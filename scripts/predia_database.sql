-- ============================================
-- SCRIPT DE BASE DE DATOS PREDIA
-- Sistema de Predicción de Diabetes
-- MariaDB 10.x
-- ============================================

DROP DATABASE IF EXISTS predia;
CREATE DATABASE predia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE predia;

-- ============================================
-- TABLAS DE CATÁLOGOS
-- ============================================

-- Tabla de Estados
CREATE TABLE estado (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    nombre_estado VARCHAR(100) NOT NULL,
    codigo_estado VARCHAR(10) UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre_estado (nombre_estado)
) ENGINE=InnoDB;

-- Tabla de Municipios
CREATE TABLE municipio (
    id_municipio INT AUTO_INCREMENT PRIMARY KEY,
    id_estado INT NOT NULL,
    nombre_municipio VARCHAR(100) NOT NULL,
    codigo_municipio VARCHAR(10),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_estado) REFERENCES estado(id_estado) ON DELETE RESTRICT,
    INDEX idx_nombre_municipio (nombre_municipio),
    INDEX idx_estado (id_estado)
) ENGINE=InnoDB;

-- Tabla de Colonias
CREATE TABLE colonia (
    id_colonia INT AUTO_INCREMENT PRIMARY KEY,
    id_municipio INT NOT NULL,
    nombre_colonia VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_municipio) REFERENCES municipio(id_municipio) ON DELETE RESTRICT,
    INDEX idx_nombre_colonia (nombre_colonia),
    INDEX idx_cp (codigo_postal)
) ENGINE=InnoDB;

-- Tabla de Tipos de Inmueble
CREATE TABLE tipo_inmueble (
    id_tipo_inmueble INT AUTO_INCREMENT PRIMARY KEY,
    nombre_tipo VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- ============================================
-- TABLAS DE DIRECCIONES
-- ============================================

CREATE TABLE direccion (
    id_direccion INT AUTO_INCREMENT PRIMARY KEY,
    id_colonia INT NOT NULL,
    id_tipo_inmueble INT NOT NULL,
    calle VARCHAR(150),
    numero_exterior VARCHAR(20),
    numero_interior VARCHAR(20),
    referencia TEXT,
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_colonia) REFERENCES colonia(id_colonia) ON DELETE RESTRICT,
    FOREIGN KEY (id_tipo_inmueble) REFERENCES tipo_inmueble(id_tipo_inmueble) ON DELETE RESTRICT,
    INDEX idx_colonia (id_colonia)
) ENGINE=InnoDB;

-- ============================================
-- TABLAS DE USUARIOS Y ROLES
-- ============================================

CREATE TABLE rol (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    cedula_profesional VARCHAR(50),
    especialidad VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol) ON DELETE RESTRICT,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_cedula (cedula_profesional)
) ENGINE=InnoDB;

-- ============================================
-- TABLAS DE PACIENTES
-- ============================================

CREATE TABLE paciente (
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    cedula VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    genero ENUM('M', 'F', 'Otro') NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    edad INT,
    telefono VARCHAR(20),
    email VARCHAR(150),
    id_direccion INT,
    foto_perfil VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_direccion) REFERENCES direccion(id_direccion) ON DELETE SET NULL,
    INDEX idx_cedula (cedula),
    INDEX idx_nombre (nombre, apellido_paterno),
    INDEX idx_fecha_nacimiento (fecha_nacimiento)
) ENGINE=InnoDB;

-- ============================================
-- TABLAS DE DATOS CLÍNICOS
-- ============================================

-- Tabla de Estudios de Laboratorio
CREATE TABLE estudio_laboratorio (
    id_estudio INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_estudio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Función Renal
    urea DECIMAL(6, 2) COMMENT 'Urea en mg/dL',
    creatinina DECIMAL(5, 2) COMMENT 'Creatinina (Cr) en mg/dL',
    
    -- Glucosa
    hba1c DECIMAL(4, 2) COMMENT 'Hemoglobina Glicosilada en %',
    glucosa_ayunas DECIMAL(6, 2) COMMENT 'Glucosa en ayunas mg/dL',
    
    -- Perfil Lipídico
    colesterol_total DECIMAL(6, 2) COMMENT 'Colesterol Total en mg/dL',
    trigliceridos DECIMAL(6, 2) COMMENT 'Triglicéridos en mg/dL',
    hdl DECIMAL(6, 2) COMMENT 'HDL Colesterol en mg/dL',
    ldl DECIMAL(6, 2) COMMENT 'LDL Colesterol en mg/dL',
    vldl DECIMAL(6, 2) COMMENT 'VLDL Colesterol en mg/dL',
    
    -- Otros
    observaciones TEXT,
    archivo_pdf VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    INDEX idx_paciente_fecha (id_paciente, fecha_estudio),
    INDEX idx_usuario (id_usuario)
) ENGINE=InnoDB;

