/* eslint-env browser */
// functions/static/merchant/ajustes.js

(function() {
  "use strict";

  // ===== Helpers =====

  /**
   * Devuelve el primer elemento que coincide con el selector.
   * @param {string} sel - Selector CSS.
   * @return {Element|null} Elemento encontrado o null.
   */
  const $ = (sel) => document.querySelector(sel);

  /**
 * Muestra retroalimentación simple al usuario.
 * @param {string} message - Mensaje a mostrar.
 * @param {"info"|"success"|"error"} [type="info"] - Tipo de mensaje.
 * @return {void}
 */
  const showFeedback = (message, type = "info") => {
  // eslint-disable-next-line no-console
    console.log("[Feedback - " + type + "]: " + message);

    const labelMap = {error: "Error: ", success: "Éxito: ", info: ""};
    const prefix = labelMap[type] || "";

    alert(prefix + message);
  };

  /**
   * Cambia estado de guardado del botón principal.
   * @param {boolean} [isSaving=true] - Si está guardando.
   * @return {void}
   */
  const setSaving = (isSaving = true) => {
    const btn = $("#saveProfileBtn");
    if (!btn) return;

    btn.disabled = isSaving;

    if (isSaving) {
      const spin =
        "<span class=\"inline-flex items-center\">" +
        "<svg class=\"animate-spin -ml-1 mr-2 h-4 w-4 text-white\" " +
        "xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" " +
        "viewBox=\"0 0 24 24\">" +
        "<circle class=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" " +
        "stroke=\"currentColor\" stroke-width=\"4\"></circle>" +
        "<path class=\"opacity-75\" fill=\"currentColor\" " +
        "d=\"M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z\"></path>" +
        "</svg> Guardando...</span>";
      btn.innerHTML = spin;
    } else {
      btn.innerHTML = "Actualizar datos";
    }

    btn.classList.toggle("opacity-50", isSaving);
    btn.classList.toggle("cursor-not-allowed", isSaving);
  };

  /**
   * Coloca el mapa embebido en el iframe según dirección.
   * @param {string} address - Dirección a mostrar.
   * @return {void}
   */
  const setMap = (address) => {
    const iframe = $("#gmap-embed");
    if (!iframe) return;

    if (!address || !String(address).trim()) {
      iframe.src = "";
      // eslint-disable-next-line no-console
      console.warn("Address empty, clearing map.");
      return;
    }

    // Sustituye por tu API key real de Google Maps Embed
    const apiKey = "YOUR_GOOGLE_MAPS_EMBED_API_KEY";
    if (apiKey === "YOUR_GOOGLE_MAPS_EMBED_API_KEY") {
      // eslint-disable-next-line no-console
      console.warn("Google Maps API Key missing in ajustes.js.");
      try {
        iframe.contentWindow.document.body.innerHTML =
          "<div style=\"padding: 2em; text-align: center; color: grey; " +
          "font-family: sans-serif;\">" +
          "Mapa no disponible.<br/>Se requiere configurar API Key.</div>";
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Could not set iframe fallback content.");
      }
      return;
    }

    const baseUrl = "http://googleusercontent.com/maps.google.com/50";
    const url =
      baseUrl +
      "?key=" + apiKey +
      "&q=" + encodeURIComponent(address) +
      "&hl=es&z=16";
    iframe.src = url;
  };

  // ===== Lambda Interaction =====
  const LAMBDA_PROFILE_URL =
    "https://jxsxjt7ujzare3y5jvajn333z40oylno.lambda-url.us-east-1.on.aws/";

  /**
   * Obtiene el id del negocio desde localStorage.
   * @return {string|null} Id o null si no existe.
   */
  function getIdNegocio() {
    const id = localStorage.getItem("id_negocio_logeado");
    if (!id) {
      // eslint-disable-next-line no-console
      console.error("Missing 'id_negocio_logeado'.");
      showFeedback("Error de autenticación.", "error");
    }
    return id;
  }

  /**
   * Carga los datos del perfil desde Lambda.
   * @param {string} idNegocio - Id del negocio.
   * @return {Promise<void>} Promesa de finalización.
   */
  async function loadProfileData(idNegocio) {
    if (!idNegocio) return;

    const url =
      LAMBDA_PROFILE_URL + "?action=getProfile&id_negocio=" + idNegocio;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error " + res.status);

      const elFullName = $("#fullName");
      const elEmail = $("#email");
      const elPhone = $("#phone");
      const elAddressVisible = $("#address-visible");
      const elAddressHidden = $("#address");
      const elDesc = $("#description");

      if (elFullName) elFullName.value = data.fullName || "";
      if (elEmail) elEmail.value = data.email || "";
      if (elPhone) elPhone.value = data.phone || "";
      if (elAddressVisible) elAddressVisible.value = data.address || "";
      if (elAddressHidden) elAddressHidden.value = data.address || "";
      if (elDesc) elDesc.value = data.description || "";

      setMap(data.address);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error loading profile:", err);
      showFeedback(
          "No se pudieron cargar tus datos: " + err.message,
          "error",
      );
    } finally {
      const loader = $("#loader-overlay");
      if (loader) loader.remove();
    }
  }

  /**
   * Envía actualización del perfil.
   * @param {string} idNegocio - Id del negocio.
   * @return {Promise<void>} Promesa de finalización.
   */
  async function saveProfileData(idNegocio) {
    if (!idNegocio) return;

    const url =
      LAMBDA_PROFILE_URL + "?action=updateProfile&id_negocio=" + idNegocio;

    const fullNameEl = $("#fullName");
    const emailEl = $("#email");
    const phoneEl = $("#phone");
    const addressVisibleEl = $("#address-visible");
    const descEl = $("#description");

    const payload = {
      fullName: fullNameEl ? fullNameEl.value.trim() : "",
      email: emailEl ? emailEl.value.trim() : "",
      phone: phoneEl ? phoneEl.value.trim() : "",
      address: addressVisibleEl ? addressVisibleEl.value.trim() : "",
      description: descEl ? descEl.value.trim() : "",
    };

    // Validaciones básicas
    if (
      !payload.fullName ||
      !payload.email ||
      !payload.phone ||
      !payload.address
    ) {
      showFeedback(
          "Completa Nombre, Correo, Teléfono y Dirección.",
          "error",
      );
      return;
    }

    if (!/\S+@\S+\.\S+/.test(payload.email)) {
      showFeedback("Correo inválido.", "error");
      return;
    }

    if (!/^[\d\s+\-()]{7,}$/.test(payload.phone)) {
      showFeedback("Teléfono inválido.", "error");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error " + res.status);

      showFeedback("¡Perfil actualizado!", "success");

      // Refleja dirección y mapa si cambió
      const hidden = $("#address");
      if (hidden && hidden.value !== payload.address) {
        hidden.value = payload.address;
        setMap(payload.address);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error saving profile:", err);
      showFeedback("Error al guardar: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ===== Initialization =====
  document.addEventListener("DOMContentLoaded", () => {
    const idNegocio = getIdNegocio();
    if (idNegocio) {
      loadProfileData(idNegocio);
    } else {
      const loader = $("#loader-overlay");
      if (loader) loader.remove();

      const mainContent = $("#page-content");
      if (mainContent) {
        mainContent.innerHTML =
          "<p class=\"p-4 text-center text-red-600\">" +
          "Error de autenticación. No se pudo cargar el perfil.</p>";
      }
    }

    // Envío de formulario
    const profileForm = $("#profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const currentId = getIdNegocio();
        if (currentId) saveProfileData(currentId);
      });
    }

    // Sincroniza dirección visible -> oculta
    const addressVisibleInput = $("#address-visible");
    const addressHiddenInput = $("#address");
    if (addressVisibleInput) {
      addressVisibleInput.addEventListener("input", () => {
        if (addressHiddenInput) {
          addressHiddenInput.value = addressVisibleInput.value;
        }
      });
    }
  });
})();
