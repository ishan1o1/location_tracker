const {calDistAndEta} = require('./controllers/locationController');

let roomUsers = {};

const handleJoinRoom = (socket,io) => {
    console.log('User joined room:', socket.id);

    socket.on('joinRoom', (room) => {
        socket.join(roomId);
        socket.roomId = roomId;
        if(!roomUsers[roomId]){
            roomUsers[roodId] = {};
        }
        roomUsers[roomId][socket.id] = {};
    });


    socket.on('locationUpdate', async(data) => {
        const {lat,lang} = data;
        const roomId =socket.roomId;
        if(!roomId) return;
        roomUsers[roomId][socket.id] = {lat,lang};

        const users = roomUsers[roomId];
        const updateUsers = await Prommise.all(
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
                lang:users[id].lang,
                distance,
                eta:duration
               };
            })
        )
       
        io.to(roomId).emit('locationUpdate', updateUsers); //user offline
    })
     socket.on('disconnect', () =>{
            console.log('User disconnected:', socket.id);
            delete roomUsers[roomId][socket.id];
            io.to(roomId).emit('user-offline',Object,keys(roomUsers[roomId]).map(id => ({
                userId: id,
                ...roomUsers[roomId][id]  
            }))); //notify others in room
            if(Object.keys(roomUsers[roomId]).length === 0){
                delete roomUsers[roomId]; //remove room if empty
            }
        });
    }
        module.exports = {handleJoinRoom};