/* eslint-env browser */

// /functions/static/home.js
// Script para buscador + filtros del catálogo (sin inline scripts)

(() => {
  "use strict";

  /**
   * Ejecuta una función cuando el DOM está listo.
   * @param {function(): void} fn - Callback a ejecutar.
   * @return {void}
   */
  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, {once: true});
    } else {
      fn();
    }
  };

  onReady(() => {
    const searchInput = document.getElementById("search");
    const cards = Array.from(
        document.querySelectorAll("#cards .card"),
    );
    const pills = document.getElementById("pills");
    let activeFilter = "all";

    /**
     * Aplica filtros de texto y categoría sobre las tarjetas.
     * @return {void}
     */
    const applyFilters = () => {
      const q = (searchInput && searchInput.value ? searchInput.value : "")
          .toLowerCase()
          .trim();

      cards.forEach((card) => {
        const title = (card.dataset.title || "").toLowerCase();
        const cat = card.dataset.category || "";
        const matchesText = !q || title.includes(q);
        const matchesCat = activeFilter === "all" || activeFilter === cat;
        card.style.display = matchesText && matchesCat ? "" : "none";
      });
    };

    // Buscar por texto
    if (searchInput) {
      const handleInput = () => applyFilters();
      searchInput.addEventListener("input", handleInput);
    }

    /**
     * Aplica estilos activos/inactivos a los pills.
     * @param {HTMLButtonElement} btn
     * @param {boolean} isActive
     */
    const setPillActiveStyles = (btn, isActive) => {
      const base = [
        "px-3",
        "py-1",
        "rounded-full",
        "text-sm",
        "font-medium",
      ];
      const active = ["bg-bjviolet-600", "text-white"];
      const inactive = ["bg-white", "ring-1", "ring-gray-200"];

      btn.classList.remove(...base, ...active, ...inactive);
      btn.classList.add(...base, ...(isActive ? active : inactive));
    };

    // Click en pills de categoría
    if (pills) {
      const handlePillsClick = (e) => {
        const btn = e.target.closest("button[data-pill]");
        if (!btn) return;

        activeFilter = btn.dataset.pill;

        pills.querySelectorAll("button").forEach((b) => {
          setPillActiveStyles(b, b === btn);
        });

        applyFilters();
      };

      pills.addEventListener("click", handlePillsClick);
    }

    // Accesos desde la grilla de categorías (iconos con data-filter)
    document.querySelectorAll("[data-filter]").forEach((el) => {
      const handleClick = () => {
        const value = el.dataset.filter;
        if (!value) return;

        activeFilter = value;

        if (pills) {
          const target = pills.querySelector(
              `button[data-pill="${value}"]`,
          );
          if (target) {
            pills.querySelectorAll("button").forEach((b) => {
              setPillActiveStyles(b, b === target);
            });
          }
        }

        // Aplicar filtros tras el siguiente tick
        setTimeout(applyFilters, 0);
      };

      el.addEventListener("click", handleClick);
    });

    /**
     * Configura envío del formulario "Solicita tu tarjeta".
     * Envía POST a /api/solicitudes-negocios con x-www-form-urlencoded.
     * Reutiliza la Cloud Function de solicitudesNegocios mapeando campos
     * (CP -> ubicacion).
     * @return {void}
     */
    const setupSolicitaForm = () => {
      const form = document.querySelector("#solicita form");
      if (!form) return;

      const q = (sel) => form.querySelector(sel);
      const inNombre = q("input[placeholder=\"Tu nombre\"]");
      const inCorreo = q("input[type=\"email\"]");
      const inTel = q("input[type=\"tel\"]");
      const inCp = q("input[placeholder=\"00000\"]");
      const inMensaje = q("textarea");
      const btn = q("button[type=\"button\"]");

      if (!btn) return;

      /**
       * Muestra un mensaje de estado debajo del botón.
       * @param {string} msg
       * @param {boolean} ok
       * @return {void}
       */
      const showStatus = (msg, ok) => {
        let el = form.querySelector("[data-status=\"solicita\"]");
        if (!el) {
          el = document.createElement("p");
          el.setAttribute("data-status", "solicita");
          el.className = "mt-3 text-sm";
          btn.parentElement.appendChild(el);
        }
        el.textContent = msg;
        el.className =
          "mt-3 text-sm " + (ok ? "text-green-600" : "text-red-600");
      };

      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailOk = (v) => EMAIL_RE.test(String(v || "").trim());

      /**
       * Maneja el submit del formulario.
       * @return {Promise<void>}
       */
      const handleSubmit = async () => {
        const nombre = (inNombre && inNombre.value || "").trim();
        const correo = (inCorreo && inCorreo.value || "").trim();
        const telefono = (inTel && inTel.value || "").trim();
        const cp = (inCp && inCp.value || "").trim();
        const mensaje = (inMensaje && inMensaje.value || "").trim();

        if (!nombre) {
          showStatus("Escribe tu nombre.", false);
          return;
        }
        if (!emailOk(correo)) {
          showStatus("Escribe un correo válido.", false);
          return;
        }

        // Mapeo a la función solicitudesNegocios
        const payload = {
          nombre_negocio: `Solicitud Tarjeta - ${nombre}`,
          representante: nombre,
          email: correo,
          telefono,
          tipo_negocio: "solicita_tarjeta",
          ubicacion: cp,
          descripcion: mensaje || "Solicitud de tarjeta desde landing.",
          beneficio: "Solicitud de tarjeta",
        };

        const url = "/api/solicitudes-negocios";
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Enviando…";

        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: new URLSearchParams(payload).toString(),
          });

          if (!resp.ok) {
            const t = await resp.text();
            throw new Error(t || "Fallo al enviar.");
          }

          showStatus("¡Enviado! Te contactaremos pronto.", true);
          form.reset();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          showStatus("Error al enviar. Intenta de nuevo.", false);
        } finally {
          btn.disabled = false;
          btn.textContent = original;
        }
      };

      btn.addEventListener("click", handleSubmit);
    };

    // Inicializa formulario de solicitud
    setupSolicitaForm();

    // Filtro inicial
    applyFilters();
  });
})();
