/* eslint-env browser */
/**
 * Cargador genérico de navbar para cualquier vista sin scripts en línea.
 * Configuración por data-attributes en el placeholder:
 *   <div id="navbar-placeholder"
 *        data-partial="/partials/navbarmerchant.html"
 *        data-content-id="page-content"
 *        data-slot-selector="#content-slot"
 *        data-fallback-selector=".border-dashed.rounded-lg"></div>
 */
(() => {
  "use strict";

  /**
   * Ejecuta la función cuando el DOM esté listo.
   * @param {function(): void} fn
   *        Callback a ejecutar cuando el documento esté listo.
   * @return {void}
   */
  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, {once: true});
    } else {
      fn();
    }
  };

  onReady(async () => {
    // 1) Placeholder
    const mount =
      document.getElementById("navbar-placeholder") ||
      document.querySelector("[data-navbar-placeholder]");

    if (!mount) {
      // eslint-disable-next-line no-console
      console.error("[navbar] No se encontró #navbar-placeholder");
      return;
    }

    // 2) Parámetros desde atributos
    const partial =
      mount.getAttribute("data-partial") || "/partials/navbarmerchant.html";
    const contentId =
      mount.getAttribute("data-content-id") || "page-content";
    const slotSelector =
      mount.getAttribute("data-slot-selector") || "#content-slot";
    const fallbackSelector =
      mount.getAttribute("data-fallback-selector") ||
      ".border-dashed.rounded-lg";

    // 3) Descargar partial del navbar (cache-buster)
    const url = `${partial}?v=${Date.now()}`;

    try {
      const res = await fetch(url, {
        headers: {Accept: "text/html"},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      mount.innerHTML = html;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[navbar] Error al cargar:", err);
      mount.innerHTML =
        "<div class=\"fixed w-16 h-screen bg-gray-800 text-white " +
        "p-4\">Error</div>";
      return;
    }

    // 4) Reubicar el contenido de la página en el layout del navbar
    const content = document.getElementById(contentId);
    let slot = document.querySelector(slotSelector);

    if (!slot) {
      const dashed = mount.querySelector(fallbackSelector);
      if (dashed) {
        slot = document.createElement("div");
        slot.id = "content-slot";
        dashed.appendChild(slot);
      }
    }

    if (slot && content) {
      slot.appendChild(content);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[navbar] Falta content-slot o #${contentId}`);
    }

    /* Re‑inicializa Flowbite cuando esté disponible. */
    const tryInitFlowbite = () => {
      if (typeof window.initFlowbite === "function") {
        try {
          window.initFlowbite();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("initFlowbite falló:", e);
        }
        return true;
      }
      return false;
    };

    if (!tryInitFlowbite()) {
      // a) Observa el DOM por si Flowbite se inyecta después
      const obs = new MutationObserver(() => {
        if (tryInitFlowbite()) obs.disconnect();
      });

      obs.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      // b) Intentos temporizados (máx. 2 s)
      let n = 0;
      const id = setInterval(() => {
        if (tryInitFlowbite() || ++n > 20) clearInterval(id);
      }, 100);
    }
  });
  // 5) Oculta el loader al finalizar
  const loader = document.getElementById("loader-overlay");
  if (loader) {
    loader.classList.add("hidden");
    setTimeout(() => loader.remove(), 300);
  }
})();
