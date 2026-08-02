const { calDistAndEta } = require('./controllers/locationController');
const { verifyToken } = require('./utils/jwt');
const authService = require('./services/authService');

// Room storage: roomId -> { metadata, members (Map), sockets (Map), locations (Map) }
let rooms = {};

const socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }

        const decoded = verifyToken(token);
        const user = await authService.getUserById(decoded.userId);
        if (!user) {
            return next(new Error('Authentication error: User no longer exists'));
        }

        socket.user = {
            id: user.id,
            name: user.name,
            email: user.email,
        };
        next();
    } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
    }
};

const normalizeRoomId = (roomId) => String(roomId || '').trim().toUpperCase();

const getUserActiveRooms = (userId) => {
    const activeRooms = [];
    for (const [roomId, room] of Object.entries(rooms)) {
        if (room.members.has(userId)) {
            const memberInfo = room.members.get(userId);
            activeRooms.push({
                roomId: room.metadata.roomId,
                ownerId: room.metadata.ownerId,
                ownerName: room.metadata.ownerName,
                memberCount: room.members.size,
                isOwner: room.metadata.ownerId === userId,
                joinedAt: memberInfo?.joinedAt || room.metadata.createdAt,
                createdAt: room.metadata.createdAt,
            });
        }
    }
    return activeRooms;
};

const syncUserProfileInRooms = (io, userId, newName) => {
    for (const [roomId, room] of Object.entries(rooms)) {
        if (room.members.has(userId)) {
            const member = room.members.get(userId);
            member.name = newName;
            if (room.metadata.ownerId === userId) {
                room.metadata.ownerName = newName;
            }
            broadcastRoomUsers(io, roomId);
        }
    }
};

const getRoomUserList = async (roomId, activeUserId = null) => {
    const room = rooms[roomId];
    if (!room) return [];

    const memberList = Array.from(room.members.values());

    return Promise.all(
        memberList.map(async (member) => {
            let distance = null;
            let duration = null;

            const activeUserLoc = activeUserId ? room.locations.get(activeUserId) : null;
            const currentUserLoc = room.locations.get(member.userId);

            if (
                activeUserId &&
                member.userId !== activeUserId &&
                activeUserLoc?.lat &&
                activeUserLoc?.lng &&
                currentUserLoc?.lat &&
                currentUserLoc?.lng
            ) {
                try {
                    const result = await calDistAndEta(currentUserLoc, activeUserLoc);
                    distance = result.distance;
                    duration = result.duration;
                } catch (err) {
                    distance = 'N/A';
                    duration = 'N/A';
                }
            }

            return {
                userId: member.userId,
                name: member.name,
                email: member.email,
                isOwner: member.userId === room.metadata.ownerId,
                lat: currentUserLoc?.lat || null,
                lng: currentUserLoc?.lng || null,
                updatedAt: currentUserLoc?.updatedAt || null,
                distance,
                eta: duration,
            };
        })
    );
};

const broadcastRoomUsers = async (io, roomId, activeUserId = null) => {
    if (!rooms[roomId]) return;
    const users = await getRoomUserList(roomId, activeUserId);
    io.to(roomId).emit('roomUsers', users);
};

const deleteRoomInternal = (io, roomId) => {
    if (!rooms[roomId]) return;

    io.to(roomId).emit('roomDeleted', {
        message: 'The room has been deleted by its owner.',
        roomId,
    });
    io.in(roomId).socketsLeave(roomId);
    delete rooms[roomId];
};

const removeUserFromRoom = async (socket, io, roomId, explicitLeave = false) => {
    const room = rooms[roomId];
    const userId = socket.user?.id;
    if (!room || !userId || !room.members.has(userId)) return;

    if (explicitLeave) {
        // Explicit user leave action
        if (room.metadata.ownerId === userId) {
            // Owner leaving deletes room for all
            deleteRoomInternal(io, roomId);
            return;
        }

        const leavingMember = room.members.get(userId);
        room.members.delete(userId);
        room.locations.delete(userId);

        io.to(roomId).emit('userLeft', {
            userId,
            name: leavingMember?.name || 'User',
        });

        if (room.members.size === 0) {
            delete rooms[roomId];
            return;
        }

        await broadcastRoomUsers(io, roomId);
    }
};

