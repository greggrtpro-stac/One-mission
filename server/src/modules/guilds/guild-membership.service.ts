import type { GuildInvitationDto, JoinGuildResult } from '@one-mission/shared'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'
import {
  cleanupPendingForUser,
  getMembership,
  guildOfficerIds,
  notifyGuildEvent,
  requireGuildRole,
  requireMembership,
  roleAtLeast,
} from './guilds.service.js'

/**
 * Cycle de vie des membres : rejoindre, demander, inviter, accepter, refuser,
 * quitter, expulser, promouvoir, rétrograder, transférer. TOUTES les règles
 * de permission sont appliquées ici, côté serveur — jamais confiées au client.
 */

type GuildLite = { id: string; name: string; icon: string; color: string }

function guildData(guild: GuildLite): Record<string, string> {
  return { guildId: guild.id, guildName: guild.name, guildIcon: guild.icon, guildColor: guild.color }
}

async function assertCanEnter(guild: {
  id: string
  minLevel: number
  maxMembers: number
}): Promise<void> {
  const count = await prisma.guildMember.count({ where: { guildId: guild.id } })
  if (count >= guild.maxMembers) {
    throw new ApiError(409, 'Cette guilde est complète', 'GUILD_FULL')
  }
}

/** Fait entrer un joueur : création du membre + purge de ses candidatures ailleurs. */
async function admitMember(guildId: string, userId: string) {
  await prisma.guildMember.create({ data: { guildId, userId } })
  await cleanupPendingForUser(userId)
}

// ── Rejoindre / demander ─────────────────────────────────────

/**
 * Guilde ouverte : entrée directe. Guilde fermée : demande d'adhésion.
 * Une invitation en attente vaut acceptation immédiate (intention mutuelle),
 * et dispense du niveau minimum — le chef a invité ce joueur en connaissance
 * de cause.
 */
export async function joinGuild(
  meId: string,
  guildId: string,
  message?: string,
): Promise<JoinGuildResult> {
  if (await getMembership(meId)) {
    throw new ApiError(409, 'Tu appartiens déjà à une guilde', 'ALREADY_IN_GUILD')
  }
  const guild = await prisma.guild.findUnique({ where: { id: guildId } })
  if (!guild) throw new ApiError(404, 'Guilde introuvable', 'GUILD_NOT_FOUND')

  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: { id: true, username: true, level: true },
  })
  if (!me) throw new ApiError(401, 'Authentification requise', 'UNAUTHENTICATED')

  const invitation = await prisma.guildInvitation.findUnique({
    where: { guildId_inviteeId: { guildId, inviteeId: meId } },
  })

  if (!invitation && me.level < guild.minLevel) {
    throw new ApiError(
      403,
      `Niveau ${guild.minLevel} minimum requis pour rejoindre cette guilde`,
      'GUILD_LEVEL_REQUIRED',
    )
  }

  if (invitation || guild.isOpen) {
    await assertCanEnter(guild)
    await admitMember(guildId, meId)
    await notifyGuildEvent(await guildOfficerIds(guildId, meId), 'GUILD_MEMBER_JOINED', {
      ...guildData(guild),
      username: me.username,
      userId: me.id,
    })
    return { status: 'joined' }
  }

  try {
    await prisma.guildJoinRequest.create({
      data: { guildId, userId: meId, message: message || null },
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ApiError(409, 'Demande déjà envoyée à cette guilde', 'REQUEST_EXISTS')
    }
    throw err
  }
  await notifyGuildEvent(await guildOfficerIds(guildId), 'GUILD_REQUEST_RECEIVED', {
    ...guildData(guild),
    username: me.username,
    userId: me.id,
  })
  return { status: 'requested' }
}

/** Annulation par le demandeur lui-même — sans notification. */
export async function cancelJoinRequest(meId: string, requestId: string): Promise<void> {
  const request = await prisma.guildJoinRequest.findUnique({ where: { id: requestId } })
  if (!request || request.userId !== meId) {
    throw new ApiError(404, 'Demande introuvable', 'REQUEST_NOT_FOUND')
  }
  await prisma.guildJoinRequest.delete({ where: { id: requestId } })
}

export async function acceptJoinRequest(meId: string, requestId: string): Promise<void> {
  const request = await prisma.guildJoinRequest.findUnique({
    where: { id: requestId },
    include: { guild: true, user: { select: { id: true, username: true } } },
  })
  if (!request) throw new ApiError(404, 'Demande introuvable', 'REQUEST_NOT_FOUND')
  await requireGuildRole(meId, request.guildId, 'OFFICER')

  // Le demandeur a pu rejoindre une autre guilde entre-temps.
  if (await getMembership(request.userId)) {
    await prisma.guildJoinRequest.delete({ where: { id: requestId } })
    throw new ApiError(409, 'Ce joueur a déjà rejoint une autre guilde', 'ALREADY_IN_GUILD')
  }
  await assertCanEnter(request.guild)

  await admitMember(request.guildId, request.userId)
  await notifyGuildEvent([request.userId], 'GUILD_REQUEST_ACCEPTED', guildData(request.guild))
  await notifyGuildEvent(
    await guildOfficerIds(request.guildId, meId),
    'GUILD_MEMBER_JOINED',
    { ...guildData(request.guild), username: request.user.username, userId: request.user.id },
  )
}

