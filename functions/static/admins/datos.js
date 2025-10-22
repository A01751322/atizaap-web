/* eslint-env browser */
/* global Chart */
/* eslint max-len: ["error", { "code": 120 }] */

(function() {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  /**
   * Renderiza todos los charts del panel de admin.
   * @param {Object} charts - Objeto con los datos de los charts.
   * @return {void}
   */
  function renderAdminCharts(charts) {
    if (!charts || typeof Chart === "undefined") {
      console.error("Chart.js no está cargado o no hay datos.");
      return;
    }

    const elAdminChartAreas = $("#admin-chart-areas");
    const ctxAreas = elAdminChartAreas ? elAdminChartAreas.getContext("2d") : null;
    if (ctxAreas && charts.areasActivas7d) {
      new Chart(ctxAreas, {
        type: "bar",
        data: {
          labels: charts.areasActivas7d.labels,
          datasets: [
            {
              label: "Redenciones (7 días)",
              data: charts.areasActivas7d.data,
              backgroundColor: "rgba(234, 179, 8, 0.7)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }

    const elGlobalLine = $("#admin-chart-redenciones-dia");
    const ctxGlobalLine = elGlobalLine ? elGlobalLine.getContext("2d") : null;
    if (ctxGlobalLine && charts.redencionesGlobal30d) {
      new Chart(ctxGlobalLine, {
        type: "line",
        data: {
          labels: charts.redencionesGlobal30d.labels,
          datasets: [
            {
              label: "Redenciones Globales",
              data: charts.redencionesGlobal30d.data,
              borderColor: "rgb(30, 64, 175)",
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }

    const elTopNegocios = $("#admin-chart-top-negocios");
    const ctxTopNegocios = elTopNegocios ? elTopNegocios.getContext("2d") : null;
    if (ctxTopNegocios && charts.topNegocios) {
      new Chart(ctxTopNegocios, {
        type: "bar",
        data: {
          labels: charts.topNegocios.labels,
          datasets: [
            {
              label: "Total Redenciones",
              data: charts.topNegocios.data,
              backgroundColor: "rgba(22, 163, 74, 0.7)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
        },
      });
    }

    const elTopUsuarios = $("#admin-chart-top-usuarios");
    const ctxTopUsuarios = elTopUsuarios ? elTopUsuarios.getContext("2d") : null;
    if (ctxTopUsuarios && charts.topUsuarios) {
      new Chart(ctxTopUsuarios, {
        type: "bar",
        data: {
          labels: charts.topUsuarios.labels,
          datasets: [
            {
              label: "Total Redenciones",
              data: charts.topUsuarios.data,
              backgroundColor: "rgba(192, 38, 211, 0.7)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
        },
      });
    }

    const elTipos = $("#admin-chart-tipos-negocio");
    const ctxTipos = elTipos ? elTipos.getContext("2d") : null;
    if (ctxTipos && charts.conteoNegociosPorTipo) {
      new Chart(ctxTipos, {
        type: "pie",
        data: {
          labels: charts.conteoNegociosPorTipo.labels,
          datasets: [
            {
              label: "Nº de Negocios",
              data: charts.conteoNegociosPorTipo.data,
              backgroundColor: [
                "rgba(59, 130, 246, 0.7)",
                "rgba(22, 163, 74, 0.7)",
                "rgba(234, 179, 8, 0.7)",
                "rgba(239, 68, 68, 0.7)",
                "rgba(147, 51, 234, 0.7)",
                "rgba(21, 128, 128, 0.7)",
              ],
              hoverOffset: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }
  }

  /**
   * Obtiene los datos del dashboard y llama a renderAdminCharts.
   * @return {Promise<void>}
   */
  async function fetchAdminData() {
    const LAMBDA_URL =
      "https://rm65wsuarfqqx43ocb6n5ruawi0mjfrr.lambda-url.us-east-1.on.aws/";
    const url = `${LAMBDA_URL}?action=getDashboard`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      renderAdminCharts(data.charts);
    } catch (err) {
      console.error("Error al obtener datos de admin:", err);
      const main = $("#page-content");
      if (main) {
        main.innerHTML +=
          "<p class=\"text-red-500 text-center mt-4\">Error al cargar los datos del administrador.</p>";
      }
    }
  }

  // Usar arrow functions para callbacks (evita 'Unexpected function expression' en ESLint)
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      fetchAdminData();
    }, 100);
  });
})();
