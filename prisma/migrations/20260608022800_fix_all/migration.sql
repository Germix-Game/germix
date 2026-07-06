DROP INDEX IF EXISTS "Score_sessionId_roundNumber_key";
CREATE UNIQUE INDEX "SessionMicrobe_sessionId_microbeId_key" ON "SessionMicrobe"("sessionId", "microbeId");
