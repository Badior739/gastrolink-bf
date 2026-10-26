const mysql = require('mysql2/promise');

/**
 * Pool de connexions MySQL. Nécessite les variables d'environnement suivantes
 * (voir .env.example) : DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT.
 *
 * Support SSL ajouté pour les fournisseurs managés qui l'exigent (Aiven,
 * PlanetScale, etc.) : activez avec DB_SSL=true dans .env. Si un certificat
 * CA est fourni par le fournisseur (fortement recommandé), placez son
 * contenu dans DB_SSL_CA (voir .env.example pour le détail). Sans certificat
 * fourni, DB_SSL_REJECT_UNAUTHORIZED=false permet de se connecter quand
 * même — pratique pour tester rapidement, mais moins sûr (aucune
 * vérification que le serveur contacté est bien le bon) : à éviter en
 * production, où le certificat CA doit être fourni.
 */
function buildSslConfig() {
  if (process.env.DB_SSL !== 'true') return undefined;
  const config = {};
  if (process.env.DB_SSL_CA) {
    config.ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n');
  }
  if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false') {
    config.rejectUnauthorized = false;
  }
  return config;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'gastrolink_bf',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  ssl: buildSslConfig(),
});

module.exports = pool;
