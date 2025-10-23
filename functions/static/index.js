/**
 * Firebase Functions v2 + Express auth server using session cookies.
 * Valida contra RDS (MySQL) usando: usuario_web(correo, contrasena),
 * rol/usuario_rol y negocio(id_usuario).
 */
const express = require("express");
const cookieParser = require("cookie-parser");
const admin = require("firebase-admin");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

admin.initializeApp();

// --- Secrets (configúralos con CLI) ---
const DB_HOST = defineSecret("DB_HOST");
const DB_USER = defineSecret("DB_USER");
const DB_PASSWORD = defineSecret("DB_PASS");
const DB_NAME = defineSecret("DB_NAME");

// --- MySQL pool (lazy) ---
let pool;
/**
 * Devuelve un pool de MySQL (lazy, singleton).
 */
async function getPool() {
  if (!pool) {
    pool = await mysql.createPool({
      host: DB_HOST.value(),
      user: DB_USER.value(),
      password: DB_PASSWORD.value(),
      database: DB_NAME.value(),
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

// --- Express app ---
const app = express();
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "https://atizaap-web-v1.web.app",
  "https://atizaap-web-v1.firebaseapp.com",
  // añade tu dominio en Cloudflare:
  // "https://tudominio.mx",
];
app.use(cors({origin: allowedOrigins, credentials: true}));


const SESSION_COOKIE_NAME = "session";
const SESSION_EXPIRES_IN = 1000 * 60 * 60 * 24 * 7; // 7 días

/**
 * @typedef {Object} RdsUser
 * @property {number} id_usuario
 * @property {string} correo
 * @property {string} contrasena
 */

// Helpers ----------------------------------------------------------
/**
 * Obtiene usuario por correo desde RDS.
 * @param {string} email
 * @return {Promise<RdsUser|null>}
 */
async function fetchUserByEmail(email) {
  const pool = await getPool();
  const [rows] = await pool.query(
      `SELECT uw.id_usuario, uw.correo, uw.contrasena
       FROM usuario_web uw
       WHERE uw.correo = ? LIMIT 1`,
      [email],
  );
  return rows[0] || null;
}

/**
 * Obtiene los nombres de rol asociados al usuario.
 * @param {number} userId
 * @return {Promise<string[]>}
 */
async function fetchUserRoles(userId) {
  const pool = await getPool();
  const [rows] = await pool.query(
      `SELECT r.nombre AS rol
       FROM usuario_rol ur
       JOIN rol r ON r.id_rol = ur.id_rol
       WHERE ur.id_usuario = ?`,
      [userId],
  );
  return rows.map((r) => r.rol.toLowerCase());
}

/**
 * Verifica si el usuario tiene un negocio asociado.
 * @param {number} userId
 * @return {Promise<boolean>}
 */
async function hasNegocio(userId) {
  const pool = await getPool();
  const [rows] = await pool.query(
      `SELECT COUNT(*) AS c FROM negocio WHERE id_usuario = ?`,
      [userId],
  );
  return rows[0]?.c > 0;
}

/**
 * Decide el rol final del usuario.
 * @param {string[]} roles
 * @param {boolean} negocioFlag
 * @return {"admin"|"merchant"}
 */
function decideRole(roles, negocioFlag) {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("merchant")) return "merchant";
  if (negocioFlag) return "merchant";
  return "merchant"; // fallback
}

/**
 * Asegura que exista un usuario en Firebase Auth; si no, lo crea
 * con un uid basado en el id de RDS.
 * @param {string} email
 * @param {(string|number)} uidHint
 */
async function ensureFirebaseUser(email, uidHint) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch {
    return await admin.auth().createUser({
      uid: `rds:${uidHint}`, email, emailVerified: true,
    });
  }
}

/**
 * Establece custom claims con el rol para el usuario dado.
 * @param {string} uid
 * @param {"admin"|"merchant"} role
 * @return {Promise<void>}
 */
async function setRoleClaims(uid, role) {
  await admin.auth().setCustomUserClaims(uid, {role});
}

/**
 * Escribe la cookie de sesión httpOnly en la respuesta.
 * @param {Response} res
 * @param {string} cookieValue
 * @return {void}
 */
function setSessionCookie(res, cookieValue) {
  res.cookie(SESSION_COOKIE_NAME, cookieValue, {
    maxAge: SESSION_EXPIRES_IN,
    httpOnly: true,
    secure: true, // en emulator local podrías poner false
    sameSite: "lax",
    path: "/",
  });
}

// Middlewares ------------------------------------------------------
/**
 * Middleware: valida la cookie de sesión y adjunta `req.user`.
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @return {Promise<void>}
 */
async function verifySessionCookie(req, res, next) {
  const token = req.cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({error: "No session"});
  }
  try {
    const decoded = await admin.auth().verifySessionCookie(token, true);
    req.user = decoded; // incluye custom claims (role)
    next();
  } catch {
    return res.status(401).json({error: "Invalid session"});
  }
}

