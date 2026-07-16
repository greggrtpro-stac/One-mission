import {
  computeGuildScore,
  DEFAULT_GUILD_COLOR,
  DEFAULT_GUILD_ICON,
  GUILD_MAX_MEMBERS,
  type CreateGuildPayload,
  type GuildBadgeDto,
  type GuildDto,
  type GuildJoinRequestDto,
  type GuildLeaderboardEntry,
  type GuildLeaderboardResponse,
  type GuildMemberDto,
  type GuildRelation,
  type GuildRole,
  type GuildStatsResponse,
  type MyGuildResponse,
  type UpdateGuildPayload,
} from '@one-mission/shared'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'

/**
 * Cœur du système de guildes : agrégats, classement, fiche, CRUD et
 * statistiques. La gestion des membres (adhésions, rôles, invitations) vit
 * dans guild-membership.service.ts, le chat dans guild-chat.service.ts.
 */

// ── Helpers partagés (membres, rôles, notifications) ─────────

const ROLE_RANK: Record<GuildRole, number> = { LEADER: 3, OFFICER: 2, MEMBER: 1 }

export function roleAtLeast(role: GuildRole, min: GuildRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

/** Appartenance du joueur (avec sa guilde), ou null s'il n'en a pas. */
export function getMembership(userId: string) {
  return prisma.guildMember.findUnique({
    where: { userId },
    include: { guild: true },
  })
}

export async function requireMembership(userId: string) {
  const membership = await getMembership(userId)
  if (!membership) throw new ApiError(404, "Tu n'appartiens à aucune guilde", 'NO_GUILD')
  return membership
}

/** Vérifie que le joueur est membre de CETTE guilde avec le rôle minimum requis. */
export async function requireGuildRole(userId: string, guildId: string, min: GuildRole) {
  const membership = await requireMembership(userId)
  if (membership.guildId !== guildId) {
    throw new ApiError(403, "Tu n'es pas membre de cette guilde", 'NOT_GUILD_MEMBER')
  }
  if (!roleAtLeast(membership.role, min)) {
    throw new ApiError(403, 'Tu n’as pas les permissions nécessaires', 'GUILD_ROLE_REQUIRED')
  }
  return membership
}

type GuildNotificationType =
  | 'GUILD_INVITATION_RECEIVED'
  | 'GUILD_REQUEST_RECEIVED'
  | 'GUILD_REQUEST_ACCEPTED'
  | 'GUILD_REQUEST_DECLINED'
  | 'GUILD_MEMBER_JOINED'
  | 'GUILD_MEMBER_LEFT'
  | 'GUILD_PROMOTED_OFFICER'
  | 'GUILD_DEMOTED_OFFICER'
  | 'GUILD_LEADERSHIP_TRANSFERRED'
  | 'GUILD_KICKED'

/** Notifie plusieurs joueurs d'un événement de guilde (une ligne chacun). */
export async function notifyGuildEvent(
  userIds: string[],
  type: GuildNotificationType,
  data: Record<string, string | number | boolean | null>,
) {
  if (userIds.length === 0) return
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, type, data })),
  })
}

/** Ids du chef et des officiers (destinataires des événements de gestion). */
export async function guildOfficerIds(guildId: string, except?: string): Promise<string[]> {
  const rows = await prisma.guildMember.findMany({
    where: { guildId, role: { in: ['LEADER', 'OFFICER'] } },
    select: { userId: true },
  })
  return rows.map((r) => r.userId).filter((id) => id !== except)
}

export function badgeOf(guild: {
  id: string
  name: string
  icon: string
  color: string
}): GuildBadgeDto {
  return { id: guild.id, name: guild.name, icon: guild.icon, color: guild.color }
}

// ── Agrégats & classement ────────────────────────────────────

interface GuildRow {
  id: string
  name: string
  icon: string
  color: string
  minLevel: number
  isOpen: boolean
  maxMembers: number
  createdAt: Date
}

export interface GuildAggregate {
  guild: GuildRow
  memberCount: number
  avgLevel: number
  totalXp: number
  totalStreak: number
  questsDone: number
  score: number
  rank: number
}

/**
 * Calcule les totaux de toutes les guildes (3 requêtes, quel que soit leur
 * nombre) et les classe par Score global décroissant. Le rang est déterministe :
 * à score égal, la guilde la plus ancienne passe devant.
 */
