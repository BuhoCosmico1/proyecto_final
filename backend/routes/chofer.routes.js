const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Listar todos los choferes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado, buscar } = req.query;
    
    let query = 'SELECT * FROM Chofer WHERE 1=1';
    let params = [];
    
    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }
    
    // Búsqueda por nombre, cédula o licencia
    if (buscar) {
      query += ' AND (nombre LIKE ? OR cedula LIKE ? OR licencia LIKE ?)';
      const searchTerm = `%${buscar}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY nombre';
    
    const [choferes] = await pool.query(query, params);
    res.json(choferes);
  } catch (error) {
    console.error('Error obteniendo choferes:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener un chofer por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [choferes] = await pool.query(
      'SELECT * FROM Chofer WHERE idChofer = ?',
      [req.params.id]
    );
    
    if (choferes.length === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }
    
    res.json(choferes[0]);
  } catch (error) {
    console.error('Error obteniendo chofer:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener estadísticas de un chofer
router.get('/:id/estadisticas', authenticateToken, async (req, res) => {
  try {
    const [stats] = await pool.query(`
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
          CASE 
            WHEN MONTH(v.fecha) = MONTH(CURDATE()) 
            AND YEAR(v.fecha) = YEAR(CURDATE())
            THEN TIMESTAMPDIFF(MINUTE, 
              CONCAT(v.fecha, ' ', v.horaInicio), 
              CONCAT(v.fecha, ' ', v.horaFin)
            ) / 60.0
            ELSE 0
          END
        ), 0) AS horasMesActual
      FROM Chofer c
      LEFT JOIN Viaje v ON c.idChofer = v.idChofer AND v.estado = 'Completado'
      WHERE c.idChofer = ?
      GROUP BY c.idChofer
    `, [req.params.id]);
    
    if (stats.length === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear nuevo chofer (Solo Administrador y Supervisor)
router.post('/', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { nombre, cedula, licencia, telefono, estado } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !cedula || !licencia) {
      return res.status(400).json({ error: 'Nombre, cédula y licencia son requeridos' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO Chofer (nombre, cedula, licencia, telefono, estado) VALUES (?, ?, ?, ?, ?)',
      [nombre, cedula, licencia, telefono, estado || 'Activo']
    );
    
    res.status(201).json({
      success: true,
      message: 'Chofer creado exitosamente',
      idChofer: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'La cédula ya está registrada' });
    }
    console.error('Error creando chofer:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Actualizar chofer (Solo Administrador y Supervisor)
router.put('/:id', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { nombre, cedula, licencia, telefono, estado } = req.body;
    
    const [result] = await pool.query(
      'UPDATE Chofer SET nombre = ?, cedula = ?, licencia = ?, telefono = ?, estado = ? WHERE idChofer = ?',
      [nombre, cedula, licencia, telefono, estado, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }
    
    res.json({ success: true, message: 'Chofer actualizado exitosamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'La cédula ya está registrada' });
    }
    console.error('Error actualizando chofer:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Desactivar chofer (Solo Administrador y Supervisor)
router.patch('/:id/desactivar', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Chofer SET estado = "Inactivo" WHERE idChofer = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }
    
    res.json({ success: true, message: 'Chofer desactivado exitosamente' });
  } catch (error) {
    console.error('Error desactivando chofer:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar chofer (Solo Administrador)
router.delete('/:id', authenticateToken, authorize('Administrador'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Chofer WHERE idChofer = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }
    
    res.json({ success: true, message: 'Chofer eliminado exitosamente' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: 'No se puede eliminar el chofer porque tiene viajes asociados' 
      });
    }
    console.error('Error eliminando chofer:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;