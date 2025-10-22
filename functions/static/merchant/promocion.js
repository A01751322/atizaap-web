

/* eslint-env browser, es2021 */
/* eslint-disable max-len, require-jsdoc, brace-style, no-multi-spaces */
// Referencia estilo inicio-v0: listeners explícitos, IDs claros, sin depender de frameworks para el toggle.

// === Elementos de la vista ===
const openAddBtn = document.getElementById("openAddPromo");
const addPanel   = document.getElementById("addPromoPanel");
const editPanel  = document.getElementById("editPromoPanel");
const addForm    = document.getElementById("add-promo-form");
const editForm   = document.getElementById("edit-promo-form");
const tbody      = document.getElementById("promo-tbody");

// === Utilidades UI ===
function show(el) {
  if (!el) return;
  el.removeAttribute("hidden");
  el.setAttribute("aria-hidden", "false");
}
function hide(el) {
  if (!el) return;
  el.setAttribute("aria-hidden", "true");
  el.setAttribute("hidden", "");
}
function normDateStr(s) {
  if (!s) return "-";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
}
function pad2(n) {const s = String(n || 0); return s.length < 2 ? "0" + s : s;}
function statusBadgeHTML(status, key) {
  const active = String(status) === "Activa";
  const btnCls = active ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
  const dotCls = active ? "bg-green-500" : "bg-yellow-500";
  return `
    <div class="relative inline-block" data-status-container>
      <button type="button" id="status-btn-${key}"
        data-status-btn data-dropdown-toggle="status-dd-${key}"
        class="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 ${btnCls}">
        <span class="w-2 h-2 rounded-full ${dotCls}" data-status-dot></span>
        <span data-status-text>${active ? "Activa" : "Inactiva"}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="ms-1 h-3 w-3"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/></svg>
      </button>
      <div id="status-dd-${key}" class="z-20 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-28">
        <ul class="py-1 text-sm text-gray-700">
          <li><button type="button" class="w-full text-left px-4 py-2 hover:bg-gray-100" data-set-status="Activa">Activa</button></li>
          <li><button type="button" class="w-full text-left px-4 py-2 hover:bg-gray-100" data-set-status="Inactiva">Inactiva</button></li>
        </ul>
      </div>
    </div>`;
}

// Asegurar estado inicial
[addPanel, editPanel].forEach((p) => {if (p) {p.setAttribute("aria-hidden", "true"); p.setAttribute("hidden", "");}});

// === Botón "Crear Promoción" ===
if (openAddBtn && addPanel) {
  openAddBtn.addEventListener("click", (e) => {e.preventDefault(); show(addPanel);});
}

// === Botones de cerrar en ambos paneles (atributo data-modal-hide="...") ===
document.querySelectorAll("[data-modal-hide=\"addPromoPanel\"]").forEach((btn) => {
  btn.addEventListener("click", (e) => {e.preventDefault(); hide(addPanel);});
});
document.querySelectorAll("[data-modal-hide=\"editPromoPanel\"]").forEach((btn) => {
  btn.addEventListener("click", (e) => {e.preventDefault(); hide(editPanel);});
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {hide(addPanel); hide(editPanel);}
});

// === Abrir editar desde la tabla (botón con data-edit-id) ===
document.addEventListener("click", (e) => {
  const editBtn = e.target.closest("[data-edit-id]");
  if (!editBtn || !tbody || !editForm || !editPanel) return;
  const tr = editBtn.closest("tr");
  if (!tr) return;

  // Estructura esperada:
  // td1: índice
  // td2: creador (nombre .font-medium, correo .text-xs)
  // td3: estatus (badge con [data-status-text])
  // td4: fecha
  // td5: descripcion
  const nombre = tr.querySelector("td:nth-child(2) .font-medium")?.textContent?.trim() || "";
  const correo = tr.querySelector("td:nth-child(2) .text-xs")?.textContent?.trim() || "";
  const fecha  = tr.querySelector("td:nth-child(4)")?.textContent?.trim() || "";
  const desc   = tr.querySelector("td:nth-child(5)")?.textContent?.trim() || "";
  const estado = tr.querySelector("[data-status-text]")?.textContent?.trim() || "Activa";

  // Prellenar form
  const setVal = (id, val) => {const el = document.getElementById(id); if (el) el.value = String(val || "");};
  setVal("edit-promo-creador-nombre", nombre);
  setVal("edit-promo-creador-correo", correo);
  const d = new Date(fecha);
  if (!Number.isNaN(d.getTime())) {
    const iso = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0, 10);
    setVal("edit-promo-fecha", iso);
  } else {setVal("edit-promo-fecha", "");}
  const ta = document.getElementById("edit-promo-descripcion"); if (ta) ta.value = desc;
  // radios
  editForm.querySelectorAll("input[name=\"edit-estado\"]").forEach((r) => {r.checked = (String(r.value) === String(estado));});

  editForm.dataset.rowId = tr.getAttribute("data-id") || "";
  show(editPanel);
});

