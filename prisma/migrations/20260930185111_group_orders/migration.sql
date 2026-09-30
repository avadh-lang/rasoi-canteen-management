-- CreateTable
CREATE TABLE "GroupOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupOrder_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "sharePaise" INTEGER,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GroupOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    CONSTRAINT "GroupLine_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GroupOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GroupLine_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" INTEGER NOT NULL,
    "businessDate" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLACED',
    "customerName" TEXT NOT NULL,
    "userId" TEXT,
    "handledById" TEXT,
    "pickupSlot" DATETIME,
    "subtotalPaise" INTEGER NOT NULL,
    "taxPaise" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "paymentRef" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "groupId" TEXT,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preparingAt" DATETIME,
    "readyAt" DATETIME,
    "collectedAt" DATETIME,
    "cancelledAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GroupOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("businessDate", "cancelledAt", "channel", "collectedAt", "customerName", "handledById", "id", "note", "paymentMethod", "paymentRef", "paymentStatus", "pickupSlot", "placedAt", "preparingAt", "readyAt", "status", "subtotalPaise", "taxPaise", "token", "totalPaise", "updatedAt", "userId") SELECT "businessDate", "cancelledAt", "channel", "collectedAt", "customerName", "handledById", "id", "note", "paymentMethod", "paymentRef", "paymentStatus", "pickupSlot", "placedAt", "preparingAt", "readyAt", "status", "subtotalPaise", "taxPaise", "token", "totalPaise", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_groupId_key" ON "Order"("groupId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_placedAt_idx" ON "Order"("placedAt");
CREATE UNIQUE INDEX "Order_businessDate_token_key" ON "Order"("businessDate", "token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "GroupOrder_code_key" ON "GroupOrder"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupLine_groupId_userId_menuItemId_key" ON "GroupLine"("groupId", "userId", "menuItemId");
