// ============================================
// scripts/seed-usuarios.sql
// ============================================

/*
-- Script para crear usuarios de prueba con contraseñas hasheadas

-- Usuario médico (password: diabetes2024)
INSERT INTO usuario (username, password_hash, id_rol, nombre, apellido_paterno, 
                     email, cedula_profesional, especialidad) 
VALUES ('medico', '$2a$10$YourHashedPasswordHere', 2, 'Juan', 'Pérez', 
        'juan.perez@hospital.com', '12345678', 'Endocrinología');

-- Usuario admin (password: admin2024)
INSERT INTO usuario (username, password_hash, id_rol, nombre, apellido_paterno, email)
VALUES ('admin', '$2a$10$YourHashedPasswordHere', 1, 'María', 'González', 
        'admin@predia.com');

-- Para generar los hashes de contraseñas, ejecutar en Node.js:
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('diabetes2024', 10);
console.log(hash);
*/


