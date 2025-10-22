/* eslint-env browser, es2021 */
/* eslint-disable max-len, require-jsdoc, brace-style, no-multi-spaces */

// Admins: lista + agregar + editar

const tbody = document.getElementById("admin-tbody");
const emptyState = document.getElementById("empty-state");
const loaderOverlay = document.getElementById("loader-overlay");

const searchInput = document.getElementById("searchInput");

const drawer = document.getElementById("addAdminPanel");
const openAddBtn = document.getElementById("openAddAdmin");
const addForm = document.getElementById("add-admin-form");

const editPanel = document.getElementById("editAdminPanel");
const editForm = document.getElementById("edit-admin-form");

let adminsCache = [];
let firstLoad = true;

/** MODO DEMO (sin DB) — cambia a false cuando conectes la API real. */
const USE_MOCK = true;

const MOCK_ADMINS = [
  {id: 1, nombre: "Mario García", correo: "mario@atizaap.mx", created_at: Date.now() - 1000 * 60 * 60 * 24 * 10},
  {id: 2, nombre: "Ana López",   correo: "ana@atizaap.mx",   created_at: Date.now() - 1000 * 60 * 60 * 24 * 25},
  {id: 3, nombre: "Mike Admin",  correo: "mike@atizaap.mx",  created_at: Date.now() - 1000 * 60 * 60 * 24 * 40},
];

function nextId() {
  const ids = MOCK_ADMINS.map((x) => Number(x.id) || 0);
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
  } catch (_) {return "-";}
}

function openPanel(panelEl) {
  if (!panelEl) return;
  panelEl.removeAttribute("hidden");
  panelEl.setAttribute("aria-hidden", "false");
  panelEl.classList.remove("translate-x-full", "hidden");
}

function closePanel(panelEl) {
  if (!panelEl) return;
  panelEl.classList.add("translate-x-full");
  panelEl.setAttribute("aria-hidden", "true");
  setTimeout(() => panelEl.setAttribute("hidden", ""), 150);
}