/**
 * Middleware factory que exige un rol específico.
 * @param {"admin"|"merchant"} role
 * @return {RequestHandler}
 */
function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({
        error: "Forbidden",
      });
    }
    next();
  };
}

// Routes -----------------------------------------------------------

// 1) Login: valida en RDS, setea claims, entrega customToken
app.post("/auth/login", async (req, res) => {
  const {email, password} = req.body || {};
  if (!email || !password) {
    return res.status(400).json({
      error: "email and password required",
    });
  }

  try {
    const user = await fetchUserByEmail(email);
    if (!user) {
      return res.status(401).json({error: "Credenciales inválidas"});
    }

    // 1.a) contraseña: intenta bcrypt y, si no, texto plano (fallback)
    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.contrasena);
    } catch (e) {
      /* ignore: fallback to plain compare below */
    }
    if (!ok) ok = (password === user.contrasena);
    if (!ok) {
      return res.status(401).json({error: "Credenciales inválidas"});
    }

    // 1.b) rol
    const roles = await fetchUserRoles(user.id_usuario);
    const negocioFlag = await hasNegocio(user.id_usuario);
    const role = decideRole(roles, negocioFlag);

    // 1.c) Firebase user + claims + custom token
    const fbUser = await ensureFirebaseUser(user.correo, user.id_usuario);
    await setRoleClaims(fbUser.uid, role);
    const customToken = await admin.auth().createCustomToken(fbUser.uid);

    res.json({customToken, role});
  } catch (err) {
    console.error("login error", err);
    res.status(500).json({error: "Internal error"});
  }
});

// 2) Intercambia idToken por session cookie httpOnly
app.post("/auth/sessionLogin", async (req, res) => {
  const {idToken} = req.body || {};
  if (!idToken) {
    return res.status(400).json({error: "idToken required"});
  }
  try {
    const sessionCookie =
    await admin.auth().createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN,
    });
    setSessionCookie(res, sessionCookie);
    res.json({status: "ok"});
  } catch (err) {
    console.error("sessionLogin error", err);
    res.status(401).json({error: "Cannot create session"});
  }
});

// 3) Logout (limpia cookie)
app.post("/auth/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, {path: "/"});
  res.json({status: "logged out"});
});

// 4) Info de sesión para el guard del cliente
app.get("/auth/session", verifySessionCookie, (req, res) => {
  res.json({uid: req.user.uid, role: req.user.role || null});
});

// Ejemplos de APIs protegidas
app.get("/admin/data", verifySessionCookie, requireRole("admin"),
    (req, res) => {
      res.json({ok: true, scope: "admin"});
    });
app.get("/merchant/data", verifySessionCookie, requireRole("merchant"),
    (req, res) => {
      res.json({ok: true, scope: "merchant"});
    });

app.get("/test/db", async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query("SELECT NOW() AS now;");
    res.json({ok: true, result: rows[0]});
  } catch (err) {
    console.error("DB test error:", err);
    res.status(500).json({error: err.message});
  }
});

// Exporta como función HTTP
exports.app = onRequest({
  secrets: [DB_HOST, DB_USER, DB_PASSWORD, DB_NAME],
}, app);
