import React, { useState, useEffect } from "react";
import { vehiculosAPI } from "../../services/api";

export default function VehiculoModal({ isOpen, onClose, onSaved, vehiculo }) {
  const isEditing = Boolean(vehiculo);

  const [form, setForm] = useState({
    placa: "",
    modelo: "",
    tipo: "",
    estado: "Disponible",
    kilometrajeActual: "",
    kilometrajeLimiteMantenimiento: ""
  });

  // Cuando se abre para editar, llenamos los campos
  useEffect(() => {
    if (vehiculo) {
      setForm({
        placa: vehiculo.placa,
        modelo: vehiculo.modelo,
        tipo: vehiculo.tipo,
        estado: vehiculo.estado,
        kilometrajeActual: vehiculo.kilometrajeActual,
        kilometrajeLimiteMantenimiento: vehiculo.kilometrajeLimiteMantenimiento
      });
    }
  }, [vehiculo]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      if (isEditing) {
        await vehiculosAPI.update(vehiculo.idVehiculo, form);
      } else {
        await vehiculosAPI.create(form);
      }

      onSaved(); // refrescar tabla
      onClose(); // cerrar modal
    } catch (error) {
      console.error("Error guardando vehículo:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[450px]">
        
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {isEditing ? "Editar Vehículo" : "Nuevo Vehículo"}
        </h2>

        <div className="space-y-3">
          
          <input
            type="text"
            placeholder="Placa"
            name="placa"
            value={form.placa}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="text"
            placeholder="Modelo"
            name="modelo"
            value={form.modelo}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="text"
            placeholder="Tipo"
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="Disponible">Disponible</option>
            <option value="En uso">En uso</option>
            <option value="Mantenimiento">Mantenimiento</option>
          </select>

          <input
            type="number"
            placeholder="Kilometraje Actual"
            name="kilometrajeActual"
            value={form.kilometrajeActual}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="number"
            placeholder="Límite de Mantenimiento"
            name="kilometrajeLimiteMantenimiento"
            value={form.kilometrajeLimiteMantenimiento}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            className="px-4 py-2 bg-gray-200 rounded-lg"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            onClick={handleSave}
          >
            {isEditing ? "Guardar Cambios" : "Crear Vehículo"}
          </button>
        </div>

      </div>
    </div>
  );
}