function render(list) {
  if (!tbody) {console.warn("[ajustes] Falta #admin-tbody en el HTML; no se puede renderizar."); return;}
  tbody.innerHTML = "";
  if (!list.length) {
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }
  if (emptyState) emptyState.classList.add("hidden");

  list.forEach((a, i) => {
    const tr = document.createElement("tr");
    tr.className = "bg-white border-t border-gray-200 hover:bg-gray-50";
    tr.dataset.id = a.id;

    tr.innerHTML = `
      <td class="px-4 py-4">${String(i + 1).padStart(2, "0")}</td>
      <td class="px-6 py-4">
        <div class="font-medium text-gray-900">${a.nombre || "-"}</div>
      </td>
      <td class="px-6 py-4">${a.correo || "-"}</td>
      <td class="px-6 py-4">${normDate(a.created_at)}</td>
      <td class="px-6 py-4 text-right">
        <button type="button"
          data-modal-target="editAdminPanel"
          data-modal-toggle="editAdminPanel"
          class="inline-flex items-center p-2 rounded hover:bg-gray-100"
          title="Editar"
          data-edit-id="${a.id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
               fill="currentColor" class="h-5 w-5 text-emerald-600">
            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0L3.9 16.388a5.25 5.25 0 0 0-1.32 2.214l-.8 2.401a.75.75 0 0 0 .948.948l2.401-.8a5.25 5.25 0 0 0 2.214-1.32L21.731 5.981a2.625 2.625 0 0 0 0-3.712Zm-5.004 3.256 1.748 1.748-9.9 9.9a3.75 3.75 0 0 1-1.582.95l-1.86.62.62-1.86a3.75 3.75 0 0 1 .95-1.582l9.9-9.9Z"/>
          </svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (typeof window.initFlowbite === "function" && drawer && editPanel) {
    try {window.initFlowbite();} catch (_) {/* noop */}
  }
}

async function fetchAdmins() {
  const q = ((searchInput ? searchInput.value : "") || "").trim().toLowerCase();

  if (USE_MOCK) {
    const filtered = MOCK_ADMINS
        .filter((a) => {
          if (!q) return true;
          const blob = `${a.nombre} ${a.correo}`.toLowerCase();
          return blob.includes(q);
        })
        .sort((a, b) => (Number(b.created_at || 0) - Number(a.created_at || 0)));
    adminsCache = filtered;
    render(adminsCache);
    if (firstLoad) {
      firstLoad = false;
      if (loaderOverlay) loaderOverlay.classList.add("hidden");
    }
    return;
  }

  /* ==== API REAL (ejemplo) ====
  const params = new URLSearchParams({q, limit: "100"});
  const res = await fetch(`/api/admin/admins?${params.toString()}`, {headers: {Accept: "application/json"}});
  if (!res.ok) throw new Error(`GET admins ${res.status}`);
  const data = await res.json(); // {items: [...]}
  adminsCache = Array.isArray(data.items) ? data.items : [];
  render(adminsCache);
  if (firstLoad) {firstLoad = false; loaderOverlay?.classList.add("hidden");}
  ============================== */
}

async function createAdmin(payload) {
  if (USE_MOCK) {
    const item = {...payload, id: nextId(), created_at: Date.now()};
    MOCK_ADMINS.unshift(item);
    return {id: item.id};
  }
  /* POST /api/admin/admins ... */
}

async function updateAdmin(id, payload) {
  if (USE_MOCK) {
    const idx = MOCK_ADMINS.findIndex((x) => String(x.id) === String(id));
    if (idx !== -1) MOCK_ADMINS[idx] = {...MOCK_ADMINS[idx], ...payload};
    return {id};
  }
  /* PATCH /api/admin/admins/:id ... */
}

/* ---------- Listeners UI (sin optional chaining) ---------- */

// Buscar en vivo
if (searchInput) {
  searchInput.addEventListener("input", () => {
    fetchAdmins().catch(console.error);
  });
}

// Abrir panel de alta
if (openAddBtn) {
  openAddBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openPanel(drawer);
  });
}

// Cerrar paneles con los botones que traen data-modal-hide
document.querySelectorAll("[data-modal-hide='addAdminPanel']").forEach((btn) => {
  btn.addEventListener("click", (e) => {e.preventDefault(); closePanel(drawer);});
});
document.querySelectorAll("[data-modal-hide='editAdminPanel']").forEach((btn) => {
  btn.addEventListener("click", (e) => {e.preventDefault(); closePanel(editPanel);});
});

// Cerrar con tecla Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {closePanel(drawer); closePanel(editPanel);}
});

// Abrir y prellenar el panel de edición
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-edit-id]");
  if (!btn) return;
  const id = btn.getAttribute("data-edit-id");
  const item = adminsCache.find((x) => String(x.id) === String(id));
  if (!item) return;

  if (editForm) {
    editForm.dataset.id = String(item.id);
    const setV = (elId, val) => {const el = document.getElementById(elId); if (el) el.value = val || "";};
    setV("edit-admin-nombre", item.nombre);
    setV("edit-admin-correo", item.correo);
  }
  openPanel(editPanel);
});

// Alta de admin
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(addForm);
    const payload = {
      nombre: (fd.get("nombre") || "").toString().trim(),
      correo: (fd.get("correo") || "").toString().trim(),
    };

    try {
      await createAdmin(payload);
      addForm.reset();
      closePanel(drawer);
      await fetchAdmins();
    } catch (err) {
      console.error("[ajustes] No se pudo crear el admin:", err);
      window.alert("No se pudo guardar. Revisa consola.");
    }
  });
}

// Edición de admin
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = editForm.dataset.id;
    const fd = new FormData(editForm);
    const payload = {
      nombre: (fd.get("nombre") || "").toString().trim(),
      correo: (fd.get("correo") || "").toString().trim(),
    };

    try {
      await updateAdmin(id, payload);
      closePanel(editPanel);
      await fetchAdmins();
    } catch (err) {
      console.error("[ajustes] No se pudieron guardar los cambios:", err);
      window.alert("No se pudieron guardar los cambios. Revisa consola.");
    }
  });
}

// Primera carga segura
(function safeReady(run) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => run(), {once: true});
  } else {run();}
})(() => {
  fetchAdmins().catch((e) => {
    console.error(e);
    if (loaderOverlay) loaderOverlay.classList.add("hidden");
  });
});
