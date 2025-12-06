import React, { useState, useEffect } from "react";
import { viajesAPI, rutasAPI, choferesAPI, vehiculosAPI } from "../../services/api";

export default function ViajeModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    idVehiculo: "",
    idChofer: "",
    idRuta: "",
    fecha: "",
    horaInicio: "",
    carga: "",
    estado: "Programado",
  });

  const [vehiculos, setVehiculos] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [rutas, setRutas] = useState([]);

  useEffect(() => {
    if (isOpen) {
      vehiculosAPI.getAll().then(res => setVehiculos(res.data));
      choferesAPI.getAll().then(res => setChoferes(res.data));
      rutasAPI.getAll().then(res => setRutas(res.data));
    }
  }, [isOpen]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
  try {
    if (!form.idVehiculo || !form.idChofer || !form.idRuta || !form.fecha || !form.horaInicio) {
      alert("Todos los campos obligatorios deben llenarse.");
      return;
    }

    await viajesAPI.create(form);
    onSaved();
    onClose();
  } catch (error) {
    console.error("Error creando viaje:", error);
    alert("Error al crear el viaje.");
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[450px]">

        <h2 className="text-xl font-bold mb-4 text-gray-800">Nuevo Viaje</h2>

        <div className="space-y-3">

          <select
            name="idVehiculo"
            value={form.idVehiculo}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="">Seleccionar Vehículo</option>
            {vehiculos.map(v => (
              <option key={v.idVehiculo} value={v.idVehiculo}>
                {v.placa} — {v.modelo}
              </option>
            ))}
          </select>

          <select
            name="idChofer"
            value={form.idChofer}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="">Seleccionar Chofer</option>
            {choferes.map(c => (
              <option key={c.idChofer} value={c.idChofer}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            name="idRuta"
            value={form.idRuta}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="">Seleccionar Ruta</option>
            {rutas.map(r => (
              <option key={r.idRuta} value={r.idRuta}>
                {r.nombre}
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

          <input
            type="time"
            name="horaInicio"
            value={form.horaInicio}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <input
            type="text"
            name="carga"
            placeholder="Tipo de carga (opcional)"
            value={form.carga}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          />

          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-lg"
          >
            <option value="Programado">Programado</option>
            <option value="Completado">Completado</option>
            <option value="Cancelado">Cancelado</option>
          </select>

        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button className="px-4 py-2 bg-gray-200 rounded-lg" onClick={onClose}>
            Cancelar
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg" onClick={handleSave}>
            Crear Viaje
          </button>
        </div>

      </div>
    </div>
  );
}
