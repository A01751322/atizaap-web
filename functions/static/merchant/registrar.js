/* eslint-env browser */
// functions/static/merchant/registrar.js
// Lógica de la vista: /views/web-merchant/registrar.html
// - Formatea el número de tarjeta como xxxx-xxxx-xxxx-xxxx
// - Valida (incluye Luhn) y envía al backend
// - Maneja estados de UI (loader, éxito, error)

// ====== Helpers de UI ======
/** @param {string} sel - Selector CSS.
 * @return {Element|null}
  */
const $ = (sel) => document.querySelector(sel);

/**
 * Muestra/oculta un overlay de carga.
 * @param {boolean} [on=true] - Si true, muestra; si false, oculta.
 * @return {void}
 */
function showLoader(on = true) {
  const overlay = $("#loader-overlay");
  if (!overlay) return;
  overlay.style.display = on ? "flex" : "none";
}

/**
 * Deshabilita un botón, pinta spinner y devuelve una función para restaurar.
 * @param {HTMLElement|null} btn - Botón objetivo.
 * @param {string} [busyText] - Texto temporal (default: "Procesando...").
 * @return {function(): void} Función para restaurar el estado original.
 */
function setBusy(btn, busyText = "Procesando...") {
  if (!btn) return () => {};
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add("opacity-60", "cursor-not-allowed");
  btn.innerHTML = `
    <span class="inline-flex items-center gap-2">
      <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" 
        stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      ${busyText}
    </span>`;
  return () => {
    btn.disabled = false;
    btn.classList.remove("opacity-60", "cursor-not-allowed");
    btn.innerHTML = original;
  };
}

/** Íconos cortos para no romper max-len */
const ICON_ERROR = [
  "<svg class=\"h-5 w-5\" viewBox=\"0 0 20 20\" fill=\"currentColor\">",
  "<path fill-rule=\"evenodd\" d=\"M10 18a8 8 0 100-16 8 8 0 000 16Z\"/>",
  "<path d=\"M9 6h2v6H9V6Zm0 8h2v2H9v-2Z\" clip-rule=\"evenodd\"/>",
  "</svg>",
].join("");

const ICON_SUCCESS = [
  "<svg class=\"h-5 w-5\" viewBox=\"0 0 20 20\" fill=\"currentColor\">",
  "<path d=\"M16.707 5.293a1 1 0 00-1.414 0L8 12.586 \">",
  "4.707 9.293A1 1 0 003.293 10.707l4 4a1 1 0 001.414 0 ",
  "l8-8a1 1 0 000-1.414z\"/>",
  "</svg>",
].join("");

/**
 * Pinta la caja de respuesta con estilo de éxito o error.
 * @param {"error"|"success"} type - Tipo de mensaje.
 * @param {string} message - Mensaje a mostrar.
 * @return {void}
 */
function paintResponse(type, message) {
  const box = $("#response");
  if (!box) return;
  box.classList.remove("hidden", "border-gray-300", "bg-gray-50",
      "border-red-300", "bg-red-50", "border-green-300", "bg-green-50");
  if (type === "error") {
    box.classList.add("border-red-300", "bg-red-50");
  } else {
    box.classList.add("border-green-300", "bg-green-50");
  }
  box.innerHTML = `
    <div class="flex items-start gap-2">
      <span class="mt-0.5">
        ${type === "error" ? ICON_ERROR : ICON_SUCCESS}
      </span>
      <p class="text-sm text-gray-800">${message}</p>
    </div>`;
}

/**
 * Extrae solo dígitos de una cadena.
 * @param {string} str
 * @return {string}
 */
function onlyDigits(str) {
  return (str || "").replace(/\D+/g, "");
}

/**
 * Formatea una cadena a patrón de tarjeta 16 dígitos: xxxx-xxxx-xxxx-xxxx
 * @param {string} value
 * @return {string}
 */
function formatCard16(value) {
  const digits = onlyDigits(value).slice(0, 16);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join("-"); // xxxx-xxxx-xxxx-xxxx
}

/**
 * Valida número de 16 dígitos con algoritmo de Luhn.
 * @param {string} numStr
 * @return {boolean}
 */