export async function declineJoinRequest(meId: string, requestId: string): Promise<void> {
  const request = await prisma.guildJoinRequest.findUnique({
    where: { id: requestId },
    include: { guild: true },
  })
  if (!request) throw new ApiError(404, 'Demande introuvable', 'REQUEST_NOT_FOUND')
  await requireGuildRole(meId, request.guildId, 'OFFICER')

  await prisma.guildJoinRequest.delete({ where: { id: requestId } })
  await notifyGuildEvent([request.userId], 'GUILD_REQUEST_DECLINED', guildData(request.guild))
}

// ── Invitations ──────────────────────────────────────────────

export async function invitePlayer(meId: string, guildId: string, targetId: string): Promise<void> {
  const membership = await requireGuildRole(meId, guildId, 'OFFICER')

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, username: true },
  })
  if (!target) throw new ApiError(404, 'Joueur introuvable', 'USER_NOT_FOUND')
  if (await getMembership(targetId)) {
    throw new ApiError(409, 'Ce joueur appartient déjà à une guilde', 'ALREADY_IN_GUILD')
  }

  // Cas croisé : ce joueur avait déjà demandé à nous rejoindre — l'intention
  // est mutuelle, sa demande est acceptée au lieu de créer une invitation.
  const pending = await prisma.guildJoinRequest.findUnique({
    where: { guildId_userId: { guildId, userId: targetId } },
    select: { id: true },
  })
  if (pending) {
    await acceptJoinRequest(meId, pending.id)
    return
  }

  try {
    await prisma.guildInvitation.create({
      data: { guildId, inviterId: meId, inviteeId: targetId },
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ApiError(409, 'Ce joueur a déjà une invitation en attente', 'INVITATION_EXISTS')
    }
    throw err
  }

  const inviter = await prisma.user.findUnique({
    where: { id: meId },
    select: { username: true },
  })
  await notifyGuildEvent([targetId], 'GUILD_INVITATION_RECEIVED', {
    ...guildData(membership.guild),
    fromUsername: inviter?.username ?? '',
  })
}

