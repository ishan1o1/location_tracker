import {io} from 'socket.io-client';
const socket = io('http://localhost:4000'); 

export const joinRoom = (roomId) =>{
    socket.emit('joinRoom',roomId);

}

export const emitLocationUpdate = (location) =>{
    socket.emit('locationUpdate',location);
}

export const listenForLocationUpdates = (callback) =>{
    socket.on('user-offline',callback)
}

export default socket;