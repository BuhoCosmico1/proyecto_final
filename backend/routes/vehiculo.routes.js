const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Listar todos los vehículos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = 'SELECT * FROM Vehiculo';
    let params = [];
    
    if (estado) {
      query += ' WHERE estado = ?';
      params.push(estado);
    }
    
    query += ' ORDER BY placa';
    
    const [vehiculos] = await pool.query(query, params);
    res.json(vehiculos);
  } catch (error) {
    console.error('Error obteniendo vehículos:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener un vehículo por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [vehiculos] = await pool.query(
      'SELECT * FROM Vehiculo WHERE idVehiculo = ?',
      [req.params.id]
    );
    
    if (vehiculos.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    
    res.json(vehiculos[0]);
  } catch (error) {
    console.error('Error obteniendo vehículo:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener estadísticas de un vehículo
router.get('/:id/estadisticas', authenticateToken, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        v.*,
        COUNT(vj.idViaje) AS totalViajes,
        COALESCE(SUM(vj.combustibleUsado), 0) AS combustibleTotal,
        v.kilometrajeLimiteMantenimiento - v.kilometrajeActual AS kmRestantes
      FROM Vehiculo v
      LEFT JOIN Viaje vj ON v.idVehiculo = vj.idVehiculo AND vj.estado = 'Completado'
      WHERE v.idVehiculo = ?
      GROUP BY v.idVehiculo
    `, [req.params.id]);
    
    if (stats.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear nuevo vehículo (Solo Administrador y Supervisor)
router.post('/', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { 
      placa, 
      modelo, 
      tipo, 
      kilometrajeActual, 
      kilometrajeLimiteMantenimiento 
    } = req.body;
    
    // Validar campos requeridos
    if (!placa || !modelo || !tipo) {
      return res.status(400).json({ error: 'Placa, modelo y tipo son requeridos' });
    }
    
    const [result] = await pool.query(
      `INSERT INTO Vehiculo (placa, modelo, tipo, kilometrajeActual, kilometrajeLimiteMantenimiento) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        placa, 
        modelo, 
        tipo, 
        kilometrajeActual || 0, 
        kilometrajeLimiteMantenimiento || 10000
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Vehículo creado exitosamente',
      idVehiculo: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'La placa ya está registrada' });
    }
    console.error('Error creando vehículo:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Actualizar vehículo (Solo Administrador y Supervisor)
router.put('/:id', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { 
      placa, 
      modelo, 
      tipo, 
      estado, 
      kilometrajeActual,
      kilometrajeLimiteMantenimiento 
    } = req.body;
    
    const [result] = await pool.query(
      `UPDATE Vehiculo 
       SET placa = ?, modelo = ?, tipo = ?, estado = ?, 
           kilometrajeActual = ?, kilometrajeLimiteMantenimiento = ?
       WHERE idVehiculo = ?`,
      [placa, modelo, tipo, estado, kilometrajeActual, kilometrajeLimiteMantenimiento, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    
    res.json({ success: true, message: 'Vehículo actualizado exitosamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'La placa ya está registrada' });
    }
    console.error('Error actualizando vehículo:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar vehículo (Solo Administrador)
router.delete('/:id', authenticateToken, authorize('Administrador'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Vehiculo WHERE idVehiculo = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    
    res.json({ success: true, message: 'Vehículo eliminado exitosamente' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: 'No se puede eliminar el vehículo porque tiene viajes asociados' 
      });
    }
    console.error('Error eliminando vehículo:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;