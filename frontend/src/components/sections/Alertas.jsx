import React, { useEffect, useState } from "react";
import { alertasAPI } from "../../services/api";
import { Bell, CheckCircle, Trash2, Filter } from "lucide-react";

export default function Alertas() {
  const [alertas, setAlertas] = useState([]);
  const [filtro, setFiltro] = useState("");

  // ============================
  // Cargar alertas
  // ============================
  const cargarAlertas = async () => {
    try {
      const resp = await alertasAPI.getAll({ filtro });
      setAlertas(resp.data);
    } catch (err) {
      console.error("Error cargando alertas:", err);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, [filtro]);

  // ============================
  // Resolver alerta
  // ============================
  const resolverAlerta = async (id) => {
    try {
      await alertasAPI.resolver(id);
      cargarAlertas();
    } catch (err) {
      console.error("Error resolviendo alerta:", err);
      alert("No se pudo resolver la alerta");
    }
  };

  // ============================
  // Eliminar alerta
  // ============================
  const eliminarAlerta = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar la alerta?")) return;


    try {
      await alertasAPI.delete(id);
      cargarAlertas();
    } catch (err) {
      console.error("Error eliminando alerta:", err);
      alert("No se pudo eliminar la alerta");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Bell className="text-red-500" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Alertas del Sistema</h2>
            <p className="text-gray-600">Control de alertas activas y resueltas.</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-4 items-end">
        <div>
          <label className="text-sm text-gray-600">Filtrar por estado</label>
          <select
            className="border rounded-lg px-3 py-2"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="Activa">Activas</option>
            <option value="Resuelta">Resueltas</option>
          </select>
        </div>

        <button
          onClick={cargarAlertas}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg"
        >
          <Filter size={18} />
          Aplicar
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white p-6 rounded-lg shadow">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">ID</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Mensaje</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {alertas.map((a) => (
              <tr key={a.idAlerta} className="border-t">
                <td className="p-3">{a.idAlerta}</td>
                <td className="p-3">{a.tipo}</td>
                <td className="p-3">{a.mensaje}</td>
                <td className="p-3">{a.fecha}</td>
                <td
                  className={`p-3 font-semibold ${
                    a.estado === "Activa" ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {a.estado}
                </td>

                <td className="p-3 flex justify-center gap-3">
                  {/* Botón resolver */}
                  {a.estado === "Activa" && (
                    <button
                      className="text-green-600 hover:bg-green-100 p-2 rounded-full"
                      onClick={() => resolverAlerta(a.idAlerta)}
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}

                  {/* Botón eliminar */}
                  <button
                    className="text-red-600 hover:bg-red-100 p-2 rounded-full"
                    onClick={() => eliminarAlerta(a.idAlerta)}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}

            {alertas.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-6 text-gray-500">
                  No hay alertas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
