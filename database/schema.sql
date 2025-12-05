-- ============================================
-- SISTEMA DE LOGÍSTICA - BASE DE DATOS
-- Versión Simple y Manual
-- ============================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS sistema_logistica;
USE sistema_logistica;

-- ============================================
-- TABLA: Rol
-- ============================================
CREATE TABLE Rol (
    idRol INT PRIMARY KEY AUTO_INCREMENT,
    nombreRol VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200)
);

-- ============================================
-- TABLA: Usuario
-- ============================================
CREATE TABLE Usuario (
    idUsuario INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    idRol INT NOT NULL,
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultimoAcceso DATETIME,
    FOREIGN KEY (idRol) REFERENCES Rol(idRol)
);

-- ============================================
-- TABLA: Vehiculo
-- ============================================
CREATE TABLE Vehiculo (
    idVehiculo INT PRIMARY KEY AUTO_INCREMENT,
    placa VARCHAR(20) NOT NULL UNIQUE,
    modelo VARCHAR(50) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    estado ENUM('Disponible', 'En uso', 'Mantenimiento') DEFAULT 'Disponible',
    kilometrajeActual DECIMAL(10,2) DEFAULT 0,
    kilometrajeLimiteMantenimiento DECIMAL(10,2) DEFAULT 10000,
    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: Chofer
-- ============================================
CREATE TABLE Chofer (
    idChofer INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) NOT NULL UNIQUE,
    licencia VARCHAR(30) NOT NULL,
    telefono VARCHAR(20),
    horasTrabajadasTotal DECIMAL(10,2) DEFAULT 0,
    estado ENUM('Activo', 'Inactivo', 'Vacaciones') DEFAULT 'Activo',
    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: Ruta
-- ============================================
CREATE TABLE Ruta (
    idRuta INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100),
    origen VARCHAR(100) NOT NULL,
    destino VARCHAR(100) NOT NULL,
    distancia DECIMAL(10,2) NOT NULL,
    tiempoEstimado DECIMAL(5,2) NOT NULL,
    estado ENUM('Activa', 'Inactiva') DEFAULT 'Activa'
);

-- ============================================
-- TABLA: Viaje
-- ============================================
CREATE TABLE Viaje (
    idViaje INT PRIMARY KEY AUTO_INCREMENT,
    idVehiculo INT NOT NULL,
    idChofer INT NOT NULL,
    idRuta INT NOT NULL,
    fecha DATE NOT NULL,
    horaInicio TIME,
    horaFin TIME,
    carga VARCHAR(200),
    combustibleUsado DECIMAL(10,2),
    kilometrajeFinal DECIMAL(10,2),
    estado ENUM('Programado', 'Completado', 'Cancelado') DEFAULT 'Programado',
    observaciones TEXT,
    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idVehiculo) REFERENCES Vehiculo(idVehiculo),
    FOREIGN KEY (idChofer) REFERENCES Chofer(idChofer),
    FOREIGN KEY (idRuta) REFERENCES Ruta(idRuta)
);

-- ============================================
-- TABLA: Mantenimiento
-- ============================================
CREATE TABLE Mantenimiento (
    idMantenimiento INT PRIMARY KEY AUTO_INCREMENT,
    idVehiculo INT NOT NULL,
    fecha DATE NOT NULL,
    tipo ENUM('Preventivo', 'Correctivo', 'Revision') NOT NULL,
    descripcion TEXT NOT NULL,
    costo DECIMAL(10,2) NOT NULL,
    estado ENUM('Programado', 'Completado') DEFAULT 'Programado',
    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idVehiculo) REFERENCES Vehiculo(idVehiculo)
);

