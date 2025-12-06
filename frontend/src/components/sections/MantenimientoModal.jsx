import React, { useEffect, useState } from "react";
import { mantenimientosAPI, vehiculosAPI } from "../../services/api"; 

export default function MantenimientoModal({ isOpen, onClose, onSaved, mantenimiento }) {
  const isEditing = Boolean(mantenimiento);

  const [form, setForm] = useState({
    idVehiculo: "",
    descripcion: "",
    fecha: "",
    costo: "",
    estado: "Pendiente",
    tipo: "Preventivo",
  });

  const [vehiculos, setVehiculos] = useState([]);

  useEffect(() => {
    cargarVehiculos();

    if (mantenimiento) {
      setForm({
        idVehiculo: mantenimiento.idVehiculo,
        descripcion: mantenimiento.descripcion,
        fecha: mantenimiento.fecha,
        costo: mantenimiento.costo,
        estado: mantenimiento.estado,
        tipo: mantenimiento.tipo
      });
    }
  }, [mantenimiento]);

  const cargarVehiculos = async () => {
    try {
      const res = await vehiculosAPI.getAll();
      setVehiculos(res.data);
    } catch (error) {
      console.error("Error cargando vehículos:", error);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      if (isEditing) {
        await mantenimientosAPI.update(mantenimiento.idMantenimiento, form);
      } else {
        await mantenimientosAPI.create(form);
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Error guardando mantenimiento:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[480px]">

        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {isEditing ? "Editar Mantenimiento" : "Nuevo Mantenimiento"}
        </h2>

        <div className="space-y-3">

          <select
            name="idVehiculo"
            value={form.idVehiculo}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="">Seleccione un vehículo</option>
            {vehiculos.map((v) => (
              <option key={v.idVehiculo} value={v.idVehiculo}>
                {v.placa} - {v.modelo}
              </option>
            ))}
          </select>

          <input
            type="date"
            name="fecha"
            value={form.fecha}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <select
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="Preventivo">Preventivo</option>
            <option value="Correctivo">Correctivo</option>
            <option value="Revision">Revisión</option>
          </select>

          <input
            type="text"
            name="descripcion"
            placeholder="Descripción"
            value={form.descripcion}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="number"
            name="costo"
            placeholder="Costo"
            value={form.costo}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="Pendiente">Pendiente</option>
            <option value="En proceso">En proceso</option>
            <option value="Completado">Completado</option>
          </select>

        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button className="px-4 py-2 bg-gray-200 rounded-lg" onClick={onClose}>
            Cancelar
          </button>

          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            onClick={handleSave}
          >
            {isEditing ? "Guardar Cambios" : "Crear Mantenimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}
