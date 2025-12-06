import React, { useEffect, useState } from "react";
import { vehiculosAPI } from "../../services/api";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import VehiculoModal from "./VehiculoModal";

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState(null);

  // ================================
  // Cargar Vehículos
  // ================================
  const fetchVehiculos = async () => {
    try {
      const response = await vehiculosAPI.getAll();
      setVehiculos(response.data);
    } catch (error) {
      console.error("Error cargando vehículos:", error);
    }
  };

  useEffect(() => {
    fetchVehiculos();
  }, []);

  // ================================
  // Acciones Modal
  // ================================
  const abrirNuevo = () => {
    setVehiculoEditando(null);
    setIsModalOpen(true);
  };

  const abrirEditar = (veh) => {
    setVehiculoEditando(veh);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setVehiculoEditando(null);
    setIsModalOpen(false);
  };

  // ================================
  // Eliminar vehículo
  // ================================
  const eliminarVehiculo = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este vehículo?")) return;

    try {
      await vehiculosAPI.delete(id);
      fetchVehiculos();
    } catch (error) {
      console.error("Error eliminando vehículo:", error);
    }
  };

  // ================================
  // Filtro simple
  // ================================
  const vehFiltrados = vehiculos.filter((v) =>
    v.placa.toLowerCase().includes(filtro.toLowerCase()) ||
    v.modelo.toLowerCase().includes(filtro.toLowerCase()) ||
    v.tipo.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-white p-5 rounded-lg shadow flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Vehículos</h1>
          <p className="text-gray-600">Administra toda tu flota vehicular</p>
        </div>

        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          onClick={abrirNuevo}
        >
          <FiPlus /> Nuevo Vehículo
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-5 rounded-lg shadow flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por placa, modelo o tipo..."
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
              <th className="py-2">Placa</th>
              <th>Modelo</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Kilometraje</th>
              <th>Límite</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {vehFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-5 text-center text-gray-500">
                  No se encontraron vehículos
                </td>
              </tr>
            ) : (
              vehFiltrados.map((veh) => (
                <tr key={veh.idVehiculo} className="border-b">
                  <td className="py-2 font-semibold">{veh.placa}</td>
                  <td>{veh.modelo}</td>
                  <td>{veh.tipo}</td>
                  <td>
                    <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-700">
                      {veh.estado}
                    </span>
                  </td>
                  <td>{veh.kilometrajeActual.toLocaleString()} km</td>
                  <td>{veh.kilometrajeLimiteMantenimiento.toLocaleString()} km</td>

                  <td className="flex gap-3">
                    <button onClick={() => abrirEditar(veh)}>
                      <FiEdit className="text-blue-600 hover:scale-110" />
                    </button>

                    <button onClick={() => eliminarVehiculo(veh.idVehiculo)}>
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
      <VehiculoModal
        isOpen={isModalOpen}
        onClose={cerrarModal}
        onSaved={fetchVehiculos}
        vehiculo={vehiculoEditando}
      />
    </div>
  );
}
