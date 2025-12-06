const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Normalizar valores numéricos para evitar NaN/null en frontend
function normalizar(data) {
  const obj = { ...data };
  Object.keys(obj).forEach((key) => {
    if (obj[key] === null) obj[key] = 0;
    if (!isNaN(obj[key])) obj[key] = Number(obj[key]);
  });
  return obj;
}

// ======================================================
// GET /mantenimientos — Listar mantenimientos
// ======================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado, tipo, idVehiculo } = req.query;

    let query = `
      SELECT 
        m.*,
        v.placa AS vehiculoPlaca,
        v.modelo AS vehiculoModelo,
        v.kilometrajeActual
      FROM Mantenimiento m
      INNER JOIN Vehiculo v ON m.idVehiculo = v.idVehiculo
      WHERE 1 = 1
    `;

    const params = [];

    if (estado) {
      query += ` AND m.estado = ?`;
      params.push(estado);
    }

    if (tipo) {
      query += ` AND m.tipo = ?`;
      params.push(tipo);
    }

    if (idVehiculo) {
      query += ` AND m.idVehiculo = ?`;
      params.push(idVehiculo);
    }

    query += ` ORDER BY m.fecha DESC`;

    const [rows] = await pool.query(query, params);

    res.json(rows.map(normalizar));

  } catch (error) {
    console.error("Error obteniendo mantenimientos:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// GET /mantenimientos/:id — Obtener mantenimiento
// ======================================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        m.*,
        v.placa AS vehiculoPlaca,
        v.modelo AS vehiculoModelo,
        v.kilometrajeActual
      FROM Mantenimiento m
      INNER JOIN Vehiculo v ON m.idVehiculo = v.idVehiculo
      WHERE m.idMantenimiento = ?
    `, [req.params.id]);

    if (rows.length === 0)
      return res.status(404).json({ error: "Mantenimiento no encontrado" });

    res.json(normalizar(rows[0]));

  } catch (error) {
    console.error("Error obteniendo mantenimiento:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// GET /mantenimientos/vehiculo/:idVehiculo — Historial
// ======================================================
router.get('/vehiculo/:idVehiculo', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        m.*, 
        v.placa AS vehiculoPlaca 
      FROM Mantenimiento m
      INNER JOIN Vehiculo v ON m.idVehiculo = v.idVehiculo
      WHERE m.idVehiculo = ?
      ORDER BY m.fecha DESC
    `, [req.params.idVehiculo]);

    res.json(rows.map(normalizar));

  } catch (error) {
    console.error("Error obteniendo historial:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// GET /mantenimientos/estadisticas/general — Stats
// ======================================================
router.get('/estadisticas/general', authenticateToken, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN estado = 'Completado' THEN 1 END) AS completados,
        COUNT(CASE WHEN estado = 'Programado' THEN 1 END) AS programados,
        COALESCE(SUM(costo), 0) AS costoTotal,
        COALESCE(AVG(costo), 0) AS costoPromedio,
        COALESCE(SUM(
          CASE WHEN MONTH(fecha) = MONTH(CURDATE()) 
             AND YEAR(fecha) = YEAR(CURDATE())
          THEN costo ELSE 0 END
        ), 0) AS costoMesActual
      FROM Mantenimiento
    `);

    res.json(normalizar(stats[0]));

  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// POST /mantenimientos — Crear mantenimiento
// ======================================================
router.post('/', authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const { idVehiculo, fecha, tipo, descripcion, costo, estado } = req.body;

    if (!idVehiculo || !fecha || !tipo || !descripcion || costo === undefined) {
      return res.status(400).json({
        error: "Todos los campos son obligatorios"
      });
    }

    const [vehiculo] = await pool.query(
      "SELECT idVehiculo FROM Vehiculo WHERE idVehiculo=?",
      [idVehiculo]
    );

    if (vehiculo.length === 0)
      return res.status(404).json({ error: "Vehículo no encontrado" });

    const [result] = await pool.query(
      `INSERT INTO Mantenimiento 
       (idVehiculo, fecha, tipo, descripcion, costo, estado)
       VALUES (?, ?, ?, ?, ?, ?)
      `,
      [idVehiculo, fecha, tipo, descripcion, costo, estado || "Programado"]
    );

    // Crear alerta automática si el costo es muy alto
if (costo > 150000) {
  await pool.query(
    `INSERT INTO Alerta (tipo, idRelacionado, mensaje, prioridad)
     VALUES (?, ?, ?, ?)`,
    [
      "Mantenimiento",
      result.insertId,
      "El costo del mantenimiento supera el límite recomendado.",
      "Alta",
    ]
  );
}

    // Si es programado → vehículo pasa a "Mantenimiento"
    await pool.query(
      `UPDATE Vehiculo 
       SET estado="Mantenimiento"
       WHERE idVehiculo=?`,
      [idVehiculo]
    );

    res.status(201).json({
      success: true,
      message: "Mantenimiento registrado",
      idMantenimiento: result.insertId
    });

  } catch (error) {
    console.error("Error creando mantenimiento:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


// ======================================================
// PATCH /mantenimientos/:id/completar — Completar
// ======================================================
router.patch('/:id/completar', authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { costo, descripcion } = req.body;

    const [rows] = await connection.query(
      `SELECT idVehiculo 
       FROM Mantenimiento 
       WHERE idMantenimiento=?`,
      [req.params.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Mantenimiento no encontrado" });

    const idVehiculo = rows[0].idVehiculo;

    await connection.query(
      `UPDATE Mantenimiento 
       SET estado="Completado",
           descripcion=?,
           costo=?
       WHERE idMantenimiento=?`,
      [descripcion, costo, req.params.id]
    );

    await connection.query(
      `UPDATE Vehiculo
       SET estado="Disponible"
       WHERE idVehiculo = ?`,
      [idVehiculo]
    );

    // Resolver alertas
    await connection.query(
      `UPDATE Alerta 
       SET estado="Resuelta" 
       WHERE tipo="Mantenimiento" 
         AND idRelacionado=? 
         AND estado="Activa"`,
      [idVehiculo]
    );

    await connection.commit();

    res.json({ success: true, message: "Mantenimiento completado" });

  } catch (error) {
    await connection.rollback();
    console.error("Error completando mantenimiento:", error);
    res.status(500).json({ error: "Error en el servidor" });
  } finally {
    connection.release();
  }
});

// ======================================================
// PUT /mantenimientos/:id — Editar mantenimiento
// ======================================================
router.put('/:id', authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const { fecha, tipo, descripcion, costo, estado } = req.body;

    const [result] = await pool.query(
      `UPDATE Mantenimiento 
       SET fecha=?, tipo=?, descripcion=?, costo=?, estado=?
       WHERE idMantenimiento=?`,
      [fecha, tipo, descripcion, costo, estado, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Mantenimiento no encontrado" });

    res.json({ success: true, message: "Mantenimiento actualizado" });

  } catch (error) {
    console.error("Error actualizando mantenimiento:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// DELETE /mantenimientos/:id — Eliminar
// ======================================================
router.delete('/:id', authenticateToken, authorize("Administrador"), async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM Mantenimiento WHERE idMantenimiento=?`,
      [req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Mantenimiento no encontrado" });

    res.json({ success: true, message: "Mantenimiento eliminado" });

  } catch (error) {
    console.error("Error eliminando mantenimiento:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
