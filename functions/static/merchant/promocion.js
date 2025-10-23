/* eslint-env browser, es2021 */
// /functions/static/merchant/promocion.js

(function() {
    "use strict";

    // ===== Helpers =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const showFeedback = (message, type = 'info') => {
        console.log(`[Promo Feedback - ${type}]: ${message}`);
        const prefix = type === 'error' ? 'Error: ' : type === 'success' ? 'Éxito: ' : '';
        alert(prefix + message); // Simple alert
    };

    const setBusy = (btn, busyText = "Procesando...") => {
        if (!btn) return () => {};
        const originalHTML = btn.innerHTML;
        const originalDisabled = btn.disabled;
        btn.disabled = true;
        btn.classList.add("opacity-60", "cursor-not-allowed");
        const spinnerSVG = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z"></path></svg>`;
        const isDarkText = btn.classList.contains('text-gray-900') || !btn.classList.contains('text-white');
        btn.innerHTML = `<span class="inline-flex items-center">${spinnerSVG.replace('text-white', isDarkText ? 'text-gray-700' : 'text-white')} ${busyText}</span>`;
        return () => {
            btn.disabled = originalDisabled;
            btn.classList.remove("opacity-60", "cursor-not-allowed");
            btn.innerHTML = originalHTML;
        };
    };

    // Formats YYYY-MM-DD or full date string for display
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            // Assumes YYYY-MM-DD from Lambda, create date as UTC to avoid timezone shifts
            const parts = dateString.split('-');
            if (parts.length === 3) {
                 const date = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
                 if (!isNaN(date.getTime())) {
                      return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                 }
            }
            // Fallback for potentially different date formats
            const fallbackDate = new Date(dateString);
            if (!isNaN(fallbackDate.getTime())) {
                return fallbackDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
            }
            return dateString; // Return original if parsing fails
        } catch (e) {
            return dateString; // Return original on error
        }
    };

    /** Generates HTML for the status badge/dropdown */
    function statusBadgeHTML(status, offerId) {
        const isActive = String(status).toLowerCase() === "activa";
        const btnClasses = isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
        const dotClasses = isActive ? "bg-green-500" : "bg-yellow-500";
        const uniqueId = `promo-${offerId}`; // Unique ID prefix for this row

        return `
        <div class="relative inline-block" data-status-container data-offer-id="${offerId}">
            <button type="button" id="status-btn-${uniqueId}"
                    data-status-btn data-dropdown-toggle="status-dd-${uniqueId}"
                    class="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-0.5 ${btnClasses}">
                <span class="w-2 h-2 rounded-full ${dotClasses}" data-status-dot></span>
                <span data-status-text>${isActive ? "Activa" : "Inactiva"}</span>
                <svg class="ms-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/></svg>
            </button>
            <div id="status-dd-${uniqueId}" class="z-20 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-28 dark:bg-gray-700">
                <ul class="py-1 text-sm text-gray-700 dark:text-gray-200">
                    <li><button type="button" class="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white" data-set-status="Activa" data-offer-id="${offerId}">Activa</button></li>
                    <li><button type="button" class="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white" data-set-status="Inactiva" data-offer-id="${offerId}">Inactiva</button></li>
                </ul>
            </div>
        </div>`;
    }

    // ===== DOM Elements =====
    const tbody = $("#promo-tbody");
    const loaderOverlay = $("#loader-overlay");
    const addFormEl = $("#add-promo-form");
    const addModalEl = $("#addPromoPanel");
    let addModalInstance = null;
    const editFormEl = $("#edit-promo-form");
    const editModalEl = $("#editPromoPanel");
    let editModalInstance = null;

    // ===== State =====
    let promotionsCache = [];

    // ===== Lambda Interaction =====
    const LAMBDA_PROMO_URL = "https://7sjasfzqwrtxf3o4dm7yfodvy40knhwg.lambda-url.us-east-1.on.aws/"; // YOUR LAMBDA URL

    /** Gets id_negocio from localStorage */
    function getIdNegocio() {
        const id = localStorage.getItem('id_negocio_logeado');
        if (!id) {
            console.error("Missing 'id_negocio_logeado'.");
            showFeedback("Error de autenticación.", "error");
        }
        return id;
    }

    // Modificar la función renderTable para incluir el estado correcto en el dropdown
    function renderTable(list = []) {
        if (!tbody) return;
        tbody.innerHTML = ""; // Clear

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center p-6 text-gray-500 dark:text-gray-400">No tienes promociones creadas.</td></tr>';
            return;
        }

        list.forEach((p, i) => {
            const tr = document.createElement("tr");
            tr.className = "bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600";
            
            tr.innerHTML = `
                <td class="px-4 py-3">${i + 1}</td>
                <td class="px-6 py-3">${p.titulo}</td>
                <td class="px-6 py-3">${p.descripcion || '-'}</td>
                <td class="px-6 py-3">${formatDate(p.fecha_inicio)}</td>
                <td class="px-6 py-3">${formatDate(p.fecha_fin)}</td>
                <td class="px-6 py-3">
                    <button type="button"
                        data-status="${p.estado}"
                        data-promo-id="${p.id}"
                        class="status-toggle inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-0.5 
                        ${p.estado === 'Activa' ? 
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}">
                        <span class="w-2 h-2 rounded-full ${p.estado === 'Activa' ? 'bg-green-500' : 'bg-yellow-500'}"></span>
                        ${p.estado}
                    </button>
                </td>
                <td class="px-6 py-3 text-right">
                    <button type="button" class="edit-btn text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-2"
                        data-action="edit"
                        data-id="${p.id}"
                        data-titulo="${p.titulo}"
                        data-descripcion="${p.descripcion || ''}"
                        data-fecha-inicio="${p.fecha_inicio}"
                        data-fecha-fin="${p.fecha_fin || ''}"
                        data-estado="${p.estado}">
                        Editar
                    </button>
                    <button type="button" class="delete-btn text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        data-action="delete"
                        data-id="${p.id}">
                        Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        // Reinitialize Flowbite for dropdowns in table
        if (typeof window.initFlowbite === 'function') window.initFlowbite();
    }

    /** Fetches promotions */
    async function fetchAndRenderPromotions(idNegocio) {
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-6 text-gray-500 dark:text-gray-400">Cargando...</td></tr>`; // Colspan 7

        const url = `${LAMBDA_PROMO_URL}?action=listPromotions&id_negocio=${idNegocio}`;
        try {
            const response = await fetch(url);
            const promotions = await response.json();
            renderTable(promotions);
        } catch (err) {
            console.error("Error fetching promotions:", err);
            showFeedback("Error al cargar promociones.", "error");
        }
    }

    /** Adds a new promotion */
    async function addPromotion(idNegocio, formData) {
        const url = `${LAMBDA_PROMO_URL}?action=addPromotion&id_negocio=${idNegocio}`;
        const payload = {
            titulo: formData.get('titulo'),
            descripcion: formData.get('descripcion'),
            fecha_inicio: formData.get('fecha_inicio'),
            fecha_fin: formData.get('fecha_fin'),
            estado: formData.get('estado') || 'Activa'
        };

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
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

     /** Updates an existing promotion */
    async function updatePromotion(idNegocio, idOferta, formData) {
        const url = `${LAMBDA_PROMO_URL}?action=updatePromotion&id_negocio=${idNegocio}&id_oferta=${idOferta}`;
        const payload = {
            titulo: formData.get('titulo'),
            descripcion: formData.get('descripcion'),
            fecha_inicio: formData.get('fecha_inicio'),
            fecha_fin: formData.get('fecha_fin'),
            estado: formData.get('estado')
        };

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
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

     /** Updates only the status of a promotion */
    async function updatePromotionStatus(idNegocio, idOferta, newStatus) {
        const promoData = promotionsCache.find(p => String(p.id) === String(idOferta));
        if (!promoData) {
            showFeedback("Promoción no encontrada.", "error");
            return;
        }

        const payload = {
            titulo: promoData.titulo,
            descripcion: promoData.descripcion,
            precio: promoData.precio,
            fecha_inicio: promoData.fecha_inicio,
            fecha_fin: promoData.fecha_fin,
            estado: newStatus // Update the status
        };

        const url = `${LAMBDA_PROMO_URL}?action=updatePromotion&id_negocio=${idNegocio}&id_oferta=${idOferta}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            showFeedback(result.message, result.statusCode === 200 ? 'success' : 'error');
            fetchAndRenderPromotions(idNegocio); // Refresh the promotions list
        } catch (err) {
            console.error("Error updating promotion status:", err);
            showFeedback("Error al actualizar el estado de la promoción.", "error");
        }
    }


    /** Deletes a promotion */
    async function deletePromotion(idNegocio, idOferta) {
         const url = `${LAMBDA_PROMO_URL}?action=deletePromotion&id_negocio=${idNegocio}&id_oferta=${idOferta}`;
        try {
            const res = await fetch(url, { method: "POST" }); // Body is empty
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
            showFeedback(data.message || "Promoción eliminada.", "success");
            return true;
        } catch (err) { showFeedback(`Error al eliminar: ${err.message}`, "error"); return false; }
    }

    // ===== Modal Handling =====
    function getModalInstance(modalElement) {
        if (!modalElement) return null;
        if (typeof Modal !== 'undefined') { return Modal.getInstance(modalElement) || new Modal(modalElement, { closable: true, backdrop: 'static' }); }
        else { console.warn("Flowbite Modal JS missing."); return null; }
    }
    function openModal(modalEl) { getModalInstance(modalEl)?.show(); }
    function closeModal(modalEl) { getModalInstance(modalEl)?.hide(); }

    // ===== Initialization =====
    document.addEventListener("DOMContentLoaded", () => {
        // navbar.js handles loader

        const idNegocio = getIdNegocio();
        if (idNegocio) {
            fetchAndRenderPromotions(idNegocio); // Load initial list
        } else {
             loaderOverlay?.remove(); // Remove loader if auth fails
             if(tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center p-6 text-red-600">Error de autenticación.</td></tr>'; // Colspan 7
        }

        // --- Event Listeners ---

        // Open Add Modal Button
        $("#openAddPromo")?.addEventListener("click", () => {
            if (addFormEl) addFormEl.reset(); // Clear form
            // Set default start date to today
            const startDateInput = $("#add-promo-fecha-inicio");
            if (startDateInput && !startDateInput.value) {
                try { startDateInput.valueAsDate = new Date(); } catch(e) {}
            }
            openModal(addModalEl);
        });

        // Add Form Submit
        addFormEl?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = addFormEl.querySelector('button[type="submit"]');
            const restore = setBusy(btn, "Guardando...");
            const currentIdNegocio = getIdNegocio();
            if (!currentIdNegocio) { restore(); return; }
            const success = await addPromotion(currentIdNegocio, new FormData(addFormEl));
            restore();
            if (success) { closeModal(addModalEl); await fetchAndRenderPromotions(currentIdNegocio); }
        });

        // Edit Form Submit
        editFormEl?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const idToEdit = editFormEl.querySelector('#edit-promo-id')?.value;
            if (!idToEdit) { showFeedback("Error ID.", "error"); return; }
            const btn = editFormEl.querySelector('button[type="submit"]');
            const restore = setBusy(btn, "Guardando...");
            const currentIdNegocio = getIdNegocio();
            if (!currentIdNegocio) { restore(); return; }
            const success = await updatePromotion(currentIdNegocio, idToEdit, new FormData(editFormEl));
            restore();
            if (success) { closeModal(editModalEl); await fetchAndRenderPromotions(currentIdNegocio); }
        });

        // Table Action Buttons (Edit/Delete/Status Change) - Event Delegation
        tbody?.addEventListener("click", async (e) => {
            const button = e.target.closest("button[data-action], button[data-set-status]");
            if (!button) return;

            const currentIdNegocio = getIdNegocio();
            if (!currentIdNegocio) return;

            // --- Handle Status Change ---
            if (button.hasAttribute("data-set-status")) {
                 const newStatus = button.dataset.setStatus;
                 const offerId = button.dataset.offerId;
                 if (!offerId || !newStatus) return;

                 // Optimistic UI update (optional but good UX)
                 const container = button.closest('[data-status-container]');
                 const statusTextEl = container?.querySelector('[data-status-text]');
                 const statusDotEl = container?.querySelector('[data-status-dot]');
                 const statusBtnEl = container?.querySelector('[data-status-btn]');
                 if (statusTextEl) statusTextEl.textContent = newStatus;
                 if(statusDotEl) { statusDotEl.className = `w-2 h-2 rounded-full ${newStatus === 'Activa' ? 'bg-green-500' : 'bg-yellow-500'}`; }
                 if(statusBtnEl) { statusBtnEl.className = `inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-0.5 ${newStatus === 'Activa' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`; }

                 // Close the dropdown if open (using Flowbite API if available)
                const dropdownId = statusBtnEl?.getAttribute('data-dropdown-toggle');
                const dropdownEl = dropdownId ? document.getElementById(dropdownId) : null;
                if (dropdownEl && typeof Dropdown !== 'undefined') {
                    Dropdown.getInstance(dropdownEl)?.hide();
                }

                 // Call Lambda to persist change
                 const success = await updatePromotionStatus(currentIdNegocio, offerId, newStatus);
                 if (!success) {
                      // Revert UI on failure
                      showFeedback("No se pudo actualizar el estado.", "error");
                      await fetchAndRenderPromotions(currentIdNegocio); // Full refresh to be safe
                 } else {
                     // Update local cache
                     const index = promotionsCache.findIndex(p => String(p.id) === String(offerId));
                     if (index !== -1) promotionsCache[index].estado = newStatus;
                 }
                 return; // Handled status change
            }

            // --- Handle Edit/Delete ---
            const action = button.dataset.action;
            const promoId = button.dataset.promoId;
            if (!promoId) return;

            if (action === "edit") {
                const row = button.closest('tr');
                if (!row) return;
                // Pre-fill edit form using data stored on the row
                $("#edit-promo-id").value = promoId;
                $("#edit-promo-titulo").value = row.dataset.titulo || '';
                $("#edit-promo-descripcion").value = row.dataset.descripcion || '';
                $("#edit-promo-precio").value = row.dataset.precio || '';
                $("#edit-promo-fecha-inicio").value = row.dataset.fechaInicio || '';
                $("#edit-promo-fecha-fin").value = row.dataset.fechaFin || '';
                $("#edit-promo-estado").value = row.dataset.estado || 'Activa';
                openModal(editModalEl);

            } else if (action === "delete") {
                 const row = button.closest('tr');
                 const name = row?.dataset.titulo || `ID ${promoId}`;
                 if (confirm(`¿Seguro que quieres eliminar la promoción "${name}"?`)) {
                     const restore = setBusy(button, "...");
                     const success = await deletePromotion(currentIdNegocio, promoId);
                     if (success) await fetchAndRenderPromotions(currentIdNegocio);
                     restore();
                 }
            }
        });

        // Initialize Modals
         if (typeof Modal !== 'undefined') {
             if (addModalEl) addModalInstance = getModalInstance(addModalEl);
             if (editModalEl) editModalInstance = getModalInstance(editModalEl);
         }
         addModalEl?.classList.add('hidden'); addModalEl?.setAttribute('aria-hidden', 'true');
         editModalEl?.classList.add('hidden'); editModalEl?.setAttribute('aria-hidden', 'true');

         // Manejador para el toggle de estado
         tbody?.addEventListener("click", async (e) => {
            const statusBtn = e.target.closest('.status-toggle');
            if (statusBtn) {
                const promoId = statusBtn.dataset.promoId;
                const currentStatus = statusBtn.dataset.status;
                const newStatus = currentStatus === 'Activa' ? 'Inactiva' : 'Activa';
                
                try {
                    await updatePromotionStatus(getIdNegocio(), promoId, newStatus);
                    // La UI se actualizará con fetchAndRenderPromotions
                } catch (err) {
                    showFeedback("Error al cambiar el estado", "error");
                }
            }
        });

    }); // End DOMContentLoaded

})(); // End IIFE