export async function computeGuildLeaderboard(): Promise<GuildAggregate[]> {
  const [guilds, members] = await Promise.all([
    prisma.guild.findMany({
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        minLevel: true,
        isOpen: true,
        maxMembers: true,
        createdAt: true,
      },
    }),
    prisma.guildMember.findMany({
      select: {
        guildId: true,
        userId: true,
        user: { select: { level: true, totalXp: true, currentStreak: true } },
      },
    }),
  ])

  // Quêtes terminées, comptées comme sur le profil (statut DONE).
  const memberIds = members.map((m) => m.userId)
  const questCounts =
    memberIds.length > 0
      ? await prisma.quest.groupBy({
          by: ['userId'],
          where: { userId: { in: memberIds }, status: 'DONE' },
          _count: { _all: true },
        })
      : []
  const questsByUser = new Map(questCounts.map((q) => [q.userId, q._count._all]))

  const byGuild = new Map<string, typeof members>()
  for (const member of members) {
    const list = byGuild.get(member.guildId) ?? []
    list.push(member)
    byGuild.set(member.guildId, list)
  }

  const rows = guilds.map((guild) => {
    const guildMembers = byGuild.get(guild.id) ?? []
    const totalXp = guildMembers.reduce((sum, m) => sum + m.user.totalXp, 0)
    const totalStreak = guildMembers.reduce((sum, m) => sum + m.user.currentStreak, 0)
    const questsDone = guildMembers.reduce((sum, m) => sum + (questsByUser.get(m.userId) ?? 0), 0)
    const avgLevel =
      guildMembers.length > 0
        ? Math.round(
            (guildMembers.reduce((sum, m) => sum + m.user.level, 0) / guildMembers.length) * 10,
          ) / 10
        : 0
    return {
      guild,
      memberCount: guildMembers.length,
      avgLevel,
      totalXp,
      totalStreak,
      questsDone,
      score: computeGuildScore({ totalXp, questsDone, totalStreak }),
      rank: 0,
    }
  })

  rows.sort(
    (a, b) => b.score - a.score || a.guild.createdAt.getTime() - b.guild.createdAt.getTime(),
  )
  rows.forEach((row, i) => {
    row.rank = i + 1
  })

  // Instantané quotidien paresseux : la première consultation de la journée
  // fige les valeurs du jour pour les graphiques d'évolution (aucun cron).
  await snapshotToday(rows)

  return rows
}

/** Minuit UTC du jour courant — clé des instantanés (colonne @db.Date). */
function todayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

async function snapshotToday(rows: GuildAggregate[]) {
  if (rows.length === 0) return
  await prisma.guildStatistics.createMany({
    data: rows.map((row) => ({
      guildId: row.guild.id,
      date: todayUtc(),
      totalXp: row.totalXp,
      memberCount: row.memberCount,
      avgLevel: row.avgLevel,
      questsDone: row.questsDone,
      totalStreak: row.totalStreak,
      score: row.score,
      rank: row.rank,
    })),
    skipDuplicates: true,
  })
}

function toEntry(row: GuildAggregate, myGuildId: string | null): GuildLeaderboardEntry {
  return {
    ...badgeOf(row.guild),
    rank: row.rank,
    memberCount: row.memberCount,
    maxMembers: row.guild.maxMembers,
    avgLevel: row.avgLevel,
    totalXp: row.totalXp,
    totalStreak: row.totalStreak,
    questsDone: row.questsDone,
    score: row.score,
    minLevel: row.guild.minLevel,
    isOpen: row.guild.isOpen,
    isMine: row.guild.id === myGuildId,
  }
}

export async function getLeaderboard(meId: string): Promise<GuildLeaderboardResponse> {
  const [rows, membership] = await Promise.all([
    computeGuildLeaderboard(),
    prisma.guildMember.findUnique({ where: { userId: meId }, select: { guildId: true } }),
  ])
  const myGuildId = membership?.guildId ?? null
  return {
    entries: rows.map((row) => toEntry(row, myGuildId)),
    totalGuilds: rows.length,
    myGuildId,
  }
}

/** Recherche par nom (exact ou partiel, insensible à la casse), rang conservé. */
export async function searchGuilds(meId: string, q: string): Promise<GuildLeaderboardEntry[]> {
  const needle = q.trim().toLowerCase()
  if (needle.length === 0) return []
  const { entries } = await getLeaderboard(meId)
  return entries.filter((entry) => entry.name.toLowerCase().includes(needle)).slice(0, 20)
}

