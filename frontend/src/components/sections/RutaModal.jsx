import React, { useState, useEffect } from "react";
import { rutasAPI } from "../../services/api";

export default function RutaModal({ isOpen, onClose, onSaved, ruta }) {
  const isEditing = Boolean(ruta);

  const [form, setForm] = useState({
    nombre: "",
    origen: "",
    destino: "",
    distancia: "",
    tiempoEstimado: "",
    estado: "Activa",
  });

  useEffect(() => {
    if (ruta) {
      setForm({
        nombre: ruta.nombre,
        origen: ruta.origen,
        destino: ruta.destino,
        distancia: ruta.distancia,
        tiempoEstimado: ruta.tiempoEstimado,
        estado: ruta.estado,
      });
    }
  }, [ruta]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      // Validación mínima
      if (
        !form.nombre ||
        !form.origen ||
        !form.destino ||
        !form.distancia ||
        !form.tiempoEstimado
      ) {
        alert("Todos los campos son obligatorios.");
        return;
      }

      if (isEditing) {
        await rutasAPI.update(ruta.idRuta, form);
      } else {
        await rutasAPI.create(form);
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Error guardando ruta:", error);
      alert("Hubo un error guardando la ruta.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[450px]">

        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {isEditing ? "Editar Ruta" : "Nueva Ruta"}
        </h2>

        <div className="space-y-3">

          <input
            type="text"
            name="nombre"
            placeholder="Nombre de la ruta"
            value={form.nombre}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="text"
            name="origen"
            placeholder="Origen"
            value={form.origen}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="text"
            name="destino"
            placeholder="Destino"
            value={form.destino}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="number"
            name="distancia"
            placeholder="Distancia (km)"
            value={form.distancia}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="number"
            name="tiempoEstimado"
            placeholder="Tiempo estimado (min)"
            value={form.tiempoEstimado}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="Activa">Activa</option>
            <option value="Inactiva">Inactiva</option>
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
            {isEditing ? "Guardar Cambios" : "Crear Ruta"}
          </button>
        </div>

      </div>
    </div>
  );
}
