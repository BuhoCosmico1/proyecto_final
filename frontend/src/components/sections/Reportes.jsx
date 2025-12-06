import { useEffect, useState, useRef } from "react";
import {
  reportesAPI
} from "../../services/api"; // debes crear este export en api.js
import {
  FileDown,
  Calendar,
  BarChart2,
  PieChart,
  TrendingUp,
  RefreshCcw,
} from "lucide-react";

import { Chart, registerables } from "chart.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

Chart.register(...registerables);

export default function Reportes() {
  const [kpis, setKpis] = useState(null);
  const [viajesDia, setViajesDia] = useState([]);
  const [rutasUsadas, setRutasUsadas] = useState([]);
  const [choferesProd, setChoferesProd] = useState([]);
  const [mantMes, setMantMes] = useState([]);
  const [alertasPrioridad, setAlertasPrioridad] = useState([]);

  const [desde, setDesde] = useState("2024-01-01");
  const [hasta, setHasta] = useState("2024-12-31");

  const chartRefs = {
    viajes: useRef(),
    rutas: useRef(),
    choferes: useRef(),
    mantenimiento: useRef(),
    alertas: useRef(),
  };

  const charts = useRef({});

  // ---------------------------
  // Cargar datos
  // ---------------------------
  const cargarTodo = async () => {
    try {
      const params = { desde, hasta };

      const kpiResp = await reportesAPI.getKPIs(params);
      const diaResp = await reportesAPI.getViajesPorDia(params);
      const rutasResp = await reportesAPI.getRutasMasUsadas(params);
      const choferResp = await reportesAPI.getChoferesProductivos(params);
      const mantResp = await reportesAPI.getMantenimientoPorMes();
      const alertaResp = await reportesAPI.getAlertasPrioridad();

      setKpis(kpiResp.data);
      setViajesDia(diaResp.data);
      setRutasUsadas(rutasResp.data);
      setChoferesProd(choferResp.data);
      setMantMes(mantResp.data);
      setAlertasPrioridad(alertaResp.data);

      renderCharts();
    } catch (err) {
      console.error("Error cargando reportes", err);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [desde, hasta]);

  // ---------------------------
  // RENDERIZAR GRÁFICAS
  // ---------------------------
  const renderCharts = () => {
    if (!kpis) return;

    const destroyIfExists = (key) => {
      if (charts.current[key]) {
        charts.current[key].destroy();
      }
    };

    // VIAJES POR DÍA
    destroyIfExists("viajes");
    charts.current.viajes = new Chart(chartRefs.viajes.current, {
      type: "line",
      data: {
        labels: viajesDia.map((v) => v.fecha),
        datasets: [
          {
            label: "Viajes",
            data: viajesDia.map((v) => v.total),
            borderColor: "#6366F1",
            backgroundColor: "rgba(99,102,241,0.2)",
            tension: 0.3,
          },
        ],
      },
    });

    // RUTAS MÁS USADAS
    destroyIfExists("rutas");
    charts.current.rutas = new Chart(chartRefs.rutas.current, {
      type: "bar",
      data: {
        labels: rutasUsadas.map((r) => r.nombre),
        datasets: [
          {
            label: "Usos",
            data: rutasUsadas.map((r) => r.uso),
            backgroundColor: "#4F46E5",
          },
        ],
      },
    });

    // CHOFERES PRODUCTIVOS
    destroyIfExists("choferes");
    charts.current.choferes = new Chart(chartRefs.choferes.current, {
      type: "bar",
      data: {
        labels: choferesProd.map((c) => c.nombre),
        datasets: [
          {
            label: "Viajes",
            data: choferesProd.map((c) => c.viajes),
            backgroundColor: "#7C3AED",
          },
        ],
      },
    });

    // COSTO DE MANTENIMIENTO
    destroyIfExists("mantenimiento");
    charts.current.mantenimiento = new Chart(chartRefs.mantenimiento.current, {
      type: "line",
      data: {
        labels: mantMes.map((m) => m.mes),
        datasets: [
          {
            label: "Costo",
            data: mantMes.map((m) => m.total),
            borderColor: "#10B981",
            backgroundColor: "rgba(16,185,129,0.2)",
          },
        ],
      },
    });

    // ALERTAS POR PRIORIDAD
    destroyIfExists("alertas");
    charts.current.alertas = new Chart(chartRefs.alertas.current, {
      type: "pie",
      data: {
        labels: alertasPrioridad.map((a) => a.prioridad),
        datasets: [
          {
            data: alertasPrioridad.map((a) => a.total),
            backgroundColor: ["#EF4444", "#F59E0B", "#10B981"],
          },
        ],
      },
    });
  };

  // ---------------------------
  // EXPORTAR A PDF
  // ---------------------------
  const exportarPDF = () => {
    const pdf = new jsPDF("p", "mm", "a4");

    pdf.setFontSize(18);
    pdf.text("Reporte General del Sistema", 14, 20);

    // KPIs
    pdf.setFontSize(12);
    pdf.text("Resumen Ejecutivo:", 14, 35);

    const rows = [
      ["Viajes", kpis.totalViajes],
      ["Km recorridos", kpis.kmRecorridos],
      ["Combustible", kpis.combustibleTotal],
      ["Horas trabajadas", kpis.minutosTotales / 60],
      ["Costo mantenimiento", "$" + kpis.costoMantenimiento],
      ["Alertas activas", kpis.alertasActivas],
    ];

    autoTable(pdf, {
      startY: 40,
      head: [["Indicador", "Valor"]],
      body: rows,
    });

    pdf.save("reporte.pdf");
  };

  // ---------------------------
  // EXPORTAR A EXCEL
  // ---------------------------
  const exportarExcel = async () => {
    const resp = await reportesAPI.getDatosExportacion();

    const wb = XLSX.utils.book_new();

    const agregar = (data, nombre) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, nombre);
    };

    agregar(resp.data.viajes, "Viajes");
    agregar(resp.data.vehiculos, "Vehículos");
    agregar(resp.data.choferes, "Choferes");
    agregar(resp.data.rutas, "Rutas");
    agregar(resp.data.mantenimiento, "Mantenimiento");
    agregar(resp.data.alertas, "Alertas");

    XLSX.writeFile(wb, "ReporteGeneral.xlsx");
  };

  // ---------------------------
  // PRESETS DE FECHAS
  // ---------------------------
  const presets = {
    hoy() {
      const hoy = new Date().toISOString().slice(0, 10);
      setDesde(hoy);
      setHasta(hoy);
    },

    ultimos7() {
      const hoy = new Date();
      const inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - 7);
      setDesde(inicio.toISOString().slice(0, 10));
      setHasta(hoy.toISOString().slice(0, 10));
    },

    ultimos30() {
      const hoy = new Date();
      const inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - 30);
      setDesde(inicio.toISOString().slice(0, 10));
      setHasta(hoy.toISOString().slice(0, 10));
    },
  };

  // ---------------------------
  // UI
  // ---------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Calendar className="text-indigo-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Reportes del Sistema</h2>
            <p className="text-gray-600">Estadísticas completas del periodo seleccionado.</p>
          </div>
        </div>

        <button
          className="p-2 border rounded-lg hover:bg-gray-100"
          onClick={cargarTodo}
        >
          <RefreshCcw size={20} />
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow flex gap-4">
        <div>
          <label className="text-sm text-gray-600">Desde</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Hasta</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>

        <div className="flex items-end gap-3">
          <button className="btn" onClick={presets.hoy}>Hoy</button>
          <button className="btn" onClick={presets.ultimos7}>7 días</button>
          <button className="btn" onClick={presets.ultimos30}>30 días</button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Viajes" value={kpis.totalViajes} icon={<TrendingUp />} />
          <KpiCard label="Km recorridos" value={kpis.kmRecorridos} icon={<BarChart2 />} />
          <KpiCard label="Combustible" value={kpis.combustibleTotal + " L"} icon={<PieChart />} />
          <KpiCard label="Alertas activas" value={kpis.alertasActivas} icon={<BarChart2 />} />
        </div>
      )}

      {/* Gráficas */}
      <ChartCard title="Viajes por día">
        <canvas ref={chartRefs.viajes}></canvas>
      </ChartCard>

      <ChartCard title="Rutas más usadas">
        <canvas ref={chartRefs.rutas}></canvas>
      </ChartCard>

      <ChartCard title="Choferes más productivos">
        <canvas ref={chartRefs.choferes}></canvas>
      </ChartCard>

      <ChartCard title="Costo de mantenimiento por mes">
        <canvas ref={chartRefs.mantenimiento}></canvas>
      </ChartCard>

      <ChartCard title="Alertas por prioridad">
        <canvas ref={chartRefs.alertas}></canvas>
      </ChartCard>

      {/* Exportadores */}
      <div className="bg-white p-6 rounded-lg shadow flex gap-4">
        <button
          onClick={exportarPDF}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg"
        >
          <FileDown size={18} />
          Exportar PDF
        </button>

        <button
          onClick={exportarExcel}
          className="flex items-center gap-2 border px-4 py-2 rounded-lg"
        >
          <FileDown size={18} />
          Exportar Excel
        </button>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
      <div className="text-indigo-600">{icon}</div>
      <div>
        <p className="text-gray-600 text-sm">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-3">{title}</h3>
      {children}
    </div>
  );
}
