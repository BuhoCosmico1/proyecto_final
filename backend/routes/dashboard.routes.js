const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Función global para limpiar resultados numéricos
function normalizarNumeros(obj) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === null) obj[key] = 0;
    if (!isNaN(obj[key])) obj[key] = Number(obj[key]);
  });
  return obj;
}

// =============================
// 🟦  KPIs PRINCIPALES
// =============================
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
        (SELECT COALESCE(SUM(costo), 0) FROM Mantenimiento 
          WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
        ) AS costoMantenimientoMes
    `);

    res.json(normalizarNumeros(kpis[0]));

  } catch (error) {
    console.error('Error obteniendo KPIs:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// =============================
// 🟦 Vehículos más usados
// =============================
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
          TIMESTAMPDIFF(MINUTE, CONCAT(vj.fecha, ' ', vj.horaInicio), CONCAT(vj.fecha, ' ', vj.horaFin)) / 60.0
        ), 0) AS tiempoPromedioHoras
      FROM Vehiculo v
      LEFT JOIN Viaje vj ON v.idVehiculo = vj.idVehiculo 
        AND vj.estado = 'Completado'
        AND vj.fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY v.idVehiculo
      ORDER BY totalViajes DESC
      LIMIT 10
    `, [dias]);

    res.json(vehiculos.map(normalizarNumeros));

  } catch (error) {
    console.error('Error obteniendo vehículos más usados:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// =============================
// 🟦 Viajes por día
// =============================
router.get('/viajes-por-dia', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { dias = 7 } = req.query;
    
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
      ORDER BY dia ASC
    `, [dias]);

    res.json(viajes.map(normalizarNumeros));

  } catch (error) {
    console.error('Error obteniendo viajes por día:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// =============================
// 🟦 Distribución de viajes
// =============================
router.get('/distribucion-viajes', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const [distribucion] = await pool.query(`
      SELECT 
        estado,
        COUNT(*) AS cantidad,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Viaje WHERE MONTH(fecha)=MONTH(CURDATE()) AND YEAR(fecha)=YEAR(CURDATE())), 2) AS porcentaje
      FROM Viaje
      WHERE MONTH(fecha)=MONTH(CURDATE()) AND YEAR(fecha)=YEAR(CURDATE())
      GROUP BY estado
    `);

    res.json(distribucion.map(normalizarNumeros));

  } catch (error) {
    console.error('Error obteniendo distribución:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// =============================
// 🟦 Últimos viajes
// =============================
router.get('/viajes-recientes', authenticateToken, authorize('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const { limite = 10 } = req.query;

    const [viajes] = await pool.query(`
      SELECT 
        v.idViaje, v.fecha, v.estado,
        ve.placa AS vehiculoPlaca,
        c.nombre AS choferNombre,
        r.origen, r.destino
      FROM Viaje v
      INNER JOIN Vehiculo ve ON v.idVehiculo = ve.idVehiculo
      INNER JOIN Chofer c ON v.idChofer = c.idChofer
      INNER JOIN Ruta r ON v.idRuta = r.idRuta
      ORDER BY v.fecha DESC, v.fechaRegistro DESC
      LIMIT ?
    `, [Number(limite)]);

    res.json(viajes);

  } catch (error) {
    console.error('Error obteniendo viajes recientes:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
