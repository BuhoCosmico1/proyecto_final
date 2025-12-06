import React, { useEffect, useState } from "react";
import { rutasAPI } from "../../services/api";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import RutaModal from "./RutaModal";

export default function Rutas() {
  const [rutas, setRutas] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rutaEditando, setRutaEditando] = useState(null);

  // ================================
  // Cargar rutas
  // ================================
  const fetchRutas = async () => {
    try {
      const response = await rutasAPI.getAll();
      setRutas(response.data);
    } catch (error) {
      console.error("Error cargando rutas:", error);
    }
  };

  useEffect(() => {
    fetchRutas();
  }, []);

  // ================================
  // Acciones Modal
  // ================================
  const abrirNuevo = () => {
    setRutaEditando(null);
    setIsModalOpen(true);
  };

  const abrirEditar = (ruta) => {
    setRutaEditando(ruta);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setRutaEditando(null);
    setIsModalOpen(false);
  };

  // ================================
  // Eliminar ruta
  // ================================
  const eliminarRuta = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta ruta?")) return;

    try {
      await rutasAPI.delete(id);
      fetchRutas();
    } catch (error) {
      console.error("Error eliminando ruta:", error);
    }
  };

  // ================================
  // Filtro
  // ================================
  const filtradas = rutas.filter((r) =>
    r.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    r.origen.toLowerCase().includes(filtro.toLowerCase()) ||
    r.destino.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-white p-5 rounded-lg shadow flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Rutas</h1>
          <p className="text-gray-600">Administra las rutas disponibles del sistema</p>
        </div>

        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          onClick={abrirNuevo}
        >
          <FiPlus /> Nueva Ruta
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-5 rounded-lg shadow flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, origen o destino..."
          className="w-full border px-3 py-2 rounded-lg"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {/* TABLA */}
      <div className="bg-white p-5 rounded-lg shadow">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-gray-600">
              <th className="py-2">Nombre</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Distancia (km)</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-5 text-center text-gray-500">
                  No se encontraron rutas
                </td>
              </tr>
            ) : (
              filtradas.map((ruta) => (
                <tr key={ruta.idRuta} className="border-b">
                  <td className="py-2 font-semibold">{ruta.nombre}</td>
                  <td>{ruta.origen}</td>
                  <td>{ruta.destino}</td>
                  <td>{ruta.distancia.toLocaleString()}</td>

                  <td>
                    <span
                      className={`px-3 py-1 text-sm rounded-full ${
                        ruta.estado === "Activa"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {ruta.estado}
                    </span>
                  </td>

                  <td className="flex gap-3">
                    <button onClick={() => abrirEditar(ruta)}>
                      <FiEdit className="text-blue-600 hover:scale-110" />
                    </button>

                    <button onClick={() => eliminarRuta(ruta.idRuta)}>
                      <FiTrash2 className="text-red-600 hover:scale-110" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      <RutaModal
        isOpen={isModalOpen}
        onClose={cerrarModal}
        onSaved={fetchRutas}
        ruta={rutaEditando}
      />
    </div>
  );
}
