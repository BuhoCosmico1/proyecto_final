const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth.middleware');

// Normalización de datos numéricos
function normalizar(obj) {
  const o = { ...obj };
  for (const k of Object.keys(o)) {
    if (o[k] === null) o[k] = 0;
    if (!isNaN(o[k])) o[k] = Number(o[k]);
  }
  return o;
}

// Validación de fechas
function validarFechas(req, res) {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return { error: "Debe enviar ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD" };
  }

  return { desde, hasta };
}

// ============================
// 📌 Reporte 1 - KPIs generales
// ============================
router.get("/kpis", authenticateToken, async (req, res) => {
  const fechas = validarFechas(req, res);
  if (fechas.error) return res.status(400).json({ error: fechas.error });
  const { desde, hasta } = fechas;

  try {
    const [[viajes]] = await pool.query(`
      SELECT COUNT(*) AS totalViajes
      FROM Viaje
      WHERE fecha BETWEEN ? AND ?
    `, [desde, hasta]);

    const [[km]] = await pool.query(`
      SELECT SUM(kilometrajeFinal) AS totalKm
      FROM Viaje
      WHERE fecha BETWEEN ? AND ?
    `, [desde, hasta]);

    const [[combustible]] = await pool.query(`
      SELECT SUM(combustibleUsado) AS totalCombustible
      FROM Viaje
      WHERE fecha BETWEEN ? AND ?
    `, [desde, hasta]);

    res.json({
      viajes: normalizar(viajes),
      km: normalizar(km),
      combustible: normalizar(combustible)
    });

  } catch (err) {
    res.status(500).json({ error: "Error obteniendo KPIs" });
  }
});

// =====================================
// 📌 Reporte 2 - Viajes por día (gráfica)
// =====================================
router.get('/viajes-por-dia', async (req, res) => {
  const { desde, hasta } = req.query;

  const [rows] = await db.execute(
    `SELECT fecha, COUNT(*) AS total
     FROM Viaje
     WHERE fecha BETWEEN ? AND ?
     GROUP BY fecha
     ORDER BY fecha ASC`,
    [desde, hasta]
  );

  res.json(rows);
});


// ==========================================
// 📌 Reporte 3 - Rutas más usadas (gráfica)
// ==========================================
router.get("/rutas-mas-usadas", authenticateToken, async (req, res) => {
  const fechas = validarFechas(req, res);
  if (fechas.error) return res.status(400).json({ error: fechas.error });
  const { desde, hasta } = fechas;

  try {
    const [rows] = await pool.query(`
      SELECT r.nombre, COUNT(*) AS uso
      FROM Viaje v
      JOIN Ruta r ON v.idRuta = r.idRuta
      WHERE v.fecha BETWEEN ? AND ?
      GROUP BY r.idRuta
      ORDER BY uso DESC
      LIMIT 10
    `, [desde, hasta]);

    res.json(rows.map(normalizar));

  } catch (err) {
    res.status(500).json({ error: "Error obteniendo rutas más usadas" });
  }
});

// =================================================
// 📌 Reporte 4 - Choferes más productivos (gráfica)
// =================================================
router.get("/choferes-productivos", authenticateToken, async (req, res) => {
  const fechas = validarFechas(req, res);
  if (fechas.error) return res.status(400).json({ error: fechas.error });
  const { desde, hasta } = fechas;

  try {
    const [rows] = await pool.query(`
      SELECT c.nombre, COUNT(*) AS viajes
      FROM Viaje v
      JOIN Chofer c ON v.idChofer = c.idChofer
      WHERE v.fecha BETWEEN ? AND ?
      GROUP BY c.idChofer
      ORDER BY viajes DESC
      LIMIT 10
    `, [desde, hasta]);

    res.json(rows.map(normalizar));

  } catch (err) {
    res.status(500).json({ error: "Error obteniendo choferes productivos" });
  }
});

// ======================================================
// 📌 Reporte 5 - Mantenimientos por mes (NO usa fechas)
// ======================================================
router.get("/mantenimiento/mes", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(fecha, '%Y-%m') AS mes,
             SUM(costo) AS total
      FROM mantenimiento
      GROUP BY DATE_FORMAT(fecha, '%Y-%m')
      ORDER BY mes
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error mantenimiento:", error);
    res.status(500).json({ error: "Error obteniendo mantenimiento por mes" });
  }
});


// =========================================
// 📌 Reporte 6 - Alertas por prioridad
// =========================================
router.get("/alertas/prioridad", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT prioridad, COUNT(*) AS total
      FROM alerta
      GROUP BY prioridad
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error alertas:", error);
    res.status(500).json({ error: "Error obteniendo alertas" });
  }
});


// =====================================================
// 📌 Reporte 7 - Datos para exportación (PDF / Excel)
// =====================================================
router.get("/datos-exportacion", authenticateToken, async (req, res) => {
  const fechas = validarFechas(req, res);
  if (fechas.error) return res.status(400).json({ error: fechas.error });
  const { desde, hasta } = fechas;

  try {
    const [viajes] = await pool.query(`
      SELECT * FROM Viaje
      WHERE fecha BETWEEN ? AND ?
    `, [desde, hasta]);

    const [vehiculos] = await pool.query(`SELECT * FROM Vehiculo`);
    const [choferes] = await pool.query(`SELECT * FROM Chofer`);
    const [rutas] = await pool.query(`SELECT * FROM Ruta`);
    const [mant] = await pool.query(`SELECT * FROM Mantenimiento`);
    const [alertas] = await pool.query(`SELECT * FROM Alerta`);

    res.json({
      viajes,
      vehiculos,
      choferes,
      rutas,
      mantenimiento: mant,
      alertas
    });

  } catch (err) {
    res.status(500).json({ error: "Error exportando datos" });
  }
});

module.exports = router;
