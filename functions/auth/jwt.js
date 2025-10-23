/** Módulo de utilidades JWT
 * Usa jsonwebtoken: https://www.npmjs.com/package/jsonwebtoken
 */

const jwt = require("jsonwebtoken");

/** Obtiene el secreto JWT desde config o envs
 * @return {string|undefined} Secreto JWT
 */
function getSecret() {
  // Soporta functions.config() y/o envs
  try {
    const fns = require("firebase-functions");
    const cfg = fns.config?.().jwt || {};
    return cfg.secret || process.env.JWT_SECRET;
  } catch {
    return process.env.JWT_SECRET;
  }
}

const JWT_SECRET = getSecret();
if (!JWT_SECRET) throw new Error("JWT_SECRET no configurado.");

const ACCESS_TTL = "15m"; // ajusta a tu gusto
const REFRESH_TTL = "30d"; // idem

/** Firma un token de acceso
 * @param {Object} payload Datos a incluir en el token
 * @return {string} Token firmado
 */
function signAccess(payload) {
  return jwt.sign(payload, JWT_SECRET, {expiresIn: ACCESS_TTL});
}

/** Firma un token de refresh
 * @param {*} payload
 * @return {string} Token firmado
 */
function signRefresh(payload) {
  return jwt.sign(payload, JWT_SECRET, {expiresIn: REFRESH_TTL});
}

/** Verifica y decodifica un token JWT
 * @param {string} token Token JWT a verificar
 * @return {Object} Payload decodificado
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signAccess, signRefresh, verifyToken, ACCESS_TTL, REFRESH_TTL,
};
