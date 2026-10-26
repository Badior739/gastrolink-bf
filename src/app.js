require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const produitRoutes = require('./routes/produit.routes');
const commandeRoutes = require('./routes/commande.routes');
const messageRoutes = require('./routes/message.routes');
const avisRoutes = require('./routes/avis.routes');
const adminRoutes = require('./routes/admin.routes');
const etablissementRoutes = require('./routes/etablissement.routes');
const livreurRoutes = require('./routes/livreur.routes');
const favoriRoutes = require('./routes/favori.routes');
const notificationRoutes = require('./routes/notification.routes');
const clientRoutes = require('./routes/client.routes');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const health = (req, res) => res.json({ status: 'ok', service: 'gastrolink-api' });
app.get('/health', health);
app.get('/api/health', health);

app.use('/api/auth', authRoutes);
app.use('/api/produits', produitRoutes);
app.use('/api/commandes', commandeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/avis', avisRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/etablissements', etablissementRoutes);
app.use('/api/livreurs', livreurRoutes);
app.use('/api/favoris', favoriRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/clients', clientRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
