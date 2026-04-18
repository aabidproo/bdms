-- AlterTable
ALTER TABLE `bloodstock` ADD COLUMN `healthIndicator` VARCHAR(191) NOT NULL DEFAULT 'Good',
    ADD COLUMN `plasmaCount` DOUBLE NULL,
    ADD COLUMN `rbcCount` DOUBLE NULL;
