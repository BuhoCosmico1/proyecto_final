const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Listar todas las rutas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = 'SELECT * FROM Ruta';
    let params = [];
    
    if (estado) {
      query += ' WHERE estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY nombre';
    
    const [rutas] = await pool.query(query, params);
    res.json(rutas);
  } catch (error) {
    console.error('Error obteniendo rutas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener una ruta por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rutas] = await pool.query(
      'SELECT * FROM Ruta WHERE idRuta = ?',
      [req.params.id]
    );
    
    if (rutas.length === 0) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    
    res.json(rutas[0]);
  } catch (error) {
    console.error('Error obteniendo ruta:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener estadísticas de una ruta
router.get('/:id/estadisticas', authenticateToken, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        r.*,
        COUNT(v.idViaje) AS totalViajes,
        COALESCE(AVG(
          TIMESTAMPDIFF(MINUTE, 
            CONCAT(v.fecha, ' ', v.horaInicio), 
            CONCAT(v.fecha, ' ', v.horaFin)
          ) / 60.0
        ), 0) AS tiempoRealPromedio,
        COALESCE(AVG(v.combustibleUsado), 0) AS combustiblePromedio
      FROM Ruta r
      LEFT JOIN Viaje v ON r.idRuta = v.idRuta AND v.estado = 'Completado'
      WHERE r.idRuta = ?
      GROUP BY r.idRuta
    `, [req.params.id]);
    
    if (stats.length === 0) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear nueva ruta (Solo Administrador y Supervisor)
router.post('/', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { nombre, origen, destino, distancia, tiempoEstimado } = req.body;
    
    // Validar campos requeridos
    if (!origen || !destino || !distancia || !tiempoEstimado) {
      return res.status(400).json({ 
        error: 'Origen, destino, distancia y tiempo estimado son requeridos' 
      });
    }
    
    const [result] = await pool.query(
      'INSERT INTO Ruta (nombre, origen, destino, distancia, tiempoEstimado) VALUES (?, ?, ?, ?, ?)',
      [nombre, origen, destino, distancia, tiempoEstimado]
    );
    
    res.status(201).json({
      success: true,
      message: 'Ruta creada exitosamente',
      idRuta: result.insertId
    });
  } catch (error) {
    console.error('Error creando ruta:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Actualizar ruta (Solo Administrador y Supervisor)
router.put('/:id', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { nombre, origen, destino, distancia, tiempoEstimado, estado } = req.body;
    
    const [result] = await pool.query(
      `UPDATE Ruta 
       SET nombre = ?, origen = ?, destino = ?, distancia = ?, tiempoEstimado = ?, estado = ?
       WHERE idRuta = ?`,
      [nombre, origen, destino, distancia, tiempoEstimado, estado, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    
    res.json({ success: true, message: 'Ruta actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando ruta:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Desactivar ruta (Solo Administrador y Supervisor)
router.patch('/:id/desactivar', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Ruta SET estado = "Inactiva" WHERE idRuta = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    
    res.json({ success: true, message: 'Ruta desactivada exitosamente' });
  } catch (error) {
    console.error('Error desactivando ruta:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar ruta (Solo Administrador)
router.delete('/:id', authenticateToken, authorize('Administrador'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Ruta WHERE idRuta = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    
    res.json({ success: true, message: 'Ruta eliminada exitosamente' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: 'No se puede eliminar la ruta porque tiene viajes asociados' 
      });
    }
    console.error('Error eliminando ruta:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;