const handleSocketConnection = (socket, io) => {
    const authenticatedUser = socket.user;
    console.log(`User connected: ${authenticatedUser.name} (${authenticatedUser.id}) [Socket: ${socket.id}]`);

    socket.on('getActiveRooms', (callback) => {
        if (typeof callback === 'function') {
            const userRooms = getUserActiveRooms(authenticatedUser.id);
            callback(userRooms);
        }
    });

    socket.on('resumeRoomSession', async (payload, callback) => {
        const roomId = normalizeRoomId(typeof payload === 'object' ? payload?.roomId : payload);
        const userId = authenticatedUser.id;

        const respond = (res) => {
            if (typeof callback === 'function') {
                callback(res);
            }
        };

        if (!roomId || !rooms[roomId] || !rooms[roomId].members.has(userId)) {
            socket.emit('roomError', { message: 'The room has been deleted or you are no longer a member.' });
            return respond({ success: false, error: 'The room has been deleted or you are no longer a member.' });
        }

        const room = rooms[roomId];

        socket.join(roomId);
        socket.roomId = roomId;

        room.sockets.set(socket.id, userId);

        const userList = await getRoomUserList(roomId, userId);

        respond({
            success: true,
            room: {
                roomId: room.metadata.roomId,
                ownerId: room.metadata.ownerId,
                ownerName: room.metadata.ownerName,
                createdAt: room.metadata.createdAt,
            },
            users: userList,
        });
    });

    socket.on('joinRoom', async (payload) => {
        const roomId = normalizeRoomId(typeof payload === 'object' ? payload?.roomId : payload);
        const shouldCreateRoom = Boolean(typeof payload === 'object' && payload?.create);

        if (!roomId) return;

        if (!shouldCreateRoom && !rooms[roomId]) {
            socket.emit('roomError', { message: 'Please enter a correct room ID.' });
            return;
        }

        // Initialize room if create = true and room does not exist
        if (!rooms[roomId]) {
            rooms[roomId] = {
                metadata: {
                    roomId,
                    ownerId: authenticatedUser.id,
                    ownerName: authenticatedUser.name,
                    createdAt: new Date().toISOString(),
                },
                members: new Map(),
                sockets: new Map(),
                locations: new Map(),
            };
        }

        const room = rooms[roomId];

        socket.join(roomId);
        socket.roomId = roomId;

        room.sockets.set(socket.id, authenticatedUser.id);

        if (!room.members.has(authenticatedUser.id)) {
            room.members.set(authenticatedUser.id, {
                userId: authenticatedUser.id,
                name: authenticatedUser.name,
                email: authenticatedUser.email,
                joinedAt: new Date().toISOString(),
            });
        } else {
            // Reconnecting user: update name in member map
            const member = room.members.get(authenticatedUser.id);
            member.name = authenticatedUser.name;
        }

        await broadcastRoomUsers(io, roomId, authenticatedUser.id);
    });

    socket.on('leaveRoom', async (payload) => {
        const roomId = normalizeRoomId(payload?.roomId || socket.roomId);
        if (roomId) {
            socket.leave(roomId);
            socket.roomId = null;
            await removeUserFromRoom(socket, io, roomId, true);
        }
    });

    socket.on('deleteRoom', (payload) => {
        const roomId = normalizeRoomId(payload?.roomId || socket.roomId);
        const room = rooms[roomId];

        if (!room) return;

        if (room.metadata.ownerId !== authenticatedUser.id) {
            socket.emit('roomError', { message: 'Only the room owner can delete this room.' });
            return;
        }

        deleteRoomInternal(io, roomId);
    });

    socket.on('locationUpdate', async (data) => {
        const { lat, lng } = data || {};
        const roomId = socket.roomId;
        const userId = authenticatedUser.id;

        if (!roomId || !rooms[roomId] || !rooms[roomId].members.has(userId)) {
            socket.emit('roomError', { message: 'You are not an authorized member of this room.' });
            return;
        }

        rooms[roomId].locations.set(userId, { lat, lng, updatedAt: Date.now() });
        await broadcastRoomUsers(io, roomId, userId);
    });

    socket.on('chatMessage', ({ message } = {}) => {
        const roomId = socket.roomId;
        const userId = authenticatedUser.id;

        if (!roomId || !rooms[roomId] || !rooms[roomId].members.has(userId) || !message || !String(message).trim()) {
            return;
        }

        io.to(roomId).emit('receiveMessage', {
            userId: userId,
            name: authenticatedUser.name,
            message: String(message).trim(),
            timestamp: Date.now(),
        });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${authenticatedUser.name} (${authenticatedUser.id})`);
        const roomId = socket.roomId;
        if (roomId && rooms[roomId]) {
            rooms[roomId].sockets.delete(socket.id);

            // 60 second grace period to clean up stale socket references
            setTimeout(() => {
                if (rooms[roomId] && rooms[roomId].members.size === 0) {
                    delete rooms[roomId];
                }
            }, 60000);
        }
    });
};

module.exports = {
    handleSocketConnection,
    socketAuthMiddleware,
    getUserActiveRooms,
    syncUserProfileInRooms,
};