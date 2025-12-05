const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Listar todas las alertas
router.get('/', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { estado, tipo, prioridad } = req.query;
    
    let query = `
      SELECT 
        a.*,
        CASE 
          WHEN a.tipo = 'Mantenimiento' THEN v.placa
          WHEN a.tipo = 'Horas_Excedidas' THEN c.nombre
          ELSE 'N/A'
        END AS relacionado,
        DATEDIFF(CURDATE(), DATE(a.fechaCreacion)) AS diasActiva
      FROM Alerta a
      LEFT JOIN Vehiculo v ON a.tipo = 'Mantenimiento' AND a.idRelacionado = v.idVehiculo
      LEFT JOIN Chofer c ON a.tipo = 'Horas_Excedidas' AND a.idRelacionado = c.idChofer
      WHERE 1=1
    `;
    let params = [];
    
    if (estado) {
      query += ' AND a.estado = ?';
      params.push(estado);
    }
    
    if (tipo) {
      query += ' AND a.tipo = ?';
      params.push(tipo);
    }
    
    if (prioridad) {
      query += ' AND a.prioridad = ?';
      params.push(prioridad);
    }
    
    query += ` 
      ORDER BY 
        CASE a.prioridad 
          WHEN 'Alta' THEN 1 
          WHEN 'Media' THEN 2 
          WHEN 'Baja' THEN 3 
        END,
        a.fechaCreacion DESC
    `;
    
    const [alertas] = await pool.query(query, params);
    res.json(alertas);
  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener una alerta por ID
router.get('/:id', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [alertas] = await pool.query(`
      SELECT 
        a.*,
        CASE 
          WHEN a.tipo = 'Mantenimiento' THEN v.placa
          WHEN a.tipo = 'Horas_Excedidas' THEN c.nombre
          ELSE 'N/A'
        END AS relacionado
      FROM Alerta a
      LEFT JOIN Vehiculo v ON a.tipo = 'Mantenimiento' AND a.idRelacionado = v.idVehiculo
      LEFT JOIN Chofer c ON a.tipo = 'Horas_Excedidas' AND a.idRelacionado = c.idChofer
      WHERE a.idAlerta = ?
    `, [req.params.id]);
    
    if (alertas.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }
    
    res.json(alertas[0]);
  } catch (error) {
    console.error('Error obteniendo alerta:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener alertas activas (para dashboard)
router.get('/activas/dashboard', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [alertas] = await pool.query(`
      SELECT 
        a.idAlerta,
        a.tipo,
        a.prioridad,
        a.mensaje,
        a.fechaCreacion,
        DATEDIFF(CURDATE(), DATE(a.fechaCreacion)) AS diasActiva,
        CASE 
          WHEN a.tipo = 'Mantenimiento' THEN v.placa
          WHEN a.tipo = 'Horas_Excedidas' THEN c.nombre
          ELSE 'N/A'
        END AS relacionado
      FROM Alerta a
      LEFT JOIN Vehiculo v ON a.tipo = 'Mantenimiento' AND a.idRelacionado = v.idVehiculo
      LEFT JOIN Chofer c ON a.tipo = 'Horas_Excedidas' AND a.idRelacionado = c.idChofer
      WHERE a.estado = 'Activa'
      ORDER BY 
        CASE a.prioridad 
          WHEN 'Alta' THEN 1 
          WHEN 'Media' THEN 2 
          WHEN 'Baja' THEN 3 
        END,
        a.fechaCreacion DESC
      LIMIT 10
    `);
    
    res.json(alertas);
  } catch (error) {
    console.error('Error obteniendo alertas activas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear alerta manualmente (Solo Administrador y Supervisor)
router.post('/', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { tipo, idRelacionado, mensaje, prioridad } = req.body;
    
    // Validar campos requeridos
    if (!tipo || !idRelacionado || !mensaje) {
      return res.status(400).json({ 
        error: 'Tipo, ID relacionado y mensaje son requeridos' 
      });
    }
    
    const [result] = await pool.query(
      'INSERT INTO Alerta (tipo, idRelacionado, mensaje, prioridad) VALUES (?, ?, ?, ?)',
      [tipo, idRelacionado, mensaje, prioridad || 'Media']
    );
    
    res.status(201).json({
      success: true,
      message: 'Alerta creada exitosamente',
      idAlerta: result.insertId
    });
  } catch (error) {
    console.error('Error creando alerta:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Marcar alerta como resuelta
router.patch('/:id/resolver', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Alerta SET estado = "Resuelta" WHERE idAlerta = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }
    
    res.json({ success: true, message: 'Alerta marcada como resuelta' });
  } catch (error) {
    console.error('Error resolviendo alerta:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Resolver todas las alertas de un vehículo o chofer
router.patch('/resolver-por-relacion/:tipo/:id', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { tipo, id } = req.params;
    
    if (!['Mantenimiento', 'Horas_Excedidas'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de alerta inválido' });
    }
    
    const [result] = await pool.query(
      'UPDATE Alerta SET estado = "Resuelta" WHERE tipo = ? AND idRelacionado = ? AND estado = "Activa"',
      [tipo, id]
    );
    
    res.json({ 
      success: true, 
      message: 'Alertas resueltas exitosamente',
      alertasResueltas: result.affectedRows
    });
  } catch (error) {
    console.error('Error resolviendo alertas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar alerta (Solo Administrador)
router.delete('/:id', authenticateToken, authorize('Administrador'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Alerta WHERE idAlerta = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }
    
    res.json({ success: true, message: 'Alerta eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando alerta:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Estadísticas de alertas
router.get('/estadisticas/general', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) AS totalAlertas,
        COUNT(CASE WHEN estado = 'Activa' THEN 1 END) AS activas,
        COUNT(CASE WHEN estado = 'Resuelta' THEN 1 END) AS resueltas,
        COUNT(CASE WHEN prioridad = 'Alta' THEN 1 END) AS altaPrioridad,
        COUNT(CASE WHEN tipo = 'Mantenimiento' THEN 1 END) AS alertasMantenimiento,
        COUNT(CASE WHEN tipo = 'Horas_Excedidas' THEN 1 END) AS alertasHoras
      FROM Alerta
    `);
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error obteniendo estadísticas de alertas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;