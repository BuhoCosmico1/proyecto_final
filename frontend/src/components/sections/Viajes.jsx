import React, { useState, useEffect } from "react";
import { viajesAPI } from "../../services/api";
import { FiTrash2, FiPlus } from "react-icons/fi";
import ViajeModal from "./ViajeModal";

export default function Viajes() {
  const [viajes, setViajes] = useState([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);

  // ============================
  // FORMATEADOR DE FECHA
  // ============================
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // ============================
  // CARGAR VIAJES
  // ============================
  const loadViajes = async () => {
    try {
      const res = await viajesAPI.getAll();
      setViajes(res.data);
    } catch (error) {
      console.error("Error cargando viajes:", error);
    }
  };

  useEffect(() => {
    loadViajes();
  }, []);

  // ============================
  // ELIMINAR VIAJE
  // ============================
  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este viaje?")) return;

    try {
      await viajesAPI.delete(id);
      loadViajes();
    } catch (error) {
      console.error("Error al eliminar viaje:", error);
      alert("Error eliminando viaje.");
    }
  };

  // ============================
  // FILTRO DE BUSQUEDA
  // ============================
  const filteredViajes = viajes.filter((v) => {
    const text = `${v.chofer} ${v.vehiculo} ${v.ruta}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="container mx-auto p-5">
      
      {/* TITULO Y BOTÓN */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Gestión de Viajes</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          <FiPlus /> Nuevo Viaje
        </button>
      </div>

      {/* BUSCADOR */}
      <input
        type="text"
        placeholder="Buscar viaje..."
        className="w-full border px-3 py-2 rounded-lg mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* TABLA */}
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Chofer</th>
              <th className="p-3">Vehículo</th>
              <th className="p-3">Ruta</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredViajes.map((v) => (
              <tr key={v.idViaje} className="border-b">
                <td className="p-3">{v.chofer}</td>
                <td className="p-3">{v.vehiculo}</td>
                <td className="p-3">{v.ruta}</td>

                {/* FECHA FORMATEADA */}
                <td className="p-3">{formatDate(v.fecha)}</td>

                <td className="p-3">{v.estado}</td>

                <td className="p-3 text-center">
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(v.idViaje)}
                  >
                    <FiTrash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* MODAL CREAR VIAJE */}
      <ViajeModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadViajes}
      />

    </div>
  );
}
