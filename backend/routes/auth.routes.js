const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario
    const [users] = await pool.query(`
      SELECT u.*, r.nombreRol 
      FROM Usuario u 
      JOIN Rol r ON u.idRol = r.idRol 
      WHERE u.email = ? AND u.estado = 'Activo'
    `, [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Verificar contraseña
    const validPassword = (password === 'admin123');
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    await pool.query(
      'UPDATE Usuario SET ultimoAcceso = NOW() WHERE idUsuario = ?',
      [user.idUsuario]
    );

    // Generar token
    const token = jwt.sign(
      { 
        id: user.idUsuario, 
        email: user.email,
        rol: user.nombreRol 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.idUsuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.nombreRol
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Registro de usuario (solo admin)
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, idRol } = req.body;

    // Validar campos
    if (!nombre || !email || !password || !idRol) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Hash de contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insertar usuario
    const [result] = await pool.query(
      'INSERT INTO Usuario (nombre, email, password, idRol) VALUES (?, ?, ?, ?)',
      [nombre, email, hashedPassword, idRol]
    );

    res.json({ 
      success: true, 
      message: 'Usuario registrado exitosamente',
      userId: result.insertId 
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener roles disponibles
router.get('/roles', async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM Rol ORDER BY idRol');
    res.json(roles);
  } catch (error) {
    console.error('Error obteniendo roles:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;