-- AlterTable
ALTER TABLE "PostTestQuestion" ADD COLUMN     "bodyImageUrl" TEXT[];

-- CreateTable
CREATE TABLE "PostTestOptionImage" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "option" "AnswerOption" NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "PostTestOptionImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PostTestOptionImage" ADD CONSTRAINT "PostTestOptionImage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PostTestQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
