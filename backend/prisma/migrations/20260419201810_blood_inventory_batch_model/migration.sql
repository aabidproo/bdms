-- DropIndex
DROP INDEX `blood_inventory_bloodGroup_key` ON `blood_inventory`;

-- AlterTable
ALTER TABLE `blood_inventory` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `donationDate` DATETIME(3) NULL,
    ADD COLUMN `donorName` VARCHAR(191) NULL,
    ADD COLUMN `plasmaCount` DOUBLE NULL,
    ADD COLUMN `rbcCount` DOUBLE NULL;

-- AlterTable
ALTER TABLE `donations` ADD COLUMN `donationDate` DATETIME(3) NULL,
    ADD COLUMN `healthIndicator` VARCHAR(191) NULL DEFAULT 'Good',
    ADD COLUMN `plasmaCount` DOUBLE NULL,
    ADD COLUMN `rbcCount` DOUBLE NULL;
