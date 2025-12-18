const {calDistAndEta} = require('./controllers/locationController');

let roomUsers = {};

const handleSocketConnection = (socket,io) => {
    console.log('User joined room:', socket.id);

    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        socket.roomId = roomId;
        if(!roomUsers[roomId]){
            roomUsers[roomId] = {};
        }
        roomUsers[roomId][socket.id] = {};
    });


    socket.on('locationUpdate', async(data) => {
        const {lat,lng} = data;
        const roomId =socket.roomId;
        if(!roomId) return;
        roomUsers[roomId][socket.id] = {lat,lng};

        const users = roomUsers[roomId];
        const updateUsers = await Promise.all(
            Object.keys(users).map(async(id) => {
               let distance = null, duration = null;
               if(users[socket.id] && users[id]){
                try{
                    if(id != socket.id){
                        const result = await calDistAndEta(users[id],users[socket.id]);
                        distance = result.distance;
                        duration = result.duration;
                    }
                }
                catch(err){
                    distance='N/A';
                    duration='N/A';
                }
               }
               return {
                userId:id,
                lat:users[id].lat,
                lng:users[id].lng,
                distance,
                eta:duration
               };
            })
        )
       
        io.to(roomId).emit('user-offline', updateUsers); //user offline
    })
     socket.on('disconnect', () =>{
            console.log('User disconnected:', socket.id);
            const roomId = socket.roomId;
            if(roomId && roomUsers[roomId]){
            delete roomUsers[roomId][socket.id];
            io.to(roomId).emit('user-offline',Object.keys(roomUsers[roomId]).map(id => ({
                userId: id,
                ...roomUsers[roomId][id]  
            }))); //notify others in room
            if(Object.keys(roomUsers[roomId]).length === 0){
                delete roomUsers[roomId]; //remove room if empty
            }
        }
        });
    }
        module.exports = {handleSocketConnection};