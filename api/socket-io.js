const http = require('http');
const { Server } = require('socket.io');
const { initSockets } = require('../src/sockets');

const server = http.createServer();
const io = new Server(server, { cors: { origin: '*' } });

initSockets(io);

module.exports = server;
