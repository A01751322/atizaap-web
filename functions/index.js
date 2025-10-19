const functions = require("firebase-functions");
const express = require("express");
const path = require("path");


// 2. Crear una instancia de Express
const app = express();

// 3. Middleware para servir archivos estáticos (CSS, Imágenes, etc.)
app.use(express.static("public"));

const expressStatic = require("express").static; // reuse express static
app.use("/api", expressStatic(path.join(__dirname, "api")));

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

// 4. Definir las rutas para TUS PÁGINAS HTML
// ----------------------------------------------------

// Ruta Principal: Sirve el index.html principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Ruta para la página de negocios aliados
app.get("/negocios-aliados", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "negocios.html"));
});

// Ruta para la página de registro
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "register.html"));
});

// Ruta para iniciar sesión
app.get("/iniciar-sesion", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// ------ ---------------------------------- -------
// ------ Rutas para la sección "web-admins" -------
// ------ ---------------------------------- -------

// --- Ruta principal ---
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "web-admins", "inicio.html"));
});

// --- Ruta datos ---
app.get("/admin/datos", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "web-admins", "datos.html"));
});

// --- Ruta ajustes ---
app.get("/admin/ajustes", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "web-admins", "ajustes.html"));
});

// ------ ------------------------------------ ------
// ------ Rutas para la sección "web-merchant" ------
// ------ ------------------------------------ ------

// --- Ruta principal ---
app.get("/merchant", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "web-merchant", "inicio.html"));
});

// --- Ruta Datos ---
app.get("/merchant/datos", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "web-merchant", "datos.html"));
});

// --- Ruta promociones ---
app.get("/merchant/promociones", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "web-merchant", "promocion.html"));
});

// --- Ruta Ajustes ---
app.get("/merchant/ajustes", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "web-merchant", "ajustes.html"));
});

// --- Ruta Ajustes equipo ---
app.get("/merchant/ajustes-equipos", (req, res) => {
  res.sendFile(
      path.join(__dirname, "views", "web-merchant", "ajustesequipo.html"));
});

// --- Ruta registrar ---
app.get("/merchant/registrar", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "web-merchant", "registrar.html"));
});

// --- Ruta registrar Qr ---
app.get("/merchant/registrar-qr", (req, res) => {
  res.sendFile(
      path.join(__dirname, "views", "web-merchant", "registrarqr.html"));
});

const {solicitudesNegocios} = require("./static/sendMail");
module.exports.solicitudesNegocios = solicitudesNegocios;

module.exports.app = functions.https.onRequest(app);
