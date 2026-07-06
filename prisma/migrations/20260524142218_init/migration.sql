-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('BACTERIA', 'FUNGI', 'PARASITE', 'VIRUS');

-- CreateEnum
CREATE TYPE "GramType" AS ENUM ('POSITIVE', 'NEGATIVE', 'ACID_FAST', 'NONE');

-- CreateEnum
CREATE TYPE "CardCategory" AS ENUM ('GRAM_STAIN', 'VIRULENCE_FACTOR', 'LAB_CHARACTERISTIC', 'SPECIAL_TRAIT', 'CLINICAL_MANIFESTATION');

-- CreateEnum
CREATE TYPE "MicrobeTag" AS ENUM ('ANAEROBE', 'AEROBE', 'FACULTATIVE_ANAEROBE', 'SPORE_FORMER', 'ENCAPSULATED', 'INTRACELLULAR');

-- CreateEnum
CREATE TYPE "PostTestPeriod" AS ENUM ('MIDTERM', 'FINAL');

-- CreateEnum
CREATE TYPE "AnswerOption" AS ENUM ('A', 'B', 'C', 'D');

-- CreateTable
CREATE TABLE "ApprovedUsername" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" TIMESTAMP(3),

    CONSTRAINT "ApprovedUsername_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameMode" "GameMode" NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "totalTime" INTEGER NOT NULL DEFAULT 0,
    "heartsLeft" INTEGER NOT NULL DEFAULT 3,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "abandoned" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionMicrobe" (
    "sessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "microbeId" TEXT NOT NULL,

    CONSTRAINT "SessionMicrobe_pkey" PRIMARY KEY ("sessionId","roundNumber")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "microbeId" TEXT NOT NULL,
    "answeredMicrobeId" TEXT,
    "roundNumber" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "cardSlotsOpened" INTEGER[],
    "heartsLeft" INTEGER NOT NULL,
    "roundScore" INTEGER NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Microbe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "answerImageUrl" TEXT NOT NULL,
    "gameMode" "GameMode" NOT NULL,
    "gramType" "GramType" NOT NULL,
    "tags" "MicrobeTag"[],
    "starRating" INTEGER NOT NULL,

    CONSTRAINT "Microbe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClueCard" (
    "id" TEXT NOT NULL,
    "category" "CardCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "ClueCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicrobeClue" (
    "microbeId" TEXT NOT NULL,
    "clueCardId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "MicrobeClue_pkey" PRIMARY KEY ("microbeId","clueCardId")
);

-- CreateTable
CREATE TABLE "PlayerMicrobeUnlocked" (
    "playerId" TEXT NOT NULL,
    "microbeId" TEXT NOT NULL,
    "cardSlotsOpened" INTEGER[],
    "firstUnlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerMicrobeUnlocked_pkey" PRIMARY KEY ("playerId","microbeId")
);

-- CreateTable
CREATE TABLE "PostTest" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "period" "PostTestPeriod" NOT NULL,
    "answers" "AnswerOption"[],
    "score" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTestQuestion" (
    "id" TEXT NOT NULL,
    "period" "PostTestPeriod" NOT NULL,
    "body" TEXT NOT NULL,
    "options" TEXT[],
    "correctOption" "AnswerOption" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "PostTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedUsername_username_key" ON "ApprovedUsername"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Player_username_key" ON "Player"("username");

-- CreateIndex
CREATE INDEX "Player_totalScore_idx" ON "Player"("totalScore" DESC);

-- CreateIndex
CREATE INDEX "GameSession_playerId_startedAt_idx" ON "GameSession"("playerId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "GameSession_completed_completedAt_idx" ON "GameSession"("completed", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessionMicrobe_sessionId_microbeId_key" ON "SessionMicrobe"("sessionId", "microbeId");

-- CreateIndex
CREATE INDEX "Score_playerId_createdAt_idx" ON "Score"("playerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Score_microbeId_idx" ON "Score"("microbeId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_sessionId_roundNumber_key" ON "Score"("sessionId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Microbe_name_key" ON "Microbe"("name");

-- CreateIndex
CREATE INDEX "Microbe_gameMode_idx" ON "Microbe"("gameMode");

-- CreateIndex
CREATE INDEX "Microbe_tags_idx" ON "Microbe" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "ClueCard_category_idx" ON "ClueCard"("category");

-- CreateIndex
CREATE INDEX "MicrobeClue_clueCardId_idx" ON "MicrobeClue"("clueCardId");

-- CreateIndex
CREATE UNIQUE INDEX "PostTest_playerId_period_key" ON "PostTest"("playerId", "period");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_username_fkey" FOREIGN KEY ("username") REFERENCES "ApprovedUsername"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMicrobe" ADD CONSTRAINT "SessionMicrobe_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMicrobe" ADD CONSTRAINT "SessionMicrobe_microbeId_fkey" FOREIGN KEY ("microbeId") REFERENCES "Microbe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_microbeId_fkey" FOREIGN KEY ("microbeId") REFERENCES "Microbe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_answeredMicrobeId_fkey" FOREIGN KEY ("answeredMicrobeId") REFERENCES "Microbe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicrobeClue" ADD CONSTRAINT "MicrobeClue_microbeId_fkey" FOREIGN KEY ("microbeId") REFERENCES "Microbe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicrobeClue" ADD CONSTRAINT "MicrobeClue_clueCardId_fkey" FOREIGN KEY ("clueCardId") REFERENCES "ClueCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMicrobeUnlocked" ADD CONSTRAINT "PlayerMicrobeUnlocked_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerMicrobeUnlocked" ADD CONSTRAINT "PlayerMicrobeUnlocked_microbeId_fkey" FOREIGN KEY ("microbeId") REFERENCES "Microbe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTest" ADD CONSTRAINT "PostTest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
