-- CreateTable
CREATE TABLE "RoutineSection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutineTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutineCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineSection_userId_idx" ON "RoutineSection"("userId");

-- CreateIndex
CREATE INDEX "RoutineTask_sectionId_idx" ON "RoutineTask"("sectionId");

-- CreateIndex
CREATE INDEX "RoutineTask_userId_idx" ON "RoutineTask"("userId");

-- CreateIndex
CREATE INDEX "RoutineCheck_userId_weekStart_idx" ON "RoutineCheck"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineCheck_taskId_weekStart_dayOfWeek_key" ON "RoutineCheck"("taskId", "weekStart", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "RoutineSection" ADD CONSTRAINT "RoutineSection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineTask" ADD CONSTRAINT "RoutineTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineTask" ADD CONSTRAINT "RoutineTask_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "RoutineSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineCheck" ADD CONSTRAINT "RoutineCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineCheck" ADD CONSTRAINT "RoutineCheck_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "RoutineTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
