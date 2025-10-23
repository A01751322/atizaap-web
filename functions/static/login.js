// /public/js/login.js
/* global firebase */
// Requiere Firebase Web (compat) y window.firebaseConfig en el HTML.

(function() {
  firebase.initializeApp(window.firebaseConfig);
  const auth = firebase.auth(); // <-- Typo corregido

  const form = document.querySelector("form");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = emailEl.value.trim();
    const password = passEl.value;

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
})();
