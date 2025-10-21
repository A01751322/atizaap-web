/* eslint-env browser */
/**
 * Cargador genérico de navbar para cualquier vista sin scripts en línea.
 * Configuración por data-attributes en el placeholder:
 *   <div id="navbar-placeholder"
 *        data-partial="/partials/navbaradmins.html"
 *        data-content-id="page-content"
 *        data-slot-selector="#content-slot"
 *        data-fallback-selector=".border-dashed.rounded-lg"></div>
 */
(() => {
  "use strict";
  // --- Global guard: prevent double boot ---
  if (window.__NAVBAR_MERCHANT_BOOTED__) {
    return;
  }
  window.__NAVBAR_MERCHANT_BOOTED__ = true;
  const __SCRIPT_STARTED_AT = performance.now();

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

  // ======================= NAVBAR LOADER =======================
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

    // Avoid running twice on the same mount
    if (mount.getAttribute("data-navbar-init") === "1") return;
    mount.setAttribute("data-navbar-init", "1");

    // 2) Parámetros desde atributos
    const partial =
      mount.getAttribute("data-partial") || "/partials/navbaradmins.html";
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
      const res = await fetch(url, {headers: {Accept: "text/html"}});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      mount.innerHTML = html;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[navbar] Error al cargar:", err);
      const ERROR_HTML =
        "<div class=\"fixed w-16 h-screen bg-gray-800 text-white p-4\">" +
        "Error</div>";
      mount.innerHTML = ERROR_HTML;
      return;
    }

    // 4) Reubicar el contenido de la página en el layout del navbar
    const content = document.getElementById(contentId);
    let slot = document.querySelector(slotSelector);

    // Intento 1: usar el slot declarado por atributo
    // Intento 2: crear dentro del contenedor fallback
    if (!slot) {
      const dashed = mount.querySelector(fallbackSelector);
      if (dashed) {
        slot = document.createElement("div");
        slot.id = "content-slot";
        dashed.appendChild(slot);
      }
    }

    // Intento 3: si aún no existe, crearlo dentro del propio mount
    if (!slot) {
      slot = document.createElement("div");
      slot.id = "content-slot";
      slot.className = "w-full";
      mount.appendChild(slot);
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


  // ======================= LOADER CONTROL =======================
  // Oculta el loader solo cuando todo esté estable
  // y respetando un tiempo mínimo
  const MIN_LOADER_MS = 500; // 0.5s
  // tiempo máximo absoluto antes de quitar el loader, aunque falte algo
  const MAX_WAIT_MS = 2500; // 2.5s; ajusta a tu realidad

  const loader = document.getElementById("loader-overlay");

  /**
   * Oculta el loader asegurando un tiempo mínimo visible para evitar parpadeos.
   * @return {void}
   */
  function hideLoaderWithMinimum() {
    if (!loader) return;

    const elapsed = performance.now() - __SCRIPT_STARTED_AT;
    const remaining = Math.max(0, MIN_LOADER_MS - elapsed);

    setTimeout(() => {
      // Transición suave
      loader.classList.add("is-fading");
      // Permite el scroll otra vez
      document.body.classList.remove("overflow-hidden");
      // Remueve el nodo tras la animación
      setTimeout(() => loader.remove(), 50);
    }, remaining);
  }

  /**
   * Comprueba si la interfaz está lo bastante lista para ocultar el loader.
   * @return {boolean}
   */
  function conditionsReady() {
    // Navbar cargado en el DOM
    const navbar = document.querySelector(".navbar, [data-navbar]");
    // Slot de contenido presente (layout ya ensamblado)
    const slotReady = document.getElementById("content-slot") !== null;
    // Flowbite disponible (al menos función presente)
    const flowbiteAvailable = typeof window.initFlowbite === "function";

    return Boolean(navbar && slotReady && flowbiteAvailable);
  }

  /**
   * Espera hasta que la app esté visualmente estable o hasta un máximo global.
   * @return {void}
   */
  function waitUntilStable() {
    if (!loader) return;

    const elapsed = performance.now() - __SCRIPT_STARTED_AT;

    if (conditionsReady()) {
      // Espera dos frames para evitar parpadeo y oculta con tiempo mínimo
      requestAnimationFrame(() => {
        requestAnimationFrame(hideLoaderWithMinimum);
      });
    } else if (elapsed >= MAX_WAIT_MS) {
      // Cortafuegos: no seguimos esperando más
      hideLoaderWithMinimum();
    } else {
      setTimeout(waitUntilStable, 50);
    }
  }

  if (loader) waitUntilStable();
})();
