/* eslint-env browser */
/* global Chart */
/* eslint max-len: ["error", { "code": 120 }] */

(function() {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  /**
   * Obtiene el id_negocio del localStorage, guardado por el login.
   * @return {string|null}
   */
  function getIdNegocio() {
    const id = localStorage.getItem("id_negocio_logeado");
    if (!id) {
      console.error("No se encontró 'id_negocio_logeado' en localStorage.",
          "El usuario no está autenticado o el login no guardó el ID.");
      // window.location.href = "/login.html";
    }
    return id;
  }

  /**
   * Rellena los contadores (slots) del dashboard del comercio.
   * @param {{promocionesActivas:number, promocionesRedimidas30d:number, clientesUnicos30d:number}} slots
   * @return {void}
   */
  function populateSlots(slots) {
    if (!slots) return;

    const elPromos = $("#slot-promos-activas");
    const elRedimidas = $("#slot-redimidas-30d");
    const elClientes = $("#slot-clientes-unicos");

    if (elPromos) elPromos.textContent = slots.promocionesActivas || 0;
    if (elRedimidas) elRedimidas.textContent = slots.promocionesRedimidas30d || 0;
    if (elClientes) elClientes.textContent = slots.clientesUnicos30d || 0;
  }

  /**
   * Dibuja las gráficas del dashboard del comercio.
   * @param {Object} charts
   * @return {void}
   */
  function renderCharts(charts) {
    if (!charts || typeof Chart === "undefined") {
      console.error("Chart.js no está cargado o no hay datos de gráficas.");
      return;
    }

    // Barra: redenciones por oferta
    const elBar = $("#chart-redenciones-oferta");
    const ctxBar = elBar ? elBar.getContext("2d") : null;
    if (ctxBar && charts.redencionesPorOferta) {
      new Chart(ctxBar, {
        type: "bar",
        data: {
          labels: charts.redencionesPorOferta.labels,
          datasets: [
            {
              label: "Redenciones",
              data: charts.redencionesPorOferta.data,
              backgroundColor: "rgba(59, 130, 246, 0.7)",
              borderColor: "rgba(59, 130, 246, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {y: {beginAtZero: true}},
        },
      });
    }

    // Línea: redenciones por día (30d)
    const elLine = $("#chart-redenciones-dia");
    const ctxLine = elLine ? elLine.getContext("2d") : null;
    if (ctxLine && charts.redencionesPorDia30d) {
      new Chart(ctxLine, {
        type: "line",
        data: {
          labels: charts.redencionesPorDia30d.labels,
          datasets: [
            {
              label: "Redenciones por día",
              data: charts.redencionesPorDia30d.data,
              fill: false,
              borderColor: "rgb(22, 163, 74)",
              tension: 0.1,
            },
          ],
        },
        options: {responsive: true, maintainAspectRatio: false},
      });
    }

    // Pie: estado de ofertas
    const elPie = $("#chart-ofertas-status");
    const ctxPie = elPie ? elPie.getContext("2d") : null;
    if (ctxPie && charts.ofertasStatus) {
      new Chart(ctxPie, {
        type: "pie",
        data: {
          labels: charts.ofertasStatus.labels,
          datasets: [
            {
              label: "Estado",
              data: charts.ofertasStatus.data,
              backgroundColor: [
                "rgba(34, 197, 94, 0.7)",
                "rgba(239, 68, 68, 0.7)",
                "rgba(245, 158, 11, 0.7)",
              ],
              hoverOffset: 4,
            },
          ],
        },
        options: {responsive: true, maintainAspectRatio: false},
      });
    }
  }

  /**
   * Llama a la Lambda y actualiza slots + charts.
   * @return {Promise<void>}
   */
  async function fetchDashboardData() {
    const LAMBDA_URL = "https://2r5ryogxyqzx2c3bgebhemgrfq0akuyi.lambda-url.us-east-1.on.aws/";

    const idNegocio = getIdNegocio();
    if (!idNegocio) {
      const p = $("#slot-promos-activas");
      const r = $("#slot-redimidas-30d");
      const c = $("#slot-clientes-unicos");
      if (p) p.textContent = "N/A";
      if (r) r.textContent = "N/A";
      if (c) c.textContent = "N/A";
      return;
    }

    const url = `${LAMBDA_URL}?action=getDashboard&id_negocio=${encodeURIComponent(idNegocio)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();

      populateSlots(data.slots);
      renderCharts(data.charts);
    } catch (err) {
      console.error("Error al obtener datos del dashboard:", err);
      const p = $("#slot-promos-activas");
      const r = $("#slot-redimidas-30d");
      const c = $("#slot-clientes-unicos");
      if (p) p.textContent = "Error";
      if (r) r.textContent = "Error";
      if (c) c.textContent = "Error";
    }
  }

  // Callbacks con arrow functions (evita 'Unexpected function expression' en ESLint)
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      fetchDashboardData();
    }, 100);
  });
})();
