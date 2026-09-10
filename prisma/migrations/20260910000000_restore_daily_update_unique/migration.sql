-- Restore the uniqueness required by DailyUpdate upsert(employeeId, forDate).
CREATE UNIQUE INDEX "DailyUpdate_employeeId_forDate_key" ON "DailyUpdate"("employeeId", "forDate");
