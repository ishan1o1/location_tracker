const express = require('express');
const cors = require('cors');
const {handleSocketConnection} = require('./socketHandler');
const locationRoutes = require('./routes/locationRoute');
const http = require('http');
const {Server} = require('socket.io');
const dotenv = require('dotenv');
dotenv.config();
const app = express();

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
        origin: '*', //allow all origins for testing purposes
        methods: ['GET','POST'],
        credentials:true
    }
});


const PORT = process.env.PORT || 4000;

app.get('/', (req,res)=>{
    res.send('Server is running');
})

app.use('/api/location', locationRoutes);

io.on('connection',(socket)=>{
    handleSocketConnection(socket,io);
});


server.listen(PORT,()=>{
    console.log(`Server is running on port : ${PORT}`);
})
