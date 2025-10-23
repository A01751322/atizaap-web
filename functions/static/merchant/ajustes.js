/* eslint-env browser, es2021 */
// /functions/static/admins/inicio.js

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
   * Muestra un aviso simple (alert + consola).
   * @param {string} message - Texto a mostrar.
   * @param {"info"|"error"|"success"} [type="info"] - Tipo de mensaje.
   * @return {void}
   */
  const showFeedback = (message, type = "info") => {
    // eslint-disable-next-line no-console
    console.log(`[Admin Feedback - ${type}]: ${message}`);
    const prefix = type === "error" ?
    "Error: " :
    type === "success" ?
    "Éxito: " :
    "";
    alert(prefix + message); // Simple alert
  };

  /**
   * Coloca un botón en estado ocupado y devuelve función para restaurarlo.
   * @param {HTMLButtonElement|null} btn - Botón objetivo.
   * @param {string} [busyText="Procesando..."] - Texto mientras está ocupado.
   * @return {function():void} Restaurador de estado del botón.
   */
  const setBusy = (btn, busyText = "Procesando...") => {
    if (!btn) return () => {};
    const originalHTML = btn.innerHTML;
    const originalDisabled = btn.disabled;
    btn.disabled = true;
    btn.classList.add("opacity-60", "cursor-not-allowed");
    const spinnerSVG =
      `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" ` +
      `xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">` +
      `<circle class="opacity-25" cx="12" cy="12" r="10"` +
      `stroke="currentColor" stroke-width="4"></circle>` +
      `<path class="opacity-75" fill="currentColor" ` +
      ` d="M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z"></path>` +
      `</svg>`;
    const isDarkText =
      btn.classList.contains("text-gray-900") ||
      !btn.classList.contains("text-white");
    btn.innerHTML = [
      "<span class=\"inline-flex items-center\">",
      spinnerSVG.replace("text-white", isDarkText ?
        "text-gray-700" :
        "text-white"),
      " ",
      busyText,
      "</span>",
    ].join("");
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
  const downloadCsvBtn = $("#downloadCsvBtn");
  const addForm = $("#add-business-form");
  const addModalEl = $("#addBusinessPanel");
  const editForm = $("#edit-business-form");
  const editModalEl = $("#editBusinessPanel");

  // ===== State =====
  let negociosCache = [];
  const currentFilters = {q: "", category: ""};

  // ===== Lambda Interaction =====
  const LAMBDA_ADMIN_URL = "https://6khdpce4zdgyjfiyzoeuq7tfsi0okojz.lambda-url.us-east-1.on.aws/"; // YOUR LAMBDA URL

  /**
   * @typedef {Object} BizRow
   * @property {string|number} id
   * @property {string} nombre
   * @property {string} representante
   * @property {string} correo
   * @property {string} telefono
   * @property {string} categoria
   * @property {string} ubicacion
   * @property {string} descripcion
   */

  /**
   * Pinta la tabla con los negocios.
   * @param {BizRow[]} list
   * @return {void}
   */
  function renderTable(list = []) {
    if (!tbody) return;
    tbody.innerHTML = ""; // Clear
    if (emptyState) emptyState.classList.add("hidden");

    if (!list || list.length === 0) {
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }

    list.forEach((n, i) => {
      const tr = document.createElement("tr");
      tr.className = [
        "bg-white",
        "border-b",
        "hover:bg-gray-50",
      ].join(" ");
      tr.dataset.id = n.id;
      tr.dataset.nombre = n.nombre || "";
      tr.dataset.representante = n.representante || "";
      tr.dataset.correo = n.correo || "";
      tr.dataset.telefono = n.telefono || "";
      tr.dataset.categoria = n.categoria || "";
      tr.dataset.ubicacion = n.ubicacion || "";
      tr.dataset.descripcion = n.descripcion || ""; // Store description

      const shortDesc = (n.descripcion || "").substring(0, 40) +
      ((n.descripcion || "").length > 40 ? "..." : "");

      // Ensure correct number of columns
      // (6 total: #, Negocio, Rep, Cat, Desc, Actions)
      /* eslint-disable max-len */
      tr.innerHTML = `
                <td
                  class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap"
                >${String(i + 1).padStart(2, "0")}</td>
                <td class="px-6 py-3">
                    <div class="font-medium text-gray-900 dark:text-white">${n.nombre || "-"}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">${n.correo || ""}</div>
                </td>
                <td class="px-6 py-3">${n.representante || "-"}</td>
                <td class="px-6 py-3">${n.categoria || "-"}</td>
                <td class="px-6 py-3 text-xs text-gray-500 dark:text-gray-400" title="${n.descripcion || ""}">${shortDesc || "-"}</td>
                <td class="px-6 py-3 text-right whitespace-nowrap">
                    <button type="button" data-action="edit" data-id="${n.id}" class="inline-flex items-center p-1.5 rounded text-sm font-medium text-center text-gray-500 hover:text-gray-800 focus:ring-2 focus:outline-none focus:ring-gray-300 dark:text-gray-400 dark:hover:text-white dark:focus:ring-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title="Editar">
                         <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
                    </button>
                    <button type="button" data-action="delete" data-id="${n.id}" class="inline-flex items-center p-1.5 rounded text-sm font-medium text-center text-gray-500 hover:text-gray-800 focus:ring-2 focus:outline-none focus:ring-gray-300 dark:text-gray-400 dark:hover:text-white dark:focus:ring-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 ms-1" title="Borrar">
                         <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                    </button>
                </td>
            `;
      /* eslint-enable max-len */
      tbody.appendChild(tr);
    });
    if (typeof window.initFlowbite === "function") window.initFlowbite();
  }

  /**
   * Descarga la lista de negocios y refresca la tabla aplicando filtros.
   * @return {Promise<void>}
   */
  async function fetchAndRenderBusinesses() {
    if (tbody) {
      tbody.innerHTML =
        "<tr><td colspan=\"6\" class=\"text-center p-6 text-gray-500\">" +
        "Cargando...</td></tr>";
    }
    if (emptyState) emptyState.classList.add("hidden");
    const params = new URLSearchParams({action: "listBusinesses"});
    if (currentFilters.q) {
      params.set("q", currentFilters.q);
    }
    if (currentFilters.category) {
      params.set("category", currentFilters.category);
    }
    const url = `${LAMBDA_ADMIN_URL}?${params.toString()}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      negociosCache = Array.isArray(data) ? data : [];
      renderTable(negociosCache);
    } catch (err) {
      console.error("Error fetching businesses:", err);
      if (tbody) {
        tbody.innerHTML =
          "<tr><td colspan=\"6\" class=\"text-center p-6 text-red-600\">" +
          "Error: " + err.message + "</td></tr>";
      }
    } finally {
      if (loaderOverlay) loaderOverlay.classList.add("hidden");
    }
  }

  /**
   * Agrega un nuevo negocio.
   * @param {FormData} formData
   * @return {Promise<boolean>}
   */
  async function addBusiness(formData) {
    const url = `${LAMBDA_ADMIN_URL}?action=addBusiness`;
    const payload = Object.fromEntries(formData.entries());
    try {
      const res = await fetch(
          url,
          {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
          },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      showFeedback(data.message || "Negocio agregado.", "success");
      return true;
    } catch (err) {
      showFeedback(`Error al agregar: ${err.message}`, "error");
      return false;
    }
  }

  /**
   * Actualiza un negocio existente.
   * @param {string|number} idNegocio
   * @param {FormData} formData
   * @return {Promise<boolean>}
   */
  async function updateBusiness(idNegocio, formData) {
    const url =
      `${LAMBDA_ADMIN_URL}?action=updateBusiness&id_negocio=${idNegocio}`;
    const payload = Object.fromEntries(formData.entries());
    try {
      const res = await fetch(
          url,
          {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
          },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      showFeedback(data.message || "Negocio actualizado.", "success");
      return true;
    } catch (err) {
      showFeedback(`Error al actualizar: ${err.message}`, "error");
      return false;
    }
  }

  /**
   * Elimina un negocio por ID.
   * @param {string|number} idNegocio
   * @return {Promise<boolean>}
   */
  async function deleteBusiness(idNegocio) {
    const url =
      `${LAMBDA_ADMIN_URL}?action=deleteBusiness&id_negocio=${idNegocio}`;
    try {
      const res = await fetch(url, {method: "POST"});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
      showFeedback(data.message || "Negocio eliminado.", "success");
      return true;
    } catch (err) {
      showFeedback(`Error al eliminar: ${err.message}`, "error");
      return false;
    }
  }

  /**
   * Descarga el CSV del reporte de negocios.
   * @return {Promise<void>}
   */
  async function downloadCsvReport() {
    const btn = downloadCsvBtn;
    const restore = setBusy(btn, "..."); // Small indicator
    const url = `${LAMBDA_ADMIN_URL}?action=downloadCsv`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        let errorMsg = `Error ${res.status}`;
        try {
          const ed = await res.json();
          errorMsg = ed.message || errorMsg;
        } catch (e) {/* ignore parse error */}
        throw new Error(errorMsg);
      }
      const disposition = res.headers.get("content-disposition");
      let filename = "reporte_negocios.csv";
      if (disposition && disposition.includes("attachment")) {
        const part = disposition.split("filename=")[1];
        if (part) filename = part.replace(/['"]/g, "") || filename;
      }
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
      showFeedback(`No se pudo descargar: ${err.message}`, "error");
    } finally {
      restore();
    }
  }

  /**
   * Obtiene/crea instancia del modal (Flowbite).
   * @param {HTMLElement|null} modalElement
   * @return {any}
   */
  function getModalInstance(modalElement) {
    if (!modalElement) return null;
    const hasModal =
      typeof window !== "undefined" &&
      typeof window.Modal !== "undefined";
    if (!hasModal) {
      // eslint-disable-next-line no-console
      console.warn("Flowbite Modal JS missing.");
      return null;
    }
    let inst = null;
    try {
      if (typeof window.Modal.getInstance === "function") {
        inst = window.Modal.getInstance(modalElement);
      }
    } catch (_e) {
      inst = null;
    }
    return inst || new window.Modal(
        modalElement,
        {closable: true, backdrop: "static"},
    );
  }
  /**
   * Abre un modal Flowbite si existe.
   * @param {HTMLElement|null} modalEl
   * @return {void}
   */
  function openModal(modalEl) {
    const m = getModalInstance(modalEl);
    if (m && typeof m.show === "function") m.show();
  }
  /**
   * Cierra un modal Flowbite si existe.
   * @param {HTMLElement|null} modalEl
   * @return {void}
   */
  function closeModal(modalEl) {
    const m = getModalInstance(modalEl);
    if (m && typeof m.hide === "function") m.hide();
  }

  // ===== Initialization =====
  document.addEventListener("DOMContentLoaded", () => {
    fetchAndRenderBusinesses(); // Initial load

    // --- Event Listeners ---
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

    if (filterApplyBtn) {
      filterApplyBtn.addEventListener("click", () => {
        const catVal = filterCategory ? filterCategory.value.trim() : "";
        currentFilters.category = catVal || "";
        fetchAndRenderBusinesses();
        const dropdown = $("#filter-dd");
        const hasDropdown =
          typeof window !== "undefined" &&
          typeof window.Dropdown !== "undefined";
        if (dropdown && hasDropdown) {
          let dd = null;
          if (typeof window.Dropdown.getInstance === "function") {
            dd = window.Dropdown.getInstance(dropdown);
          }
          if (dd && typeof dd.hide === "function") dd.hide();
        }
      });
    }

    if (filterClearBtn) {
      filterClearBtn.addEventListener("click", () => {
        if (filterCategory) filterCategory.value = "";
        currentFilters.category = "";
        fetchAndRenderBusinesses();
        const dropdown = $("#filter-dd");
        const hasDropdown =
          typeof window !== "undefined" &&
          typeof window.Dropdown !== "undefined";
        if (dropdown && hasDropdown) {
          let dd = null;
          if (typeof window.Dropdown.getInstance === "function") {
            dd = window.Dropdown.getInstance(dropdown);
          }
          if (dd && typeof dd.hide === "function") dd.hide();
        }
      });
    }

    if (downloadCsvBtn) {
      downloadCsvBtn.addEventListener("click", downloadCsvReport);
    }

    if (addForm) {
      addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = addForm.querySelector("button[type=\"submit\"]");
        const restore = setBusy(btn, "Guardando...");
        const success = await addBusiness(new FormData(addForm));
        restore();
        if (success) {
          addForm.reset();
          closeModal(addModalEl);
          await fetchAndRenderBusinesses();
        }
      });
    }

    if (editForm) {
      editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const idEl = editForm.querySelector("#edit-neg-id");
        const idToEdit = idEl ? idEl.value : "";
        if (!idToEdit) {
          showFeedback("Error ID.", "error");
          return;
        }
        const btn = editForm.querySelector("button[type=\"submit\"]");
        const restore = setBusy(btn, "Guardando...");
        const success = await updateBusiness(idToEdit, new FormData(editForm));
        restore();
        if (success) {
          closeModal(editModalEl);
          await fetchAndRenderBusinesses();
        }
      });
    }

    if (tbody) {
      tbody.addEventListener("click", async (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;
        const action = button.dataset.action;
        const id = button.dataset.id;
        if (!id) return;

        if (action === "edit") {
          const rowEl = button.closest("tr");
          const data = negociosCache.find((n) => String(n.id) ===
          String(id)) || (rowEl ? rowEl.dataset : null);
          if (!data) {
            showFeedback("Datos no encontrados.", "error");
            return;
          }
          $("#edit-neg-id").value = id;
          $("#edit-neg-nombre").value = data.nombre || "";
          $("#edit-neg-representante").value = data.representante || "";
          $("#edit-neg-correo").value = data.correo || "";
          $("#edit-neg-telefono").value = data.telefono || "";
          $("#edit-neg-categoria").value = data.categoria || "";
          $("#edit-neg-ubicacion").value = data.ubicacion || "";
          $("#edit-neg-descripcion").value = data.descripcion || "";
          openModal(editModalEl);
        } else if (action === "delete") {
          const row = button.closest("tr");
          const name = row ? (row.dataset && row.dataset.nombre ?
            row.dataset.nombre : "ID " + id) : "ID " + id;
          if (confirm("¿Seguro que quieres eliminar \"" + name +
            "\"?\nEsto eliminará también al usuario representante.")) {
            const restore = setBusy(button, "...");
            await deleteBusiness(id);
            restore();
          }
        }
      });
    }

    // Initialize Modals
    if (typeof Modal !== "undefined") {
      if (addModalEl) {
        /* eslint-disable max-len */
        addModalEl.classList.add("hidden");
        addModalEl.setAttribute("aria-hidden", "true");
        /* eslint-enable max-len */
      }
      if (editModalEl) {
        /* eslint-disable max-len */
        editModalEl.classList.add("hidden");
        editModalEl.setAttribute("aria-hidden", "true");
        /* eslint-enable max-len */
      }
      if (addModalEl) getModalInstance(addModalEl);
      if (editModalEl) getModalInstance(editModalEl);
    }
  }); // End DOMContentLoaded
})(); // End IIFE
