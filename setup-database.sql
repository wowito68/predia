-- Script SQL para inicializar la base de datos Predia
-- Ejecutar con: mysql -u root -p < setup-database.sql

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS predia;
USE predia;

-- Crear usuario y asignar permisos
CREATE USER IF NOT EXISTS 'predia_app'@'localhost' IDENTIFIED BY 'SecurePassword123!';
GRANT ALL PRIVILEGES ON predia.* TO 'predia_app'@'localhost';
FLUSH PRIVILEGES;

-- Crear tabla de roles
CREATE TABLE IF NOT EXISTS rol (
  id_rol INT PRIMARY KEY AUTO_INCREMENT,
  nombre_rol VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true
);

-- Insertar roles predeterminados
INSERT INTO rol (nombre_rol, descripcion) VALUES
  ('Administrador', 'Acceso completo al sistema'),
  ('Médico', 'Acceso para crear predicciones y gestionar pacientes'),
  ('Enfermero', 'Acceso limitado para registrar mediciones'),
  ('Paciente', 'Acceso solo a su propia información') ON DUPLICATE KEY UPDATE nombre_rol=nombre_rol;

-- Ver tablas creadas
SHOW TABLES;
SHOW GRANTS FOR 'predia_app'@'localhost';
