CREATE TABLE `reports` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `source_type` ENUM('synthetic', 'upload') NOT NULL DEFAULT 'synthetic',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `measurements` (
    `id` CHAR(36) NOT NULL,
    `report_id` CHAR(36) NOT NULL,
    `test_name` VARCHAR(160) NOT NULL,
    `normalized_name` VARCHAR(160) NULL,
    `value` DECIMAL(14, 4) NOT NULL,
    `unit` VARCHAR(48) NULL,
    `reference_low` DECIMAL(14, 4) NULL,
    `reference_high` DECIMAL(14, 4) NULL,
    `source_text` TEXT NULL,
    `extraction_confidence` DECIMAL(5, 4) NULL,
    `collected_at` DATE NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_measurements_report`(`report_id`),
    INDEX `idx_measurements_normalized_name`(`normalized_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `measurements`
    ADD CONSTRAINT `fk_measurements_report`
    FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
