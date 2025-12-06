const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const { authenticateToken, authorize } = require("../middleware/auth.middleware");

// ======================================================
// GET todas las rutas
// ======================================================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM Ruta ORDER BY idRuta DESC`);
    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo rutas:", error);
    res.status(500).json({ error: "Error al obtener rutas" });
  }
});

// ======================================================
// GET ruta por ID
// ======================================================
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM Ruta WHERE idRuta = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ruta no encontrada" });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("Error obteniendo ruta:", error);
    res.status(500).json({ error: "Error al obtener ruta" });
  }
});

// ======================================================
// POST crear ruta
// ======================================================
router.post("/", authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const { nombre, origen, destino, distancia, tiempoEstimado, estado } = req.body;

    if (!nombre || !origen || !destino || !distancia || !tiempoEstimado || !estado) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const [result] = await pool.query(
      `INSERT INTO Ruta (nombre, origen, destino, distancia, tiempoEstimado, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, origen, destino, distancia, tiempoEstimado, estado]
    );

    res.status(201).json({
      message: "Ruta creada correctamente",
      idRuta: result.insertId
    });

  } catch (error) {
    console.error("Error al crear ruta:", error);
    res.status(500).json({ error: "Error al crear ruta" });
  }
});

// ======================================================
// PUT actualizar ruta
// ======================================================
router.put("/:id", authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, origen, destino, distancia, tiempoEstimado, estado } = req.body;

    await pool.query(
      `UPDATE Ruta SET
        nombre = COALESCE(?, nombre),
        origen = COALESCE(?, origen),
        destino = COALESCE(?, destino),
        distancia = COALESCE(?, distancia),
        tiempoEstimado = COALESCE(?, tiempoEstimado),
        estado = COALESCE(?, estado)
      WHERE idRuta = ?`,
      [nombre, origen, destino, distancia, tiempoEstimado, estado, id]
    );

    res.json({ message: "Ruta actualizada correctamente" });

  } catch (error) {
    console.error("Error actualizando ruta:", error);
    res.status(500).json({ error: "Error al actualizar ruta" });
  }
});

// ======================================================
// DELETE ruta
// ======================================================
router.delete("/:id", authenticateToken, authorize("Administrador"), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM Ruta WHERE idRuta = ?", [id]);

    res.json({ message: "Ruta eliminada correctamente" });

  } catch (error) {
    console.error("Error eliminando ruta:", error);
    res.status(500).json({ error: "Error al eliminar ruta" });
  }
});

module.exports = router;
