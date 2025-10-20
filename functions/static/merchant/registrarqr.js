/* eslint-env browser */
/* global ZXing */
// functions/static/merchant/registrarqr.js
// Vista: /views/web-merchant/registrarqr.html
// - Escanea QR (cámara o imagen) para obtener los 16 dígitos
// - Valida (16 dígitos + Luhn) y registra en backend con method: "qr"

// ===== Helpers =====
/** Íconos en líneas cortas para cumplir max-len y comillas dobles */
const ICON_ERROR_QR = [
  "<svg class=\"h-5 w-5\" viewBox=\"0 0 20 20\" fill=\"currentColor\">",
  "<path fill-rule=\"evenodd\" d=\"M10 18a8 8 0 100-16 8 8 0 000 16Z\"/>",
  "<path d=\"M9 6h2v6H9V6Zm0 8h2v2H9v-2Z\" clip-rule=\"evenodd\"/>",
  "</svg>",
].join("");

const ICON_SUCCESS_QR = [
  "<svg class=\"h-5 w-5\" viewBox=\"0 0 20 20\" fill=\"currentColor\">",
  "<path d=\"M16.707 5.293a1 1 0 00-1.414 0L8 12.586 \">",
  "4.707 9.293A1 1 0 003.293 10.707l4 4a1 1 0 001.414 0 ",
  "l8-8a1 1 0 000-1.414z\"/>",
  "</svg>",
].join("");

/** @param {"error"|"success"} type
 *  @param {string} message
 *  @return {void} */
function paintResponse(type, message) {
  const box = $("#response");
  if (!box) return;
  box.classList.remove("hidden", "border-gray-300", "bg-gray-50",
      "border-red-300", "bg-red-50", "border-green-300", "bg-green-50");
  if (type === "error") box.classList.add("border-red-300", "bg-red-50");
  else box.classList.add("border-green-300", "bg-green-50");
  box.innerHTML = [
    "<div class=\"flex items-start gap-2\">",
    "  <span class=\"mt-0.5\">",
    type === "error" ? ICON_ERROR_QR : ICON_SUCCESS_QR,
    "  </span>",
    "  <p class=\"text-sm text-gray-800\">" + message + "</p>",
    "</div>",
  ].join("");
}

/** @param {string} sel - Selector CSS.
 *  @return {Element|null} */
const $ = (sel) => document.querySelector(sel);

/** @param {string} str
 *  @return {string} */
function onlyDigits(str) {
  return (str || "").replace(/\D+/g, "");
}

/** @param {string} value
 *  @return {string} */
function formatCard16(value) {
  const digits = onlyDigits(value).slice(0, 16);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) parts.push(digits.slice(i, i + 4));
  return parts.join("-");
}

/** @param {string} numStr
 *  @return {boolean} */