// ── Fiche d'une guilde ───────────────────────────────────────

const memberUserSelect = {
  id: true,
  username: true,
  avatarUrl: true,
  level: true,
  totalXp: true,
  currentStreak: true,
} as const

function sortMembers(a: GuildMemberDto, b: GuildMemberDto): number {
  return ROLE_RANK[b.role] - ROLE_RANK[a.role] || b.totalXp - a.totalXp
}

export async function getGuild(meId: string, guildId: string): Promise<GuildDto> {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: {
      members: { include: { user: { select: memberUserSelect } } },
    },
  })
  if (!guild) throw new ApiError(404, 'Guilde introuvable', 'GUILD_NOT_FOUND')

  const members: GuildMemberDto[] = guild.members
    .map((m) => ({
      userId: m.user.id,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      level: m.user.level,
      totalXp: m.user.totalXp,
      currentStreak: m.user.currentStreak,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    }))
    .sort(sortMembers)

  const leader = members.find((m) => m.role === 'LEADER') ?? null

  // Rang mondial + totaux — issus du même calcul que le classement affiché.
  const rows = await computeGuildLeaderboard()
  const row = rows.find((r) => r.guild.id === guildId)

  // Relation entre le joueur connecté et cette guilde (adapte les actions du client).
  const my = guild.members.find((m) => m.userId === meId)
  let relation: GuildRelation = { kind: 'none' }
  if (my) {
    relation = { kind: 'member', role: my.role }
  } else {
    const [request, invitation] = await Promise.all([
      prisma.guildJoinRequest.findUnique({
        where: { guildId_userId: { guildId, userId: meId } },
        select: { id: true },
      }),
      prisma.guildInvitation.findUnique({
        where: { guildId_inviteeId: { guildId, inviteeId: meId } },
        select: { id: true },
      }),
    ])
    if (invitation) relation = { kind: 'invited', invitationId: invitation.id }
    else if (request) relation = { kind: 'request_pending', requestId: request.id }
  }

  const memberCount = members.length
  return {
    ...badgeOf(guild),
    description: guild.description,
    minLevel: guild.minLevel,
    isOpen: guild.isOpen,
    maxMembers: guild.maxMembers,
    memberCount,
    createdAt: guild.createdAt.toISOString(),
    leader: leader
      ? { userId: leader.userId, username: leader.username, avatarUrl: leader.avatarUrl }
      : null,
    members,
    totals: {
      totalXp: row?.totalXp ?? 0,
      avgLevel: row?.avgLevel ?? 0,
      questsDone: row?.questsDone ?? 0,
      totalStreak: row?.totalStreak ?? 0,
      avgStreak:
        memberCount > 0 ? Math.round(((row?.totalStreak ?? 0) / memberCount) * 10) / 10 : 0,
      score: row?.score ?? 0,
    },
    rank: row?.rank ?? 0,
    totalGuilds: rows.length,
    relation,
  }
}

// ── Ma guilde ────────────────────────────────────────────────

export async function getMyGuild(meId: string): Promise<MyGuildResponse> {
  const membership = await getMembership(meId)
  if (!membership) {
    // Sans guilde : le joueur voit (et peut annuler) ses demandes en attente.
    const myRequests = await prisma.guildJoinRequest.findMany({
      where: { userId: meId },
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
      },
    })
    return {
      guild: null,
      joinRequests: [],
      unreadMessages: 0,
      myRequests: myRequests.map((r) => ({
        id: r.id,
        guild: {
          id: r.guild.id,
          name: r.guild.name,
          icon: r.guild.icon,
          color: r.guild.color,
          memberCount: r.guild._count.members,
          maxMembers: r.guild.maxMembers,
        },
        createdAt: r.createdAt.toISOString(),
      })),
    }
  }

  const [guild, unreadMessages, joinRequests] = await Promise.all([
    getGuild(meId, membership.guildId),
    prisma.guildMessage.count({
      where: {
        guildId: membership.guildId,
        createdAt: { gt: membership.lastReadAt },
        NOT: { authorId: meId },
      },
    }),
    // Les demandes en attente ne sont visibles que du chef et des officiers.
    roleAtLeast(membership.role, 'OFFICER')
      ? prisma.guildJoinRequest.findMany({
          where: { guildId: membership.guildId },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, level: true } },
          },
        })
      : Promise.resolve([]),
  ])

  const requests: GuildJoinRequestDto[] = joinRequests.map((r) => ({
    id: r.id,
    user: {
      userId: r.user.id,
      username: r.user.username,
      avatarUrl: r.user.avatarUrl,
      level: r.user.level,
    },
    message: r.message,
    createdAt: r.createdAt.toISOString(),
  }))

  return { guild, joinRequests: requests, unreadMessages, myRequests: [] }
}

