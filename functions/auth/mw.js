/** Módulo de middlewares de autenticación */

const {verifyToken} = require("./jwt");

/** Middleware para requerir autenticación
 * Agrega `req.user` con el payload del token
 * @param {Request} req Objeto Request
 * @param {Response} res Objeto Response
 * @param {Function} next Siguiente middleware
 * @return {void}
 */
function authRequired(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({error: "No token"});

    const payload = verifyToken(token);
    req.user = payload; // { uid, role }
    next();
  } catch (e) {
    return res.status(401).json({error: "Invalid/expired token"});
  }
}

/** Middleware para requerir roles específicos
 * @param {Array<string>} allowed Roles permitidos
 * @return {Function} Middleware
 */
function requireRole(allowed = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({error: "Unauthenticated"});
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({error: "Forbidden"});
    }
    next();
  };
}

module.exports = {authRequired, requireRole};
