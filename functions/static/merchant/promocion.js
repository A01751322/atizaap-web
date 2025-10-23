/* eslint-env browser, es2021 */
/* global Modal, Dropdown */
// /functions/static/merchant/promocion.js

(function() {
  "use strict";

  // ===== Helpers =====
  const $ = (sel) => document.querySelector(sel);
  // const $$ = (sel) => document.querySelectorAll(sel);

  const showFeedback = (message, type = "info") => {
    // eslint-disable-next-line no-console
    console.log(`[Promo Feedback - ${type}]: ${message}`);
    const prefix = type === "error" ? "Error: " : type === "success" ?
      "Éxito: " : "";
    alert(prefix + message); // Simple alert
  };

  const setBusy = (btn, busyText = "Procesando...") => {
    if (!btn) return () => { };
    const originalHTML = btn.innerHTML;
    const originalDisabled = btn.disabled;
    btn.disabled = true;
    btn.classList.add("opacity-60", "cursor-not-allowed");
    const spinnerSVG = "<svg class=\"animate-spin -ml-1 mr-2 h-4 w-4 text-white\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\"><circle class=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"4\"></circle><path class=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z\"></path></svg>";
    const isDarkText = btn.classList.contains("text-gray-900") ||
      !btn.classList.contains("text-white");
    const spinnerColor = isDarkText ? "text-gray-700" : "text-white";
    btn.innerHTML =
      `<span class="inline-flex items-center">` +
      `${spinnerSVG.replace("text-white", spinnerColor)} ${busyText}</span>`;
    return () => {
      btn.disabled = originalDisabled;
      btn.classList.remove("opacity-60", "cursor-not-allowed");
      btn.innerHTML = originalHTML;
    };
  };

  // Formats YYYY-MM-DD or full date string for display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      // Assumes YYYY-MM-DD from Lambda,
      // create date as UTC to avoid timezone shifts
      const parts = dateString.split("-");
      if (parts.length === 3) {
        const date = new Date(Date.UTC(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10),
        ));
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("es-MX", {
            year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
          });
        }
      }
      // Fallback for potentially different date formats
      const fallbackDate = new Date(dateString);
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate.toLocaleDateString("es-MX", {
          year: "numeric", month: "short", day: "numeric",
        });
      }
      return dateString; // Return original if parsing fails
    } catch (e) {
      return dateString; // Return original on error
    }
  };

  /** Generates HTML for the status badge/dropdown
   * @param {string} status
   * @param {string|number} offerId
   * @return {string} HTML string for status badge with dropdown
  */
  function statusBadgeHTML(status, offerId) {
    const isActive = Number(status) === 1;
    const btnClasses = isActive ?
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" :
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    const dotClasses = isActive ? "bg-green-500" : "bg-yellow-500";
    const uniqueId = `promo-${offerId}`; // Unique ID prefix for this row

    // eslint-disable-next-line max-len
    return `
    <div class="relative inline-block" data-status-container
         data-offer-id="${offerId}">
        <button type="button" id="status-btn-${uniqueId}"
                data-status-btn data-dropdown-toggle="status-dd-${uniqueId}"
                class="inline-flex items-center gap-1 rounded-full text-xs
                       font-medium px-2.5 py-0.5 ${btnClasses}">
        <span class="w-2 h-2 rounded-full ${dotClasses}" data-status-dot></span>
            <span data-status-text>${isActive ? "Activa" : "Inactiva"}</span>
            <svg class="ms-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10
            10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0
            1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/>
            </svg>
        </button>
        <div id="status-dd-${uniqueId}" class="z-20 hidden bg-white divide-y
             divide-gray-100 rounded-lg shadow w-28 dark:bg-gray-700">
            <ul class="py-1 text-sm text-gray-700 dark:text-gray-200">
                <li><button type="button" class="block w-full text-left px-4
                     py-2 hover:bg-gray-100 dark:hover:bg-gray-600
                     dark:hover:text-white" data-set-status="Activa"
                     data-offer-id="${offerId}">Activa</button></li>
                <li><button type="button" class="block w-full text-left px-4
                     py-2 hover:bg-gray-100 dark:hover:bg-gray-600
                     dark:hover:text-white" data-set-status="Inactiva"
                     data-offer-id="${offerId}">Inactiva</button></li>
            </ul>
        </div>
    </div>`;
  }

  // ===== DOM Elements =====
  const tbody = $("#promo-tbody");
  const loaderOverlay = $("#loader-overlay");
  const addFormEl = $("#add-promo-form");
  const addModalEl = $("#addPromoPanel");
  const editFormEl = $("#edit-promo-form");
  const editModalEl = $("#editPromoPanel");

  // ===== State =====
  let promotionsCache = [];

  // ===== Lambda Interaction =====
  const LAMBDA_PROMO_URL = "https://7sjasfzqwrtxf3o4dm7yfodvy40knhwg.lambda-url.us-east-1.on.aws/"; // YOUR LAMBDA URL

  /** Gets id_negocio from localStorage
   * @return {string|null} id_negocio or null if missing
  */
  function getIdNegocio() {
    const id = localStorage.getItem("id_negocio_logeado");
    if (!id) {
      console.error("Missing 'id_negocio_logeado'.");
      showFeedback("Error de autenticación.", "error");
    }
    return id;
  }

  /** Renders the promotions list in the table
   * @param {Array} list - List of promotions to render
  */
  function renderTable(list = []) {
    if (!tbody) return;
    tbody.innerHTML = ""; // Clear

    if (!list || list.length === 0) {
      tbody.innerHTML =
        "<tr><td colspan=\"8\" class=\"text-center p-6 text-gray-500 " +
        " dark:text-gray-400\">No tienes promociones creadas.</td></tr>";
      return;
    }

    list.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.className = "bg-white border-b dark:bg-gray-800 dark:border-gray-700" +
        " hover:bg-gray-50 dark:hover:bg-gray-600";
      // Store data on the row for editing
      tr.dataset.promoId = p.id;
      tr.dataset.titulo = p.titulo || "";
      tr.dataset.descripcion = p.descripcion || "";
      tr.dataset.precio = p.precio || "0.00";
      tr.dataset.fechaInicio = p.fecha_inicio || "";
      tr.dataset.fechaFin = p.fecha_fin || "";
      tr.dataset.estado = p.estado || "Activa";

      const shortDesc = (p.descripcion || "").substring(0, 50) +
        ((p.descripcion || "").length > 50 ? "..." : "");

      tr.innerHTML = `
          <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap
               dark:text-white">${String(i + 1).padStart(2, "0")}</td>
          <td class="px-6 py-3 font-medium text-gray-900 dark:text-white">
               ${p.titulo || "-"}</td>
          <td class="px-6 py-3 text-xs text-gray-500 dark:text-gray-400"
               title="${p.descripcion || ""}">${shortDesc || "-"}</td>
          <td class="px-6 py-3 whitespace-nowrap">$${p.precio || "0.00"}</td>
          <td class="px-6 py-3 whitespace-nowrap">
               ${formatDate(p.fecha_inicio)}</td>
          <td class="px-6 py-3 whitespace-nowrap">
               ${formatDate(p.fecha_fin)}</td>
          <td class="px-6 py-3">${statusBadgeHTML(p.estado, p.id)}</td>
          <td class="px-6 py-3 text-right whitespace-nowrap">
              <button type="button" data-action="edit" data-promo-id="${p.id}"
                      class="inline-flex items-center p-1.5 rounded text-sm
                             font-medium text-center text-gray-500
                             hover:text-gray-800 focus:ring-2
                             focus:outline-none focus:ring-gray-300
                             dark:text-gray-400 dark:hover:text-white
                             dark:focus:ring-gray-500 hover:bg-gray-100
                             dark:hover:bg-gray-700"
                      title="Editar">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7
                10.172V13h2.828l7.586-7.586a2 2 0000-2.828z"</path>
                <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010
                 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                  clip-rule="evenodd"></path></svg>
              </button>
              <button type="button" data-action="delete" data-promo-id="${p.id}"
                      class="inline-flex items-center p-1.5 rounded text-sm
                             font-medium text-center text-gray-500
                             hover:text-gray-800 focus:ring-2
                             focus:outline-none focus:ring-gray-300
                             dark:text-gray-400 dark:hover:text-white
                             dark:focus:ring-gray-500 hover:bg-gray-100
                             dark:hover:bg-gray-700 ms-1"
                      title="Borrar">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382
                   4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0
                    100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1
                     1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0
                      00-1-1z" clip-rule="evenodd"></path></svg>
              </button>
          </td>
      `;
      tbody.appendChild(tr);
    });
    // Reinitialize Flowbite for dropdowns in table
    if (typeof window.initFlowbite === "function") window.initFlowbite();
  }

  /** Fetches promotions
   * @param {string} idNegocio
  */
  async function fetchAndRenderPromotions(idNegocio) {
    if (!tbody) return;
    tbody.innerHTML =
      "<tr><td colspan=\"8\" class=\"text-center p-6 text-gray-500" +
      " dark:text-gray-400\">Cargando...</td></tr>";

    const url =
      `${LAMBDA_PROMO_URL}?action=listPromotions&id_negocio=${idNegocio}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      promotionsCache = Array.isArray(data) ? data : [];
      renderTable(promotionsCache);
    } catch (err) {
      console.error("Error fetching promotions:", err);
      if (tbody) {
        tbody.innerHTML =
          "<tr><td colspan=\"8\" class=\"text-center p-6 text-red-600 " +
          "dark:text-red-400\">Error: " + err.message + "</td></tr>";
      }
    } finally {
      if (loaderOverlay) loaderOverlay.remove(); // Hide loader after fetch
    }
  }

  /** Adds a new promotion
   * @param {string} idNegocio
   * @param {FormData} formData
  */
  async function addPromotion(idNegocio, formData) {
    const url =
      `${LAMBDA_PROMO_URL}?action=addPromotion&id_negocio=${idNegocio}`;
    const payload = Object.fromEntries(formData.entries());
    // Convert empty fecha_fin to null before sending if
    // needed by backend, Lambda handles it now
    // if (!payload.fecha_fin) payload.fecha_fin = null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      showFeedback(data.message || "Promoción agregada.", "success");
      return true;
    } catch (err) {
      showFeedback(`Error al agregar: ${err.message}`, "error");
      return false;
    }
  }

  /** Updates an existing promotion
   * @param {string} idNegocio
   * @param {string} idOferta
   * @param {FormData} formData
  */
  async function updatePromotion(idNegocio, idOferta, formData) {
    const url =
      `${LAMBDA_PROMO_URL}?action=updatePromotion&id_negocio=${idNegocio}` +
      `&id_oferta=${idOferta}`;
    const payload = Object.fromEntries(formData.entries());
    // if (!payload.fecha_fin) payload.fecha_fin = null;
    // Lambda handles empty string
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      showFeedback(data.message || "Promoción actualizada.", "success");
      return true;
    } catch (err) {
      showFeedback(`Error al actualizar: ${err.message}`, "error");
      return false;
    }
  }

  /** Updates only the status of a promotion
   * @param {string} idNegocio
   * @param {string} idOferta
   * @param {string} newStatus
  */
  async function updatePromotionStatus(idNegocio, idOferta, newStatus) {
    // We need to fetch the existing data first, then send the full update
    const promoData =
      promotionsCache.find((p) => String(p.id) === String(idOferta));
    if (!promoData) {
      showFeedback(
          "Error: No se encontraron datos locales para actualizar estado.",
          "error",
      );
      return false;
    }
    // Create payload with existing data + new status
    const payload = {
      titulo: promoData.titulo,
      descripcion: promoData.descripcion,
      precio: promoData.precio,
      fecha_inicio: promoData.fecha_inicio, // Already in YYYY-MM-DD
      fecha_fin: promoData.fecha_fin, // Already in YYYY-MM-DD or empty
      estado: newStatus, // The only change
    };
    const url =
      `${LAMBDA_PROMO_URL}?action=updatePromotion&id_negocio=${idNegocio}` +
      `&id_oferta=${idOferta}`;
    try {
      const res = await fetch(url, {
        method: "POST", headers: {
          "Content-Type": "application/json",
        }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      showFeedback(`Estado actualizado a ${newStatus}.`, "success");
      return true;
    } catch (err) {
      showFeedback(`Error al cambiar estado: ${err.message}`, "error");
      return false;
    }
  }


  /** Deletes a promotion
   * @param {string} idNegocio
   * @param {string} idOferta
   * @return {Promise<boolean>} true if deleted, false otherwise
  */
  async function deletePromotion(idNegocio, idOferta) {
    const url =
      `${LAMBDA_PROMO_URL}?action=deletePromotion&id_negocio=${idNegocio}` +
      `&id_oferta=${idOferta}`;
    try {
      const res = await fetch(url, {method: "POST"}); // Body is empty
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      showFeedback(data.message || "Promoción eliminada.", "success");
      return true;
    } catch (err) {
      showFeedback(`Error al eliminar: ${err.message}`, "error");
      return false;
    }
  }

  // ===== Modal Handling =====
  /** Gets or creates a Flowbite Modal instance
   * @param {HTMLElement} modalElement
   * @return {Modal|null} Modal instance or null
   */
  function getModalInstance(modalElement) {
    if (!modalElement) return null;
    if (typeof Modal !== "undefined") {
      return Modal.getInstance(modalElement) ||
        new Modal(modalElement, {closable: true, backdrop: "static"});
    } else {
      console.warn("Flowbite Modal JS missing."); return null;
    }
  }
  /** Opens a modal
   * @param {HTMLElement} modalEl
   */
  function openModal(modalEl) {
    const inst = getModalInstance(modalEl);
    if (inst && typeof inst.show === "function") inst.show();
  }

  /** Closes a modal
   * @param {HTMLElement} modalEl
   */
  function closeModal(modalEl) {
    const inst = getModalInstance(modalEl);
    if (inst && typeof inst.hide === "function") inst.hide();
  }

  // ===== Initialization =====
  document.addEventListener("DOMContentLoaded", () => {
    // navbar.js handles loader

    const idNegocio = getIdNegocio();
    if (idNegocio) {
      fetchAndRenderPromotions(idNegocio); // Load initial list
    } else {
      if (loaderOverlay) loaderOverlay.remove(); // Remove loader if auth fails
      if (tbody) {
        tbody.innerHTML =
          "<tr><td colspan=\"8\" class=\"text-center p-6 text-red-600\">" +
          "Error de autenticación.</td></tr>";
      }
    }

    // --- Event Listeners ---

    // Open Add Modal Button
    const openAddBtn = $("#openAddPromo");
    if (openAddBtn) {
      openAddBtn.addEventListener("click", () => {
        if (addFormEl) addFormEl.reset(); // Clear form
        // Set default start date to today
        const startDateInput = $("#add-promo-fecha-inicio");
        if (startDateInput && !startDateInput.value) {
          try {
            startDateInput.valueAsDate = new Date();
          } catch (e) {/* noop */}
        }
        openModal(addModalEl);
      });
    }

    // Add Form Submit
    if (addFormEl) {
      addFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = addFormEl.querySelector("button[type=\"submit\"]");
        const restore = setBusy(btn, "Guardando...");
        const currentIdNegocio = getIdNegocio();
        if (!currentIdNegocio) {
          restore();
          return;
        }
        const success =
        await addPromotion(currentIdNegocio, new FormData(addFormEl));
        restore();
        if (success) {
          closeModal(addModalEl);
          await fetchAndRenderPromotions(currentIdNegocio);
        }
      });
    }

    // Edit Form Submit
    if (editFormEl) {
      editFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const idEl = editFormEl.querySelector("#edit-promo-id");
        const idToEdit = idEl ? idEl.value : "";
        if (!idToEdit) {
          showFeedback("Error ID.", "error");
          return;
        }
        const btn = editFormEl.querySelector("button[type=\"submit\"]");
        const restore = setBusy(btn, "Guardando...");
        const currentIdNegocio = getIdNegocio();
        if (!currentIdNegocio) {
          restore();
          return;
        }
        const success = await updatePromotion(
            currentIdNegocio,
            idToEdit,
            new FormData(editFormEl),
        );
        restore();
        if (success) {
          closeModal(editModalEl);
          await fetchAndRenderPromotions(currentIdNegocio);
        }
      });
    }

    // Table Action Buttons (Edit/Delete/Status Change) - Event Delegation
    if (tbody) {
      tbody.addEventListener("click", async (e) => {
        const button =
        e.target.closest("button[data-action], button[data-set-status]");
        if (!button) return;

        const currentIdNegocio = getIdNegocio();
        if (!currentIdNegocio) return;

        // --- Handle Status Change ---
        if (button.hasAttribute("data-set-status")) {
          const newStatus = button.dataset.setStatus;
          const offerId = button.dataset.offerId;
          if (!offerId || !newStatus) return;

          const container = button.closest("[data-status-container]");
          const statusTextEl = container ?
          container.querySelector("[data-status-text]") : null;
          const statusDotEl = container ?
          container.querySelector("[data-status-dot]") : null;
          const statusBtnEl = container ?
          container.querySelector("[data-status-btn]") : null;
          if (statusTextEl) statusTextEl.textContent = newStatus;
          if (statusDotEl) {
            const dotClass = newStatus === "Activa" ?
            "bg-green-500" :
            "bg-yellow-500";
            statusDotEl.className = "w-2 h-2 rounded-full " + dotClass;
          }
          if (statusBtnEl) {
            const btnClass = newStatus === "Activa" ?
           "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" :
              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 " +
              "dark:text-yellow-300";
            statusBtnEl.className = "inline-flex items-center gap-1 " +
              "rounded-full text-xs font-medium px-2.5 py-0.5 " + btnClass;
          }

          const toggleId = statusBtnEl ?
          statusBtnEl.getAttribute("data-dropdown-toggle") : null;
          const dropdownEl = toggleId ?
          document.getElementById(toggleId) : null;
          if (dropdownEl && typeof Dropdown !== "undefined") {
            const dd = typeof Dropdown.getInstance === "function" ?
              Dropdown.getInstance(dropdownEl) :
              null;
            if (dd && typeof dd.hide === "function") dd.hide();
          }

          const success =
          await updatePromotionStatus(currentIdNegocio, offerId, newStatus);
          if (!success) {
            showFeedback("No se pudo actualizar el estado.", "error");
            await fetchAndRenderPromotions(currentIdNegocio);
          } else {
            const index =
            promotionsCache.findIndex((p) => String(p.id) === String(offerId));
            if (index !== -1) promotionsCache[index].estado = newStatus;
          }
          return;
        }

        // --- Handle Edit/Delete ---
        const action = button.dataset.action;
        const promoId = button.dataset.promoId;
        if (!promoId) return;

        if (action === "edit") {
          const row = button.closest("tr");
          if (!row) return;
          $("#edit-promo-id").value = promoId;
          $("#edit-promo-titulo").value = row.dataset.titulo || "";
          $("#edit-promo-descripcion").value = row.dataset.descripcion || "";
          $("#edit-promo-precio").value = row.dataset.precio || "";
          $("#edit-promo-fecha-inicio").value = row.dataset.fechaInicio || "";
          $("#edit-promo-fecha-fin").value = row.dataset.fechaFin || "";
          $("#edit-promo-estado").value = row.dataset.estado || "Activa";
          openModal(editModalEl);
        } else if (action === "delete") {
          const row = button.closest("tr");
          const name = row && row.dataset ?
          (row.dataset.titulo || ("ID " + promoId)) :
          ("ID " + promoId);
          if (confirm(`¿Seguro que quieres eliminar la promoción "${name}"?`)) {
            const restore = setBusy(button, "...");
            const success = await deletePromotion(currentIdNegocio, promoId);
            if (success) await fetchAndRenderPromotions(currentIdNegocio);
            restore();
          }
        }
      });
    }

    // Initialize Modals
    if (typeof Modal !== "undefined") {
      if (addModalEl) getModalInstance(addModalEl);
      if (editModalEl) getModalInstance(editModalEl);
    }
    if (addModalEl) {
      addModalEl.classList.add("hidden");
      addModalEl.setAttribute("aria-hidden", "true");
    }
    if (editModalEl) {
      editModalEl.classList.add("hidden");
      editModalEl.setAttribute("aria-hidden", "true");
    }
  });
})();
