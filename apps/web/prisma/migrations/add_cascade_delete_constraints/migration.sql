-- AddForeignKey for EstudioLaboratorio → Paciente with onDelete: Cascade
ALTER TABLE `estudio_laboratorio` DROP FOREIGN KEY `estudio_laboratorio_id_paciente_fkey`;
ALTER TABLE `estudio_laboratorio` 
ADD CONSTRAINT `estudio_laboratorio_id_paciente_fkey` 
FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for MedicionAntropometrica → Paciente with onDelete: Cascade
ALTER TABLE `medicion_antropometrica` DROP FOREIGN KEY `medicion_antropometrica_id_paciente_fkey`;
ALTER TABLE `medicion_antropometrica` 
ADD CONSTRAINT `medicion_antropometrica_id_paciente_fkey` 
FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for Prediccion → Paciente with onDelete: Cascade
ALTER TABLE `prediccion` DROP FOREIGN KEY `prediccion_id_paciente_fkey`;
ALTER TABLE `prediccion` 
ADD CONSTRAINT `prediccion_id_paciente_fkey` 
FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for HistorialClinico → Paciente with onDelete: Cascade
ALTER TABLE `historial_clinico` DROP FOREIGN KEY `historial_clinico_id_paciente_fkey`;
ALTER TABLE `historial_clinico` 
ADD CONSTRAINT `historial_clinico_id_paciente_fkey` 
FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;
