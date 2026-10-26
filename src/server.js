require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const { initSockets } = require('./sockets');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io);
initSockets(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`GastroLink BF API démarrée sur le port ${PORT}`);
});

module.exports = { app, server };
