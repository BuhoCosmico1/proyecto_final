const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Normalizador para evitar null/NaN en frontend
function normalizar(obj) {
  const r = { ...obj };
  for (const key of Object.keys(r)) {
    if (r[key] === null) r[key] = 0;
    if (!isNaN(r[key])) r[key] = Number(r[key]);
  }
  return r;
}

// ======================================================
// GET /alertas — Listar todas las alertas
// ======================================================
router.get('/', authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const { estado, tipo, prioridad } = req.query;

    let query = `
      SELECT 
        a.*,
        CASE 
          WHEN a.tipo='Mantenimiento' THEN v.placa
          WHEN a.tipo='Horas_Excedidas' THEN c.nombre
          ELSE 'N/A'
        END AS relacionado,
        DATEDIFF(CURDATE(), DATE(a.fechaCreacion)) AS diasActiva
      FROM Alerta a
      LEFT JOIN Vehiculo v ON a.tipo='Mantenimiento' AND a.idRelacionado=v.idVehiculo
      LEFT JOIN Chofer c ON a.tipo='Horas_Excedidas' AND a.idRelacionado=c.idChofer
      WHERE 1=1
    `;
    const params = [];

    if (estado) { query += ' AND a.estado=?'; params.push(estado); }
    if (tipo) { query += ' AND a.tipo=?'; params.push(tipo); }
    if (prioridad) { query += ' AND a.prioridad=?'; params.push(prioridad); }

    query += `
      ORDER BY 
        FIELD(a.prioridad, 'Alta', 'Media', 'Baja'),
        a.fechaCreacion DESC
    `;

    const [rows] = await pool.query(query, params);
    res.json(rows.map(normalizar));

  } catch (error) {
    console.error("Error obteniendo alertas:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// GET /alertas/:id — Obtener alerta por ID
// ======================================================
router.get('/:id', authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.*,
        CASE 
          WHEN a.tipo='Mantenimiento' THEN v.placa
          WHEN a.tipo='Horas_Excedidas' THEN c.nombre
          ELSE 'N/A'
        END AS relacionado
      FROM Alerta a
      LEFT JOIN Vehiculo v ON a.tipo='Mantenimiento' AND a.idRelacionado=v.idVehiculo
      LEFT JOIN Chofer c ON a.tipo='Horas_Excedidas' AND a.idRelacionado=c.idChofer
      WHERE a.idAlerta = ?
    `, [req.params.id]);

    if (rows.length === 0)
      return res.status(404).json({ error: "Alerta no encontrada" });

    res.json(normalizar(rows[0]));

  } catch (error) {
    console.error("Error obteniendo alerta:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// GET /alertas/activas/dashboard — Últimas alertas activas
// ======================================================
router.get('/activas/dashboard', authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.idAlerta, a.tipo, a.prioridad, a.mensaje, a.fechaCreacion,
        DATEDIFF(CURDATE(), DATE(a.fechaCreacion)) AS diasActiva,
        CASE 
          WHEN a.tipo='Mantenimiento' THEN v.placa
          WHEN a.tipo='Horas_Excedidas' THEN c.nombre
          ELSE 'N/A'
        END AS relacionado
      FROM Alerta a
      LEFT JOIN Vehiculo v ON a.tipo='Mantenimiento' AND a.idRelacionado=v.idVehiculo
      LEFT JOIN Chofer c ON a.tipo='Horas_Excedidas' AND a.idRelacionado=c.idChofer
      WHERE a.estado = 'Activa'
      ORDER BY FIELD(a.prioridad,'Alta','Media','Baja'), a.fechaCreacion DESC
      LIMIT 10
    `);

    res.json(rows.map(normalizar));

  } catch (error) {
    console.error("Error obteniendo alertas activas:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// POST /alertas — Crear alerta manual
// ======================================================
router.post('/', authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const { tipo, idRelacionado, mensaje, prioridad } = req.body;

    if (!tipo || !idRelacionado || !mensaje)
      return res.status(400).json({ error: "Campos obligatorios faltantes" });

    const [result] = await pool.query(
      `INSERT INTO Alerta (tipo, idRelacionado, mensaje, prioridad)
       VALUES (?, ?, ?, ?)`,
      [tipo, idRelacionado, mensaje, prioridad || 'Media']
    );

    res.status(201).json({
      success: true,
      message: "Alerta creada exitosamente",
      idAlerta: result.insertId
    });

  } catch (error) {
    console.error("Error creando alerta:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// PATCH /alertas/:id/resolver — Resolver alerta individual
// ======================================================
router.patch('/:id/resolver', authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE Alerta SET estado='Resuelta' WHERE idAlerta=?`,
      [req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Alerta no encontrada" });

    res.json({ success: true, message: "Alerta marcada como resuelta" });

  } catch (error) {
    console.error("Error resolviendo alerta:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// PATCH /alertas/resolver-por-relacion/:tipo/:id — Resolver todas
// ======================================================
router.patch('/resolver-por-relacion/:tipo/:id', authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const { tipo, id } = req.params;

    if (!['Mantenimiento', 'Horas_Excedidas'].includes(tipo))
      return res.status(400).json({ error: "Tipo inválido" });

    const [result] = await pool.query(
      `UPDATE Alerta 
       SET estado='Resuelta'
       WHERE tipo=? AND idRelacionado=? AND estado='Activa'`,
      [tipo, id]
    );

    res.json({
      success: true,
      message: "Alertas resueltas",
      totalResueltas: result.affectedRows
    });

  } catch (error) {
    console.error("Error resolviendo alertas:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// DELETE /alertas/:id — Eliminar alerta
// ======================================================
router.delete('/:id', authenticateToken, authorize("Administrador"), async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM Alerta WHERE idAlerta=?`,
      [req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Alerta no encontrada" });

    res.json({ success: true, message: "Alerta eliminada" });

  } catch (error) {
    console.error("Error eliminando alerta:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ======================================================
// GET /alertas/estadisticas/general — Stats
// ======================================================
router.get('/estadisticas/general', authenticateToken, authorize("Administrador", "Supervisor"), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(estado='Activa') AS activas,
        SUM(estado='Resuelta') AS resueltas,
        SUM(prioridad='Alta') AS alta,
        SUM(tipo='Mantenimiento') AS mantenimiento,
        SUM(tipo='Horas_Excedidas') AS horas
      FROM Alerta
    `);

    res.json(normalizar(rows[0]));

  } catch (error) {
    console.error("Error obteniendo stats:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
