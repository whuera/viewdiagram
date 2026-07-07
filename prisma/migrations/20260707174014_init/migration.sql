-- CreateTable
CREATE TABLE "Diagram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cat" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "filePath" TEXT,
    "svgCache" TEXT,
    "sourceXml" TEXT,
    "imageData" TEXT,
    "isStatic" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
