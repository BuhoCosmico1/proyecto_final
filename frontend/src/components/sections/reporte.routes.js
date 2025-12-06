const express = require("express");
const router = express.Router();

// ENDPOINT DE PRUEBA PARA EVITAR ERRORES
router.get("/", (req, res) => {
  res.json({
    message: "Módulo de reportes funcionando correctamente.",
    status: "ok"
  });
});

module.exports = router;
