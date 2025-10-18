// 1. Requerir los módulos necesarios
const functions = require("firebase-functions");
const express = require("express");
const path = require("path");


// 2. Crear una instancia de Express
const app = express();

// 3. Middleware para servir archivos estáticos (CSS, Imágenes, etc.)
// ¡Esto no cambia! Sigue apuntando a tu carpeta 'public'.
app.use(express.static("public"));

// 4. Definir las rutas para TUS PÁGINAS HTML
// ----------------------------------------------------

// Ruta Principal: Sirve el index.html principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Ruta para la página de negocios aliados
app.get("/negocio-aliados", (req, res) => {
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

module.exports.app = functions.https.onRequest(app);