-- Tabla de Mediciones Antropométricas
CREATE TABLE medicion_antropometrica (
    id_medicion INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_medicion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    peso DECIMAL(5, 2) COMMENT 'Peso en kg',
    altura DECIMAL(4, 2) COMMENT 'Altura en cm',
    imc DECIMAL(4, 2) COMMENT 'Índice de Masa Corporal',
    circunferencia_cintura DECIMAL(5, 2) COMMENT 'En cm',
    circunferencia_cadera DECIMAL(5, 2) COMMENT 'En cm',
    presion_sistolica INT COMMENT 'Presión arterial sistólica',
    presion_diastolica INT COMMENT 'Presión arterial diastólica',
    
    observaciones TEXT,
    activo BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    INDEX idx_paciente_fecha (id_paciente, fecha_medicion)
) ENGINE=InnoDB;

-- ============================================
-- TABLAS DE PREDICCIÓN CON IA
-- ============================================

-- Tabla de Versiones del Modelo
CREATE TABLE modelo_ia (
    id_modelo INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    fecha_entrenamiento TIMESTAMP NOT NULL,
    accuracy DECIMAL(5, 4) NOT NULL,
    n_samples_train INT NOT NULL,
    n_samples_test INT NOT NULL,
    features JSON NOT NULL,
    feature_importance JSON,
    descripcion TEXT,
    archivo_modelo VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_version (version)
) ENGINE=InnoDB;

-- Tabla de Predicciones
CREATE TABLE prediccion (
    id_prediccion INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    id_usuario INT NOT NULL,
    id_modelo INT NOT NULL,
    id_estudio INT,
    id_medicion INT,
    
    fecha_prediccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Datos utilizados para la predicción (snapshot)
    datos_entrada JSON NOT NULL COMMENT 'Datos usados en la predicción',
    
    -- Resultado de la predicción
    resultado ENUM('No Diabetes', 'Diabetes') NOT NULL,
    probabilidad_diabetes DECIMAL(5, 4) NOT NULL COMMENT 'Probabilidad 0-1',
    probabilidad_no_diabetes DECIMAL(5, 4) NOT NULL,
    
    -- Análisis
    nivel_riesgo ENUM('Bajo', 'Moderado', 'Alto', 'Muy Alto') NOT NULL,
    factores_riesgo JSON COMMENT 'Lista de factores de riesgo identificados',
    recomendaciones TEXT,
    
    -- Control
    validado BOOLEAN DEFAULT FALSE,
    diagnostico_confirmado ENUM('Pendiente', 'Confirmado', 'Descartado') DEFAULT 'Pendiente',
    notas_medicas TEXT,
    fecha_validacion TIMESTAMP NULL,
    
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    FOREIGN KEY (id_modelo) REFERENCES modelo_ia(id_modelo) ON DELETE RESTRICT,
    FOREIGN KEY (id_estudio) REFERENCES estudio_laboratorio(id_estudio) ON DELETE SET NULL,
    FOREIGN KEY (id_medicion) REFERENCES medicion_antropometrica(id_medicion) ON DELETE SET NULL,
    INDEX idx_paciente_fecha (id_paciente, fecha_prediccion),
    INDEX idx_resultado (resultado),
    INDEX idx_nivel_riesgo (nivel_riesgo)
) ENGINE=InnoDB;

-- ============================================
-- TABLAS DE HISTORIAL Y SEGUIMIENTO
-- ============================================

CREATE TABLE historial_clinico (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    tipo_evento ENUM('Consulta', 'Estudio', 'Predicción', 'Seguimiento', 'Diagnóstico', 'Otro') NOT NULL,
    descripcion TEXT NOT NULL,
    diagnostico TEXT,
    tratamiento TEXT,
    observaciones TEXT,
    
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    INDEX idx_paciente_fecha (id_paciente, fecha_registro),
    INDEX idx_tipo (tipo_evento)
) ENGINE=InnoDB;

-- ============================================
-- TABLAS DE AUDITORÍA
-- ============================================

