-- AlterTable: Add supabaseUserId column and remove passwordHash
ALTER TABLE "User" ADD COLUMN "supabaseUserId" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" DROP COLUMN "passwordHash";

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");
CREATE INDEX "User_supabaseUserId_idx" ON "User"("supabaseUserId");
