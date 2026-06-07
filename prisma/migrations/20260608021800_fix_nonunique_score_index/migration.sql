DROP INDEX IF EXISTS "Score_sessionId_roundNumber_idx";
CREATE INDEX "Score_sessionId_roundNumber_idx" ON "Score"("sessionId", "roundNumber");
