const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar rutas (SOLO authRoutes existe por ahora)
const authRoutes = require('./routes/auth.routes');
const vehiculoRoutes = require('./routes/vehiculo.routes');
const choferRoutes = require('./routes/chofer.routes');     
const rutaRoutes = require('./routes/ruta.routes');        
const viajeRoutes = require('./routes/viaje.routes');      
const mantenimientoRoutes = require('./routes/mantenimiento.routes'); 
const dashboardRoutes = require('./routes/dashboard.routes'); 
const alertaRoutes = require('./routes/alerta.routes');    

// Usar rutas (SOLO authRoutes por ahora)
app.use('/api/auth', authRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/choferes', choferRoutes);       
app.use('/api/rutas', rutaRoutes);            
app.use('/api/viajes', viajeRoutes);          
app.use('/api/mantenimientos', mantenimientoRoutes); 
app.use('/api/dashboard', dashboardRoutes);   
app.use('/api/alertas', alertaRoutes);        

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: '🚛 API Sistema de Logística funcionando!',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Error en el servidor',
    message: err.message 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api`);
  console.log('=================================');
});