// /public/static/sessionGuard.js

/**
 * @file sessionGuard.js
 * Exponer y verificar sesión/rol en páginas públicas.
 * Adjunta `ensureRole` al objeto window para usarlo desde HTML.
 */

/**
 * Verifica la sesión del usuario y su rol.
 * Redirige a /login si no hay sesión; si el rol no está permitido,
 * redirige a la sección correspondiente según su rol ("admin" o "merchant").
 * @param {string[]} allowed
 * Lista de roles permitidos (por ejemplo, ["admin", "merchant"]).
 * @return {Promise<null|{uid: string, role: string}>}
 * Información de sesión si está autorizado; null si se redirige.
 */
async function ensureRole(allowed) {
  try {
    const r = await fetch("/auth/session", {credentials: "include"});
    if (!r.ok) {
      window.location.href = "/login";
      return null;
    }
    const info = await r.json(); // { uid, role }
    if (!allowed.includes(info.role)) {
      window.location.href = info.role === "admin" ? "/admin" : "/merchant";
      return null;
    }
    return info;
  } catch (e) {
    console.error("guard error", e);
    window.location.href = "/login";
    return null;
  }
}

// Exponer para uso desde etiquetas <script> en HTML
window.ensureRole = ensureRole;
