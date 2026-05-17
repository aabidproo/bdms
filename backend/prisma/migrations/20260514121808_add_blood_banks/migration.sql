-- AlterTable
ALTER TABLE `hospitals` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `category` VARCHAR(191) NULL DEFAULT 'Government',
    ADD COLUMN `district` VARCHAR(191) NULL,
    ADD COLUMN `province` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `blood_bank_stocks` (
    `id` VARCHAR(191) NOT NULL,
    `hospitalId` VARCHAR(191) NOT NULL,
    `bloodGroup` VARCHAR(191) NOT NULL,
    `component` VARCHAR(191) NOT NULL DEFAULT 'Whole Blood',
    `units` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `blood_bank_stocks_hospitalId_idx`(`hospitalId`),
    INDEX `blood_bank_stocks_bloodGroup_idx`(`bloodGroup`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `blood_bank_stocks` ADD CONSTRAINT `blood_bank_stocks_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `hospitals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
