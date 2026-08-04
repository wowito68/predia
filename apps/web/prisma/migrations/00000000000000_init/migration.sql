-- CreateTable
CREATE TABLE `rol` (
    `id_rol` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_rol` VARCHAR(50) NOT NULL,
    `descripcion` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `rol_nombre_rol_key`(`nombre_rol`),
    PRIMARY KEY (`id_rol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `id_rol` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `apellido_paterno` VARCHAR(100) NOT NULL,
    `apellido_materno` VARCHAR(100) NULL,
    `email` VARCHAR(100) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `cedula_profesional` VARCHAR(50) NULL,
    `especialidad` VARCHAR(100) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `ultimo_acceso` DATETIME(3) NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_modificacion` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuario_username_key`(`username`),
    UNIQUE INDEX `usuario_email_key`(`email`),
    UNIQUE INDEX `usuario_cedula_profesional_key`(`cedula_profesional`),
    INDEX `usuario_id_rol_fkey`(`id_rol`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `direccion` (
    `id_direccion` INTEGER NOT NULL AUTO_INCREMENT,
    `calle` VARCHAR(255) NOT NULL,
    `numero` VARCHAR(20) NULL,
    `apartamento` VARCHAR(20) NULL,
    `ciudad` VARCHAR(100) NOT NULL,
    `provincia` VARCHAR(100) NOT NULL,
    `codigo_postal` VARCHAR(10) NULL,
    `pais` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id_direccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paciente` (
    `id_paciente` INTEGER NOT NULL AUTO_INCREMENT,
    `cedula` VARCHAR(50) NOT NULL,
    `curp` VARCHAR(18) NULL,
    `pin_hash` VARCHAR(255) NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `apellido_paterno` VARCHAR(100) NOT NULL,
    `apellido_materno` VARCHAR(100) NULL,
    `genero` VARCHAR(10) NOT NULL,
    `fecha_nacimiento` DATETIME(3) NOT NULL,
    `edad` INTEGER NULL,
    `telefono` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `id_direccion` INTEGER NULL,
    `foto_perfil` TEXT NULL,
    `tipo_sangre` VARCHAR(5) NULL,
    `seguro_medico` VARCHAR(100) NULL,
    `poliza_seguro` VARCHAR(50) NULL,
    `contacto_emergencia_nombre` VARCHAR(150) NULL,
    `contacto_emergencia_telefono` VARCHAR(20) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_modificacion` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `paciente_cedula_key`(`cedula`),
    UNIQUE INDEX `paciente_curp_key`(`curp`),
    INDEX `paciente_id_direccion_fkey`(`id_direccion`),
    PRIMARY KEY (`id_paciente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automonitoreo` (
    `id_automonitoreo` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `tipo` VARCHAR(20) NOT NULL,
    `valor` DOUBLE NOT NULL,
    `valor_secundario` DOUBLE NULL,
    `unidad` VARCHAR(20) NULL,
    `notas` TEXT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `automonitoreo_id_paciente_idx`(`id_paciente`),
    PRIMARY KEY (`id_automonitoreo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estudio_laboratorio` (
    `id_estudio` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `fecha_estudio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `urea` DOUBLE NULL,
    `creatinina` DOUBLE NULL,
    `hba1c` DOUBLE NULL,
    `glucosa_ayunas` DOUBLE NULL,
    `colesterol_total` DOUBLE NULL,
    `trigliceridos` DOUBLE NULL,
    `hdl` DOUBLE NULL,
    `ldl` DOUBLE NULL,
    `vldl` DOUBLE NULL,
    `observaciones` TEXT NULL,
    `archivo_pdf` VARCHAR(255) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_modificacion` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `estudio_laboratorio_id_paciente_fkey`(`id_paciente`),
    INDEX `estudio_laboratorio_id_usuario_fkey`(`id_usuario`),
    PRIMARY KEY (`id_estudio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medicion_antropometrica` (
    `id_medicion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `fecha_medicion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `peso` DOUBLE NULL,
    `altura` DOUBLE NULL,
    `imc` DOUBLE NULL,
    `circunferencia_cintura` DOUBLE NULL,
    `circunferencia_cadera` DOUBLE NULL,
    `presion_sistolica` INTEGER NULL,
    `presion_diastolica` INTEGER NULL,
    `observaciones` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_modificacion` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `medicion_antropometrica_id_paciente_fkey`(`id_paciente`),
    INDEX `medicion_antropometrica_id_usuario_fkey`(`id_usuario`),
    PRIMARY KEY (`id_medicion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modelo_ia` (
    `id_modelo` INTEGER NOT NULL AUTO_INCREMENT,
    `version` VARCHAR(50) NOT NULL,
    `fecha_entrenamiento` DATETIME(3) NOT NULL,
    `accuracy` DOUBLE NOT NULL,
    `n_samples_train` INTEGER NOT NULL,
    `n_samples_test` INTEGER NOT NULL,
    `features` TEXT NOT NULL,
    `feature_importance` TEXT NULL,
    `descripcion` TEXT NULL,
    `archivo_modelo` VARCHAR(255) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `modelo_ia_version_key`(`version`),
    PRIMARY KEY (`id_modelo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prediccion` (
    `id_prediccion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `id_modelo` INTEGER NOT NULL,
    `id_estudio` INTEGER NULL,
    `id_medicion` INTEGER NULL,
    `fecha_prediccion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `datos_entrada` TEXT NOT NULL,
    `resultado` VARCHAR(50) NOT NULL,
    `probabilidad_diabetes` DOUBLE NOT NULL,
    `probabilidad_no_diabetes` DOUBLE NOT NULL,
    `nivel_riesgo` VARCHAR(50) NOT NULL,
    `factores_riesgo` TEXT NULL,
    `recomendaciones` TEXT NULL,
    `score_riesgo` DOUBLE NULL,
    `recomendaciones_generadas` TEXT NULL,
    `validado` BOOLEAN NOT NULL DEFAULT false,
    `diagnostico_confirmado` VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    `notas_medicas` TEXT NULL,
    `fecha_validacion` DATETIME(3) NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_modificacion` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `prediccion_id_estudio_fkey`(`id_estudio`),
    INDEX `prediccion_id_medicion_fkey`(`id_medicion`),
    INDEX `prediccion_id_modelo_fkey`(`id_modelo`),
    INDEX `prediccion_id_paciente_fkey`(`id_paciente`),
    INDEX `prediccion_id_usuario_fkey`(`id_usuario`),
    PRIMARY KEY (`id_prediccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historial_clinico` (
    `id_historial` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipo_evento` VARCHAR(50) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `diagnostico` TEXT NULL,
    `tratamiento` TEXT NULL,
    `observaciones` TEXT NULL,

    INDEX `historial_clinico_id_paciente_fkey`(`id_paciente`),
    INDEX `historial_clinico_id_usuario_fkey`(`id_usuario`),
    PRIMARY KEY (`id_historial`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditoria` (
    `id_auditoria` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `accion` VARCHAR(100) NOT NULL,
    `detalles` VARCHAR(500) NULL,
    `resultado` VARCHAR(20) NULL,
    `fecha_registro` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_fecha`(`fecha_registro`),
    INDEX `idx_usuario`(`id_usuario`),
    PRIMARY KEY (`id_auditoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_token` (
    `id_refresh_token` INTEGER NOT NULL AUTO_INCREMENT,
    `token_hash` VARCHAR(128) NOT NULL,
    `subject_type` VARCHAR(20) NOT NULL,
    `id_usuario` INTEGER NULL,
    `id_paciente` INTEGER NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revoked_at` DATETIME(3) NULL,
    `replaced_by_hash` VARCHAR(128) NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` VARCHAR(255) NULL,

    UNIQUE INDEX `refresh_token_token_hash_key`(`token_hash`),
    INDEX `refresh_token_id_usuario_idx`(`id_usuario`),
    INDEX `refresh_token_id_paciente_idx`(`id_paciente`),
    INDEX `refresh_token_expires_at_idx`(`expires_at`),
    INDEX `refresh_token_revoked_idx`(`revoked`),
    PRIMARY KEY (`id_refresh_token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalogo_vacuna` (
    `id_vacuna` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT NULL,
    `dosis_requeridas` INTEGER NOT NULL DEFAULT 1,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_vacuna`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vacuna_aplicada` (
    `id_aplicacion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_vacuna` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `fecha_aplicacion` DATETIME(3) NOT NULL,
    `dosis_numero` INTEGER NOT NULL DEFAULT 1,
    `lote` VARCHAR(50) NULL,
    `observaciones` TEXT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vacuna_aplicada_id_paciente_idx`(`id_paciente`),
    INDEX `vacuna_aplicada_id_vacuna_idx`(`id_vacuna`),
    INDEX `vacuna_aplicada_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_aplicacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalogo_patologia` (
    `id_patologia` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo_cie10` VARCHAR(10) NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `descripcion` TEXT NULL,
    `categoria` VARCHAR(100) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `catalogo_patologia_codigo_cie10_key`(`codigo_cie10`),
    PRIMARY KEY (`id_patologia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patologia_paciente` (
    `id_diagnostico` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_patologia` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `fecha_diagnostico` DATETIME(3) NOT NULL,
    `estado` VARCHAR(30) NOT NULL DEFAULT 'Activa',
    `severidad` VARCHAR(30) NULL,
    `notas` TEXT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `patologia_paciente_id_paciente_idx`(`id_paciente`),
    INDEX `patologia_paciente_id_patologia_idx`(`id_patologia`),
    INDEX `patologia_paciente_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_diagnostico`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consulta_medica` (
    `id_consulta` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `fecha_consulta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `motivo_consulta` TEXT NOT NULL,
    `sintomas` TEXT NULL,
    `exploracion_fisica` TEXT NULL,
    `diagnostico` TEXT NULL,
    `tratamiento` TEXT NULL,
    `receta` TEXT NULL,
    `proxima_cita` DATETIME(3) NULL,
    `observaciones` TEXT NULL,
    `datos_medico` TEXT NULL,
    `datos_paciente` TEXT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `consulta_medica_id_paciente_idx`(`id_paciente`),
    INDEX `consulta_medica_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_consulta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cita` (
    `id_cita` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `id_consulta` INTEGER NULL,
    `fecha_cita` DATETIME(3) NOT NULL,
    `motivo` TEXT NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA',
    `inicio_cita` DATETIME(3) NULL,
    `fin_cita` DATETIME(3) NULL,
    `observaciones_cierre` TEXT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_modificacion` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cita_id_consulta_key`(`id_consulta`),
    INDEX `cita_id_paciente_idx`(`id_paciente`),
    INDEX `cita_id_usuario_idx`(`id_usuario`),
    INDEX `cita_fecha_cita_idx`(`fecha_cita`),
    INDEX `cita_estado_idx`(`estado`),
    PRIMARY KEY (`id_cita`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `imagen_diagnostica` (
    `id_imagen` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `fecha_estudio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipo_imagen` VARCHAR(50) NOT NULL,
    `region_anatomica` VARCHAR(100) NOT NULL,
    `archivo_data` LONGBLOB NULL,
    `archivo_nombre` VARCHAR(255) NULL,
    `archivo_tipo` VARCHAR(100) NULL,
    `informe` TEXT NULL,
    `hallazgos` TEXT NULL,
    `conclusion` TEXT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `imagen_diagnostica_id_paciente_idx`(`id_paciente`),
    INDEX `imagen_diagnostica_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_imagen`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fractura` (
    `id_fractura` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `fecha_fractura` DATETIME(3) NOT NULL,
    `hueso_afectado` VARCHAR(100) NOT NULL,
    `tipo_fractura` VARCHAR(100) NULL,
    `lado` VARCHAR(20) NULL,
    `causa` TEXT NULL,
    `tratamiento` TEXT NULL,
    `estado` VARCHAR(30) NOT NULL DEFAULT 'En tratamiento',
    `fecha_alta` DATETIME(3) NULL,
    `observaciones` TEXT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fractura_id_paciente_idx`(`id_paciente`),
    INDEX `fractura_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_fractura`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alergia` (
    `id_alergia` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `tipo_alergia` VARCHAR(50) NOT NULL,
    `alergeno` VARCHAR(200) NOT NULL,
    `severidad` VARCHAR(30) NULL,
    `reaccion` TEXT NULL,
    `fecha_deteccion` DATETIME(3) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `alergia_id_paciente_idx`(`id_paciente`),
    INDEX `alergia_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_alergia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `antecedente_familiar` (
    `id_antecedente` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `parentesco` VARCHAR(50) NOT NULL,
    `condicion` VARCHAR(200) NOT NULL,
    `detalles` TEXT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `antecedente_familiar_id_paciente_idx`(`id_paciente`),
    INDEX `antecedente_familiar_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_antecedente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plantilla` (
    `id_plantilla` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `tipo` VARCHAR(50) NOT NULL,
    `especialidad` VARCHAR(100) NULL,
    `contenido` TEXT NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `plantilla_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_plantilla`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receta` (
    `id_receta` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `id_consulta` INTEGER NULL,
    `fecha_emicion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `medicamentos` TEXT NOT NULL,
    `instrucciones` TEXT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'Activa',
    `datos_medico` TEXT NULL,
    `datos_paciente` TEXT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `receta_id_paciente_idx`(`id_paciente`),
    INDEX `receta_id_usuario_idx`(`id_usuario`),
    INDEX `receta_id_consulta_idx`(`id_consulta`),
    PRIMARY KEY (`id_receta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documento_adjunto` (
    `id_documento` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_usuario` INTEGER NOT NULL,
    `tipo_documento` VARCHAR(50) NOT NULL,
    `nombre_archivo` VARCHAR(255) NOT NULL,
    `tipo_archivo` VARCHAR(100) NOT NULL,
    `datos_archivo` LONGBLOB NULL,
    `descripcion` TEXT NULL,
    `fecha_subida` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `documento_adjunto_id_paciente_idx`(`id_paciente`),
    INDEX `documento_adjunto_id_usuario_idx`(`id_usuario`),
    PRIMARY KEY (`id_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalogo_medicamento` (
    `id_medicamento` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(200) NOT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `catalogo_medicamento_nombre_key`(`nombre`),
    PRIMARY KEY (`id_medicamento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalogo_alergia` (
    `id_alergia` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(200) NOT NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `catalogo_alergia_nombre_key`(`nombre`),
    PRIMARY KEY (`id_alergia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_id_rol_fkey` FOREIGN KEY (`id_rol`) REFERENCES `rol`(`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paciente` ADD CONSTRAINT `paciente_id_direccion_fkey` FOREIGN KEY (`id_direccion`) REFERENCES `direccion`(`id_direccion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automonitoreo` ADD CONSTRAINT `automonitoreo_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estudio_laboratorio` ADD CONSTRAINT `estudio_laboratorio_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estudio_laboratorio` ADD CONSTRAINT `estudio_laboratorio_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medicion_antropometrica` ADD CONSTRAINT `medicion_antropometrica_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medicion_antropometrica` ADD CONSTRAINT `medicion_antropometrica_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prediccion` ADD CONSTRAINT `prediccion_id_estudio_fkey` FOREIGN KEY (`id_estudio`) REFERENCES `estudio_laboratorio`(`id_estudio`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prediccion` ADD CONSTRAINT `prediccion_id_medicion_fkey` FOREIGN KEY (`id_medicion`) REFERENCES `medicion_antropometrica`(`id_medicion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prediccion` ADD CONSTRAINT `prediccion_id_modelo_fkey` FOREIGN KEY (`id_modelo`) REFERENCES `modelo_ia`(`id_modelo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prediccion` ADD CONSTRAINT `prediccion_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prediccion` ADD CONSTRAINT `prediccion_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_clinico` ADD CONSTRAINT `historial_clinico_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_clinico` ADD CONSTRAINT `historial_clinico_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditoria` ADD CONSTRAINT `auditoria_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `refresh_token` ADD CONSTRAINT `refresh_token_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_token` ADD CONSTRAINT `refresh_token_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vacuna_aplicada` ADD CONSTRAINT `vacuna_aplicada_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vacuna_aplicada` ADD CONSTRAINT `vacuna_aplicada_id_vacuna_fkey` FOREIGN KEY (`id_vacuna`) REFERENCES `catalogo_vacuna`(`id_vacuna`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vacuna_aplicada` ADD CONSTRAINT `vacuna_aplicada_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patologia_paciente` ADD CONSTRAINT `patologia_paciente_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patologia_paciente` ADD CONSTRAINT `patologia_paciente_id_patologia_fkey` FOREIGN KEY (`id_patologia`) REFERENCES `catalogo_patologia`(`id_patologia`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patologia_paciente` ADD CONSTRAINT `patologia_paciente_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consulta_medica` ADD CONSTRAINT `consulta_medica_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consulta_medica` ADD CONSTRAINT `consulta_medica_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cita` ADD CONSTRAINT `cita_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cita` ADD CONSTRAINT `cita_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cita` ADD CONSTRAINT `cita_id_consulta_fkey` FOREIGN KEY (`id_consulta`) REFERENCES `consulta_medica`(`id_consulta`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `imagen_diagnostica` ADD CONSTRAINT `imagen_diagnostica_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `imagen_diagnostica` ADD CONSTRAINT `imagen_diagnostica_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fractura` ADD CONSTRAINT `fractura_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fractura` ADD CONSTRAINT `fractura_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alergia` ADD CONSTRAINT `alergia_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alergia` ADD CONSTRAINT `alergia_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `antecedente_familiar` ADD CONSTRAINT `antecedente_familiar_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `antecedente_familiar` ADD CONSTRAINT `antecedente_familiar_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plantilla` ADD CONSTRAINT `plantilla_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receta` ADD CONSTRAINT `receta_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receta` ADD CONSTRAINT `receta_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receta` ADD CONSTRAINT `receta_id_consulta_fkey` FOREIGN KEY (`id_consulta`) REFERENCES `consulta_medica`(`id_consulta`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_adjunto` ADD CONSTRAINT `documento_adjunto_id_paciente_fkey` FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_adjunto` ADD CONSTRAINT `documento_adjunto_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;