// === Guardar cambios (Editar) ===
if (editForm) {
  editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const rowId = editForm.dataset.rowId || "";
    const tr = rowId && tbody ? tbody.querySelector(`tr[data-id="${CSS.escape(rowId)}"]`) : null;
    if (!tr) {hide(editPanel); return;}

    const fd = new FormData(editForm);
    const get = (k) => (fd.get(k) ? String(fd.get(k)).trim() : "");
    const nombre = get("creador_nombre");
    const correo = get("creador_correo");
    const fecha  = get("fecha");
    const desc   = get("descripcion");
    const estado = fd.get("edit-estado") ? String(fd.get("edit-estado")) : "Activa";

    // Actualizar celdas
    const nameEl = tr.querySelector("td:nth-child(2) .font-medium");
    const mailEl = tr.querySelector("td:nth-child(2) .text-xs");
    const dateEl = tr.querySelector("td:nth-child(4)");
    const descEl = tr.querySelector("td:nth-child(5)");
    if (nameEl) nameEl.textContent = nombre || "-";
    if (mailEl) mailEl.textContent = correo || "";
    if (dateEl) dateEl.textContent = normDateStr(fecha);
    if (descEl) descEl.textContent = desc || "";

    const btn  = tr.querySelector("[data-status-btn]");
    const dot  = tr.querySelector("[data-status-dot]");
    const text = tr.querySelector("[data-status-text]");
    if (btn && dot && text) {
      btn.classList.remove("bg-green-100", "text-green-800", "bg-yellow-100", "text-yellow-800");
      dot.classList.remove("bg-green-500", "bg-yellow-500");
      if (estado === "Activa") {
        btn.classList.add("bg-green-100", "text-green-800"); dot.classList.add("bg-green-500"); text.textContent = "Activa";
      } else {
        btn.classList.add("bg-yellow-100", "text-yellow-800"); dot.classList.add("bg-yellow-500"); text.textContent = "Inactiva";
      }
    }
    hide(editPanel);
  });
}

// === Alta (Agregar) ===
if (addForm && tbody) {
  // Default de fecha: hoy
  const fechaAdd = document.getElementById("promo-fecha");
  if (fechaAdd && !fechaAdd.value) {
    const d = new Date(); const iso = new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0, 10);
    fechaAdd.value = iso;
  }

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(addForm);
    const get = (k) => (fd.get(k) ? String(fd.get(k)).trim() : "");
    const nombre = get("creador_nombre");
    const correo = get("creador_correo");
    const fecha  = get("fecha");
    const desc   = get("descripcion");
    const estado = fd.get("estado") ? String(fd.get("estado")) : "Activa";

    const nextIndex = tbody.querySelectorAll("tr").length + 1;
    const id = pad2(nextIndex);
    const tr = document.createElement("tr");
    tr.className = "bg-white border-t border-gray-200 hover:bg-gray-50";
    tr.setAttribute("data-id", id);
    tr.innerHTML = `
      <td class="px-4 py-4">${id}</td>
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-gray-200"></div>
          <div>
            <div class="font-medium text-gray-900">${nombre || "-"}</div>
            <div class="text-xs text-gray-500">${correo || ""}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4">${statusBadgeHTML(estado, id)}</td>
      <td class="px-6 py-4">${normDateStr(fecha)}</td>
      <td class="px-6 py-4">${desc || ""}</td>
      <td class="px-6 py-4 text-right">
        <button type="button" class="inline-flex items-center p-2 rounded hover:bg-gray-100" title="Editar" data-edit-id="${id}" data-modal-target="editPromoPanel" data-modal-toggle="editPromoPanel">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-emerald-600"><path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0L3.9 16.388a5.25 5.25 0 0 0-1.32 2.214l-.8 2.401a.75.75 0 0 0 .948.948l2.401-.8a5.25 5.25 0 0 0 2.214-1.32L21.731 5.981a2.625 2.625 0 0 0 0-3.712Zm-5.004 3.256 1.748 1.748-9.9 9.9a3.75 3.75 0 0 1-1.582.95l-1.86.62.62-1.86a3.75 3.75 0 0 1 .95-1.582l9.9-9.9Z"/></svg>
        </button>
        <button type="button" class="inline-flex items-center p-2 rounded hover:bg-gray-100 ms-1" title="Borrar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-red-600"><path d="M9 3.75A1.5 1.5 0 0 1 10.5 2.25h3A1.5 1.5 0 0 1 15 3.75V5H19.5a.75.75 0 0 1 0 1.5h-15A.75.75 0 0 1 4.5 5H9V3.75Z"/><path d="M6.75 7.25h10.5l-.64 11.063A2.25 2.25 0 0 1 14.37 20.5H9.63a2.25 2.25 0 0 1-2.241-2.187L6.75 7.25Z"/></svg>
        </button>
      </td>`;
    tbody.appendChild(tr);

    if (typeof window.initFlowbite === "function") {try {window.initFlowbite();} catch (err) {
      /* no-op: Flowbite may not estar disponible en pruebas */

    }}
    addForm.reset();
    hide(addPanel);
  });
}

// === Cambiar estatus desde el dropdown ===
document.addEventListener("click", (e) => {
  const opt = e.target.closest("[data-set-status]");
  if (!opt) return;
  const estado = opt.getAttribute("data-set-status");
  const container = opt.closest("[data-status-container]");
  if (!container) return;
  const btn  = container.querySelector("[data-status-btn]");
  const dot  = container.querySelector("[data-status-dot]");
  const text = container.querySelector("[data-status-text]");
  if (!btn || !dot || !text) return;
  btn.classList.remove("bg-green-100", "text-green-800", "bg-yellow-100", "text-yellow-800");
  dot.classList.remove("bg-green-500", "bg-yellow-500");
  if (estado === "Activa") {
    btn.classList.add("bg-green-100", "text-green-800"); dot.classList.add("bg-green-500"); text.textContent = "Activa";
  } else {
    btn.classList.add("bg-yellow-100", "text-yellow-800"); dot.classList.add("bg-yellow-500"); text.textContent = "Inactiva";
  }
});
