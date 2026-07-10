-- AlterTable
ALTER TABLE "User" ADD COLUMN     "communicationPrefs" JSONB,
ADD COLUMN     "newsletterOptIn" BOOLEAN NOT NULL DEFAULT false;
