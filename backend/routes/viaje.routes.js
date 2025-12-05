const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Listar todos los viajes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado, fecha, idChofer, idVehiculo } = req.query;
    
    let query = `
      SELECT 
        v.*,
        ve.placa AS vehiculoPlaca,
        ve.modelo AS vehiculoModelo,
        c.nombre AS choferNombre,
        r.nombre AS rutaNombre,
        r.origen,
        r.destino,
        r.distancia
      FROM Viaje v
      INNER JOIN Vehiculo ve ON v.idVehiculo = ve.idVehiculo
      INNER JOIN Chofer c ON v.idChofer = c.idChofer
      INNER JOIN Ruta r ON v.idRuta = r.idRuta
      WHERE 1=1
    `;
    let params = [];
    
    if (estado) {
      query += ' AND v.estado = ?';
      params.push(estado);
    }
    
    if (fecha) {
      query += ' AND v.fecha = ?';
      params.push(fecha);
    }
    
    if (idChofer) {
      query += ' AND v.idChofer = ?';
      params.push(idChofer);
    }
    
    if (idVehiculo) {
      query += ' AND v.idVehiculo = ?';
      params.push(idVehiculo);
    }
    
    query += ' ORDER BY v.fecha DESC, v.horaInicio DESC';
    
    const [viajes] = await pool.query(query, params);
    res.json(viajes);
  } catch (error) {
    console.error('Error obteniendo viajes:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener un viaje por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [viajes] = await pool.query(`
      SELECT 
        v.*,
        ve.placa AS vehiculoPlaca,
        ve.modelo AS vehiculoModelo,
        c.nombre AS choferNombre,
        c.cedula AS choferCedula,
        r.nombre AS rutaNombre,
        r.origen,
        r.destino,
        r.distancia,
        r.tiempoEstimado
      FROM Viaje v
      INNER JOIN Vehiculo ve ON v.idVehiculo = ve.idVehiculo
      INNER JOIN Chofer c ON v.idChofer = c.idChofer
      INNER JOIN Ruta r ON v.idRuta = r.idRuta
      WHERE v.idViaje = ?
    `, [req.params.id]);
    
    if (viajes.length === 0) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    
    res.json(viajes[0]);
  } catch (error) {
    console.error('Error obteniendo viaje:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear nuevo viaje (Solo Administrador y Supervisor)
router.post('/', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { idVehiculo, idChofer, idRuta, fecha, carga } = req.body;
    
    // Validar campos requeridos
    if (!idVehiculo || !idChofer || !idRuta || !fecha) {
      return res.status(400).json({ 
        error: 'Vehículo, chofer, ruta y fecha son requeridos' 
      });
    }
    
    // Verificar que el vehículo esté disponible
    const [vehiculo] = await pool.query(
      'SELECT estado FROM Vehiculo WHERE idVehiculo = ?',
      [idVehiculo]
    );
    
    if (vehiculo.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }
    
    if (vehiculo[0].estado !== 'Disponible') {
      return res.status(400).json({ 
        error: `El vehículo no está disponible. Estado actual: ${vehiculo[0].estado}` 
      });
    }
    
    // Verificar que el chofer esté activo
    const [chofer] = await pool.query(
      'SELECT estado FROM Chofer WHERE idChofer = ?',
      [idChofer]
    );
    
    if (chofer.length === 0) {
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }
    
    if (chofer[0].estado !== 'Activo') {
      return res.status(400).json({ 
        error: `El chofer no está activo. Estado actual: ${chofer[0].estado}` 
      });
    }
    
    // Crear el viaje
    const [result] = await pool.query(
      'INSERT INTO Viaje (idVehiculo, idChofer, idRuta, fecha, carga, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [idVehiculo, idChofer, idRuta, fecha, carga, 'Programado']
    );
    
    // Actualizar estado del vehículo a "En uso"
    await pool.query(
      'UPDATE Vehiculo SET estado = "En uso" WHERE idVehiculo = ?',
      [idVehiculo]
    );
    
    res.status(201).json({
      success: true,
      message: 'Viaje creado exitosamente',
      idViaje: result.insertId
    });
  } catch (error) {
    console.error('Error creando viaje:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Iniciar viaje (cambiar a "En curso")
router.patch('/:id/iniciar', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { horaInicio } = req.body;
    
    if (!horaInicio) {
      return res.status(400).json({ error: 'La hora de inicio es requerida' });
    }
    
    const [result] = await pool.query(
      'UPDATE Viaje SET estado = "En curso", horaInicio = ? WHERE idViaje = ? AND estado = "Programado"',
      [horaInicio, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ 
        error: 'Viaje no encontrado o no se puede iniciar (debe estar en estado Programado)' 
      });
    }
    
    res.json({ success: true, message: 'Viaje iniciado exitosamente' });
  } catch (error) {
    console.error('Error iniciando viaje:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Completar viaje
router.patch('/:id/completar', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { horaInicio, horaFin, combustibleUsado, kilometrajeFinal, observaciones } = req.body;
    
    // Validar campos requeridos
    if (!horaInicio || !horaFin || !kilometrajeFinal) {
      return res.status(400).json({ 
        error: 'Hora de inicio, hora de fin y kilometraje final son requeridos' 
      });
    }
    
    // Obtener datos del viaje
    const [viajes] = await connection.query(
      'SELECT idVehiculo, idChofer, idRuta, fecha FROM Viaje WHERE idViaje = ?',
      [req.params.id]
    );
    
    if (viajes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    
    const viaje = viajes[0];
    
    // Actualizar el viaje
    await connection.query(
      `UPDATE Viaje 
       SET estado = 'Completado', horaInicio = ?, horaFin = ?, 
           combustibleUsado = ?, kilometrajeFinal = ?, observaciones = ?
       WHERE idViaje = ?`,
      [horaInicio, horaFin, combustibleUsado, kilometrajeFinal, observaciones, req.params.id]
    );
    
    // Actualizar kilometraje del vehículo y liberar el vehículo
    await connection.query(
      'UPDATE Vehiculo SET kilometrajeActual = ?, estado = "Disponible" WHERE idVehiculo = ?',
      [kilometrajeFinal, viaje.idVehiculo]
    );
    
    // Calcular horas trabajadas
    const [tiempoResult] = await connection.query(`
      SELECT TIMESTAMPDIFF(MINUTE, 
        CONCAT(?, ' ', ?), 
        CONCAT(?, ' ', ?)
      ) / 60.0 AS horasTrabajadas
    `, [viaje.fecha, horaInicio, viaje.fecha, horaFin]);
    
    const horasTrabajadas = tiempoResult[0].horasTrabajadas;
    
    // Actualizar horas trabajadas del chofer
    await connection.query(
      'UPDATE Chofer SET horasTrabajadasTotal = horasTrabajadasTotal + ? WHERE idChofer = ?',
      [horasTrabajadas, viaje.idChofer]
    );
    
    // Verificar si se necesita alerta de mantenimiento
    const [vehiculo] = await connection.query(
      'SELECT kilometrajeActual, kilometrajeLimiteMantenimiento, placa FROM Vehiculo WHERE idVehiculo = ?',
      [viaje.idVehiculo]
    );
    
    const kmRestantes = vehiculo[0].kilometrajeLimiteMantenimiento - vehiculo[0].kilometrajeActual;
    
    if (kmRestantes <= 500 && kmRestantes > 0) {
      await connection.query(
        `INSERT INTO Alerta (tipo, idRelacionado, mensaje, prioridad)
         VALUES ('Mantenimiento', ?, ?, 'Alta')`,
        [
          viaje.idVehiculo,
          `Vehículo ${vehiculo[0].placa} está cerca del límite. Faltan ${Math.round(kmRestantes)} km para mantenimiento`
        ]
      );
    } else if (kmRestantes <= 0) {
      await connection.query(
        'UPDATE Vehiculo SET estado = "Mantenimiento" WHERE idVehiculo = ?',
        [viaje.idVehiculo]
      );
      
      await connection.query(
        `INSERT INTO Alerta (tipo, idRelacionado, mensaje, prioridad)
         VALUES ('Mantenimiento', ?, ?, 'Alta')`,
        [
          viaje.idVehiculo,
          `¡URGENTE! Vehículo ${vehiculo[0].placa} ha excedido el límite de kilometraje. Requiere mantenimiento inmediato`
        ]
      );
    }
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Viaje completado exitosamente',
      horasTrabajadas: horasTrabajadas.toFixed(2)
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error completando viaje:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    connection.release();
  }
});

// Cancelar viaje
router.patch('/:id/cancelar', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { observaciones } = req.body;
    
    // Obtener el viaje
    const [viajes] = await connection.query(
      'SELECT idVehiculo FROM Viaje WHERE idViaje = ?',
      [req.params.id]
    );
    
    if (viajes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    
    // Actualizar viaje
    await connection.query(
      'UPDATE Viaje SET estado = "Cancelado", observaciones = ? WHERE idViaje = ?',
      [observaciones, req.params.id]
    );
    
    // Liberar vehículo
    await connection.query(
      'UPDATE Vehiculo SET estado = "Disponible" WHERE idVehiculo = ?',
      [viajes[0].idVehiculo]
    );
    
    await connection.commit();
    
    res.json({ success: true, message: 'Viaje cancelado exitosamente' });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error cancelando viaje:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    connection.release();
  }
});

module.exports = router;