/* eslint-env browser, es2021 */
/* eslint-disable max-len, require-jsdoc, brace-style, no-multi-spaces */
// /functions/static/admins/inicio.js  (browser script - no imports)
// Este archivo consume la API REST en Functions que
// se conecta a tu RDS (MySQL).
// Endpoints esperados:
//   GET    /api/admin/negocios?q=&status=&category=&limit=100
//   POST   /api/admin/negocios
//   PATCH  /api/admin/negocios/:id/status

// const e = require("express");

const tbody = document.getElementById("biz-tbody");
const emptyState = document.getElementById("empty-state");
const loaderOverlay = document.getElementById("loader-overlay");

const searchInput = document.getElementById("searchInput");
const filterStatusSel = document.getElementById("filter-status");
const filterCategory = document.getElementById("filter-category");
const filterApplyBtn = document.getElementById("filter-apply");
const filterClearBtn = document.getElementById("filter-clear");

const addForm = document.getElementById("add-business-form");

const drawer = document.getElementById("addBusinessPanel");
const openAddBtn = document.getElementById("openAddBusiness");
const editPanel = document.getElementById("editBusinessPanel");
const editForm = document.getElementById("edit-business-form");

let negociosCache = [];
let firstLoad = true;

/**
 * MODO DEMO (sin DB)
 * Cambia USE_MOCK a false cuando conectes la API.
 */
const USE_MOCK = true;

// Datos de ejemplo para trabajar sin conexión a la DB
const MOCK_DATA = [
  {id: 1, nombre: "Test Café", representante: "Mike", correo: "test@example.com", telefono: "5551234567", categoria: "Servicios", ubicacion: "Atizapán", descripcion: "Café artesanal", beneficio: "10% en bebidas", estado: "Activa", created_at: Date.now() - 1000 * 60 * 60 * 24 * 5},
  {id: 2, nombre: "Taquería DO", representante: "Ana", correo: "ana@do.com", telefono: "5551112222", categoria: "Comida",   ubicacion: "CDMX",     descripcion: "Tacos al pastor", beneficio: "2x1 martes",      estado: "Inactiva", created_at: Date.now() - 1000 * 60 * 60 * 24 * 12},
  {id: 3, nombre: "Gimnasio X", representante: "Luis", correo: "luis@x.com", telefono: "5553334444", categoria: "Salud",    ubicacion: "Naucalpan", descripcion: "Membresías",      beneficio: "Mes gratis",      estado: "Activa",   created_at: Date.now() - 1000 * 60 * 60 * 24 * 30},
];

function nextId() {
  const ids = MOCK_DATA.map((x) => Number(x.id) || 0);
  let max = 0;
  for (let i = 0; i < ids.length; i++) {if (ids[i] > max) max = ids[i];}
  return max + 1;
}

function normDate(d) {
  try {
    if (!d) return "-";
    const date = typeof d === "string" ? new Date(d) : new Date(Number(d));
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  } catch (e) {return "-";}
}

function statusBadge(status, idx, id) {
  const active = status === "Activa";
  const btnCls = active ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
  const dotCls = active ? "bg-green-500" : "bg-yellow-500";
  return `
    <div class="relative inline-block" data-status-container>
      <button type="button" id="status-btn-${idx}"
        data-status-btn data-dropdown-toggle="status-dd-${idx}"
        class="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 ${btnCls}">
        <span class="w-2 h-2 rounded-full ${dotCls}" data-status-dot></span>
        <span data-status-text>${active ? "Activa" : "Inactiva"}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
             fill="currentColor" class="ms-1 h-3 w-3">
          <path fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
          clip-rule="evenodd"/>
        </svg>
      </button>
      <div id="status-dd-${idx}" class="z-20 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-28">
        <ul class="py-1 text-sm text-gray-700">
          <li><button type="button" class="w-full text-left px-4 py-2 hover:bg-gray-100"
          data-set-status="Activa" data-id="${id}">Activa</button></li>
          <li><button type="button" class="w-full text-left px-4 py-2 hover:bg-gray-100"
          data-set-status="Inactiva" data-id="${id}">Inactiva</button></li>
        </ul>
      </div>
    </div>`;
}

