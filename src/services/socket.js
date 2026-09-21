import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      console.log('Socket connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected from server');
    });
  }
  return socket;
}