-- ============================================
-- TABLA: Alerta
-- ============================================
CREATE TABLE Alerta (
    idAlerta INT PRIMARY KEY AUTO_INCREMENT,
    tipo ENUM('Mantenimiento', 'Horas_Excedidas') NOT NULL,
    idRelacionado INT NOT NULL,
    mensaje TEXT NOT NULL,
    prioridad ENUM('Alta', 'Media', 'Baja') DEFAULT 'Media',
    estado ENUM('Activa', 'Resuelta') DEFAULT 'Activa',
    fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar roles
INSERT INTO Rol (nombreRol, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Supervisor', 'Gestión de operaciones diarias'),
('Chofer', 'Visualización de viajes asignados');

-- Insertar usuario administrador
-- Email: admin@logistica.com
-- Password: admin123
INSERT INTO Usuario (nombre, email, password, idRol) VALUES
('Administrador', 'admin@logistica.com', '$2b$10$rHZx5K8h7xoqLf8oxJ9hPeVVJHX7B6nHO7ySIEh8KCyZWp7YN1S8e', 1);

-- Insertar vehículos de ejemplo
INSERT INTO Vehiculo (placa, modelo, tipo, kilometrajeActual, kilometrajeLimiteMantenimiento) VALUES
('ABC-123', 'Volvo FH16', 'Camión', 5000.00, 10000.00),
('DEF-456', 'Mercedes Actros', 'Camión', 3200.00, 10000.00),
('GHI-789', 'Isuzu NQR', 'Camioneta', 1800.00, 8000.00);

-- Insertar choferes de ejemplo
INSERT INTO Chofer (nombre, cedula, licencia, telefono) VALUES
('Carlos Ramírez', '1234567890', 'C-2024-001', '3001234567'),
('María González', '0987654321', 'C-2024-002', '3009876543'),
('José Martínez', '1122334455', 'C-2024-003', '3002233445');

-- Insertar rutas de ejemplo
INSERT INTO Ruta (nombre, origen, destino, distancia, tiempoEstimado) VALUES
('Ruta Norte', 'Barranquilla', 'Santa Marta', 98.5, 1.5),
('Ruta Centro', 'Barranquilla', 'Cartagena', 120.0, 2.0),
('Ruta Interior', 'Barranquilla', 'Valledupar', 285.0, 4.5);

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================
CREATE INDEX idx_viaje_fecha ON Viaje(fecha);
CREATE INDEX idx_viaje_estado ON Viaje(estado);
CREATE INDEX idx_vehiculo_estado ON Vehiculo(estado);
CREATE INDEX idx_chofer_estado ON Chofer(estado);

-- ============================================
-- TRIGGERS AUTOMÁTICOS
-- ============================================

-- Trigger: Actualizar kilometraje del vehículo al completar viaje
DELIMITER //
CREATE TRIGGER actualizar_kilometraje_vehiculo
AFTER UPDATE ON Viaje
FOR EACH ROW
BEGIN
    IF NEW.estado = 'Completado' AND OLD.estado != 'Completado' AND NEW.kilometrajeFinal IS NOT NULL THEN
        UPDATE Vehiculo 
        SET kilometrajeActual = NEW.kilometrajeFinal,
            estado = 'Disponible'
        WHERE idVehiculo = NEW.idVehiculo;
    END IF;
END//
DELIMITER ;

-- Trigger: Actualizar horas trabajadas del chofer
DELIMITER //
CREATE TRIGGER actualizar_horas_chofer
AFTER UPDATE ON Viaje
FOR EACH ROW
BEGIN
    DECLARE horasTrabajadas DECIMAL(5,2);
    
    IF NEW.estado = 'Completado' AND OLD.estado != 'Completado' AND NEW.horaInicio IS NOT NULL AND NEW.horaFin IS NOT NULL THEN
        SET horasTrabajadas = TIMESTAMPDIFF(MINUTE, 
            CONCAT(NEW.fecha, ' ', NEW.horaInicio), 
            CONCAT(NEW.fecha, ' ', NEW.horaFin)
        ) / 60.0;
        
        UPDATE Chofer 
        SET horasTrabajadasTotal = horasTrabajadasTotal + horasTrabajadas
        WHERE idChofer = NEW.idChofer;
    END IF;
END//
DELIMITER ;

-- Trigger: Generar alerta de mantenimiento
DELIMITER //
CREATE TRIGGER alerta_mantenimiento
AFTER UPDATE ON Vehiculo
FOR EACH ROW
BEGIN
    DECLARE kmRestantes DECIMAL(10,2);
    
    SET kmRestantes = NEW.kilometrajeLimiteMantenimiento - NEW.kilometrajeActual;
    
    -- Alerta si faltan menos de 500 km para mantenimiento
    IF kmRestantes <= 500 AND kmRestantes > 0 THEN
        INSERT INTO Alerta (tipo, idRelacionado, mensaje, prioridad)
        VALUES (
            'Mantenimiento',
            NEW.idVehiculo,
            CONCAT('Vehículo ', NEW.placa, ' está cerca del límite. Faltan ', ROUND(kmRestantes, 0), ' km para mantenimiento'),
            'Alta'
        );
    END IF;
    
    -- Bloquear vehículo si excede el límite
    IF NEW.kilometrajeActual >= NEW.kilometrajeLimiteMantenimiento THEN
        UPDATE Vehiculo 
        SET estado = 'Mantenimiento'
        WHERE idVehiculo = NEW.idVehiculo;
        
        INSERT INTO Alerta (tipo, idRelacionado, mensaje, prioridad)
        VALUES (
            'Mantenimiento',
            NEW.idVehiculo,
            CONCAT('¡URGENTE! Vehículo ', NEW.placa, ' ha excedido el límite de kilometraje. Requiere mantenimiento inmediato'),
            'Alta'
        );
    END IF;
END//
DELIMITER ;

-- Trigger: Generar alerta de horas excedidas
DELIMITER //
CREATE TRIGGER alerta_horas_chofer
AFTER UPDATE ON Chofer
FOR EACH ROW
BEGIN
    DECLARE horasMes DECIMAL(10,2);
    
    -- Calcular horas del mes actual
    SET horasMes = (
        SELECT COALESCE(SUM(
            TIMESTAMPDIFF(MINUTE, 
                CONCAT(v.fecha, ' ', v.horaInicio), 
                CONCAT(v.fecha, ' ', v.horaFin)
            ) / 60.0
        ), 0)
        FROM Viaje v
        WHERE v.idChofer = NEW.idChofer
        AND v.estado = 'Completado'
        AND MONTH(v.fecha) = MONTH(CURDATE())
        AND YEAR(v.fecha) = YEAR(CURDATE())
    );
    
    -- Alerta si excede 200 horas en el mes
    IF horasMes > 200 THEN
        INSERT INTO Alerta (tipo, idRelacionado, mensaje, prioridad)
        VALUES (
            'Horas_Excedidas',
            NEW.idChofer,
            CONCAT('Chofer ', NEW.nombre, ' ha excedido las 200 horas este mes: ', ROUND(horasMes, 1), ' horas'),
            'Alta'
        );
    END IF;
END//
DELIMITER ;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Viajes completos con toda la información
CREATE VIEW vista_viajes_completos AS
SELECT 
    v.idViaje,
    v.fecha,
    v.horaInicio,
    v.horaFin,
    v.estado,
    ve.placa AS vehiculoPlaca,
    ve.modelo AS vehiculoModelo,
    c.nombre AS choferNombre,
    r.nombre AS rutaNombre,
    r.origen,
    r.destino,
    r.distancia,
    v.carga,
    v.combustibleUsado,
    v.kilometrajeFinal
FROM Viaje v
INNER JOIN Vehiculo ve ON v.idVehiculo = ve.idVehiculo
INNER JOIN Chofer c ON v.idChofer = c.idChofer
INNER JOIN Ruta r ON v.idRuta = r.idRuta;

-- Vista: Estadísticas de vehículos
CREATE VIEW vista_estadisticas_vehiculos AS
SELECT 
    ve.idVehiculo,
    ve.placa,
    ve.modelo,
    ve.kilometrajeActual,
    ve.kilometrajeLimiteMantenimiento,
    ve.kilometrajeLimiteMantenimiento - ve.kilometrajeActual AS kmRestantes,
    COUNT(v.idViaje) AS totalViajes,
    COALESCE(SUM(v.combustibleUsado), 0) AS combustibleTotal
FROM Vehiculo ve
LEFT JOIN Viaje v ON ve.idVehiculo = v.idVehiculo AND v.estado = 'Completado'
GROUP BY ve.idVehiculo;

-- ============================================
-- SCRIPT COMPLETADO
-- ============================================
SELECT '✅ Base de datos creada exitosamente!' AS Mensaje;