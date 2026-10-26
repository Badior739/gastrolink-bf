const jwt = require('../utils/jwt');

/**
 * Initialise Socket.io. Chaque commande active correspond à une "room"
 * nommée `commande:<id>`, rejointe par le client, l'établissement et le livreur
 * concernés. Cela permet de diffuser messages et positions uniquement aux
 * parties prenantes de cette commande précise.
 */
function initSockets(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload; // { id, role }
      next();
    } catch (err) {
      next(new Error('Authentification Socket.io invalide.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('rejoindre_commande', (idCommande) => {
      socket.join(`commande:${idCommande}`);
    });

    socket.on('quitter_commande', (idCommande) => {
      socket.leave(`commande:${idCommande}`);
    });

    // Partage de position en temps réel par le livreur (correction R1/POS-01 à POS-06)
    socket.on('position_livreur', ({ id_commande, latitude, longitude }) => {
      if (socket.user.role !== 'livreur') return;
      io.to(`commande:${id_commande}`).emit('position_livreur_maj', {
        id_livreur: socket.user.id,
        latitude,
        longitude,
        date_heure: new Date().toISOString(),
      });
      // Note V1 : la persistance dans POSITION_LIVREUR (historique) se fait
      // via un appel REST séparé ou un batch, pour ne pas saturer la base
      // à chaque événement temps réel.
    });

    socket.on('message_instantane', (message) => {
      if (message?.id_commande) {
        io.to(`commande:${message.id_commande}`).emit('nouveau_message', message);
      }
    });
  });
}

module.exports = { initSockets };