CREATE TABLE auditoria (
    id_auditoria BIGINT AUTO_INCREMENT PRIMARY KEY,
    tabla VARCHAR(50) NOT NULL,
    id_registro INT NOT NULL,
    id_usuario INT,
    accion ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    datos_anteriores JSON,
    datos_nuevos JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tabla_registro (tabla, id_registro),
    INDEX idx_usuario (id_usuario),
    INDEX idx_fecha (fecha_accion)
) ENGINE=InnoDB;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de pacientes con última predicción
CREATE VIEW v_pacientes_ultima_prediccion AS
SELECT 
    p.id_paciente,
    p.cedula,
    p.nombre,
    p.apellido_paterno,
    p.apellido_materno,
    p.genero,
    p.edad,
    pred.fecha_prediccion,
    pred.resultado,
    pred.probabilidad_diabetes,
    pred.nivel_riesgo,
    pred.diagnostico_confirmado
FROM paciente p
LEFT JOIN (
    SELECT 
        id_paciente,
        MAX(fecha_prediccion) as ultima_prediccion
    FROM prediccion
    GROUP BY id_paciente
) up ON p.id_paciente = up.id_paciente
LEFT JOIN prediccion pred ON p.id_paciente = pred.id_paciente 
    AND pred.fecha_prediccion = up.ultima_prediccion
WHERE p.activo = TRUE;

-- Vista de estudios completos
CREATE VIEW v_estudios_completos AS
SELECT 
    e.id_estudio,
    p.id_paciente,
    p.cedula,
    p.nombre,
    p.apellido_paterno,
    p.genero,
    p.edad,
    e.fecha_estudio,
    e.urea,
    e.creatinina,
    e.hba1c,
    e.colesterol_total,
    e.trigliceridos,
    e.hdl,
    e.ldl,
    e.vldl,
    m.imc,
    u.nombre as medico_nombre,
    u.apellido_paterno as medico_apellido
FROM estudio_laboratorio e
INNER JOIN paciente p ON e.id_paciente = p.id_paciente
INNER JOIN usuario u ON e.id_usuario = u.id_usuario
LEFT JOIN medicion_antropometrica m ON e.id_paciente = m.id_paciente
    AND DATE(e.fecha_estudio) = DATE(m.fecha_medicion)
WHERE e.activo = TRUE;

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar roles
INSERT INTO rol (nombre_rol, descripcion) VALUES
('Administrador', 'Acceso completo al sistema'),
('Médico', 'Acceso a diagnósticos y pacientes'),
('Enfermero', 'Acceso a registro de datos clínicos'),
('Recepcionista', 'Acceso a registro de pacientes');

-- Insertar tipos de inmueble
INSERT INTO tipo_inmueble (nombre_tipo, descripcion) VALUES
('Casa', 'Casa habitación'),
('Departamento', 'Departamento o apartamento'),
('Consultorio', 'Consultorio médico'),
('Hospital', 'Hospital o clínica'),
('Otro', 'Otro tipo de inmueble');

-- Insertar usuario de prueba (password: diabetes2024)
-- Hash generado con bcrypt
INSERT INTO usuario (username, password_hash, id_rol, nombre, apellido_paterno, 
                     apellido_materno, email, cedula_profesional, especialidad) VALUES
('medico', '$2y$10$YourHashedPasswordHere', 2, 'Juan', 'Pérez', 'García', 
 'juan.perez@hospital.com', '12345678', 'Endocrinología'),
('admin', '$2y$10$YourHashedPasswordHere', 1, 'María', 'González', 'López',
 'admin@predia.com', NULL, NULL);

-- Insertar modelo de IA actual
INSERT INTO modelo_ia (version, fecha_entrenamiento, accuracy, n_samples_train, n_samples_test, 
                       features, feature_importance, descripcion, activo) VALUES
('v1.0', '2025-11-20 23:06:44', 0.9789, 757, 190,
 '["Gender", "AGE", "Urea", "Cr", "HbA1c", "Chol", "TG", "HDL", "LDL", "VLDL", "BMI"]',
 '{"Gender": 0.3184, "AGE": 0.2294, "Urea": 0.1098, "Cr": -0.0432, "HbA1c": 2.3632, 
   "Chol": 0.9543, "TG": 0.9613, "HDL": 0.2918, "LDL": 0.0477, "VLDL": 0.2250, "BMI": 2.8687}',
 'Modelo de regresión logística entrenado con 947 muestras. Características más importantes: BMI, HbA1c, TG, Chol',
 TRUE);

-- Insertar estados de ejemplo (México)
INSERT INTO estado (nombre_estado, codigo_estado) VALUES
('Querétaro', 'QRO'),
('Ciudad de México', 'CDMX'),
('Jalisco', 'JAL'),
('Nuevo León', 'NL');

-- Insertar municipios de ejemplo
INSERT INTO municipio (id_estado, nombre_municipio, codigo_municipio) VALUES
(1, 'Santiago de Querétaro', '001'),
(1, 'Corregidora', '006'),
(2, 'Cuauhtémoc', '015'),
(3, 'Guadalajara', '039');