function render(list) {
  tbody.innerHTML = "";
  if (!list.length) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  list.forEach((n, i) => {
    const tr = document.createElement("tr");
    tr.className = "bg-white border-t border-gray-200 hover:bg-gray-50";
    tr.dataset.id = n.id;

    tr.innerHTML = `
      <td class="px-4 py-4">${String(i+1).padStart(2, "0")}</td>
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-gray-200"></div>
          <div>
            <div class="font-medium text-gray-900">${n.nombre || "-"}</div>
            <div class="text-xs text-gray-500">${n.correo || ""}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4">${statusBadge(n.estado || "Activa", i+1, n.id)}</td>
      <td class="px-6 py-4">${normDate(n.created_at)}</td>
      <td class="px-6 py-4">${n.descripcion ? n.descripcion.substring(0, 60) : ""}</td>
      <td class="px-6 py-4 text-right">
        <button type="button" 
        data-modal-target="editBusinessPanel" 
        data-modal-toggle="editBusinessPanel" 
        class="inline-flex items-center p-2 rounded hover:bg-gray-100" 
        title="Editar" 
        data-edit-id="${n.id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          class="h-5 w-5 text-emerald-600"><path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0L3.9 16.388a5.25 5.25 0 0 0-1.32 2.214l-.8 2.401a.75.75 0 0 0 .948.948l2.401-.8a5.25 5.25 0 0 0 2.214-1.32L21.731 5.981a2.625 2.625 0 0 0 0-3.712Zm-5.004 3.256 1.748 1.748-9.9 9.9a3.75 3.75 0 0 1-1.582.95l-1.86.62.62-1.86a3.75 3.75 0 0 1 .95-1.582l9.9-9.9Z"/></svg>
        </button>
        <button type="button" class="inline-flex items-center p-2 rounded hover:bg-gray-100 ms-1" title="Borrar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          class="h-5 w-5 text-red-600">
          <path d="M9 3.75A1.5 1.5 0 0 1 10.5 2.25h3A1.5 1.5 0 0 1 15 3.75V5H19.5a.75.75 0 0 1 0 1.5h-15A.75.75 0 0 1 4.5 5H9V3.75Z"/>
          <path d="M6.75 7.25h10.5l-.64 11.063A2.25 2.25 0 0 1 14.37 20.5H9.63a2.25 2.25 0 0 1-2.241-2.187L6.75 7.25Z"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (typeof window.initFlowbite === "function") {
    try {window.initFlowbite();} catch (e) {/* noop: Flowbite puede no estar cargado aún */}
  }
}

function openEdit() {
  if (!editPanel) return;
  editPanel.removeAttribute("hidden");
  editPanel.setAttribute("aria-hidden", "false");
  editPanel.classList.remove("translate-x-full");
}
function closeEdit() {
  if (!editPanel) return;
  editPanel.classList.add("translate-x-full");
  editPanel.setAttribute("aria-hidden", "true");
  setTimeout(() => editPanel.setAttribute("hidden", ""), 0);
}

function getFilters() {
  return {
    q: ((searchInput ? searchInput.value : "") || "").trim(),
    status: (filterStatusSel ? filterStatusSel.value : "all"),
    category: ((filterCategory ? filterCategory.value : "") || "").trim(),
  };
}

function openDrawer() {
  if (!drawer) return;
  drawer.removeAttribute("hidden");
  drawer.setAttribute("aria-hidden", "false");
  drawer.classList.remove("translate-x-full");
}
function closeDrawer() {
  if (!drawer) return;
  drawer.classList.add("translate-x-full");
  drawer.setAttribute("aria-hidden", "true");
  setTimeout(() => drawer.setAttribute("hidden", ""), 250); // tras la transición
}

// Garantiza que arranque oculto (iOS a veces ignora el hidden inicial)
if (drawer) {
  drawer.classList.add("translate-x-full");
  drawer.setAttribute("aria-hidden", "true");
  drawer.setAttribute("hidden", "");
}
if (editPanel) {
  editPanel.setAttribute("aria-hidden", "true");
  editPanel.setAttribute("hidden", "");
}

// Abrir/cerrar
if (openAddBtn) {
  openAddBtn.addEventListener("click", (e) => {e.preventDefault(); openDrawer();});
}
document.querySelectorAll("[data-drawer-hide=\"addBusinessPanel\"]").forEach((btn) => {
  btn.addEventListener("click", (e) => {e.preventDefault(); closeDrawer();});
});
document.querySelectorAll("[data-edit-hide=\"editBusinessPanel\"]").forEach((btn) => {
  btn.addEventListener("click", (e) => {e.preventDefault(); closeEdit();});
});
// Cerrar con tecla Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {closeDrawer(); closeEdit();}
});
// Delegación para abrir y prellenar el panel de edición
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-edit-id]");
  if (!btn) return;
  const id = btn.getAttribute("data-edit-id");
  const item = negociosCache.find((x) => String(x.id) === String(id));
  if (!item) return;

  if (editForm) {
    editForm.dataset.id = String(item.id);
    const setV = (elId, val) => {const el = document.getElementById(elId); if (el) el.value = val || "";};
    setV("edit-neg-nombre", item.nombre);
    setV("edit-neg-representante", item.representante);
    setV("edit-neg-correo", item.correo);
    setV("edit-neg-telefono", item.telefono);
    setV("edit-neg-categoria", item.categoria);
    setV("edit-neg-ubicacion", item.ubicacion);
    const desc = document.getElementById("edit-neg-descripcion"); if (desc) desc.value = item.descripcion || "";
    setV("edit-neg-beneficio", item.beneficio);
    const radios = editForm.querySelectorAll("input[name=\"edit-estado\"]");
    radios.forEach((r) => {r.checked = (String(r.value) === String(item.estado || "Activa"));});
  }
  openEdit();
});
async function updateNegocio(id, payload) {
  if (USE_MOCK) {
    const idx = MOCK_DATA.findIndex((x) => String(x.id) === String(id));
    if (idx !== -1) {
      MOCK_DATA[idx] = Object.assign({}, MOCK_DATA[idx], payload);
    }
    return {id};
  }
  /* =================== DB/API (comentado) ===================
  const res = await fetch(`/api/admin/negocios/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`PATCH negocio ${res.status}`);
  return res.json();
  ============================================================ */
}


async function fetchNegocios() {
  const {q, status, category} = getFilters();

  if (USE_MOCK) {
    const qlc = (q || "").toLowerCase();
    const catlc = (category || "").toLowerCase();
    const filtered = MOCK_DATA
        .filter((n) => {
          const okStatus = (status === "all" || n.estado === status);
          const okCat = (!catlc || String(n.categoria || "").toLowerCase().indexOf(catlc) !== -1);
          const blob = [
            n.nombre, n.representante, n.correo, n.telefono,
            n.categoria, n.ubicacion, n.descripcion, n.beneficio,
          ].join(" ").toLowerCase();
          const okQ = (!qlc || blob.indexOf(qlc) !== -1);
          return okStatus && okCat && okQ;
        })
        .sort((a, b) => (Number(b.created_at || 0) - Number(a.created_at || 0)));
    negociosCache = filtered;
    render(negociosCache);
    if (firstLoad) {
      firstLoad = false;
      if (loaderOverlay) loaderOverlay.classList.add("hidden");
    }
    return;
  }

  /* =================== DB/API (comentado) ===================
  const params = new URLSearchParams({ q, status, category, limit: "100" });
  const res = await fetch(`/api/admin/negocios?${params.toString()}`, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`GET negocios ${res.status}`);
  const data = await res.json(); // { items: [...] }
  negociosCache = Array.isArray(data.items) ? data.items : [];
  render(negociosCache);
  if (firstLoad) {
    firstLoad = false;
    if (loaderOverlay) loaderOverlay.classList.add("hidden");
  }
  ============================================================ */
}

async function patchStatus(id, estado) {
  if (USE_MOCK) {
    let idx = -1;
    for (let i = 0; i < MOCK_DATA.length; i++) {
      if (String(MOCK_DATA[i].id) === String(id)) {idx = i; break;}
    }
    if (idx !== -1) {MOCK_DATA[idx].estado = estado;}
    return {ok: true};
  }

  /* =================== DB/API (comentado) ===================
  const res = await fetch(`/api/admin/negocios/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado })
  });
  if (!res.ok) throw new Error(`PATCH status ${res.status}`);
  ============================================================ */
}

async function createNegocio(payload) {
  if (USE_MOCK) {
    const item = Object.assign({}, payload, {id: nextId(), created_at: Date.now()});
    // Al principio para que aparezca hasta arriba
    MOCK_DATA.unshift(item);
    return {id: item.id};
  }

  /* =================== DB/API (comentado) ===================
  const res = await fetch(`/api/admin/negocios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`POST negocios ${res.status}`);
  return res.json();
  ============================================================ */
}

// Eventos UI
if (searchInput) {
  searchInput.addEventListener("input", () => {
    fetchNegocios().catch(console.error);
  });
}
if (filterApplyBtn) {
  filterApplyBtn.addEventListener("click", () => {
    fetchNegocios().catch(console.error);
  });
}
if (filterClearBtn) {
  filterClearBtn.addEventListener("click", () => {
    if (filterStatusSel) {filterStatusSel.value = "all";}
    if (filterCategory)  {filterCategory.value  = "";}
    fetchNegocios().catch(console.error);
  });
}

// Delegación para cambiar estado
document.addEventListener("click", async (e) => {
  const opt = e.target.closest("[data-set-status]");
  if (!opt) return;
  const estado = opt.getAttribute("data-set-status");
  let id;
  if (opt.getAttribute("data-id")) {
    id = opt.getAttribute("data-id");
  } else {
    const tr = opt.closest("tr");
    if (tr && tr.dataset) {
      id = tr.dataset.id;
    }
  }
  if (!id) return;

  const container = opt.closest("[data-status-container]");
  if (container) {
    const btn = container.querySelector("[data-status-btn]");
    const dot = container.querySelector("[data-status-dot]");
    const text = container.querySelector("[data-status-text]");
    btn.classList.remove("bg-green-100", "text-green-800",
        "bg-yellow-100", "text-yellow-800");
    dot.classList.remove("bg-green-500", "bg-yellow-500");
    if (estado === "Activa") {
      btn.classList.add("bg-green-100", "text-green-800");
      dot.classList.add("bg-green-500");
      text.textContent = "Activa";
    } else {
      btn.classList.add("bg-yellow-100", "text-yellow-800");
      dot.classList.add("bg-yellow-500");
      text.textContent = "Inactiva";
    }
  }

  try {
    await patchStatus(id, estado);
  } catch (err) {
    console.error("[inicio] No se pudo actualizar estado:", err);
    fetchNegocios().catch(console.error);
  }
});

// Alta de negocio
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(addForm);
    const getVal = (key) => {
      const v = fd.get(key);
      return (v ? String(v) : "").trim();
    };
    const estadoVal = fd.get("estado");
    const estadoStr = estadoVal ? String(estadoVal) : "Activa";

    const payload = {
      nombre: getVal("nombre"),
      representante: getVal("representante"),
      correo: getVal("correo"),
      telefono: getVal("telefono"),
      categoria: getVal("categoria"),
      ubicacion: getVal("ubicacion"),
      descripcion: getVal("descripcion"),
      beneficio: getVal("beneficio"),
      estado: estadoStr,
    };
    try {
      await createNegocio(payload);
      addForm.reset();
      closeDrawer();
      await fetchNegocios();
    } catch (err) {
      console.error("[inicio] No se pudo crear el negocio:", err);
      window.alert("No se pudo guardar. Revisa consola.");
    }
  });
}

// Edición de negocio
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = editForm.dataset.id;
    const fd = new FormData(editForm);
    const getVal = (key) => {const v = fd.get(key); return (v ? String(v) : "").trim();};
    const estadoVal = fd.get("edit-estado");
    const estadoStr = estadoVal ? String(estadoVal) : "Activa";
    const payload = {
      nombre: getVal("nombre"),
      representante: getVal("representante"),
      correo: getVal("correo"),
      telefono: getVal("telefono"),
      categoria: getVal("categoria"),
      ubicacion: getVal("ubicacion"),
      descripcion: getVal("descripcion"),
      beneficio: getVal("beneficio"),
      estado: estadoStr,
    };
    try {
      await updateNegocio(id, payload);
      closeEdit();
      await fetchNegocios();
    } catch (err) {
      console.error("[inicio] No se pudieron guardar los cambios:", err);
      window.alert("No se pudieron guardar los cambios. Revisa consola.");
    }
  });
}

// Primera carga
fetchNegocios().catch((e) => {
  console.error(e);
  if (loaderOverlay) loaderOverlay.classList.add("hidden");
});