// ── Création / modification / suppression ────────────────────

/** Refuse un nom déjà pris, sans tenir compte de la casse ni des espaces. */
async function assertNameAvailable(name: string, exceptGuildId?: string) {
  const existing = await prisma.guild.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  })
  if (existing && existing.id !== exceptGuildId) {
    throw new ApiError(409, 'Ce nom de guilde est déjà pris', 'GUILD_NAME_TAKEN')
  }
}

export async function createGuild(meId: string, payload: CreateGuildPayload): Promise<GuildDto> {
  const existing = await getMembership(meId)
  if (existing) {
    throw new ApiError(409, 'Tu appartiens déjà à une guilde', 'ALREADY_IN_GUILD')
  }
  await assertNameAvailable(payload.name)

  const guild = await prisma.guild.create({
    data: {
      name: payload.name,
      description: payload.description || null,
      icon: payload.icon ?? DEFAULT_GUILD_ICON,
      color: payload.color ?? DEFAULT_GUILD_COLOR,
      minLevel: payload.minLevel ?? 1,
      isOpen: payload.isOpen ?? true,
      maxMembers: GUILD_MAX_MEMBERS,
      // Le créateur devient automatiquement le chef.
      members: { create: { userId: meId, role: 'LEADER' } },
    },
  })

  // Rejoindre une guilde annule mes candidatures et invitations ailleurs.
  await cleanupPendingForUser(meId)

  return getGuild(meId, guild.id)
}

export async function updateGuild(
  meId: string,
  guildId: string,
  payload: UpdateGuildPayload,
): Promise<GuildDto> {
  await requireGuildRole(meId, guildId, 'LEADER')
  if (payload.name !== undefined) await assertNameAvailable(payload.name, guildId)

  await prisma.guild.update({
    where: { id: guildId },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      ...(payload.icon !== undefined ? { icon: payload.icon } : {}),
      ...(payload.color !== undefined ? { color: payload.color } : {}),
      ...(payload.minLevel !== undefined ? { minLevel: payload.minLevel } : {}),
      ...(payload.isOpen !== undefined ? { isOpen: payload.isOpen } : {}),
    },
  })
  return getGuild(meId, guildId)
}

export async function deleteGuild(meId: string, guildId: string): Promise<void> {
  await requireGuildRole(meId, guildId, 'LEADER')
  // Cascade : membres, invitations, demandes, messages et statistiques.
  await prisma.guild.delete({ where: { id: guildId } })
}

/** Purge les demandes et invitations d'un joueur qui vient de rejoindre une guilde. */
export async function cleanupPendingForUser(userId: string) {
  await prisma.$transaction([
    prisma.guildJoinRequest.deleteMany({ where: { userId } }),
    prisma.guildInvitation.deleteMany({ where: { inviteeId: userId } }),
  ])
}

// ── Suppression de compte ────────────────────────────────────

/**
 * Appelé AVANT la suppression d'un compte : une guilde ne doit jamais rester
 * sans chef. Le chef sortant transmet automatiquement à l'officier le plus
 * ancien (à défaut, au membre le plus ancien) ; s'il était seul, la guilde
 * disparaît avec lui.
 */
export async function handleAccountDeletion(userId: string): Promise<void> {
  const membership = await getMembership(userId)
  if (!membership || membership.role !== 'LEADER') return

  // Héritier : l'officier le plus ancien, à défaut le membre le plus ancien.
  const heir =
    (await prisma.guildMember.findFirst({
      where: { guildId: membership.guildId, userId: { not: userId }, role: 'OFFICER' },
      orderBy: { joinedAt: 'asc' },
      select: { id: true, userId: true },
    })) ??
    (await prisma.guildMember.findFirst({
      where: { guildId: membership.guildId, userId: { not: userId } },
      orderBy: { joinedAt: 'asc' },
      select: { id: true, userId: true },
    }))

  if (!heir) {
    await prisma.guild.delete({ where: { id: membership.guildId } })
    return
  }

  await prisma.guildMember.update({ where: { id: heir.id }, data: { role: 'LEADER' } })
  await notifyGuildEvent([heir.userId], 'GUILD_LEADERSHIP_TRANSFERRED', {
    guildId: membership.guildId,
    guildName: membership.guild.name,
    guildIcon: membership.guild.icon,
    guildColor: membership.guild.color,
  })
}