-- ============================================
-- PROCEDIMIENTOS ALMACENADOS
-- ============================================

DELIMITER //

-- Procedimiento para registrar predicción completa
CREATE PROCEDURE sp_registrar_prediccion(
    IN p_id_paciente INT,
    IN p_id_usuario INT,
    IN p_id_modelo INT,
    IN p_datos_entrada JSON,
    IN p_resultado VARCHAR(20),
    IN p_probabilidad DECIMAL(5,4),
    IN p_nivel_riesgo VARCHAR(20),
    IN p_factores_riesgo JSON,
    IN p_recomendaciones TEXT,
    OUT p_id_prediccion INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_id_prediccion = -1;
    END;
    
    START TRANSACTION;
    
    INSERT INTO prediccion (
        id_paciente, id_usuario, id_modelo, datos_entrada,
        resultado, probabilidad_diabetes, probabilidad_no_diabetes,
        nivel_riesgo, factores_riesgo, recomendaciones
    ) VALUES (
        p_id_paciente, p_id_usuario, p_id_modelo, p_datos_entrada,
        p_resultado, p_probabilidad, (1 - p_probabilidad),
        p_nivel_riesgo, p_factores_riesgo, p_recomendaciones
    );
    
    SET p_id_prediccion = LAST_INSERT_ID();
    
    -- Registrar en historial
    INSERT INTO historial_clinico (id_paciente, id_usuario, tipo_evento, descripcion)
    VALUES (p_id_paciente, p_id_usuario, 'Predicción', 
            CONCAT('Predicción de diabetes realizada. Resultado: ', p_resultado));
    
    COMMIT;
END //

-- Función para calcular nivel de riesgo
CREATE FUNCTION fn_calcular_nivel_riesgo(
    p_probabilidad DECIMAL(5,4),
    p_hba1c DECIMAL(4,2),
    p_imc DECIMAL(4,2)
)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    DECLARE v_nivel VARCHAR(20);
    
    IF p_probabilidad >= 0.75 OR p_hba1c >= 6.5 THEN
        SET v_nivel = 'Muy Alto';
    ELSEIF p_probabilidad >= 0.50 OR (p_hba1c >= 5.7 AND p_imc >= 30) THEN
        SET v_nivel = 'Alto';
    ELSEIF p_probabilidad >= 0.25 OR p_imc >= 27 THEN
        SET v_nivel = 'Moderado';
    ELSE
        SET v_nivel = 'Bajo';
    END IF;
    
    RETURN v_nivel;
END //

DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

DELIMITER //

-- Trigger para auditar cambios en pacientes
CREATE TRIGGER trg_paciente_audit_update
AFTER UPDATE ON paciente
FOR EACH ROW
BEGIN
    INSERT INTO auditoria (tabla, id_registro, accion, datos_anteriores, datos_nuevos)
    VALUES ('paciente', NEW.id_paciente, 'UPDATE',
            JSON_OBJECT('nombre', OLD.nombre, 'cedula', OLD.cedula),
            JSON_OBJECT('nombre', NEW.nombre, 'cedula', NEW.cedula));
END //

-- Trigger para validar IMC en mediciones
CREATE TRIGGER trg_validar_imc
BEFORE INSERT ON medicion_antropometrica
FOR EACH ROW
BEGIN
    IF NEW.peso IS NOT NULL AND NEW.altura IS NOT NULL THEN
        SET NEW.imc = NEW.peso / POWER((NEW.altura / 100), 2);
    END IF;
END //

DELIMITER ;

-- ============================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================

CREATE INDEX idx_prediccion_fecha_resultado ON prediccion(fecha_prediccion, resultado);
CREATE INDEX idx_estudio_hba1c ON estudio_laboratorio(hba1c);
CREATE INDEX idx_medicion_imc ON medicion_antropometrica(imc);

-- ============================================
-- PERMISOS Y USUARIOS DE BASE DE DATOS
-- ============================================

-- Crear usuario de aplicación (cambiar contraseña en producción)
-- CREATE USER 'predia_app'@'localhost' IDENTIFIED BY 'SecurePassword123!';
-- GRANT SELECT, INSERT, UPDATE ON predia.* TO 'predia_app'@'localhost';
-- GRANT EXECUTE ON predia.* TO 'predia_app'@'localhost';
-- FLUSH PRIVILEGES;

-- ============================================
-- ANÁLISIS Y ESTADÍSTICAS
-- ============================================

SELECT 'Base de datos PREDIA creada exitosamente' AS STATUS;
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'predia' 
ORDER BY TABLE_NAME;
