// functions/static/merchant/promocion.js
// JS de la vista "Promociones" (merchant)

/* eslint-env browser */
(function() {
  "use strict";

  /**
   * Monta el navbar de la vista merchant y mueve el contenido
   * principal al slot dentro del layout del navbar.
   * @async
   * @function mountNavbar
   * @return {Promise<void>}
   */
  async function mountNavbar() {
    const mount = document.getElementById("navbar-placeholder");
    if (!mount) return;

    try {
      // cache-buster para evitar HTML viejo
      const res = await fetch(
          "/partials/navbarmerchant.html?v=" + Date.now(),
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const html = await res.text();
      mount.innerHTML = html;

      // Mover contenido al slot dentro del layout del navbar
      const content = document.getElementById("page-content");
      let slot = mount.querySelector("#content-slot");

      // Fallback: crear slot dentro del recuadro punteado
      if (!slot) {
        const dashed = mount.querySelector(".border-dashed.rounded-lg");
        if (dashed) {
          slot = document.createElement("div");
          slot.id = "content-slot";
          dashed.appendChild(slot);
        }
      }

      if (slot && content) {
        slot.appendChild(content);
      } else {
        console.warn(
            "No se encontró content-slot ni contenido para mover",
        );
      }

      // Re-inicializa Flowbite para nuevos elementos
      if (window.initFlowbite) window.initFlowbite();
    } catch (err) {
      console.error("Error al cargar la barra de navegación:", err);
      mount.innerHTML =
        "<div class=\"fixed w-16 h-screen bg-gray-800 text-white p-4\">" +
        "Error al cargar</div>";
    }
  }

  /**
   * Cambia visualmente el estatus de una promoción (Activa/Inactiva)
   * @function applyStatus
   * @param {HTMLElement} container - Contenedor del estatus.
   * @param {"Activa"|"Inactiva"} value - Nuevo estatus a aplicar.
   */
  function applyStatus(container, value) {
    const btn = container.querySelector("[data-status-btn]");
    if (!btn) return;

    const dot = btn.querySelector("[data-status-dot]");
    const text = btn.querySelector("[data-status-text]");

    btn.classList.remove(
        "bg-green-100",
        "text-green-800",
        "bg-yellow-100",
        "text-yellow-800",
    );
    if (dot) dot.classList.remove("bg-green-500", "bg-yellow-500");

    if (value === "Activa") {
      btn.classList.add("bg-green-100", "text-green-800");
      if (dot) dot.classList.add("bg-green-500");
      if (text) text.textContent = "Activa";
    } else {
      btn.classList.add("bg-yellow-100", "text-yellow-800");
      if (dot) dot.classList.add("bg-yellow-500");
      if (text) text.textContent = "Inactiva";
    }
  }

  /**
   * Escucha los clicks en botones con data-set-status
   * y aplica el cambio de estatus al elemento correspondiente.
   * @function wireStatusDelegation
   */
  function wireStatusDelegation() {
    document.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-set-status]");
      if (!opt) return;
      const value = opt.getAttribute("data-set-status");
      const container = opt.closest("[data-status-container]");
      if (container) applyStatus(container, value);
    });
  }

  /**
   * Inicializa la vista: monta el navbar
   * y activa los listeners de cambio de estatus.
   */
  document.addEventListener("DOMContentLoaded", async () => {
    await mountNavbar();
    wireStatusDelegation();
  });
})();
