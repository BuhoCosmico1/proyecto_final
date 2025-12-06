import React, { useEffect, useState } from "react";
import { choferesAPI } from "../../services/api";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import ChoferModal from "./ChoferModal";

export default function Choferes() {
  const [choferes, setChoferes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [choferEditando, setChoferEditando] = useState(null);

  // =====================================
  // Cargar Choferes
  // =====================================
  const fetchChoferes = async () => {
    try {
      const response = await choferesAPI.getAll();
      setChoferes(response.data);
    } catch (error) {
      console.error("Error cargando choferes:", error);
    }
  };

  useEffect(() => {
    fetchChoferes();
  }, []);

  // =====================================
  // Acciones Modal
  // =====================================
  const abrirNuevo = () => {
    setChoferEditando(null);
    setIsModalOpen(true);
  };

  const abrirEditar = (chofer) => {
    setChoferEditando(chofer);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setChoferEditando(null);
    setIsModalOpen(false);
  };

  // =====================================
  // Eliminar chofer
  // =====================================
  const eliminarChofer = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este chofer?")) return;

    try {
      await choferesAPI.delete(id);
      fetchChoferes();
    } catch (error) {
      console.error("Error eliminando chofer:", error);
    }
  };

  // =====================================
  // Filtro
  // =====================================
  const filtrados = choferes.filter((c) =>
    c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    c.cedula.toLowerCase().includes(filtro.toLowerCase()) ||
    c.licencia.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-white p-5 rounded-lg shadow flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Choferes</h1>
          <p className="text-gray-600">Administra tu personal de conducción</p>
        </div>

        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          onClick={abrirNuevo}
        >
          <FiPlus /> Nuevo Chofer
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-5 rounded-lg shadow flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, cédula o licencia..."
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
              <th>Cédula</th>
              <th>Licencia</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-5 text-center text-gray-500">
                  No se encontraron choferes
                </td>
              </tr>
            ) : (
              filtrados.map((chofer) => (
                <tr key={chofer.idChofer} className="border-b">
                  <td className="py-2 font-semibold">{chofer.nombre}</td>
                  <td>{chofer.cedula}</td>
                  <td>{chofer.licencia}</td>
                  <td>{chofer.telefono}</td>
                  <td>
                    <span
                      className={`px-3 py-1 text-sm rounded-full ${
                        chofer.estado === "Activo"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {chofer.estado}
                    </span>
                  </td>
                  <td className="flex gap-3">
                    <button onClick={() => abrirEditar(chofer)}>
                      <FiEdit className="text-blue-600 hover:scale-110" />
                    </button>

                    <button onClick={() => eliminarChofer(chofer.idChofer)}>
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
      <ChoferModal
        isOpen={isModalOpen}
        onClose={cerrarModal}
        onSaved={fetchChoferes}
        chofer={choferEditando}
      />
    </div>
  );
}
