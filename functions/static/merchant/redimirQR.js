/* eslint-env browser */
// functions/static/merchant/redimirQR.js
(function() {
  "use strict";

  // ===== Helpers =====

  /** Query helper
   * @param {string} sel
   * @return {Element|null}
  */
  const $ = (sel) => document.querySelector(sel);

  /** Botón ocupado con spinner
   * @param {HTMLButtonElement} btn
   * @param {string} busyText
   * @return {Function} restore function
  */
  const setBusy = (btn, busyText = "Procesando...") => {
    if (!btn) return () => {};
    const originalHTML = btn.innerHTML;
    const originalDisabled = btn.disabled;

    btn.disabled = true;
    btn.classList.add("opacity-60", "cursor-not-allowed");

    const spin =
      "<span class='h-4 w-4 mr-2 rounded-full border-2 " +
      "border-white border-t-transparent animate-spin'></span>";
    btn.innerHTML =
    `<span class="inline-flex items-center">${spin}${busyText}</span>`;

    return () => {
      btn.disabled = originalDisabled;
      btn.classList.remove("opacity-60", "cursor-not-allowed");
      btn.innerHTML = originalHTML;
    };
  };

  /** Pintar mensajes
   * @param {string} type - 'error' | 'success' | 'info'
   * @param {string} message
  */
  const paintResponse = (type, message) => {
    const box = $("#response");
    if (!box) return;

    const classes = {
      error: "border-red-300 bg-red-50 text-red-700",
      success: "border-green-300 bg-green-50 text-green-700",
      info: "border-gray-300 bg-gray-50 text-gray-700",
    };
    const icons = {error: "❗️", success: "✅", info: "ℹ️"};

    box.className =
    `mt-4 p-4 border rounded-lg text-sm ${classes[type] || classes.info}`;
    box.innerHTML =
    `<p class="flex items-center gap-2"><span class="text-lg">${
      icons[type] || icons.info}</span> ${message}</p>`;
    box.classList.remove("hidden");
  };

  /** Solo dígitos
   * @param {string} str
   * @return {string}
  */
  const onlyDigits = (str = "") => str.replace(/\D+/g, "");

  /** Luhn para 16 dígitos
   * @param {string} numStr
   * @return {boolean}
  */
  function luhnCheck(numStr = "") {
    const s = onlyDigits(numStr);
    if (s.length !== 16) return false;

    let sum = 0;
    let dbl = false;
    for (let i = s.length - 1; i >= 0; i -= 1) {
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

  /** HTTPS / localhost
   * @return {boolean}
  */
  function isSecureContext() {
    return (
      window.isSecureContext ||
      location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1"
    );
  }

  // ===== API helpers =====

  /** Obtener id_negocio_logeado
   * @return {string|null}
  */
  function getIdNegocio() {
    const id = localStorage.getItem("id_negocio_logeado");
    if (!id) {
      // eslint-disable-next-line no-console
      console.error("No se encontró 'id_negocio_logeado'.");
      paintResponse("error",
          "Error de autenticación. No se pudo identificar al negocio.");
    }
    return id;
  }

  /** Cargar ofertas activas
   * @param {*} idNegocio
   * @return {Promise<void>}
   */
  async function loadActiveOffers(idNegocio) {
    const select = $("#oferta-select");
    if (!idNegocio || !select) return;

    const LAMBDA_GET_OFFERS_URL =
      "https://wzsadz6opqjtd6bsc4rcru2pgi0dzyus.lambda-url.us-east-1.on.aws/";
    const url =
    `${LAMBDA_GET_OFFERS_URL}?action=getActiveOffers&id_negocio=${idNegocio}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const offers = await res.json();

      if (!offers || offers.length === 0) {
        select.innerHTML =
        "<option value=''>No tienes ofertas activas</option>";
        select.disabled = true;
        return;
      }

      select.innerHTML =
      "<option value=''>-- Selecciona una oferta --</option>";
      offers.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o.id_oferta;
        opt.textContent = o.titulo;
        select.appendChild(opt);
      });
      select.disabled = false;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error cargando ofertas:", err);
      select.innerHTML =
      "<option value=''>Error al cargar ofertas</option>";
      select.disabled = true;
      paintResponse("error", "No se pudieron cargar las ofertas.");
    }
  }

  /**
   * @param {*} idNegocio
   * @param {*} idOferta
   * @param {*} cardNumberFromQR
   */
  async function submitRedemption(idNegocio, idOferta, cardNumberFromQR) {
    const btn = $("#submitBtn");
    const restore = setBusy(btn, "Redimiendo...");

    const LAMBDA_REDEEM_URL =
      "https://m6yveslq32cdzevmqzvhyyab7u0xskvg.lambda-url.us-east-1.on.aws/";
    const url = `${LAMBDA_REDEEM_URL}?action=redeemOffer`;

    try {
      const body = {
        id_oferta: parseInt(idOferta, 10),
        id_negocio: parseInt(idNegocio, 10),
        cardNumber: cardNumberFromQR,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);

      paintResponse("success", data.message || "¡Oferta redimida con éxito!");
      const qrInput = $("#qr-result");
      if (qrInput) qrInput.value = "";
      const offerSelect = $("#oferta-select");
      if (offerSelect) offerSelect.selectedIndex = 0;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error al redimir:", err);
      paintResponse("error", err?.message ||
        "No se pudo completar la redención.");
    } finally {
      restore();
    }
  }

  // ===== Init =====

  document.addEventListener("DOMContentLoaded", () => {
    // Quita loader
    const loader = $("#loader-overlay");
    if (loader) loader.remove();

    // Ofertas
    const idNegocio = getIdNegocio();
    if (idNegocio) loadActiveOffers(idNegocio);

    // Botón Redimir
    const submitBtn = $("#submitBtn");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const idOferta = $("#oferta-select")?.value || "";
        const cardNumber = $("#qr-result")?.value || "";
        const digits = onlyDigits(cardNumber);

        if (!idNegocio) return paintResponse("error", "Error de autenticación");
        if (!idOferta) return paintResponse("error", "Selecciona una oferta.");
        if (!cardNumber) {
          return paintResponse("error",
              "Escanea o introduce el QR del cliente primero.");
        }
        if (digits.length !== 16) {
          return paintResponse("error", "El QR debe contener 16 dígitos.");
        }
        if (!luhnCheck(digits)) {
          return paintResponse("error",
              "El número de tarjeta del QR no es válido.");
        }

        submitRedemption(idNegocio, idOferta, cardNumber);
      });
    }

    // ===== ZXing / Cámara =====
    const videoEl = document.getElementById("qr-video");
    const videoSelect = document.getElementById("camera-select");
    const startBtn = document.getElementById("start-scan");
    const stopBtn = document.getElementById("stop-scan");
    const hintsEl = document.getElementById("qr-hints");

    let zxingReader = null;
    let scanning = false;

    // Popular cámaras (sin labels hasta dar permiso)
    if (videoSelect && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        devices
            .filter((d) => d.kind === "videoinput")
            .forEach((d, i) => {
              const opt = document.createElement("option");
              opt.value = d.deviceId || "";
              opt.textContent = d.label || `Camera ${i + 1}`;
              videoSelect.appendChild(opt);
            });
      });
    }

    // Rellena labels/ids después de conceder permiso
    const refreshDevices = async () => {
      if (!zxingReader || !videoSelect) return;
      try {
        const devices = await zxingReader.listVideoInputDevices();
        if (!devices?.length) return;
        const prev = videoSelect.value;
        videoSelect.innerHTML = "";
        devices.forEach((d, i) => {
          const opt = document.createElement("option");
          opt.value = d.deviceId || "";
          opt.textContent = d.label || `Camera ${i + 1}`;
          videoSelect.appendChild(opt);
        });
        if (prev && [...videoSelect.options].some((o) => o.value === prev)) {
          videoSelect.value = prev;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("No se pudieron listar cámaras:", err);
      }
    };

    // Cambiar de cámara mientras se escanea
    if (videoSelect && videoEl) {
      videoSelect.addEventListener("change", () => {
        if (!scanning || !zxingReader) return;
        if (typeof zxingReader.reset === "function") zxingReader.reset();
        const deviceId = videoSelect.value || null;
        zxingReader.decodeFromVideoDevice(deviceId, videoEl, onScan);
      });
    }

    // Iniciar / Detener
    const onScan = (res, err) => {
      if (res) {
        const qrInput = $("#qr-result");
        if (qrInput) qrInput.value = res.getText();
        paintResponse("success", "QR leído correctamente.");
        // Si quieres mantener la cámara encendida, comenta la siguiente línea:
        stopScan();
        return;
      }
      const NotFoundEx = window.ZXing && window.ZXing.NotFoundException;
      if (err && !(NotFoundEx && err instanceof NotFoundEx)) {
        // eslint-disable-next-line no-console
        console.error(err);
        if (hintsEl) hintsEl.textContent = err.message || String(err);
      }
    };

    const startScan = async () => {
      if (!isSecureContext()) {
        paintResponse("error",
            "Se requiere HTTPS o localhost para usar la cámara.");
        return;
      }
      // Instancia ZXing si hace falta
      if (!zxingReader && window.ZXing?.BrowserMultiFormatReader) {
        zxingReader = new window.ZXing.BrowserMultiFormatReader();
      }
      if (!zxingReader) {
        paintResponse("error", "No se pudo inicializar el lector QR (ZXing).");
        return;
      }

      scanning = true;
      if (startBtn) startBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;
      if (hintsEl) hintsEl.textContent = "";
      const sel = videoSelect?.value;
      const deviceId = sel ? sel : null;
      // null -> default cam y dispara permiso

      if (typeof zxingReader.reset === "function") zxingReader.reset();
      zxingReader.decodeFromVideoDevice(deviceId, videoEl, onScan);

      // Tras permiso, actualiza labels y opciones reales
      await refreshDevices();
    };

    const stopScan = () => {
      scanning = false;
      if (stopBtn) stopBtn.disabled = true;
      if (startBtn) startBtn.disabled = false;
      if (zxingReader &&
        typeof zxingReader.reset === "function") zxingReader.reset();
    };

    if (startBtn) startBtn.addEventListener("click", startScan);
    if (stopBtn) stopBtn.addEventListener("click", stopScan);
  });
})();
