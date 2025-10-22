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
      return "Fecha inválida";
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

    const svg =
      "<svg class=\"animate-spin -ml-1 mr-2 h-4 w-4 text-current\" " +
      "xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\">" +
      "<circle class=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" " +
      "stroke=\"currentColor\" stroke-width=\"4\"></circle>" +
      "<path class=\"opacity-75\" fill=\"currentColor\" " +
      "d=\"M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z\"></path></svg>";

    btn.innerHTML =
      "<span class=\"inline-flex items-center\">" + svg + " " +
      busyText + "</span>";

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
    if (!tbody) {
      // eslint-disable-next-line no-console
      console.error("Table body not found!");
      return;
    }

    if (!teamMembers || teamMembers.length === 0) {
      tbody.innerHTML =
        "<tr><td colspan=\"4\" class=\"text-center p-6 text-gray-500\">" +
        "No hay miembros registrados.</td></tr>";
      return;
    }

    tbody.innerHTML = "";

    teamMembers.forEach((member, index) => {
      const isOwner = member.isOwner === true;

      const tr = document.createElement("tr");
      tr.className =
        "bg-white border-b hover:bg-gray-50";
      tr.dataset.userId = member.id;
      tr.dataset.userName = member.name || "";
      tr.dataset.userEmail = member.email || "";

      // Iniciales
      let initials = "?";
      if (member.name && member.name.length > 0) {
        initials = member.name.charAt(0).toUpperCase();
      }

      // Tag propietario
      let ownerTag = "";
      if (isOwner) {
        ownerTag =
          "<span class=\"text-xs font-normal text-blue-600\">"+
          "(Propietario)</span>";
      }

      // Atributos/clases dependientes de isOwner (sin ternarios partidos)
      let disabledAttr = "";
      let stateClass = "hover:bg-gray-100";
      let editTitle = "Editar";
      let deleteTitle = "Borrar";

      if (isOwner) {
        disabledAttr = "disabled";
        stateClass = "opacity-50 cursor-not-allowed";
        editTitle = "No se puede editar al propietario";
        deleteTitle = "No se puede eliminar al propietario";
      }
      const idx = String(index + 1).padStart(2, "0");

      tr.innerHTML =
        "<td class=\"px-4 py-3 font-medium text-gray-900 " +
        "hitespace-nowrap\">" + idx + "</td>" +
        "<td class=\"px-6 py-3\">" +
        "<div class=\"flex items-center gap-3\">" +
        "<div class=\"w-9 h-9 rounded-full bg-gray-200 flex" +
        "items-center justify-center text-gray-600" +
        "text-sm font-medium ring-1 ring-gray-300\">" +
        initials + "</div>" +
        "<div>" +
        "<div class=\"font-medium text-gray-900\">" +
        (member.name || "N/A") + " " + ownerTag + "</div>" +
        "<div class=\"text-xs text-gray-500\">" +
        (member.email || "N/A") + "</div>" +
        "</div></div></td>" +
        "<td class=\"px-6 py-3 text-gray-500\">" +
        formatDate(member.joinDate) + "</td>" +
        "<td class=\"px-6 py-3 text-right\">" +
        "<!-- Edit Button -->" +
        "<button type=\"button\" data-action=\"edit-member\" " +
        "data-user-id=\"" + member.id + "\" " + disabledAttr + " " +
        "class=\"inline-flex items-center p-1.5 rounded text-sm " +
        "font-medium text-center text-gray-500 hover:text-gray-800 " +
        "focus:ring-2 focus:outline-none focus:ring-gray-300 " +
        stateClass + "\" title=\"" + editTitle + "\">" +
        "<svg class=\"w-4 h-4\" fill=\"currentColor\" viewBox=\"0 0 20 20\">" +
        "<path d=\"M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828" +
        "l7.586-7.586a2 2 0 000-2.828z\"></path>" +
        "<path fill-rule=\"evenodd\" d=\"M2 6a2 2 0 012-2h4a1 1 0 010 " +
        "2H4v10h10 v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z\" " +
        "clip-rule=\"evenodd\"></path></svg></button>" +
        "<!-- Delete Button -->" +
        "<button type=\"button\" data-action=\"delete-member\" " +
        "data-user-id=\"" + member.id + "\" " + disabledAttr + " " +
        "class=\"inline-flex items-center p-1.5 rounded text-sm " +
        "font-medium text-center text-gray-500 hover:text-gray-800 " +
        "focus:ring-2 focus:outline-none focus:ring-gray-300 " +
        "ms-1 " + stateClass + "\" title=\"" + deleteTitle + "\">" +
        "<svg class=\"w-4 h-4\" fill=\"currentColor\" viewBox=\"0 0 20 20\">" +
        "<path fill-rule=\"evenodd\" d=\"M9 2a1 1 0 00-.894.553L7.382 4H4a1 " +
        "1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 " +
        "100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 " +
        "11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z\" " +
        "clip-rule=\"evenodd\"></path> </svg></button></td>";

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
      "<tr><td colspan=\"4\" class=\"text-center p-6 text-gray-500\">" +
      "Cargando equipo...</td></tr>";

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
        "<tr><td colspan=\"4\" class=\"text-center p-6 text-red-600\">"+
        "Error al cargar: " + err.message + "</td></tr>";
    }
  }

  /**
   * Actualiza un miembro del equipo.
   * @param {string} idNegocio - Id del negocio.
   * @param {string} targetUserId - Id del usuario a actualizar.
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
        body: JSON.stringify({targetUserId, name, email}),
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
   * @param {string} targetUserId - Id del usuario a eliminar.
   * @return {Promise<void>} Promesa de finalización.
   */
  async function deleteTeamMember(idNegocio, targetUserId) {
    const url =
      LAMBDA_PROFILE_URL + "?action=deleteTeamMember&id_negocio=" + idNegocio;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({targetUserId}),
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

  // ===== Edit Modal Logic =====

  const editModalEl = $("#edit-member-modal");
  const editFormEl = $("#edit-member-form");
  const editNameInputEl = $("#edit-member-name");
  const editEmailInputEl = $("#edit-member-email");
  const editUserIdHiddenEl = $("#edit-member-id");
  let modalInstance = null;

  /**
   * Inicializa y devuelve la instancia de Modal de Flowbite.
   * @return {any|null} Instancia o null si no disponible.
   */
  function getModal() {
    const hasWindow = typeof window !== "undefined";
    const hasModal = hasWindow && typeof window.Modal !== "undefined";

    if (!modalInstance && hasModal && editModalEl) {
      modalInstance = new window.Modal(editModalEl, {
        closable: true,
        backdrop: "static",
      });
    } else if (!editModalEl) {
      // eslint-disable-next-line no-console
      console.error("Edit modal HTML not found.");
    } else if (!hasModal) {
      // eslint-disable-next-line no-console
      console.warn("Flowbite Modal JS missing.");
    }
    return modalInstance;
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

    const modal = getModal();
    if (modal) modal.show();
  }

  /**
   * Cierra el modal de edición.
   * @return {void}
   */
  function closeEditModal() {
    const modal = getModal();
    if (modal) modal.hide();
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
          "<tr><td colspan=\"4\" class=\"text-center p-6 text-red-600\">" +
          "Error de autenticación. No se pudo cargar el equipo.</td></tr>";
      }
    }

    // === Abrir modal "Agregar miembro" (Flowbite) ===
    const addPanelEl = document.getElementById("add-member-panel");
    const openAddBtn = document.getElementById("openAddMember");

    if (openAddBtn && addPanelEl && typeof window.Modal !== "undefined") {
      const addModal = new window.Modal(addPanelEl, {
        closable: true,
        backdrop: "static",
      });

      openAddBtn.addEventListener("click", (e) => {
        e.preventDefault();
        addModal.show();
      });

      // Cerrar con botones [data-modal-hide="add-member-panel"]
      document
          .querySelectorAll("[data-modal-hide='add-member-panel']")
          .forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              addModal.hide();
            });
          });
    }

    // Proactively initialize Edit Member modal so Flowbite registers it
    getModal();

    // Delegación de eventos Edit/Borrar
    const pageContent = $("#page-content");
    if (pageContent) {
      pageContent.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn || btn.disabled) return;

        const action = btn.dataset.action;
        const userId = btn.dataset.userId;
        const currentId = getIdNegocio();
        if (!userId || !currentId) return;

        if (action === "edit-member") {
          const row = btn.closest("tr");
          const name = row ? (row.dataset.userName || "") : "";
          const email = row ? (row.dataset.userEmail || "") : "";
          openEditModal(userId, name, email);
        } else if (action === "delete-member") {
          const row = btn.closest("tr");
          const name = row ? (row.dataset.userName || ("ID " + userId)) : "";
          if (confirm(
              "¿Estás seguro de que quieres eliminar a \"" +
              name + "\"?\nEsta acción es permanente.",
          )) {
            const restore = setBusy(btn, "Eliminando...");
            deleteTeamMember(currentId, userId).finally(restore);
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
        const currentId = getIdNegocio();
        const saveBtn = editFormEl.querySelector("button[type=\"submit\"]");

        if (!targetUserId || !name || !email || !currentId) {
          showFeedback("Faltan datos.", "error");
          return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
          showFeedback("Correo inválido.", "error");
          return;
        }

        const restore = setBusy(saveBtn, "Guardando...");
        try {
          await updateTeamMember(currentId, targetUserId, name, email);
          closeEditModal();
        } catch (err) {
          // Ya se notificó en updateTeamMember
          // eslint-disable-next-line no-console
          console.error("Submit error caught:", err);
        } finally {
          restore();
        }
      });
    }
  });
})();