export async function listMyInvitations(meId: string): Promise<GuildInvitationDto[]> {
  const rows = await prisma.guildInvitation.findMany({
    where: { inviteeId: meId },
    orderBy: { createdAt: 'desc' },
    include: {
      guild: {
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
          maxMembers: true,
          _count: { select: { members: true } },
        },
      },
      inviter: { select: { id: true, username: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    guild: {
      id: row.guild.id,
      name: row.guild.name,
      icon: row.guild.icon,
      color: row.guild.color,
      memberCount: row.guild._count.members,
      maxMembers: row.guild.maxMembers,
    },
    inviter: { userId: row.inviter.id, username: row.inviter.username },
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function acceptInvitation(meId: string, invitationId: string): Promise<void> {
  const invitation = await prisma.guildInvitation.findUnique({
    where: { id: invitationId },
    include: { guild: true },
  })
  if (!invitation || invitation.inviteeId !== meId) {
    throw new ApiError(404, 'Invitation introuvable', 'INVITATION_NOT_FOUND')
  }
  if (await getMembership(meId)) {
    throw new ApiError(409, 'Tu appartiens déjà à une guilde', 'ALREADY_IN_GUILD')
  }
  await assertCanEnter(invitation.guild)

  const me = await prisma.user.findUnique({ where: { id: meId }, select: { username: true } })
  await admitMember(invitation.guildId, meId)
  await notifyGuildEvent(
    await guildOfficerIds(invitation.guildId, meId),
    'GUILD_MEMBER_JOINED',
    { ...guildData(invitation.guild), username: me?.username ?? '', userId: meId },
  )
}

export async function declineInvitation(meId: string, invitationId: string): Promise<void> {
  const invitation = await prisma.guildInvitation.findUnique({ where: { id: invitationId } })
  if (!invitation || invitation.inviteeId !== meId) {
    throw new ApiError(404, 'Invitation introuvable', 'INVITATION_NOT_FOUND')
  }
  await prisma.guildInvitation.delete({ where: { id: invitationId } })
}

// ── Quitter / expulser ───────────────────────────────────────

export async function leaveGuild(meId: string): Promise<void> {
  const membership = await requireMembership(meId)

  if (membership.role === 'LEADER') {
    const others = await prisma.guildMember.count({
      where: { guildId: membership.guildId, userId: { not: meId } },
    })
    if (others > 0) {
      throw new ApiError(
        409,
        'Transfère d’abord la propriété de la guilde à un autre membre',
        'TRANSFER_REQUIRED',
      )
    }
    // Chef seul à bord : la guilde disparaît avec lui.
    await prisma.guild.delete({ where: { id: membership.guildId } })
    return
  }

  const me = await prisma.user.findUnique({ where: { id: meId }, select: { username: true } })
  await prisma.guildMember.delete({ where: { userId: meId } })
  await notifyGuildEvent(
    await guildOfficerIds(membership.guildId, meId),
    'GUILD_MEMBER_LEFT',
    { ...guildData(membership.guild), username: me?.username ?? '', userId: meId },
  )
}

export async function kickMember(meId: string, guildId: string, targetId: string): Promise<void> {
  if (targetId === meId) {
    throw new ApiError(400, 'Utilise « Quitter la guilde » pour partir', 'CANNOT_KICK_SELF')
  }
  const my = await requireGuildRole(meId, guildId, 'OFFICER')
  const target = await prisma.guildMember.findUnique({
    where: { userId: targetId },
    include: { user: { select: { username: true } } },
  })
  if (!target || target.guildId !== guildId) {
    throw new ApiError(404, 'Ce joueur n’est pas membre de la guilde', 'NOT_GUILD_MEMBER')
  }
  // Le chef expulse qui il veut ; un officier n'expulse que les membres simples.
  if (target.role === 'LEADER' || (my.role === 'OFFICER' && target.role !== 'MEMBER')) {
    throw new ApiError(403, 'Tu ne peux pas expulser ce membre', 'GUILD_ROLE_REQUIRED')
  }

  await prisma.guildMember.delete({ where: { userId: targetId } })
  await notifyGuildEvent([targetId], 'GUILD_KICKED', guildData(my.guild))
  await notifyGuildEvent(
    await guildOfficerIds(guildId, meId),
    'GUILD_MEMBER_LEFT',
    { ...guildData(my.guild), username: target.user.username, userId: targetId },
  )
}

// ── Rôles ────────────────────────────────────────────────────

async function requireTargetMember(guildId: string, targetId: string) {
  const target = await prisma.guildMember.findUnique({
    where: { userId: targetId },
    include: { user: { select: { username: true } } },
  })
  if (!target || target.guildId !== guildId) {
    throw new ApiError(404, 'Ce joueur n’est pas membre de la guilde', 'NOT_GUILD_MEMBER')
  }
  return target
}

export async function promoteOfficer(meId: string, guildId: string, targetId: string) {
  const my = await requireGuildRole(meId, guildId, 'LEADER')
  const target = await requireTargetMember(guildId, targetId)
  if (target.role !== 'MEMBER') {
    throw new ApiError(400, 'Seul un membre peut être promu officier', 'INVALID_ROLE_CHANGE')
  }
  await prisma.guildMember.update({ where: { id: target.id }, data: { role: 'OFFICER' } })
  await notifyGuildEvent([targetId], 'GUILD_PROMOTED_OFFICER', guildData(my.guild))
}

export async function demoteOfficer(meId: string, guildId: string, targetId: string) {
  const my = await requireGuildRole(meId, guildId, 'LEADER')
  const target = await requireTargetMember(guildId, targetId)
  if (target.role !== 'OFFICER') {
    throw new ApiError(400, 'Ce joueur n’est pas officier', 'INVALID_ROLE_CHANGE')
  }
  await prisma.guildMember.update({ where: { id: target.id }, data: { role: 'MEMBER' } })
  await notifyGuildEvent([targetId], 'GUILD_DEMOTED_OFFICER', guildData(my.guild))
}

/** L'ancien chef reste dans la guilde, avec le rang d'officier. */
export async function transferLeadership(meId: string, guildId: string, targetId: string) {
  if (targetId === meId) {
    throw new ApiError(400, 'Tu es déjà le chef de cette guilde', 'INVALID_ROLE_CHANGE')
  }
  const my = await requireGuildRole(meId, guildId, 'LEADER')
  const target = await requireTargetMember(guildId, targetId)

  await prisma.$transaction([
    prisma.guildMember.update({ where: { id: target.id }, data: { role: 'LEADER' } }),
    prisma.guildMember.update({ where: { id: my.id }, data: { role: 'OFFICER' } }),
  ])
  await notifyGuildEvent([targetId], 'GUILD_LEADERSHIP_TRANSFERRED', guildData(my.guild))
}

/** Non-membres éligibles à une invitation, cherchés par pseudo (officier+). */
export async function searchInvitablePlayers(meId: string, guildId: string, q: string) {
  await requireGuildRole(meId, guildId, 'OFFICER')
  if (q.trim().length < 2) return []

  const candidates = await prisma.user.findMany({
    where: {
      username: { contains: q.trim(), mode: 'insensitive' },
      guildMembership: null, // jamais un joueur déjà en guilde
      id: { not: meId },
    },
    orderBy: { username: 'asc' },
    take: 10,
    select: { id: true, username: true, avatarUrl: true, level: true },
  })
  const invited = await prisma.guildInvitation.findMany({
    where: { guildId, inviteeId: { in: candidates.map((c) => c.id) } },
    select: { inviteeId: true },
  })
  const invitedIds = new Set(invited.map((i) => i.inviteeId))
  return candidates.map((c) => ({
    userId: c.id,
    username: c.username,
    avatarUrl: c.avatarUrl,
    level: c.level,
    alreadyInvited: invitedIds.has(c.id),
  }))
}
