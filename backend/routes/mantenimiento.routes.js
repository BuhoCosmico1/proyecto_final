const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Listar todos los mantenimientos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado, idVehiculo, tipo } = req.query;
    
    let query = `
      SELECT 
        m.*,
        v.placa AS vehiculoPlaca,
        v.modelo AS vehiculoModelo
      FROM Mantenimiento m
      INNER JOIN Vehiculo v ON m.idVehiculo = v.idVehiculo
      WHERE 1=1
    `;
    let params = [];
    
    if (estado) {
      query += ' AND m.estado = ?';
      params.push(estado);
    }
    
    if (idVehiculo) {
      query += ' AND m.idVehiculo = ?';
      params.push(idVehiculo);
    }
    
    if (tipo) {
      query += ' AND m.tipo = ?';
      params.push(tipo);
    }
    
    query += ' ORDER BY m.fecha DESC';
    
    const [mantenimientos] = await pool.query(query, params);
    res.json(mantenimientos);
  } catch (error) {
    console.error('Error obteniendo mantenimientos:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener un mantenimiento por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [mantenimientos] = await pool.query(`
      SELECT 
        m.*,
        v.placa AS vehiculoPlaca,
        v.modelo AS vehiculoModelo,
        v.kilometrajeActual AS vehiculoKilometraje
      FROM Mantenimiento m
      INNER JOIN Vehiculo v ON m.idVehiculo = v.idVehiculo
      WHERE m.idMantenimiento = ?
    `, [req.params.id]);
    
    if (mantenimientos.length === 0) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }
    
    res.json(mantenimientos[0]);
  } catch (error) {
    console.error('Error obteniendo mantenimiento:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener historial de mantenimiento de un vehículo
router.get('/vehiculo/:idVehiculo', authenticateToken, async (req, res) => {
  try {
    const [mantenimientos] = await pool.query(`
      SELECT * FROM Mantenimiento 
      WHERE idVehiculo = ?
      ORDER BY fecha DESC
    `, [req.params.idVehiculo]);
    
    res.json(mantenimientos);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener estadísticas de mantenimiento
router.get('/estadisticas/general', authenticateToken, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) AS totalMantenimientos,
        COUNT(CASE WHEN estado = 'Completado' THEN 1 END) AS completados,
        COUNT(CASE WHEN estado = 'Programado' THEN 1 END) AS programados,
        COALESCE(SUM(costo), 0) AS costoTotal,
        COALESCE(AVG(costo), 0) AS costoPromedio,
        COALESCE(SUM(CASE WHEN MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE()) THEN costo ELSE 0 END), 0) AS costoMesActual
      FROM Mantenimiento
    `);
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear nuevo mantenimiento (Solo Administrador y Supervisor)
router.post('/', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { idVehiculo, fecha, tipo, descripcion, costo, estado } = req.body;
    
    // Validar campos requeridos
    if (!idVehiculo || !fecha || !tipo || !descripcion || costo === undefined) {
      return res.status(400).json({ 
        error: 'Vehículo, fecha, tipo, descripción y costo son requeridos' 
      });
    }
    
    // Verificar que el vehículo existe
    const [vehiculo] = await pool.query(
      'SELECT idVehiculo FROM Vehiculo WHERE idVehiculo = ?',
      [idVehiculo]
    );
    
    if (vehiculo.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    
    const [result] = await pool.query(
      'INSERT INTO Mantenimiento (idVehiculo, fecha, tipo, descripcion, costo, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [idVehiculo, fecha, tipo, descripcion, costo, estado || 'Programado']
    );
    
    // Si el mantenimiento es inmediato, cambiar estado del vehículo
    if (estado === 'Programado' || !estado) {
      await pool.query(
        'UPDATE Vehiculo SET estado = "Mantenimiento" WHERE idVehiculo = ?',
        [idVehiculo]
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'Mantenimiento registrado exitosamente',
      idMantenimiento: result.insertId
    });
  } catch (error) {
    console.error('Error creando mantenimiento:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Completar mantenimiento
router.patch('/:id/completar', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { costo, descripcion } = req.body;
    
    // Obtener el mantenimiento
    const [mantenimientos] = await connection.query(
      'SELECT idVehiculo FROM Mantenimiento WHERE idMantenimiento = ?',
      [req.params.id]
    );
    
    if (mantenimientos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }
    
    const idVehiculo = mantenimientos[0].idVehiculo;
    
    // Actualizar mantenimiento
    let updateQuery = 'UPDATE Mantenimiento SET estado = "Completado"';
    let params = [];
    
    if (costo !== undefined) {
      updateQuery += ', costo = ?';
      params.push(costo);
    }
    
    if (descripcion) {
      updateQuery += ', descripcion = ?';
      params.push(descripcion);
    }
    
    updateQuery += ' WHERE idMantenimiento = ?';
    params.push(req.params.id);
    
    await connection.query(updateQuery, params);
    
    // Volver vehículo a disponible y resetear contador de kilometraje
    await connection.query(
      'UPDATE Vehiculo SET estado = "Disponible", kilometrajeActual = 0 WHERE idVehiculo = ?',
      [idVehiculo]
    );
    
    // Resolver alertas de mantenimiento de este vehículo
    await connection.query(
      'UPDATE Alerta SET estado = "Resuelta" WHERE tipo = "Mantenimiento" AND idRelacionado = ? AND estado = "Activa"',
      [idVehiculo]
    );
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Mantenimiento completado exitosamente. El vehículo está disponible y el contador de kilometraje se ha reiniciado.' 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error completando mantenimiento:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    connection.release();
  }
});

// Actualizar mantenimiento (Solo Administrador y Supervisor)
router.put('/:id', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { fecha, tipo, descripcion, costo, estado } = req.body;
    
    const [result] = await pool.query(
      'UPDATE Mantenimiento SET fecha = ?, tipo = ?, descripcion = ?, costo = ?, estado = ? WHERE idMantenimiento = ?',
      [fecha, tipo, descripcion, costo, estado, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }
    
    res.json({ success: true, message: 'Mantenimiento actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando mantenimiento:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar mantenimiento (Solo Administrador)
router.delete('/:id', authenticateToken, authorize('Administrador'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Mantenimiento WHERE idMantenimiento = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    }
    
    res.json({ success: true, message: 'Mantenimiento eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando mantenimiento:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;