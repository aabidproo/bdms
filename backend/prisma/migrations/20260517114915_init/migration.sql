-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resetToken" TEXT,
    "resetTokenExpiry" DATETIME,
    "avatar" TEXT DEFAULT ''
);

-- CreateTable
CREATE TABLE "DonorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "gender" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bloodType" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "lastDonationDate" DATETIME,
    "medicalCondition" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DonorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipientProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bloodType" TEXT NOT NULL,
    "medicalCondition" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecipientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blood_inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bloodGroup" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "donationDate" DATETIME,
    "donorName" TEXT,
    "plasmaCount" REAL,
    "rbcCount" REAL,
    "expiryDate" DATETIME,
    "notes" TEXT,
    "tested" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "category" TEXT DEFAULT 'Government',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "blood_bank_stocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "component" TEXT NOT NULL DEFAULT 'Whole Blood',
    "units" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blood_bank_stocks_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dispatches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dispatches_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "blood_inventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dispatches_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "daysBeforeExpiry" INTEGER NOT NULL DEFAULT 7,
    "notifyOnCritical" BOOLEAN NOT NULL DEFAULT false,
    "method" TEXT NOT NULL DEFAULT 'in_app',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_alerts_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "blood_inventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorProfileId" TEXT NOT NULL,
    "bloodType" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "donationDate" DATETIME,
    "healthIndicator" TEXT DEFAULT 'Good',
    "plasmaCount" REAL,
    "rbcCount" REAL,
    CONSTRAINT "donations_donorProfileId_fkey" FOREIGN KEY ("donorProfileId") REFERENCES "DonorProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blood_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientProfileId" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'Normal',
    "hospital" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "blood_requests_recipientProfileId_fkey" FOREIGN KEY ("recipientProfileId") REFERENCES "RecipientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "DonorProfile_userId_key" ON "DonorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipientProfile_userId_key" ON "RecipientProfile"("userId");

-- CreateIndex
CREATE INDEX "blood_bank_stocks_hospitalId_idx" ON "blood_bank_stocks"("hospitalId");

-- CreateIndex
CREATE INDEX "blood_bank_stocks_bloodGroup_idx" ON "blood_bank_stocks"("bloodGroup");

-- CreateIndex
CREATE INDEX "dispatches_batchId_idx" ON "dispatches"("batchId");

-- CreateIndex
CREATE INDEX "dispatches_hospitalId_idx" ON "dispatches"("hospitalId");

-- CreateIndex
CREATE INDEX "inventory_alerts_batchId_idx" ON "inventory_alerts"("batchId");

-- CreateIndex
CREATE INDEX "donations_donorProfileId_fkey" ON "donations"("donorProfileId");

-- CreateIndex
CREATE INDEX "blood_requests_recipientProfileId_fkey" ON "blood_requests"("recipientProfileId");
