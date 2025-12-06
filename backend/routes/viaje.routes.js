const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { authenticateToken, authorize } = require("../middleware/auth.middleware");

// ============================================
// GET TODOS LOS VIAJES
// ============================================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        v.idViaje,
        v.fecha,
        v.horaInicio,
        v.horaFin,
        v.estado,
        c.nombre AS chofer,
        ve.placa AS vehiculo,
        r.nombre AS ruta
      FROM Viaje v
      JOIN Chofer c ON v.idChofer = c.idChofer
      JOIN Vehiculo ve ON v.idVehiculo = ve.idVehiculo
      JOIN Ruta r ON v.idRuta = r.idRuta
      ORDER BY v.idViaje DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo viajes:", error);
    res.status(500).json({ error: "Error al obtener viajes" });
  }
});

// ============================================
// CREAR VIAJE
// ============================================
router.post("/", authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const { idVehiculo, idChofer, idRuta, fecha, horaInicio, carga, estado } = req.body;

    if (!idVehiculo || !idChofer || !idRuta || !fecha) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    await pool.query(
      `INSERT INTO Viaje (idVehiculo, idChofer, idRuta, fecha, horaInicio, estado, carga)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idVehiculo, idChofer, idRuta, fecha, horaInicio || null, estado || "Programado", carga || null]
    );

    res.status(201).json({ message: "Viaje creado correctamente" });

  } catch (error) {
    console.error("Error creando viaje:", error);
    res.status(500).json({ error: "Error creando viaje" });
  }
});

// ============================================
// ELIMINAR VIAJE
// ============================================
router.delete("/:id", authenticateToken, authorize("Administrador"), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM Viaje WHERE idViaje = ?", [id]);

    res.json({ message: "Viaje eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando viaje:", error);
    res.status(500).json({ error: "Error eliminando viaje" });
  }
});

module.exports = router;
