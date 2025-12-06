import React, { useState, useEffect } from "react";
import { choferesAPI } from "../../services/api";

export default function ChoferModal({ isOpen, onClose, onSaved, chofer }) {
  const isEditing = Boolean(chofer);

  const [form, setForm] = useState({
    nombre: "",
    cedula: "",
    licencia: "",
    telefono: "",
    estado: "Activo",
  });

  useEffect(() => {
    if (chofer) {
      setForm({
        nombre: chofer.nombre,
        cedula: chofer.cedula,
        licencia: chofer.licencia,
        telefono: chofer.telefono,
        estado: chofer.estado,
      });
    }
  }, [chofer]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      if (isEditing) {
        await choferesAPI.update(chofer.idChofer, form);
      } else {
        await choferesAPI.create(form);
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Error guardando chofer:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[450px]">

        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {isEditing ? "Editar Chofer" : "Nuevo Chofer"}
        </h2>

        <div className="space-y-3">

          <input
            type="text"
            name="nombre"
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="text"
            name="cedula"
            placeholder="Cédula"
            value={form.cedula}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="text"
            name="licencia"
            placeholder="Licencia"
            value={form.licencia}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="text"
            name="telefono"
            placeholder="Teléfono"
            value={form.telefono}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>

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
            {isEditing ? "Guardar Cambios" : "Crear Chofer"}
          </button>
        </div>

      </div>
    </div>
  );
}
