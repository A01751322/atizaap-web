/* eslint-env browser */
// functions/static/merchant/redimirQR.js
(function() {
  "use strict";

  // ===== Helpers =====

  /**
   * Obtiene el primer elemento que coincida con el selector.
   * @param {string} sel - Selector CSS.
   * @return {Element|null} Elemento encontrado o null.
   */
  const $ = (sel) => document.querySelector(sel);

  /**
   * Deshabilita un botón, muestra un spinner y devuelve una función
   * para restaurar su estado original.
   * @param {HTMLButtonElement} btn - Botón objetivo.
   * @param {string} [busyText="Procesando..."] - Texto mientras está ocupado.
   * @return {function(): void} Función para restaurar el botón.
   */
  const setBusy = (btn, busyText = "Procesando...") => {
    if (!btn) return () => {};

    const originalHTML = btn.innerHTML;
    const originalDisabled = btn.disabled;

    btn.disabled = true;
    btn.classList.add("opacity-60", "cursor-not-allowed");

    /* spinner corto para evitar líneas largas */
    const spinA =
      "<span class=\"h-4 w-4 mr-2 rounded-full border-2 " +
      "border-white border-t-transparent animate-spin\"></span>";
    const spinWrapStart = "<span class=\"inline-flex items-center\">";
    const spinWrapEnd = "</span>";

    btn.innerHTML = spinWrapStart + spinA + busyText + spinWrapEnd;

    return () => {
      btn.disabled = originalDisabled;
      btn.classList.remove("opacity-60", "cursor-not-allowed");
      btn.innerHTML = originalHTML;
    };
  };

  /**
   * Muestra un mensaje en #response con estilos por tipo.
   * @param {"error"|"success"|"info"} type - Tipo de mensaje.
   * @param {string} message - Texto a mostrar.
   */
  const paintResponse = (type, message) => {
    const box = $("#response");
    if (!box) return;

    const styleMap = {
      error: "border-red-300 bg-red-50 text-red-700",
      success: "border-green-300 bg-green-50 text-green-700",
      info: "border-gray-300 bg-gray-50 text-gray-700",
    };
    const iconMap = {error: "❗️", success: "✅", info: "ℹ️"};

    const style = styleMap[type] || styleMap.info;
    const icon = iconMap[type] || iconMap.info;

    box.className = "mt-4 p-4 border rounded-lg text-sm " + style;

    const p1 = "<p class=\"flex items-center gap-2\">";
    const p2 = "<span class=\"text-lg\">" + icon + "</span> ";
    const p3 = message + "</p>";

    box.innerHTML = p1 + p2 + p3;
    box.classList.remove("hidden");
  };

  /**
   * Extrae únicamente los dígitos de un string.
   * @param {string} [str=""] - Entrada.
   * @return {string} Los dígitos encontrados.
   */
  const onlyDigits = (str = "") => str.replace(/\D+/g, "");

  /**
   * Verifica un número con el algoritmo de Luhn.
   * @param {string} [numStr=""] - Número a validar.
   * @return {boolean} true si pasa Luhn; de lo contrario false.
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

  // ===== Lógica Principal =====

  /**
   * Recupera el id del negocio desde localStorage y avisa si falta.
   * @return {string|null} id del negocio o null.
   */
  function getIdNegocio() {
    const id = localStorage.getItem("id_negocio_logeado");
    if (!id) {
      const msg =
        "Error de autenticación. No se pudo identificar al negocio.";
      // eslint-disable-next-line no-console
      console.error("No se encontró 'id_negocio_logeado'.");
      paintResponse("error", msg);
    }
    return id;
  }

  /**
   * Carga ofertas activas y llena el <select id="oferta-select">.
   * @param {string} idNegocio - Id del negocio.
   * @return {Promise<void>} Promesa de finalización.
   */
  async function loadActiveOffers(idNegocio) {
    const select = $("#oferta-select");
    if (!idNegocio || !select) return;

    const LAMBDA_GET_OFFERS_URL =
      "https://wzsadz6opqjtd6bsc4rcru2pgi0dzyus.lambda-url.us-east-1.on.aws/";
    const url =
      LAMBDA_GET_OFFERS_URL +
      "?action=getActiveOffers&id_negocio=" +
      idNegocio;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + String(res.status));
      const offers = await res.json();

      if (!offers || offers.length === 0) {
        select.innerHTML =
          "<option value=\"\">No tienes ofertas activas</option>";
        select.disabled = true;
        return;
      }

      select.innerHTML =
        "<option value=\"\">-- Selecciona una oferta --</option>";

      offers.forEach((offer) => {
        const opt = document.createElement("option");
        opt.value = offer.id_oferta;
        opt.textContent = offer.titulo;
        select.appendChild(opt);
      });

      select.disabled = false;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error cargando ofertas:", err);
      select.innerHTML =
        "<option value=\"\">Error al cargar ofertas</option>";
      select.disabled = true;
      paintResponse("error", "No se pudieron cargar las ofertas.");
    }
  }

  /**
   * Envía la redención de la oferta usando el número leído del QR.
   * @param {string} idNegocio - Id del negocio.
   * @param {string|number} idOferta - Id de la oferta.
   * @param {string} cardNumberFromQR - Número de tarjeta (del QR).
   * @return {Promise<void>} Promesa de finalización.
   */
  async function submitRedemption(idNegocio, idOferta, cardNumberFromQR) {
    const btn = $("#submitBtn");
    const restore = setBusy(btn, "Redimiendo...");

    const LAMBDA_REDEEM_URL =
      "https://m6yveslq32cdzevmqzvhyyab7u0xskvg.lambda-url.us-east-1.on.aws/";
    const url = LAMBDA_REDEEM_URL + "?action=redeemOffer";

    try {
      const bodyObj = {
        id_oferta: parseInt(idOferta, 10),
        id_negocio: parseInt(idNegocio, 10),
        cardNumber: cardNumberFromQR,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(bodyObj),
      });

      const data = await res.json();
      if (!res.ok) {
        const eMsg = data.message || "Error " + String(res.status);
        throw new Error(eMsg);
      }

      const successMsg =
        data.message || "¡Oferta redimida con éxito!";
      paintResponse("success", successMsg);

      const qrInput = $("#qr-result");
      if (qrInput) qrInput.value = "";

      const offerSelect = $("#oferta-select");
      if (offerSelect) offerSelect.selectedIndex = 0;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error al redimir:", err);
      let msg = "No se pudo completar la redención.";
      if (err && err.message) {
        msg = err.message;
      }
      paintResponse("error", msg);
    } finally {
      restore();
    }
  }

  // ===== Inicialización =====
  document.addEventListener("DOMContentLoaded", () => {
    const loader = $("#loader-overlay");
    if (loader) loader.remove();

    const idNegocio = getIdNegocio();
    if (idNegocio) loadActiveOffers(idNegocio);

    /* Botón Redimir (valor viene del input que llena el escáner QR) */
    const submitBtn = $("#submitBtn");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const offerSelect = $("#oferta-select");
        const qrInput = $("#qr-result");

        const idOferta = offerSelect ? offerSelect.value : "";
        const cardNumber = qrInput ? qrInput.value : "";
        const digits = onlyDigits(cardNumber);

        if (!idNegocio) {
          paintResponse("error", "Error de autenticación.");
          return;
        }
        if (!idOferta) {
          paintResponse("error", "Selecciona una oferta.");
          return;
        }
        if (!cardNumber) {
          paintResponse(
              "error",
              "Escanea o introduce el QR del cliente primero.",
          );
          return;
        }
        if (digits.length !== 16) {
          paintResponse(
              "error",
              "El QR no contiene un número de tarjeta válido (16 dígitos).",
          );
          return;
        }
        if (!luhnCheck(digits)) {
          paintResponse(
              "error",
              "El número de tarjeta del QR no es válido.",
          );
          return;
        }

        submitRedemption(idNegocio, idOferta, cardNumber);
      });
    }

    // Si tienes una función global para iniciar el lector QR,
    // puedes llamarla aquí y pasarle el id del input:
    // if (typeof initQrScanner === "function") {
    //   initQrScanner({ resultInputId: "qr-result" });
    // }
  });
})();
