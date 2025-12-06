import React, { useEffect, useState } from "react";
import "../../styles/Mantenimiento.css";
import { mantenimientosAPI } from "../../services/api"; 
import MantenimientoModal from "./MantenimientoModal"; // ← IMPORTANTE

const Mantenimiento = () => {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [filtro, setFiltro] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mantenimientoEdit, setMantenimientoEdit] = useState(null);

  const cargarMantenimientos = async () => {
    try {
      const res = await mantenimientosAPI.getAll();

      // Formatear fecha correcta
      const data = res.data.map((m) => ({
        ...m,
        fecha: m.fecha ? m.fecha.split("T")[0] : "",
      }));

      setMantenimientos(data);
    } catch (error) {
      console.error("Error cargando mantenimientos:", error);
    }
  };

  const eliminarMantenimiento = async (id) => {
    if (!window.confirm("¿Eliminar este mantenimiento?")) return;

    try {
      await mantenimientosAPI.delete(id);
      cargarMantenimientos();
    } catch (error) {
      console.error("Error eliminando mantenimiento:", error);
    }
  };

  useEffect(() => {
    cargarMantenimientos();
  }, []);

  // ================================
  // FILTROS
  // ================================
  const listaFiltrada = mantenimientos.filter((m) => {
    const coincideBusqueda =
      m.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.vehiculo?.toLowerCase().includes(busqueda.toLowerCase());

    const coincideEstado =
      filtro === "Todos" || m.estado === filtro;

    return coincideBusqueda && coincideEstado;
  });

  return (
    <div className="mantenimiento-wrapper">
      
      <div className="mantenimiento-header">
        <h2>Gestión de Mantenimientos</h2>

        {/* BOTÓN QUE ABRE EL MODAL */}
        <button
          className="btn-new"
          onClick={() => {
            setMantenimientoEdit(null);
            setIsModalOpen(true);
          }}
        >
          + Nuevo Mantenimiento
        </button>
      </div>

      <div className="mantenimiento-filtros">
        <input
          type="text"
          placeholder="Buscar mantenimiento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="Todos">Todos</option>
          <option value="Pendiente">Pendiente</option>
          <option value="En proceso">En proceso</option>
          <option value="Completado">Completado</option>
        </select>

        <span style={{ cursor: "pointer" }} onClick={cargarMantenimientos}>
          🔄
        </span>
      </div>

      <table className="mantenimiento-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Vehículo</th>
            <th>Tipo</th>
            <th>Descripción</th>
            <th>Costo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {listaFiltrada.map((m) => (
            <tr key={m.idMantenimiento}>
              <td>{m.fecha}</td>
              <td>{m.vehiculo}</td>
              <td>{m.tipo}</td>
              <td>{m.descripcion}</td>
              <td>${m.costo}</td>
              <td>{m.estado}</td>

              <td>
                <span
                  className="delete-icon"
                  onClick={() => eliminarMantenimiento(m.idMantenimiento)}
                >
                  🗑
                </span>

                <span
                  className="edit-icon"
                  onClick={() => {
                    setMantenimientoEdit(m);
                    setIsModalOpen(true);
                  }}
                >
                  ✏️
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      <MantenimientoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={cargarMantenimientos}
        mantenimiento={mantenimientoEdit}
      />
    </div>
  );
};

export default Mantenimiento;
