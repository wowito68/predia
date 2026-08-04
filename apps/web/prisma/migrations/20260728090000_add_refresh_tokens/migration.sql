CREATE TABLE IF NOT EXISTS `refresh_token` (
  `id_refresh_token` INT NOT NULL AUTO_INCREMENT,
  `token_hash` VARCHAR(128) NOT NULL,
  `subject_type` VARCHAR(20) NOT NULL,
  `id_usuario` INT NULL,
  `id_paciente` INT NULL,
  `revoked` BOOLEAN NOT NULL DEFAULT FALSE,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revoked_at` DATETIME(3) NULL,
  `replaced_by_hash` VARCHAR(128) NULL,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` VARCHAR(255) NULL,
  PRIMARY KEY (`id_refresh_token`),
  UNIQUE KEY `refresh_token_token_hash_key` (`token_hash`),
  INDEX `refresh_token_id_usuario_idx` (`id_usuario`),
  INDEX `refresh_token_id_paciente_idx` (`id_paciente`),
  INDEX `refresh_token_expires_at_idx` (`expires_at`),
  INDEX `refresh_token_revoked_idx` (`revoked`),
  CONSTRAINT `refresh_token_id_usuario_fkey`
    FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `refresh_token_id_paciente_fkey`
    FOREIGN KEY (`id_paciente`) REFERENCES `paciente`(`id_paciente`)
    ON DELETE CASCADE ON UPDATE CASCADE
);
