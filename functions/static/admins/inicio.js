/* eslint-env browser, es2021 */
// /functions/static/admins/inicio.js

/* global Modal */
/* eslint-disable max-len, object-curly-spacing, require-jsdoc, space-before-function-paren */

(function() {
  "use strict";

  // ===== Helpers =====
  const $ = (sel) => document.querySelector(sel);

  const showFeedback = (message, type = "info", duration = 3000) => {
    console.log(`[Admin Feedback - ${type}]: ${message}`);
    const prefix = type === "error" ? "Error: " : type === "success" ? "Éxito: " : "";
    alert(prefix + message); // Simple alert, replace if needed
  };

  const setBusy = (btn, busyText = "Procesando...") => {
    if (!btn) return () => {};
    const originalHTML = btn.innerHTML;
    const originalDisabled = btn.disabled;
    btn.disabled = true;
    btn.classList.add("opacity-60", "cursor-not-allowed");
    const spinnerSVG = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z"></path></svg>`;
    const isDarkText = btn.classList.contains("text-gray-900") || !btn.classList.contains("text-white");
    btn.innerHTML = `<span class="inline-flex items-center">${spinnerSVG.replace("text-white", isDarkText ? "text-gray-700" : "text-white")} ${busyText}</span>`;
    return () => {
      btn.disabled = originalDisabled;
      btn.classList.remove("opacity-60", "cursor-not-allowed");
      btn.innerHTML = originalHTML;
    };
  };

  // ===== DOM Elements =====
  const tbody = $("#biz-tbody");
  const emptyState = $("#empty-state");
  const loaderOverlay = $("#loader-overlay");

  const searchInput = $("#searchInput");
  const filterCategory = $("#filter-category");
  const filterApplyBtn = $("#filter-apply");
  const filterClearBtn = $("#filter-clear");
  const downloadCsvBtn = $("#downloadCsvBtn"); // CSV Button

  const addForm = $("#add-business-form");
  const addModalEl = $("#addBusinessPanel");

  const editForm = $("#edit-business-form");
  const editModalEl = $("#editBusinessPanel");

  // ===== State =====
  let negociosCache = []; // To store fetched businesses for filtering/editing
  const currentFilters = { q: "", category: "" }; // Store current filter values

  // ===== Lambda Interaction =====
  const LAMBDA_ADMIN_URL = "https://6khdpce4zdgyjfiyzoeuq7tfsi0okojz.lambda-url.us-east-1.on.aws/"; // YOUR LAMBDA URL

  /**
   * Render table rows into the DOM.
   * @param {Array<Object>} list - Items to render.
   * @return {void}
   */
  function renderTable(list = []) {
    if (!tbody) {
      console.error("Table body #biz-tbody not found.");
      return;
    }

    if (!list || list.length === 0) {
      tbody.innerHTML = ""; // Clear any previous rows
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }
    if (emptyState) emptyState.classList.add("hidden");
    tbody.innerHTML = ""; // Clear previous content

    list.forEach((n, i) => {
      const tr = document.createElement("tr");
      tr.className = "bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600";
      // Store data on the row for edit functionality
      tr.dataset.id = n.id;
      tr.dataset.nombre = n.nombre || "";
      tr.dataset.representante = n.representante || "";
      tr.dataset.correo = n.correo || "";
      tr.dataset.telefono = n.telefono || "";
      tr.dataset.categoria = n.categoria || "";
      tr.dataset.ubicacion = n.ubicacion || "";
      tr.dataset.descripcion = n.descripcion || "";

      tr.innerHTML = `
        <td class="px-4 py-3 font-medium text-gray-900  whitespace-nowrap dark:text-white">${String(i + 1).padStart(2, "0")}</td>
        <td class="px-6 py-3">
          <div class="font-medium text-gray-900 dark:text-white">${n.nombre || "-"}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${n.correo || ""}</div>
        </td>
        <td class="px-6 py-3">${n.representante || "-"}</td>
        <td class="px-6 py-3">${n.categoria || "-"}</td>
        {/* Status column REMOVED */}
        {/* Join Date column REMOVED (not in data) */}
        {/* Notes column REMOVED (not in data) */}
        <td class="px-6 py-3 text-right whitespace-nowrap">
          <button
            type="button"
            data-action="edit"
            data-id="${n.id}"
            class="inline-flex items-center p-1.5 rounded text-sm font-medium text-center text-gray-500 hover:text-gray-800 focus:ring-2 focus:outline-none focus:ring-gray-300 dark:text-gray-400 dark:hover:text-white dark:focus:ring-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Editar"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path>
              <path
                fill-rule="evenodd"
                d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
          <button
            type="button"
            data-action="delete"
            data-id="${n.id}"
            class="inline-flex items-center p-1.5 rounded text-sm font-medium text-center text-gray-500 hover:text-gray-800 focus:ring-2 focus:outline-none focus:ring-gray-300 dark:text-gray-400 dark:hover:text-white dark:focus:ring-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 ms-1"
            title="Borrar"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Reinitialize Flowbite for any dynamic components if needed
    if (typeof window.initFlowbite === "function") {
      try {
        window.initFlowbite();
      } catch (e) {
        console.warn("Flowbite re-init failed", e);
      }
    }
  }

  /** Fetches businesses from Lambda based on current filters */
  async function fetchAndRenderBusinesses() {
    // Show loading state in table
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-gray-500 dark:text-gray-400">Cargando...</td></tr>`;
    if (emptyState) emptyState.classList.add("hidden");

    const params = new URLSearchParams({action: "listBusinesses"});
    if (currentFilters.q) params.set("q", currentFilters.q);
    if (currentFilters.category) params.set("category", currentFilters.category);
    // Status filter removed

    const url = `${LAMBDA_ADMIN_URL}?${params.toString()}`;
    console.log("Fetching businesses:", url); // Debug log

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      negociosCache = Array.isArray(data) ? data : []; // Store fetched data
      renderTable(negociosCache);
    } catch (err) {
      console.error("Error fetching businesses:", err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center p-6 text-red-600 dark:text-red-400">Error al cargar: ${err.message}</td></tr>`;
      if (emptyState) emptyState.classList.add("hidden");
    } finally {
      if (loaderOverlay) loaderOverlay.classList.add("hidden"); // Hide initial page loader after first fetch
    }
  }

  /**
   * Create a business.
   * @param {FormData} formData - Form data from the Add modal.
   * @return {Promise<boolean>}
   */
  async function addBusiness(formData) {
    const url = `${LAMBDA_ADMIN_URL}?action=addBusiness`;
    const payload = Object.fromEntries(formData.entries());
    // Remove empty description if necessary
    if (!payload.descripcion) delete payload.descripcion;
    // Status removed

    console.log("Adding business:", payload); // Debug log
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      showFeedback(data.message || "Negocio agregado.", "success");
      return true; // Indicate success
    } catch (err) {
      console.error("Error adding business:", err);
      showFeedback(`Error al agregar: ${err.message}`, "error");
      return false; // Indicate failure
    }
  }

  /**
   * Update a business.
   * @param {string|number} idNegocio - Business id.
   * @param {FormData} formData - Form data from the Edit modal.
   * @return {Promise<boolean>}
   */
  async function updateBusiness(idNegocio, formData) {
    const url = `${LAMBDA_ADMIN_URL}?action=updateBusiness&id_negocio=${idNegocio}`;
    const payload = Object.fromEntries(formData.entries());
    if (!payload.descripcion) delete payload.descripcion;
    // Status removed

    console.log(`Updating business ${idNegocio}:`, payload); // Debug log
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      showFeedback(data.message || "Negocio actualizado.", "success");
      return true;
    } catch (err) {
      console.error("Error updating business:", err);
      showFeedback(`Error al actualizar: ${err.message}`, "error");
      return false;
    }
  }

  /**
   * Delete a business.
   * @param {string|number} idNegocio - Business id.
   * @return {Promise<boolean>}
   */
  async function deleteBusiness(idNegocio) {
    const url = `${LAMBDA_ADMIN_URL}?action=deleteBusiness&id_negocio=${idNegocio}`;
    console.log(`Deleting business ${idNegocio}`); // Debug log
    try {
      const res = await fetch(url, { method: "POST" }); // Body is empty
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      showFeedback(data.message || "Negocio eliminado.", "success");
      return true;
    } catch (err) {
      console.error("Error deleting business:", err);
      showFeedback(`Error al eliminar: ${err.message}`, "error");
      return false;
    }
  }

  /** Triggers CSV download */
  async function downloadCsvReport() {
    const btn = downloadCsvBtn;
    const restore = setBusy(btn, "Generando..."); // Show busy state on download button
    const url = `${LAMBDA_ADMIN_URL}?action=downloadCsv`;
    console.log("Downloading CSV from:", url);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        // Try to parse error message if available
        let errorMsg = `Error ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          void 0; /* ignore if body is not JSON */
        }
        throw new Error(errorMsg);
      }

      // Get filename from header if possible, otherwise use default
      const disposition = res.headers.get("content-disposition");
      let filename = "reporte_negocios.csv";
      if (disposition && disposition.indexOf("attachment") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }

      // Create blob and download link
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (err) {
      console.error("Error downloading CSV:", err);
      showFeedback(`No se pudo descargar el reporte: ${err.message}`, "error");
    } finally {
      restore(); // Restore download button state
    }
  }

  // ===== Modal Handling (using Flowbite) =====
  function getModalInstance(modalElement) {
    if (!modalElement) return null;
    const hasModal = typeof window !== "undefined" && typeof window.Modal !== "undefined";
    if (!hasModal) {
      // eslint-disable-next-line no-console
      console.warn("Flowbite Modal JS not loaded or initialized.");
      return null;
    }
    let instance = null;
    try {
      if (typeof window.Modal.getInstance === "function") {
        instance = window.Modal.getInstance(modalElement);
      }
    } catch (_e) {
      instance = null;
    }
    if (instance) return instance;
    try {
      return new window.Modal(modalElement, { closable: true, backdrop: "static" });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Modal constructor not available:", e);
      return null;
    }
  }

  function openModal(modalEl) {
    const instance = getModalInstance(modalEl);
    if (instance && typeof instance.show === "function") {
      instance.show();
    } else if (modalEl) {
      modalEl.classList.remove("hidden");
    }
  }

  function closeModal(modalEl) {
    const instance = getModalInstance(modalEl);
    if (instance && typeof instance.hide === "function") {
      instance.hide();
    } else if (modalEl) {
      modalEl.classList.add("hidden");
    }
  }

  // ===== Initialization =====
  document.addEventListener("DOMContentLoaded", () => {
    // Initial load of businesses
    fetchAndRenderBusinesses();

    // --- Event Listeners ---

    // Search Input (debounce fetching)
    let searchTimeout;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          currentFilters.q = searchInput.value.trim();
          fetchAndRenderBusinesses();
        }, 300);
      });
    }

    // Filter Apply Button
    if (filterApplyBtn) {
      filterApplyBtn.addEventListener("click", () => {
        currentFilters.category = filterCategory ? (filterCategory.value.trim() || "") : "";
        // Status filter removed
        fetchAndRenderBusinesses();
        // Close dropdown manually if needed (Flowbite might handle this)
        const dropdown = document.getElementById("filter-dd");
        if (dropdown) {
          const hasDropdown = typeof window !== "undefined" && typeof window.Dropdown !== "undefined";
          if (hasDropdown) {
            const ddInst = typeof window.Dropdown.getInstance === "function" ?
              window.Dropdown.getInstance(dropdown) :
              null;
            if (ddInst && typeof ddInst.hide === "function") ddInst.hide();
          }
        }
      });
    }

    // Filter Clear Button
    if (filterClearBtn) {
      filterClearBtn.addEventListener("click", () => {
        if (filterCategory) filterCategory.value = "";
        // Status select removed
        currentFilters.category = "";
        fetchAndRenderBusinesses();
        // Close dropdown manually if needed
        const dropdown = document.getElementById("filter-dd");
        if (dropdown) {
          const hasDropdown = typeof window !== "undefined" && typeof window.Dropdown !== "undefined";
          if (hasDropdown) {
            const ddInst = typeof window.Dropdown.getInstance === "function" ?
              window.Dropdown.getInstance(dropdown) :
              null;
            if (ddInst && typeof ddInst.hide === "function") ddInst.hide();
          }
        }
      });
    }

    // Download CSV Button
    if (downloadCsvBtn) downloadCsvBtn.addEventListener("click", downloadCsvReport);

    // Add Business Form Submit
    if (addForm) {
      addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = addForm.querySelector("button[type='submit']");
        const restore = setBusy(btn, "Guardando...");
        const success = await addBusiness(new FormData(addForm));
        restore();
        if (success) {
          addForm.reset();
          closeModal(addModalEl);
          await fetchAndRenderBusinesses(); // Refresh list
        }
      });
    }

    // Edit Business Form Submit
    if (editForm) {
      editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const idToEdit = editForm.querySelector("#edit-neg-id")?.value;
        if (!idToEdit) {
          showFeedback("Error: No se pudo identificar el negocio a editar.", "error");
          return;
        }
        const btn = editForm.querySelector("button[type='submit']");
        const restore = setBusy(btn, "Guardando...");
        const success = await updateBusiness(idToEdit, new FormData(editForm));
        restore();
        if (success) {
          closeModal(editModalEl);
          await fetchAndRenderBusinesses(); // Refresh list
        }
      });
    }

    // Table Action Buttons (Edit/Delete) - Event Delegation
    if (tbody) {
      tbody.addEventListener("click", async (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        if (!id) return;

        if (action === "edit") {
          // Find data stored in the cache or on the row
          const rowEl = button.closest("tr");
          const negocioData = negociosCache.find((n) => String(n.id) === String(id)) || (rowEl ? rowEl.dataset : null);
          if (!negocioData || typeof negocioData !== "object") {
            showFeedback("No se encontraron los datos para editar.", "error");
            return;
          }
          // Pre-fill edit form
          $("#edit-neg-id").value = id;
          $("#edit-neg-nombre").value = negocioData.nombre || "";
          $("#edit-neg-representante").value = negocioData.representante || "";
          $("#edit-neg-correo").value = negocioData.correo || "";
          $("#edit-neg-telefono").value = negocioData.telefono || "";
          $("#edit-neg-categoria").value = negocioData.categoria || "";
          $("#edit-neg-ubicacion").value = negocioData.ubicacion || "";
          $("#edit-neg-descripcion").value = negocioData.descripcion || "";
          // Status removed

          openModal(editModalEl);
        } else if (action === "delete") {
          const row = button.closest("tr");
          const name = row?.dataset.nombre || `ID ${id}`;
          if (
            confirm(
                `¿Estás seguro de que quieres eliminar "${name}"?\nEsta acción eliminará también al usuario representante y no se puede deshacer.`,
            )
          ) {
            const restore = setBusy(button, "Eliminando...");
            const success = await deleteBusiness(id);
            if (success) {
              await fetchAndRenderBusinesses(); // Refresh list
            }
            restore();
          }
        }
      });
    }

    // Initialize Modals for Flowbite JS interaction (if Flowbite is loaded)
    // This makes data-modal-hide attributes work correctly.
    // It's safe to call even if already initialized by navbar.js
    if (typeof Modal !== "undefined") {
      if (addModalEl) getModalInstance(addModalEl); // Initialize add modal
      if (editModalEl) getModalInstance(editModalEl); // Initialize edit modal
    }
    // Optional: Ensure modals are hidden on load as a fallback
    if (addModalEl) {
      addModalEl.classList.add("hidden");
      addModalEl.setAttribute("aria-hidden", "true");
    }
    if (editModalEl) {
      editModalEl.classList.add("hidden");
      editModalEl.setAttribute("aria-hidden", "true");
    }
  }); // End DOMContentLoaded
})(); // End IIFE
