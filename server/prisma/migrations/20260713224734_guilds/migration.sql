-- CreateEnum
CREATE TYPE "GuildRole" AS ENUM ('LEADER', 'OFFICER', 'MEMBER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'GUILD_INVITATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_REQUEST_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_REQUEST_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_MEMBER_JOINED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_MEMBER_LEFT';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_PROMOTED_OFFICER';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_DEMOTED_OFFICER';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_LEADERSHIP_TRANSFERRED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_KICKED';

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '🛡️',
    "color" TEXT NOT NULL DEFAULT '#8B5CF6',
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "maxMembers" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GuildRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildInvitation" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildJoinRequest" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMessage" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "replyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildStatistics" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalXp" INTEGER NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "avgLevel" DOUBLE PRECISION NOT NULL,
    "questsDone" INTEGER NOT NULL,
    "totalStreak" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "GuildStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_userId_key" ON "GuildMember"("userId");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_role_idx" ON "GuildMember"("guildId", "role");

-- CreateIndex
CREATE INDEX "GuildInvitation_inviteeId_createdAt_idx" ON "GuildInvitation"("inviteeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuildInvitation_guildId_inviteeId_key" ON "GuildInvitation"("guildId", "inviteeId");

-- CreateIndex
CREATE INDEX "GuildJoinRequest_guildId_createdAt_idx" ON "GuildJoinRequest"("guildId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuildJoinRequest_guildId_userId_key" ON "GuildJoinRequest"("guildId", "userId");

-- CreateIndex
CREATE INDEX "GuildMessage_guildId_createdAt_idx" ON "GuildMessage"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "GuildStatistics_guildId_date_idx" ON "GuildStatistics"("guildId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GuildStatistics_guildId_date_key" ON "GuildStatistics"("guildId", "date");

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildInvitation" ADD CONSTRAINT "GuildInvitation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildInvitation" ADD CONSTRAINT "GuildInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildInvitation" ADD CONSTRAINT "GuildInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildJoinRequest" ADD CONSTRAINT "GuildJoinRequest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildJoinRequest" ADD CONSTRAINT "GuildJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMessage" ADD CONSTRAINT "GuildMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMessage" ADD CONSTRAINT "GuildMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMessage" ADD CONSTRAINT "GuildMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "GuildMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildStatistics" ADD CONSTRAINT "GuildStatistics_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
