const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Dashboard principal - KPIs
router.get('/kpis', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [kpis] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM Vehiculo) AS totalVehiculos,
        (SELECT COUNT(*) FROM Vehiculo WHERE estado = 'Disponible') AS vehiculosDisponibles,
        (SELECT COUNT(*) FROM Vehiculo WHERE estado = 'En uso') AS vehiculosEnUso,
        (SELECT COUNT(*) FROM Vehiculo WHERE estado = 'Mantenimiento') AS vehiculosMantenimiento,
        (SELECT COUNT(*) FROM Chofer WHERE estado = 'Activo') AS choferesActivos,
        (SELECT COUNT(*) FROM Viaje WHERE fecha = CURDATE()) AS viajesHoy,
        (SELECT COUNT(*) FROM Viaje WHERE estado = 'En curso') AS viajesEnCurso,
        (SELECT COUNT(*) FROM Viaje WHERE estado = 'Completado' AND fecha = CURDATE()) AS viajesCompletadosHoy,
        (SELECT COUNT(*) FROM Alerta WHERE estado = 'Activa') AS alertasActivas,
        (SELECT COALESCE(SUM(costo), 0) FROM Mantenimiento WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())) AS costoMantenimientoMes
    `);
    
    res.json(kpis[0]);
  } catch (error) {
    console.error('Error obteniendo KPIs:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Vehículos más utilizados
router.get('/vehiculos-mas-usados', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    
    const [vehiculos] = await pool.query(`
      SELECT 
        v.placa,
        v.modelo,
        v.tipo,
        COUNT(vj.idViaje) AS totalViajes,
        COALESCE(SUM(vj.combustibleUsado), 0) AS combustibleTotal,
        COALESCE(AVG(
          TIMESTAMPDIFF(MINUTE, 
            CONCAT(vj.fecha, ' ', vj.horaInicio), 
            CONCAT(vj.fecha, ' ', vj.horaFin)
          ) / 60.0
        ), 0) AS tiempoPromedioHoras
      FROM Vehiculo v
      LEFT JOIN Viaje vj ON v.idVehiculo = vj.idVehiculo 
        AND vj.estado = 'Completado'
        AND vj.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY v.idVehiculo, v.placa, v.modelo, v.tipo
      ORDER BY totalViajes DESC
      LIMIT 10
    `, [dias]);
    
    res.json(vehiculos);
  } catch (error) {
    console.error('Error obteniendo vehículos más usados:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Productividad de choferes
router.get('/productividad-choferes', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    
    const [choferes] = await pool.query(`
      SELECT 
        c.nombre,
        c.cedula,
        COUNT(v.idViaje) AS viajesRealizados,
        COALESCE(SUM(
          TIMESTAMPDIFF(MINUTE, 
            CONCAT(v.fecha, ' ', v.horaInicio), 
            CONCAT(v.fecha, ' ', v.horaFin)
          ) / 60.0
        ), 0) AS horasTrabajadas,
        COALESCE(AVG(
          TIMESTAMPDIFF(MINUTE, 
            CONCAT(v.fecha, ' ', v.horaInicio), 
            CONCAT(v.fecha, ' ', v.horaFin)
          ) / 60.0
        ), 0) AS promedioHorasPorViaje
      FROM Chofer c
      LEFT JOIN Viaje v ON c.idChofer = v.idChofer 
        AND v.estado = 'Completado'
        AND v.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      WHERE c.estado = 'Activo'
      GROUP BY c.idChofer, c.nombre, c.cedula
      ORDER BY viajesRealizados DESC
      LIMIT 10
    `, [dias]);
    
    res.json(choferes);
  } catch (error) {
    console.error('Error obteniendo productividad de choferes:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Rutas más frecuentes
router.get('/rutas-frecuentes', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    
    const [rutas] = await pool.query(`
      SELECT 
        r.nombre,
        r.origen,
        r.destino,
        r.distancia,
        r.tiempoEstimado,
        COUNT(v.idViaje) AS totalViajes,
        COALESCE(AVG(
          TIMESTAMPDIFF(MINUTE, 
            CONCAT(v.fecha, ' ', v.horaInicio), 
            CONCAT(v.fecha, ' ', v.horaFin)
          ) / 60.0
        ), 0) AS tiempoPromedioReal,
        COALESCE(AVG(v.combustibleUsado), 0) AS combustiblePromedio
      FROM Ruta r
      LEFT JOIN Viaje v ON r.idRuta = v.idRuta 
        AND v.estado = 'Completado'
        AND v.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY r.idRuta, r.nombre, r.origen, r.destino, r.distancia, r.tiempoEstimado
      ORDER BY totalViajes DESC
      LIMIT 10
    `, [dias]);
    
    res.json(rutas);
  } catch (error) {
    console.error('Error obteniendo rutas frecuentes:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Viajes por día (últimos 30 días)
router.get('/viajes-por-dia', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    
    const [viajes] = await pool.query(`
      SELECT 
        DATE(fecha) AS dia,
        COUNT(*) AS totalViajes,
        COUNT(CASE WHEN estado = 'Completado' THEN 1 END) AS completados,
        COUNT(CASE WHEN estado = 'En curso' THEN 1 END) AS enCurso,
        COUNT(CASE WHEN estado = 'Cancelado' THEN 1 END) AS cancelados
      FROM Viaje
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(fecha)
      ORDER BY dia DESC
    `, [dias]);
    
    res.json(viajes);
  } catch (error) {
    console.error('Error obteniendo viajes por día:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Distribución de viajes por estado (mes actual)
router.get('/distribucion-viajes', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [distribucion] = await pool.query(`
      SELECT 
        estado,
        COUNT(*) AS cantidad,
        ROUND(COUNT(*) * 100.0 / (
          SELECT COUNT(*) FROM Viaje 
          WHERE MONTH(fecha) = MONTH(CURDATE()) 
          AND YEAR(fecha) = YEAR(CURDATE())
        ), 2) AS porcentaje
      FROM Viaje
      WHERE MONTH(fecha) = MONTH(CURDATE()) 
        AND YEAR(fecha) = YEAR(CURDATE())
      GROUP BY estado
    `);
    
    res.json(distribucion);
  } catch (error) {
    console.error('Error obteniendo distribución de viajes:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Viajes recientes
router.get('/viajes-recientes', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { limite = 10 } = req.query;
    
    const [viajes] = await pool.query(`
      SELECT 
        v.idViaje,
        v.fecha,
        v.estado,
        ve.placa AS vehiculoPlaca,
        c.nombre AS choferNombre,
        r.origen,
        r.destino
      FROM Viaje v
      INNER JOIN Vehiculo ve ON v.idVehiculo = ve.idVehiculo
      INNER JOIN Chofer c ON v.idChofer = c.idChofer
      INNER JOIN Ruta r ON v.idRuta = r.idRuta
      ORDER BY v.fecha DESC, v.fechaRegistro DESC
      LIMIT ?
    `, [parseInt(limite)]);
    
    res.json(viajes);
  } catch (error) {
    console.error('Error obteniendo viajes recientes:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Vehículos próximos a mantenimiento
router.get('/vehiculos-proximo-mantenimiento', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [vehiculos] = await pool.query(`
      SELECT 
        v.idVehiculo,
        v.placa,
        v.modelo,
        v.kilometrajeActual,
        v.kilometrajeLimiteMantenimiento,
        v.kilometrajeLimiteMantenimiento - v.kilometrajeActual AS kmRestantes,
        CASE 
          WHEN v.kilometrajeActual >= v.kilometrajeLimiteMantenimiento THEN 'Urgente'
          WHEN v.kilometrajeLimiteMantenimiento - v.kilometrajeActual <= 500 THEN 'Próximo'
          ELSE 'OK'
        END AS estadoMantenimiento
      FROM Vehiculo v
      WHERE v.estado != 'Mantenimiento'
        AND (v.kilometrajeActual >= v.kilometrajeLimiteMantenimiento 
          OR v.kilometrajeLimiteMantenimiento - v.kilometrajeActual <= 1000)
      ORDER BY kmRestantes ASC
    `);
    
    res.json(vehiculos);
  } catch (error) {
    console.error('Error obteniendo vehículos próximos a mantenimiento:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Resumen mensual
router.get('/resumen-mensual', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [resumen] = await pool.query(`
      SELECT 
        COUNT(DISTINCT v.idViaje) AS totalViajes,
        COUNT(DISTINCT v.idVehiculo) AS vehiculosUtilizados,
        COUNT(DISTINCT v.idChofer) AS choferesActivos,
        COALESCE(SUM(v.combustibleUsado), 0) AS combustibleTotal,
        COALESCE(AVG(v.combustibleUsado), 0) AS combustiblePromedio,
        COALESCE(SUM(r.distancia), 0) AS kmTotales,
        COALESCE(SUM(
          TIMESTAMPDIFF(MINUTE, 
            CONCAT(v.fecha, ' ', v.horaInicio), 
            CONCAT(v.fecha, ' ', v.horaFin)
          ) / 60.0
        ), 0) AS horasTotales,
        COUNT(CASE WHEN v.estado = 'Completado' THEN 1 END) AS viajesCompletados,
        (SELECT COALESCE(SUM(costo), 0) FROM Mantenimiento WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())) AS costoMantenimiento
      FROM Viaje v
      INNER JOIN Ruta r ON v.idRuta = r.idRuta
      WHERE v.estado = 'Completado'
        AND MONTH(v.fecha) = MONTH(CURDATE())
        AND YEAR(v.fecha) = YEAR(CURDATE())
    `);
    
    res.json(resumen[0]);
  } catch (error) {
    console.error('Error obteniendo resumen mensual:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;