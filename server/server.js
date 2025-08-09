const express = require('express');
const cors = require('cors');
const app = express();
const socketHandler = require('./socketHandler');
const locationRoutes = require('./routes/locationRoute');
const http = require('http');
const {Server} = require('socket.io');

app.use(express.json());
app.use(cors({
        origin: '*',
        methods: ['GET','POST'],
        credentials:true
    }
));

const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        origin: '*',
        methods: ['GET','POST'],
        credentials:true
    }
});


const PORT = process.env.PORT || 5000;

app.get('/', (req,res)=>{
    res.send('Server is running');
})

app.use('/api/location', locationRoutes);

io.on('connection',(socket)=>{
    console.log('User connected.',socket.id);
    handleJoinRoom(socket,io);
    socket.on('disconnect',() => {
        console.log('User disconnected.',socket.id);
    });
});


server.listen(PORT,()=>{
    console.log(`Server is running on port : ${PORT}`);
})
