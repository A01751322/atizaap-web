const functions = require("firebase-functions");
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

// Middleware para servir archivos estáticos (CSS, Imágenes, etc.)
app.use(express.static("public"));

const expressStatic = require("express").static;
app.use("/static", expressStatic(path.join(__dirname, "static")));

// Security headers (CSP) for Express responses (admin/merchant views)
app.use((req, res, next) => {
  res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://challenges.cloudflare.com",
        "script-src-elem 'self' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://challenges.cloudflare.com",
        "script-src-attr 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
        "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
        "style-src-attr 'self' 'unsafe-inline'",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "frame-src https://challenges.cloudflare.com https://www.google.com https://www.youtube.com",
        "connect-src 'self' https://challenges.cloudflare.com https://us-central1-atizaap-web-v1.cloudfunctions.net https://cdn.jsdelivr.net",
        "form-action 'self'",
      ].join("; "),
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

/* -------------------------
    Simple HTML include engine
   ------------------------- */
const VIEW_CACHE = new Map();

/**
 * Lee un archivo de texto y lo cachea en memoria.
 * Útil para vistas estáticas (HTML parciales).
 * @param {string} filePath Ruta absoluta del archivo a leer.
 * @return {string} Contenido del archivo en UTF-8.
 */
function readText(filePath) {
  if (VIEW_CACHE.has(filePath)) return VIEW_CACHE.get(filePath);
  const txt = fs.readFileSync(filePath, "utf8");
  VIEW_CACHE.set(filePath, txt);
  return txt;
}

/**
 * Renderiza un HTML y reemplaza includes del tipo:
 *   <!-- include:NAME -->
 * Busca el partial en views/partials/NAME.html
 * @param {express.Response} res - objeto response de Express.
 * @param {string} relativePath - ruta relativa dentro del directorio views.
 * @return {void}
 */
function renderHtml(res, relativePath) {
  const abs = path.join(__dirname, "views", relativePath);
  let html = readText(abs);

  // Reemplaza todos los includes dinámicos: <!-- include:NAME -->
  html = html.replace(/<!--\s*include:([a-zA-Z0-9_-]+)\s*-->/g, (m, name) => {
    try {
      const partialPath =
      path.join(__dirname, "views", "partials", `${name}.html`);
      if (!fs.existsSync(partialPath)) {
        // Si no existe, devolvemos el marcador intacto para facilitar debug
        return m;
      }
      return readText(partialPath);
    } catch (e) {
      // En caso de error, devolvemos el marcador original
      return m;
    }
  });

  res.set("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
}

/* ----------------------------------------------------
    Definir las rutas para TUS PÁGINAS HTML
   ---------------------------------------------------- */

// Ruta Principal: Sirve el index.html principal
app.get("/", (req, res) => renderHtml(res, "index.html"));

// Ruta para la página de negocios aliados
app.get("/negocios-aliados", (req, res) => renderHtml(res, "negocios.html"));

// Ruta para la página de registro
app.get("/register", (req, res) => renderHtml(res, "register.html"));

// Ruta para iniciar sesión
app.get("/iniciar-sesion", (req, res) => renderHtml(res, "login.html"));

// ------ ---------------------------------- -------
// ------ Rutas para la sección "web-admins" -------
// ------ ---------------------------------- -------

// --- Ruta principal ---
app.get("/admin",
    (req, res) => renderHtml(res, "web-admins/inicio.html"));

// --- Ruta datos ---
app.get("/admin/datos",
    (req, res) => renderHtml(res, "web-admins/datos.html"));

// --- Ruta ajustes ---
app.get("/admin/ajustes",
    (req, res) => renderHtml(res, "web-admins/ajustes.html"));

// ------ ------------------------------------ ------
// ------ Rutas para la sección "web-merchant" ------
// ------ ------------------------------------ ------

// --- Ruta principal ---
app.get("/merchant", (req, res) => renderHtml(res, "web-merchant/inicio.html"));

// --- Ruta Datos ---
app.get("/merchant/datos",
    (req, res) => renderHtml(res, "web-merchant/datos.html"));

// --- Ruta promociones ---
app.get("/merchant/promociones",
    (req, res) => renderHtml(res, "web-merchant/promocion.html"));

// --- Ruta Ajustes ---
app.get("/merchant/ajustes",
    (req, res) => renderHtml(res, "web-merchant/ajustes.html"));

// --- Ruta Ajustes equipo ---
app.get("/merchant/ajustes-equipos",
    (req, res) => renderHtml(res, "web-merchant/ajustesequipo.html"));

// --- Ruta registrar ---
app.get("/merchant/registrar",
    (req, res) => renderHtml(res, "web-merchant/registrar.html"));

// --- Ruta registrar Qr ---
app.get("/merchant/registrar-qr",
    (req, res) => renderHtml(res, "web-merchant/registrarqr.html"));

/* Export de function de envío de correos (si ya existe) */
const {solicitudesNegocios} = require("./static/sendMail");
module.exports.solicitudesNegocios = solicitudesNegocios;

module.exports.app = functions.https.onRequest(app);
