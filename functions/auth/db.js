const mysql = require("mysql2/promise");

let pool = null;

/** Obtiene la configuración de la base de datos desde config o envs
 * @return {object} Configuración de la base de datos
 */
function getDbConfig() {
  try {
    const fns = require("firebase-functions");
    const db = fns.config?.().db || {};
    return {
      host: process.env.DB_HOST || db.host,
      user: process.env.DB_USER || db.user,
      password: process.env.DB_PASS || db.pass || db.passdb,
      database: process.env.DB_NAME || db.name,
    };
  } catch {
    return {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    };
  }
}

/** Obtiene el pool de conexiones a la base de datos
 * @return {Pool} Pool de conexiones
 */
async function getPool() {
  if (!pool) {
    const cfg = getDbConfig();
    if (!cfg.host || !cfg.user || !cfg.pass || !cfg.database) {
      throw new Error("DB config incompleta.");
    }
    pool = mysql.createPool({
      ...cfg,
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return pool;
}

module.exports = {getPool};
