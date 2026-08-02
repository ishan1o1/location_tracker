import { io } from 'socket.io-client';
import authService from './services/authService';
import { SOCKET_URL, API_BASE_URL } from './config/env';

export const API_URL = API_BASE_URL;

const socket = io(SOCKET_URL, {
    autoConnect: true,
    auth: (cb) => {
        cb({ token: authService.getToken() });
    },
});

socket.on('connect_error', (err) => {
    if (err.message && err.message.toLowerCase().includes('auth')) {
        authService.logout();
        sessionStorage.setItem('pendingAuthError', 'Your session has expired. Please log in again.');
        socket.disconnect();
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }
});

export const joinRoom = (roomId, options = {}) => {
    socket.emit('joinRoom', {
        roomId,
        create: Boolean(options.create),
    });
};

export const resumeRoomSession = (roomId) => {
    return new Promise((resolve) => {
        const emit = () => {
            socket.emit('resumeRoomSession', { roomId }, (response) => {
                resolve(response || { success: false });
            });
        };

        if (socket.connected) {
            emit();
        } else {
            socket.connect();
            socket.once('connect', emit);
        }
    });
};

export const leaveRoom = (roomId) => {
    socket.emit('leaveRoom', { roomId });
};

export const deleteRoom = (roomId) => {
    socket.emit('deleteRoom', { roomId });
};

export const listenForRoomDeleted = (callback) => {
    socket.on('roomDeleted', callback);
};

export const emitLocationUpdate = (location) => {
    socket.emit('locationUpdate', location);
};

export const listenForRoomUsers = (callback) => {
    socket.on('roomUsers', callback);
};

export const listenForUserLeft = (callback) => {
    socket.on('userLeft', callback);
};

export const listenForRoomError = (callback) => {
    socket.on('roomError', callback);
};

export const sendChatMessage = (message) => {
    socket.emit('chatMessage', { message });
};

export const listenForMessages = (callback) => {
    socket.on('receiveMessage', callback);
};

export const getActiveRooms = () => {
    return new Promise((resolve) => {
        const emit = () => {
            socket.emit('getActiveRooms', (rooms) => {
                resolve(rooms || []);
            });
        };

        if (socket.connected) {
            emit();
        } else {
            socket.connect();
            socket.once('connect', emit);
        }
    });
};

export default socket;