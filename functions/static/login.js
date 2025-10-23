// /public/js/login.js
/* global firebase */
console.log("login.js loaded");
// Requiere Firebase Web (compat) y window.firebaseConfig en el HTML.

// Guarded Firebase initialization (no crash if not present)
let auth = null;
try {
  firebase.initializeApp(window.firebaseConfig);
  auth = firebase.auth();
} catch (e) {
  console.warn("Firebase no disponible, usando modo local:", e && e.message ?
    e.message : e);
}

const form = document.querySelector("form");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const email = emailEl.value.trim();
  const password = passEl.value;

  // ==== ATAJO LOCAL (sin backend) ====
  // Caso 1: Negocio Estética Jiménez
  if (email.toLowerCase() === "estetica@jimenez.com" &&
  password === "12345678") {
    try {
      localStorage.setItem("id_negocio_logeado", "5");
      localStorage.setItem("is_admin", "false");
      localStorage.setItem("chatbot_role", "merchant");
      localStorage.setItem("chatbot_admin", "false");
      localStorage.setItem("chatbot_email", email.toLowerCase());
    } catch (_) {/* ignore */}
    window.location.href = "/merchant";
    return;
  }
  // Caso 2: Admin Atizapán
  if (email.toLowerCase() === "admin@atizapan.com" && password === "12345678") {
    try {
      // útil por si alguna vista lo consulta
      localStorage.setItem("is_admin", "true");
      localStorage.removeItem("id_negocio_logeado");
      localStorage.setItem("chatbot_role", "admin");
      localStorage.setItem("chatbot_admin", "true");
      localStorage.setItem("chatbot_email", email.toLowerCase());
    } catch (_) {/* ignore */}
    window.location.href = "/admin";
    return;
  }
  // Si Firebase no está disponible y no coincidió con los atajos, aborta.
  if (!auth) {
    alert("Credenciales inválidas");
    return;
  }

  try {
    // 1) pide customToken al backend (valida RDS + claims)
    const r1 = await fetch("/auth/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify({email, password}),
    });
    if (!r1.ok) {
      const e = await r1.json().catch(() => ({}));
      alert(e.error || "Credenciales inválidas");
      return;
    }
    const {customToken, role} = await r1.json();

    // 2) inicia sesión con Firebase y consigue idToken
    await auth.signInWithCustomToken(customToken);
    const idToken = await auth.currentUser.getIdToken();

    // 3) intercambia por cookie httpOnly
    const r2 = await fetch("/auth/sessionLogin", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify({idToken}),
    });
    if (!r2.ok) {
      alert("No se pudo crear la sesión");
      return;
    }

    // 4) redirige según rol
    window.location.href = role === "admin" ? "/admin" : "/merchant";
  } catch (err) {
    console.error("login error", err);
    alert("Error de inicio de sesión");
  }
});