function luhnCheck(numStr) {
  const s = onlyDigits(numStr);
  if (s.length !== 16) return false;
  let sum = 0;
  let dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = parseInt(s[i], 10);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

// ====== Envío al backend ======
// Ajusta este endpoint a tu Express en functions/index.js
// Recomendado: POST /api/merchant/register-card

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} [ok]
 * @property {string} [message]
 * @property {any} [data]
 * @property {string} [error]
 */
const REGISTER_ENDPOINT = "/api/merchant/register-card";

/**
 * Envía el registro de tarjeta al backend.
 * @param {string} cardNumber - Número de tarjeta (puede venir formateado).
 * @return {Promise<ApiResponse>}
 */
async function sendRegistration(cardNumber) {
  const payload = {
    cardNumber: onlyDigits(cardNumber),
    method: "manual",
    at: new Date().toISOString(),
  };

  const res = await fetch(REGISTER_ENDPOINT, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });

  // Espera {ok: boolean, message?: string, data?: any} o un 4xx/5xx con {error}
  let body = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch (e) {
    // La respuesta no es JSON; dejamos body como null
    void e; // evita warning de no-unused-vars si tu ESLint lo tiene activo
    body = null;
  }

  if (!res.ok) {
    const msg =
    (body && (body.error || body.message)) || `Error HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body || {ok: true, message: "Registrado."};
}

// ====== Wireup ======
document.addEventListener("DOMContentLoaded", /** @return {void} */ () => {
  // Oculta loader cuando todo pintó
  window.requestAnimationFrame(() => showLoader(false));

  const input = $("#chat"); // textarea del número
  const btnCancel = $("#generateBtn"); // en el HTML está rotulado "Cancelar"
  const btnSubmit = $("#submitBtn");

  // Seguridad: si el label tiene for="businessName" y el input es id="chat",
  // la accesibilidad no asocia la etiqueta.
  // Idealmente cambia el 'for' a "chat" en el HTML.

  // Formateo en vivo
  if (input) {
    input.addEventListener("input", /** @param {InputEvent} e */ (e) => {
      const pos = input.selectionStart;
      const before = input.value;
      input.value = formatCard16(before);
      // intenta mantener el cursor
      const delta = input.value.length - before.length;
      input.setSelectionRange(Math.max(0, pos + delta),
          Math.max(0, pos + delta));
    });

    input.addEventListener("paste", /** @param {ClipboardEvent} e */ (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData("text");
      input.value = formatCard16(paste);
    });
  }

  // Cancelar = limpiar campos y resetear UI
  if (btnCancel) {
    btnCancel.addEventListener("click", /** @param {MouseEvent} _e */ (_e) => {
      if (input) input.value = "";
      const qrcode = $("#qrcode");
      if (qrcode) qrcode.classList.add("hidden");
      const resp = $("#response");
      if (resp) {
        resp.classList.add("hidden");
        resp.innerHTML = "";
      }
      if (input) input.focus();
    });
  }

  // Enviar registro
  if (btnSubmit) {
    btnSubmit.addEventListener("click", async () => {
      const number = input ? input.value.trim() : "";
      const raw = onlyDigits(number);

      // Validaciones rápidas
      if (!raw || raw.length !== 16) {
        paintResponse("error", "El número debe tener 16 dígitos.");
        if (input) input.focus();
        return;
      }
      // Si tu numeración interna NO usa Luhn,
      // puedes desactivar esta verificación:
      if (!luhnCheck(number)) {
        paintResponse("error", "El número no pasa la validación. Verifícalo.");
        if (input) input.focus();
        return;
      }

      const restore = setBusy(btnSubmit, "Registrando...");
      try {
        const result = await sendRegistration(number);
        paintResponse("success",
            (result && result.message) || "Tarjeta registrada correctamente.");
        // Opcional: limpiar tras éxito
        input.value = "";
      } catch (err) {
        const msg = (err && err.message) || "No se pudo registrar. Reintenta.";
        paintResponse("error", msg);
      } finally {
        restore();
      }
    });
  }
});
