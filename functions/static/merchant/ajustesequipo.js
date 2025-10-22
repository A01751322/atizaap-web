/* eslint-env browser */
// functions/static/merchant/ajustesEquipo.js

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
   * Muestra retroalimentación simple para equipo.
   * @param {string} message - Mensaje.
   * @param {"info"|"success"|"error"} [type="info"] - Tipo.
   * @return {void}
   */
  const showFeedback = (message, type = "info") => {
    // eslint-disable-next-line no-console
    console.log("[Team Feedback - " + type + "]: " + message);
    const label = {error: "Error: ", success: "Éxito: ", info: ""}[type] || "";
    alert(label + message);
  };

  /**
   * Formatea fecha a es-MX (día mes abreviado, año).
   * @param {string} dateString - Fecha en string.
   * @return {string} Fecha legible o indicador.
   */
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString(
          "es-MX",
          {year: "numeric", month: "short", day: "numeric"},
      );
    } catch (_e) {
      return "-";
    }
  };

  /**
   * Pone un botón en estado ocupado con spinner.
   * @param {HTMLButtonElement} btn - Botón objetivo.
   * @param {string} [busyText="Procesando..."] - Texto ocupado.
   * @return {function(): void} Función para restaurar botón.
   */
  const setBusy = (btn, busyText = "Procesando...") => {
    if (!btn) return () => {};

    const originalHTML = btn.innerHTML;
    const originalDisabled = btn.disabled;

    btn.disabled = true;
    btn.classList.add("opacity-60", "cursor-not-allowed");

    const spinnerSVG =
      "<svg class=\"animate-spin -ml-1 mr-2 h-4 w-4 text-white\" " +
      "xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\">" +
      "<circle class=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" " +
      "stroke=\"currentColor\" stroke-width=\"4\"></circle>" +
      "<path class=\"opacity-75\" fill=\"currentColor\" " +
      "d=\"M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z\"></path></svg>";

    const isDarkText =
      btn.classList.contains("text-gray-900") ||
      !btn.classList.contains("text-white");

    const svg = spinnerSVG.replace(
        "text-white",
      isDarkText ? "text-gray-700" : "text-white",
    );

    btn.innerHTML =
      "<span class=\"inline-flex items-center\">" +
      svg + " " + busyText + "</span>";

    return () => {
      btn.disabled = originalDisabled;
      btn.classList.remove("opacity-60", "cursor-not-allowed");
      btn.innerHTML = originalHTML;
    };
  };

  // ===== Lambda Interaction =====
  const LAMBDA_PROFILE_URL =
    "https://jxsxjt7ujzare3y5jvajn333z40oylno.lambda-url.us-east-1.on.aws/";

  /**
   * Obtiene id de negocio desde localStorage.
   * @return {string|null} Id o null.
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
   * Pinta la tabla de miembros del equipo.
   * @param {Array<Object>} [teamMembers=[]] - Lista de miembros.
   * @return {void}
   */
  function renderTeamTable(teamMembers = []) {
    const tbody = $("#page-content table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!teamMembers || teamMembers.length === 0) {
      tbody.innerHTML =
        "<tr><td colspan=\"4\" class=\"text-center p-6 text-gray-500 " +
        "dark:text-gray-400\">No hay miembros registrados.</td></tr>";
      return;
    }

    teamMembers.forEach((member, index) => {
      const isOwner = member.isOwner === true;

      const tr = document.createElement("tr");
      tr.className =
        "bg-white border-b dark:bg-gray-800 dark:border-gray-700 " +
        "hover:bg-gray-50 dark:hover:bg-gray-600";
      tr.dataset.userId = member.id;
      tr.dataset.userName = member.name || "";
      tr.dataset.userEmail = member.email || "";

      const numberCell = String(index + 1).padStart(2, "0");
      const initial = member.name ? member.name.charAt(0).toUpperCase() : "?";
      const ownerTag = isOwner ?
        "<span class=\"text-xs font-normal text-blue-600 " +
        "dark:text-blue-400\">(Propietario)</span>" :
        "";

      let disabledAttr = "";
      let stateClass = "hover:bg-gray-100 dark:hover:bg-gray-700";
      let editTitle = "Editar";
      let deleteTitle = "Borrar";

      if (isOwner) {
        disabledAttr = "disabled";
        stateClass = "opacity-50 cursor-not-allowed";
        editTitle = "No se puede editar al propietario";
        deleteTitle = "No se puede eliminar al propietario";
      }

      tr.innerHTML =
        "<td class=\"px-4 py-3 font-medium text-gray-900 whitespace-nowrap " +
        "dark:text-white\">" + numberCell + "</td>" +
        "<td class=\"px-6 py-3\">" +
        "<div class=\"flex items-center gap-3\">" +
        "<div class=\"w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 " +
        "flex items-center justify-center text-gray-600 dark:text-gray-300 " +
        "text-sm font-medium ring-1 ring-gray-300 dark:ring-gray-500\">" +
        initial + "</div>" +
        "<div>" +
        "<div class=\"font-medium text-gray-900 dark:text-white\">" +
        (member.name || "N/A") + " " + ownerTag + "</div>" +
        "<div class=\"text-xs text-gray-500 dark:text-gray-400\">" +
        (member.email || "N/A") + "</div>" +
        "</div></div></td>" +
        "<td class=\"px-6 py-3 text-gray-500 dark:text-gray-400\">" +
        formatDate(member.joinDate) + "</td>" +
        "<td class=\"px-6 py-3 text-right\">" +
        "<button type=\"button\" data-action=\"edit-member\" " +
        "data-user-id=\"" + member.id + "\" " + disabledAttr + " " +
        "class=\"inline-flex items-center p-1.5 rounded text-sm " +
        "font-medium text-center text-gray-500 hover:text-gray-800 " +
        "focus:ring-2 focus:outline-none focus:ring-gray-300 " +
        "dark:text-gray-400 dark:hover:text-white " +
        "dark:focus:ring-gray-500 " + stateClass + "\" title=\"" +
        editTitle + "\">" +
        "<svg class=\"w-4 h-4\" fill=\"currentColor\" viewBox=\"0 0 20 20\">" +
        "<path d=\"M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828" +
        "l7.586-7.586a2 2 0 000-2.828z\"></path>" +
        "<path fill-rule=\"evenodd\" d=\"M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10" +
        "h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z\" " +
        "clip-rule=\"evenodd\"></path></svg></button>" +
        "<button type=\"button\" data-action=\"delete-member\" " +
        "data-user-id=\"" + member.id + "\" " + disabledAttr + " " +
        "class=\"inline-flex items-center p-1.5 rounded text-sm " +
        "font-medium text-center text-gray-500 hover:text-gray-800 " +
        "focus:ring-2 focus:outline-none focus:ring-gray-300 " +
        "dark:text-gray-400 dark:hover:text-white dark:focus:ring-gray-500 " +
        "ms-1 " + stateClass + "\" title=\"" + deleteTitle + "\">" +
        "<svg class=\"w-4 h-4\" fill=\"currentColor\" viewBox=\"0 0 20 20\">" +
        "<path fill-rule=\"evenodd\" d=\"M9 2a1 1 0 00-.894.553L7.382 4H4a1 " +
        "1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1." +
        "447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 " +
        "00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z\" clip-rule=\"evenodd\"></path>" +
        "</svg></button></td>";

      tbody.appendChild(tr);
    });

    if (typeof window.initFlowbite === "function") {
      window.initFlowbite();
    }
  }

  /**
   * Carga miembros del equipo desde Lambda.
   * @param {string} idNegocio - Id del negocio.
   * @return {Promise<void>} Promesa de finalización.
   */
  async function loadTeamMembers(idNegocio) {
    const tbody = $("#page-content table tbody");
    if (!tbody) {
      // eslint-disable-next-line no-console
      console.error("Table body missing.");
      return;
    }

    tbody.innerHTML =
      "<tr><td colspan=\"4\" class=\"text-center p-6 text-gray-500 " +
      "dark:text-gray-400\">Cargando equipo...</td></tr>";

    const url =
      LAMBDA_PROFILE_URL + "?action=getTeamMembers&id_negocio=" + idNegocio;

    try {
      const res = await fetch(url);
      const teamMembers = await res.json();
      if (!res.ok) {
        throw new Error(teamMembers.message || "Error " + res.status);
      }
      renderTeamTable(teamMembers);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error loading team:", err);
      tbody.innerHTML =
        "<tr><td colspan=\"4\" class=\"text-center p-6 text-red-600 " +
        "dark:text-red-400\">Error: " + err.message + "</td></tr>";
    }
  }

  /**
   * Actualiza un miembro del equipo.
   * @param {string} idNegocio - Id del negocio.
   * @param {string|number} targetUserId - Id del usuario a actualizar.
   * @param {string} name - Nombre.
   * @param {string} email - Correo.
   * @return {Promise<void>} Promesa de finalización.
   */
  async function updateTeamMember(idNegocio, targetUserId, name, email) {
    const url =
      LAMBDA_PROFILE_URL + "?action=updateTeamMember&id_negocio=" + idNegocio;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          targetUserId: parseInt(targetUserId, 10),
          name: name,
          email: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error " + res.status);

      showFeedback(data.message || "Miembro actualizado.", "success");
      await loadTeamMembers(idNegocio);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error updating member:", err);
      showFeedback("Error al actualizar: " + err.message, "error");
      throw err;
    }
  }

  /**
   * Elimina un miembro del equipo.
   * @param {string} idNegocio - Id del negocio.
   * @param {string|number} targetUserId - Id del usuario a eliminar.
   * @return {Promise<void>} Promesa de finalización.
   */
  async function deleteTeamMember(idNegocio, targetUserId) {
    const url =
      LAMBDA_PROFILE_URL + "?action=deleteTeamMember&id_negocio=" + idNegocio;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          targetUserId: parseInt(targetUserId, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error " + res.status);

      showFeedback(data.message || "Miembro eliminado.", "success");
      await loadTeamMembers(idNegocio);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error deleting member:", err);
      showFeedback("Error al eliminar: " + err.message, "error");
    }
  }

  /**
   * Agrega un miembro al equipo.
   * @param {string} idNegocio - Id del negocio.
   * @param {string} name - Nombre.
   * @param {string} email - Correo.
   * @return {Promise<boolean>} true si éxito; false si falla.
   */
  async function addTeamMember(idNegocio, name, email) {
    const url =
      LAMBDA_PROFILE_URL + "?action=addTeamMember&id_negocio=" + idNegocio;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name: name, email: email}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error " + res.status);

      showFeedback(data.message || "Miembro agregado.", "success");
      await loadTeamMembers(idNegocio);
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error adding member:", err);
      showFeedback("Error al agregar: " + err.message, "error");
      return false;
    }
  }

  // ===== Modal/Drawer Handling =====

  const editModalEl = $("#edit-member-modal");
  const editFormEl = $("#edit-member-form");
  const editNameInputEl = $("#edit-member-name");
  const editEmailInputEl = $("#edit-member-email");
  const editUserIdHiddenEl = $("#edit-member-id");
  let editModalInstance = null;

  const addModalEl = $("#add-member-panel");
  const addFormEl = $("#add-member-form");
  const addNameInputEl = $("#member-name");
  const addEmailInputEl = $("#member-email");
  let addModalInstance = null;

  /**
   * Obtiene o crea una instancia de Modal de Flowbite para un elemento.
   * @param {Element} modalElement - Elemento del modal.
   * @return {any|null} Instancia de Modal o null si no disponible.
   */
  function getModalInstance(modalElement) {
    if (!modalElement) return null;

    const hasModal =
      typeof window !== "undefined" && typeof window.Modal !== "undefined";

    if (!hasModal) {
      // eslint-disable-next-line no-console
      console.warn("Flowbite Modal JS missing.");
      return null;
    }

    // @ts-ignore: Flowbite expone Modal en window
    const existing = window.Modal.getInstance ?
        window.Modal.getInstance(modalElement) :
        null;

    // @ts-ignore
    return existing || new window.Modal(modalElement, {
      closable: true,
      backdrop: "static",
    });
  }

  /**
   * Abre el modal de edición con datos actuales.
   * @param {string} userId - Id de usuario.
   * @param {string} currentName - Nombre actual.
   * @param {string} currentEmail - Email actual.
   * @return {void}
   */
  function openEditModal(userId, currentName, currentEmail) {
    if (!editUserIdHiddenEl || !editNameInputEl || !editEmailInputEl) return;
    editUserIdHiddenEl.value = userId;
    editNameInputEl.value = currentName;
    editEmailInputEl.value = currentEmail;
    if (!editModalInstance) editModalInstance = getModalInstance(editModalEl);
    if (editModalInstance && editModalInstance.show) editModalInstance.show();
  }

  /**
   * Cierra el modal de edición.
   * @return {void}
   */
  function closeEditModal() {
    if (!editModalInstance) editModalInstance = getModalInstance(editModalEl);
    if (editModalInstance && editModalInstance.hide) editModalInstance.hide();
  }

  /**
   * Abre el panel/modal para agregar miembro.
   * @return {void}
   */
  function openAddModal() {
    if (!addFormEl) return;
    addFormEl.reset();
    if (!addModalInstance) addModalInstance = getModalInstance(addModalEl);
    if (addModalInstance && addModalInstance.show) addModalInstance.show();
  }

  /**
   * Cierra el panel/modal de agregar miembro.
   * @return {void}
   */
  function closeAddModal() {
    if (!addModalInstance) addModalInstance = getModalInstance(addModalEl);
    if (addModalInstance && addModalInstance.hide) addModalInstance.hide();
  }

  // ===== Initialization =====

  document.addEventListener("DOMContentLoaded", () => {
    const idNegocio = getIdNegocio();
    if (idNegocio) {
      loadTeamMembers(idNegocio);
    } else {
      const loader = $("#loader-overlay");
      if (loader) loader.remove();
      const tbody = $("#page-content table tbody");
      if (tbody) {
        tbody.innerHTML =
          "<tr><td colspan=\"4\" class=\"text-center p-6 text-red-600 " +
          "dark:text-red-400\">Error de autenticación.</td></tr>";
      }
    }

    // Delegación de eventos Edit/Borrar
    const pageContent = $("#page-content");
    if (pageContent) {
      pageContent.addEventListener("click", (e) => {
        const target = e.target || e.srcElement;
        const button = target && target.closest ?
          target.closest("button[data-action]") :
          null;
        if (!button || button.disabled) return;

        const action = button.dataset.action;
        const userId = button.dataset.userId;
        const currentIdNegocio = getIdNegocio();
        if (!userId || !currentIdNegocio) return;

        if (action === "edit-member") {
          const row = button.closest("tr");
          if (!row) return;
          const name = row.dataset.userName || "";
          const email = row.dataset.userEmail || "";
          openEditModal(userId, name, email);
        } else if (action === "delete-member") {
          const row = button.closest("tr");
          const name = row ? (row.dataset.userName ||
            ("ID " + userId)) : ("ID " + userId);
          if (confirm("¿Seguro que quieres eliminar a \"" + name + "\"?")) {
            const restore = setBusy(button, "...");
            deleteTeamMember(currentIdNegocio, userId).finally(restore);
          }
        }
      });
    }

    // Envío del formulario de edición
    if (editFormEl) {
      editFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const targetUserId = editUserIdHiddenEl ? editUserIdHiddenEl.value : "";
        const name = editNameInputEl ? editNameInputEl.value.trim() : "";
        const email = editEmailInputEl ? editEmailInputEl.value.trim() : "";
        const currentIdNegocio = getIdNegocio();
        const saveBtn = editFormEl.querySelector("button[type=\"submit\"]");

        if (!targetUserId || !name || !email || !currentIdNegocio) {
          showFeedback("Faltan datos.", "error");
          return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
          showFeedback("Correo inválido.", "error");
          return;
        }

        const restore = setBusy(saveBtn, "Guardando...");
        try {
          await updateTeamMember(currentIdNegocio, targetUserId, name, email);
          closeEditModal();
        } catch (_err) {
          // ya notificado
        } finally {
          restore();
        }
      });
    }

    // Envío del formulario de alta
    if (addFormEl) {
      addFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = addNameInputEl ? addNameInputEl.value.trim() : "";
        const email = addEmailInputEl ? addEmailInputEl.value.trim() : "";
        const currentIdNegocio = getIdNegocio();
        const addBtn = addFormEl.querySelector("button[type=\"submit\"]");

        if (!name || !email || !currentIdNegocio) {
          showFeedback("Faltan datos.", "error");
          return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
          showFeedback("Correo inválido.", "error");
          return;
        }

        const restore = setBusy(addBtn, "Agregando...");
        try {
          const success = await addTeamMember(currentIdNegocio, name, email);
          if (success) closeAddModal();
        } catch (_err) {
          // ya notificado
        } finally {
          restore();
        }
      });
    }

    // Botón para abrir el panel de alta
    const openAddBtn = $("#openAddMember");
    if (openAddBtn) {
      openAddBtn.addEventListener("click", openAddModal);
    }
  });
})();
