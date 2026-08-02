const express = require('express');
const cors = require('cors');
const { handleSocketConnection, socketAuthMiddleware } = require('./socketHandler');
const locationRoutes = require('./routes/locationRoute');
const authRoutes = require('./routes/authRoutes');
const connectDB = require('./config/database');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
dotenv.config();

const logger = require('./logger');

// Connect Database
connectDB();

const app = express();

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.set('io', io);

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Server is running');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/location', locationRoutes);

// Socket.IO authentication middleware before handlers
io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
    handleSocketConnection(socket, io);
});

server.listen(PORT, () => {
    logger.info(`Server is running on port : ${PORT}`);
});