function luhnCheck(numStr) {
  const s = onlyDigits(numStr);
  if (s.length !== 16) return false;
  let sum = 0;
  let dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = parseInt(s[i], 10);
    if (dbl) {
      n *= 2; if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

// ===== Backend =====
/**
 * @typedef {Object} ApiResponse
 * @property {boolean=} ok
 * @property {string=} message
 * @property {any=} data
 * @property {string=} error
 */
const REGISTER_ENDPOINT = "/api/merchant/register-card";

/** @param {string} cardNumber
 *  @return {Promise<ApiResponse>} */
async function sendRegistration(cardNumber) {
  const payload = {
    cardNumber: onlyDigits(cardNumber),
    method: "qr",
    at: new Date().toISOString(),
  };

  const res = await fetch(REGISTER_ENDPOINT, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });

  let body = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch (e) {
    // No es JSON
    void e;
    body = null;
  }

  if (!res.ok) {
    const msg =
    (body && (body.error || body.message)) || ("Error HTTP " + res.status);
    const err = new Error(msg);
    // @ts-ignore
    err.status = res.status;
    throw err;
  }
  return body || {ok: true, message: "Registrado."};
}

// ===== QR logic =====
/** @return {Promise<void>} */
async function initQr() {
  const video = /** @type {HTMLVideoElement|null} */ ($("#qr-video"));
  const sel = /** @type {HTMLSelectElement|null} */ ($("#camera-select"));
  const startBtn = /** @type {HTMLButtonElement|null} */ ($("#start-scan"));
  const stopBtn = /** @type {HTMLButtonElement|null} */ ($("#stop-scan"));
  const fileInput = /** @type {HTMLInputElement|null} */ ($("#qr-file"));
  const out = /** @type {HTMLInputElement|null} */ ($("#qr-result"));
  const submitBtn = /** @type {HTMLButtonElement|null} */ ($("#submitBtn"));

  if (!video || !sel || !startBtn || !stopBtn || !fileInput || !out) {
    paintResponse("error", "Faltan elementos del QR en el HTML.");
    return;
  }

  const reader = new ZXing.BrowserQRCodeReader();
  let currentDeviceId = null;
  let scanning = false; // flag para saber si está escaneando
  let locked = false; // evita doble envío

  // Lista cámaras
  const devices = await reader.listVideoInputDevices();
  sel.innerHTML = "";
  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];
    const opt = document.createElement("option");
    opt.value = d.deviceId || "";
    opt.textContent = d.label || ("Cámara " + (i + 1));
    sel.appendChild(opt);
  }
  if (devices[0]) currentDeviceId = devices[0].deviceId || null;

  sel.addEventListener("change", () => {
    currentDeviceId = sel.value || null;
  });

  /**
   * Callback de ZXing para frames de video.
   * @param {ZXing.Result|null} result
   * @param {*} err
   * @return {void}
   */
  const onVideoResult = (result, err) => {
    if (err || !result || locked) return;
    const text =
      (result.getText && result.getText()) || result.text || String(result);
    const digits = onlyDigits(text);
    out.value = formatCard16(digits);

    if (digits.length === 16 && luhnCheck(digits)) {
      locked = true;
      reader.reset();
      scanning = false;
      stopBtn.disabled = true;
      startBtn.disabled = false;

      sendRegistration(digits)
          .then((resp) => {
            const msg =
            (resp && resp.message) || "Tarjeta registrada correctamente.";
            paintResponse("success", msg);
          })
          .catch((e2) => {
            const msg = (e2 && e2.message) || "No se pudo registrar.";
            paintResponse("error", msg);
          });
    }
  };

  // Start
  startBtn.addEventListener("click", () => {
    if (!currentDeviceId || scanning) return;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    locked = false;
    scanning = true;

    reader.decodeFromVideoDevice(
        currentDeviceId,
        video,
        onVideoResult,
    );
  });

  // Stop
  stopBtn.addEventListener("click", () => {
    reader.reset();
    scanning = false;
    stopBtn.disabled = true;
    startBtn.disabled = false;
  });

  // Archivo (imagen)
  fileInput.addEventListener("change", () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = function() {
      const url = String(fr.result || "");
      (new ZXing.BrowserQRCodeReader())
          .decodeFromImageUrl(url)
          .then((res) => {
            const text =
          (res && (res.text || (res.getText && res.getText()))) || "";
            const digits = onlyDigits(String(text));
            out.value = formatCard16(digits);
            if (digits.length === 16 && luhnCheck(digits)) {
              paintResponse("success", "Código válido. Listo para registrar.");
            } else {
              paintResponse("error", "El QR no contiene un número válido.");
            }
          })
          .catch(() => {
            paintResponse("error", "No se pudo leer el QR de la imagen.");
          });
    };
    fr.readAsDataURL(f);
  });

  // Registrar manualmente (si no quieres auto-registro)
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      const digits = onlyDigits(out.value || "");
      if (digits.length !== 16) {
        paintResponse("error", "El número debe tener 16 dígitos.");
        out.focus();
        return;
      }
      if (!luhnCheck(digits)) {
        paintResponse("error", "El número no pasa la validación. Verifícalo.");
        out.focus();
        return;
      }
      sendRegistration(digits)
          .then((resp) => {
            const msg =
          (resp && resp.message) || "Tarjeta registrada correctamente.";
            paintResponse("success", msg);
            out.value = "";
          })
          .catch((e2) => {
            const msg =
            (e2 && e2.message) || "No se pudo registrar. Reintenta.";
            paintResponse("error", msg);
          });
    });
  }
}

// ===== Boot =====
document.addEventListener("DOMContentLoaded", () => {
  // Oculta loader si existe
  const lo = document.getElementById("loader-overlay");
  if (lo) lo.style.display = "none";
  // Inicializa QR
  initQr();
});
