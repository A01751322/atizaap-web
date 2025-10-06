// 1. Requerir los módulos necesarios
const express = require('express');
const path = require('path');

// 2. Crear una instancia de Express
const app = express();
const PORT = 5002;

// 3. Middleware para servir archivos estáticos (CSS, Imágenes, etc.)
// ¡Esto no cambia! Sigue apuntando a tu carpeta 'public'.
app.use(express.static('public'));

// 4. Definir las rutas para TUS PÁGINAS HTML
// ----------------------------------------------------

// Ruta Principal: Sirve el index.html principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Ruta para la página de registro
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// --- ---------------------------------- ---
// --- Rutas para la sección "web-admins" ---
// --- ---------------------------------- ---

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'web-admins', 'inicio.html'));
});


// --- ------------------------------------ ---
// --- Rutas para la sección "web-merchant" ---
// --- ------------------------------------ ---

app.get('/merchant', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'web-merchant', 'inicio.html'));
});

// ¡Puedes seguir añadiendo todas las rutas que necesites aquí!


// 5. Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://127.0.0.1:${PORT}`);
});