/* eslint-env browser */
/**
 * ajustes.js
 * Lógica específica de la vista "Ajustes":
 *  - Cargar/actualizar el mapa de Google Maps en el iframe#gmap-embed
 *  - (Opcional) Hooks para actualizar datos del perfil y la dirección
 *
 * Requisitos de HTML:
 *  - Un <iframe id="gmap-embed"> para el mapa
 *  - Un input/hidden con id="address" que contenga la dirección (opcional)
 *  - Idealmente, inputs con ids únicos:
 *    #fullName, #email, #phone (ver notas abajo)
 */

(() => {
  "use strict";

  /**
   * Ejecuta la función cuando el DOM esté listo.
   * @param {Function} fn
   */
  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, {once: true});
    } else {
      fn();
    }
  };

  /**
   * Pequeño debounce para no saturar el mapa ni el backend.
   * @param {Function} fn
   * @param {number} ms
   * @return {Function}
   */
  const debounce = (fn, ms = 400) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  /**
   * Actualiza el iframe del mapa con la dirección indicada.
   * @param {string} address Dirección legible por Google Maps.
   */
  const setMap = (address) => {
    const iframe = document.getElementById("gmap-embed");
    if (!iframe) return;
    if (!address || !String(address).trim()) return;

    const base = "https://www.google.com/maps?q=";
    const url =
      base + encodeURIComponent(address) + "&hl=es&z=16&output=embed";
    iframe.src = url;
  };

  /**
   * Resuelve la dirección a mostrar en el mapa.
   * Prioriza la inyectada por backend y luego el hidden #address.
   * @return {string} Dirección legible por Google Maps.
   */
  const resolveAddress = () => {
    const DEMO_ADDRESS =
      "Reforma 22, Emiliano Zapata, 52918 Ciudad López Mateos, Méx.";
    const hidden = document.getElementById("address");
    return (
      (window.BUSINESS_ADDRESS && String(window.BUSINESS_ADDRESS)) ||
      (hidden && hidden.value) ||
      DEMO_ADDRESS
    );
  };

  // ======================= INIT =======================
  onReady(() => {
    // 1) Carga inicial del mapa
    setMap(resolveAddress());

    // 2) (Opcional) Auto-actualizar mapa si cambia el hidden #address
    //   Si prefieres, puedes comentar esto y actualizar
    // manualmente con setMap(nuevaDireccion).
    const addressInput = document.getElementById("address");
    if (addressInput) {
      addressInput.addEventListener(
          "input",
          debounce(() => setMap(addressInput.value), 400),
      );
    }

    // =======================
    // ACTUALIZACIÓN DE DATOS (COMENTADO)
    // =======================
    /**
     * Recomendación de IDs únicos en tu HTML
     * (ahora tienes varios #chat repetidos):
     *   <input id="fullName" ...>
     *   <input id="email" ...>
     *   <input id="phone" ...>
     *   <input id="address" ...>   // ya existe como hidden
     *
     * Ejemplo de cómo leerlos y enviarlos al backend:
     */
    /*
    const fullNameEl = document.getElementById("fullName");
    const emailEl    = document.getElementById("email");
    const phoneEl    = document.getElementById("phone");
    const addrEl     = document.getElementById("address");

    // Puedes enganchar esto a un botón "Guardar cambios"
    const saveBtn = document.getElementById("saveProfileBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const payload = {
          name:  fullNameEl ? fullNameEl.value.trim() : "",
          email: emailEl ? emailEl.value.trim() : "",
          phone: phoneEl ? phoneEl.value.trim() : "",
          address: addrEl ? addrEl.value.trim() : "",
        };
    if (!payload.name && !payload.email && !payload.phone && !payload.address) {
            console.warn("[ajustes] No hay cambios para enviar.");
            return;
        }

        // TODO: Cambia la URL por tu endpoint real de Cloud Functions/Express
        //      Por ejemplo: "/merchant/updateProfile" o "/api/merchant/profile"
        // Asegúrate de habilitar CORS en tu función si es necesario.
        try {
          const res = await fetch("/api/merchant/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("HTTP " + res.status);

          // (Opcional) refrescar mapa si cambió la dirección
          if (payload.address && typeof setMap === "function")
          setMap(payload.address);

          // Muestra feedback al usuario (toast, alerta, etc.)
          console.info("[ajustes] Perfil actualizado correctamente");
        } catch (err) {
          console.error("[ajustes] Error al actualizar perfil:", err);
        }
      });
    }
    */

    /**
     * También puedes escuchar cambios en campos y guardar "auto" con debounce:
     */
    /*
    const autoSave = debounce(async () => {
      const payload = {
        name:  fullNameEl ? fullNameEl.value.trim() : "",
        email: emailEl ? emailEl.value.trim() : "",
        phone: phoneEl ? phoneEl.value.trim() : "",
        address: addrEl ? addrEl.value.trim() : "",
      };
      try {
        const res = await fetch("/api/merchant/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        if (payload.address) setMap(payload.address);
        console.info("[ajustes] Auto-guardado OK");
      } catch (err) {
        console.error("[ajustes] Auto-guardado falló:", err);
      }
    }, 800);

    [fullNameEl, emailEl, phoneEl, addrEl].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", autoSave);
    });
    */
  });
})();