// ── Statistiques de guilde ───────────────────────────────────

/** Lundi (heure locale serveur) de la semaine du jour donné. */
function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // 0 = lundi
  d.setDate(d.getDate() - day)
  return d
}

function localDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const HISTORY_DAYS = 90
const WEEKS_COUNT = 12

export async function getGuildStats(meId: string, guildId: string): Promise<GuildStatsResponse> {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { id: true, name: true, icon: true, color: true },
  })
  if (!guild) throw new ApiError(404, 'Guilde introuvable', 'GUILD_NOT_FOUND')

  // Garantit l'instantané du jour avant de lire l'historique.
  await computeGuildLeaderboard()

  const historyStart = new Date(Date.now() - HISTORY_DAYS * 86_400_000)
  const weeksStart = mondayOf(new Date(Date.now() - (WEEKS_COUNT - 1) * 7 * 86_400_000))

  const [snapshots, members] = await Promise.all([
    prisma.guildStatistics.findMany({
      where: { guildId, date: { gte: historyStart } },
      orderBy: { date: 'asc' },
    }),
    prisma.guildMember.findMany({
      where: { guildId },
      select: { userId: true, user: { select: { currentStreak: true, longestStreak: true } } },
    }),
  ])
  const memberIds = members.map((m) => m.userId)

  const [quests, focus, addictions] = await Promise.all([
    memberIds.length > 0
      ? prisma.quest.findMany({
          where: { userId: { in: memberIds }, status: 'DONE', completedAt: { gte: weeksStart } },
          select: { completedAt: true },
        })
      : Promise.resolve([]),
    memberIds.length > 0
      ? prisma.deepWorkSession.aggregate({
          where: { userId: { in: memberIds }, kind: 'FOCUS' },
          _sum: { duration: true },
        })
      : Promise.resolve({ _sum: { duration: null } }),
    memberIds.length > 0
      ? prisma.addiction.findMany({
          where: { userId: { in: memberIds } },
          select: { startDate: true },
        })
      : Promise.resolve([]),
  ])

  // Quêtes terminées par semaine (12 semaines, même découpage que le profil).
  const weekIndex = new Map<string, { weekStart: string; questsDone: number }>()
  const weeks: { weekStart: string; questsDone: number }[] = []
  for (let i = 0; i < WEEKS_COUNT; i++) {
    const monday = new Date(
      weeksStart.getFullYear(),
      weeksStart.getMonth(),
      weeksStart.getDate() + i * 7,
    )
    const stat = { weekStart: localDayKey(monday), questsDone: 0 }
    weeks.push(stat)
    weekIndex.set(stat.weekStart, stat)
  }
  for (const quest of quests) {
    if (!quest.completedAt) continue
    const stat = weekIndex.get(localDayKey(mondayOf(quest.completedAt)))
    if (stat) stat.questsDone += 1
  }

  // Jours sans rechute cumulés (série en cours de chaque addiction suivie).
  const now = Date.now()
  const cleanDaysTotal = addictions.reduce(
    (sum, a) => sum + Math.max(0, Math.floor((now - a.startDate.getTime()) / 86_400_000)),
    0,
  )

  return {
    guild: badgeOf(guild),
    history: snapshots.map((s) => ({
      date: s.date.toISOString().slice(0, 10),
      totalXp: s.totalXp,
      memberCount: s.memberCount,
      rank: s.rank,
      score: s.score,
    })),
    weeks,
    totals: {
      focusSeconds: focus._sum.duration ?? 0,
      addictionsCount: addictions.length,
      cleanDaysTotal,
      totalStreak: members.reduce((sum, m) => sum + m.user.currentStreak, 0),
      bestStreak: members.reduce((max, m) => Math.max(max, m.user.longestStreak), 0),
    },
  }
}
