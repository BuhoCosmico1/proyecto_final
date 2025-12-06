const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Normalizar datos numéricos
function normalizar(data) {
  const obj = { ...data };
  Object.keys(obj).forEach(key => {
    if (obj[key] === null) obj[key] = 0;
    if (!isNaN(obj[key])) obj[key] = Number(obj[key]);
  });
  return obj;
}

// ======================================================
// GET /choferes — Listar choferes con filtros y búsqueda
// ======================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado, buscar } = req.query;

    let query = `SELECT * FROM Chofer WHERE 1=1`;
    const params = [];

    if (estado) {
      query += ` AND estado = ?`;
      params.push(estado);
    }

    if (buscar) {
      const term = `%${buscar}%`;
      query += ` AND (nombre LIKE ? OR cedula LIKE ? OR licencia LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY nombre`;

    const [rows] = await pool.query(query, params);

    res.json(rows.map(normalizar));

  } catch (error) {
    console.error('Error obteniendo choferes:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ======================================================
// GET /choferes/:id — Obtener chofer por ID
// ======================================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Chofer WHERE idChofer = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }

    res.json(normalizar(rows[0]));

  } catch (error) {
    console.error('Error obteniendo chofer:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ======================================================
// GET /choferes/:id/estadisticas — Stats del chofer
// ======================================================
router.get('/:id/estadisticas', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.*,
        COUNT(v.idViaje) AS totalViajes,
        COALESCE(SUM(
          TIMESTAMPDIFF(MINUTE,
            CONCAT(v.fecha, ' ', v.horaInicio),
            CONCAT(v.fecha, ' ', v.horaFin)
          ) / 60.0
        ), 0) AS horasTrabajadas,
        COALESCE(SUM(
          CASE WHEN MONTH(v.fecha) = MONTH(CURDATE())
             AND YEAR(v.fecha) = YEAR(CURDATE())
          THEN TIMESTAMPDIFF(MINUTE,
            CONCAT(v.fecha, ' ', v.horaInicio),
            CONCAT(v.fecha, ' ', v.horaFin)
          ) / 60.0
          ELSE 0 END
        ), 0) AS horasMesActual
      FROM Chofer c
      LEFT JOIN Viaje v ON c.idChofer = v.idChofer AND v.estado = 'Completado'
      WHERE c.idChofer = ?
      GROUP BY c.idChofer
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }

    res.json(normalizar(rows[0]));

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ======================================================
// POST /choferes — Crear chofer
// ======================================================
router.post('/', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { nombre, cedula, licencia, telefono, estado } = req.body;

    if (!nombre || !cedula || !licencia) {
      return res.status(400).json({
        error: 'Nombre, cédula y licencia son obligatorios'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO Chofer (nombre, cedula, licencia, telefono, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, cedula, licencia, telefono || null, estado || 'Activo']
    );

    res.status(201).json({
      success: true,
      message: 'Chofer creado exitosamente',
      idChofer: result.insertId
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'La cédula ya existe' });
    }

    console.error('Error creando chofer:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ======================================================
// PUT /choferes/:id — Actualizar chofer
// ======================================================
router.put('/:id', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { nombre, cedula, licencia, telefono, estado } = req.body;

    const [result] = await pool.query(
      `UPDATE Chofer SET nombre=?, cedula=?, licencia=?, telefono=?, estado=?
       WHERE idChofer=?`,
      [nombre, cedula, licencia, telefono, estado, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }

    res.json({ success: true, message: 'Chofer actualizado correctamente' });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'La cédula ya está registrada' });
    }

    console.error('Error actualizando chofer:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ======================================================
// PATCH /choferes/:id/desactivar — Desactivar chofer
// ======================================================
router.patch('/:id/desactivar', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE Chofer SET estado = 'Inactivo' WHERE idChofer=?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }

    res.json({ success: true, message: 'Chofer desactivado correctamente' });

  } catch (error) {
    console.error('Error desactivando chofer:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ======================================================
// DELETE /choferes/:id — Eliminar chofer
// ======================================================
router.delete('/:id', authenticateToken, authorize('Administrador'), async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM Chofer WHERE idChofer=?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }

    res.json({ success: true, message: 'Chofer eliminado exitosamente' });

  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: 'No se puede eliminar: tiene viajes asociados'
      });
    }

    console.error('Error eliminando chofer:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
