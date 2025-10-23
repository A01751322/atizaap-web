// functions/auth/routes.js
/** Rutas de autenticación (login, refresh, logout) */

const express = require("express");
const bcrypt = require("bcryptjs"); // si tus contraseñas están hasheadas
const {getPool} = require("./db");
const {signAccess, signRefresh, verifyToken} = require("./jwt");

// eslint-disable-next-line new-cap
const router = express.Router();

// SET cookie helper (RT)
/** Configura la cookie httpOnly con el refresh token
 * @param {Response} res Objeto Response
 * @param {string} token Token de refresh
 */
function setRefreshCookie(res, token) {
  res.cookie("rt", token, {
    httpOnly: true,
    secure: true, // true en producción (HTTPS)
    sameSite: "none", // "lax" si todo corre bajo el mismo dominio
    path: "/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
  });
}

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const {email, password} = req.body; // o username
    if (!email || !password) {
      return res.status(400).json({
        error: "faltan campos",
      });
    }

    const pool = await getPool();
    // AJUSTA a tu esquema real
    const [rows] = await pool.query(
        "SELECT id, email, password_hash, role FROM usuarios " +
        " WHERE email = ? LIMIT 1",
        [email],
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({error: "credenciales"});
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    // si guardas texto plano (no recomendado)
    // compara directo: password === user.password
    if (!ok) {
      return res.status(401).json({error: "credenciales"});
    }

    const payload = {uid: String(user.id), role: user.role};
    const at = signAccess(payload);
    const rt = signRefresh(payload);

    setRefreshCookie(res, rt);
    return res.json({accessToken: at, role: user.role});
  } catch (e) {
    console.error(e);
    res.status(500).json({error: "login_error"});
  }
});

// POST /auth/refresh  (usa la cookie httpOnly)
router.post("/refresh", async (req, res) => {
  try {
    const rt = req.cookies?.rt;
    if (!rt) {
      return res.status(401).json({error: "no_refresh"});
    }

    const payload = verifyToken(rt); // si expira → 401
    const at = signAccess({uid: payload.uid, role: payload.role});
    return res.json({accessToken: at, role: payload.role});
  } catch (e) {
    return res.status(401).json({error: "refresh_invalid"});
  }
});

// POST /auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("rt", {path: "/auth"});
  res.json({ok: true});
});

// GET /auth/session (pequeña ayuda para el frontend)
router.get("/session", (req, res) => {
  const hasRt = Boolean(req.cookies?.rt);
  res.json({hasRefresh: hasRt});
});

module.exports = router;
