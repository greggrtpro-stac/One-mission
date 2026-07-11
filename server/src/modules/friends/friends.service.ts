import {
  DEFAULT_FRIEND_PREFS,
  type FriendDto,
  type FriendPlayerCard,
  type FriendPrefs,
  type FriendRelationStatus,
  type FriendSearchResult,
  type PlanTier,
  type ReceivedFriendRequestDto,
  type SentFriendRequestDto,
} from '@one-mission/shared'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'

/** Fenêtre de présence : « En ligne » = activité dans les 5 dernières minutes. */
const ONLINE_WINDOW_MS = 5 * 60_000
const SEARCH_RESULTS_MAX = 20

/** Champs publics nécessaires à une carte joueur (jamais d'e-mail ni de nom réel). */
const cardSelect = {
  id: true,
  username: true,
  avatarUrl: true,
  level: true,
  friendPrefs: true,
  lastSeenAt: true,
  subscription: { select: { plan: true, status: true } },
} as const

type CardRow = {
  id: string
  username: string
  avatarUrl: string | null
  level: number
  friendPrefs: unknown
  lastSeenAt: Date | null
  subscription: { plan: PlanTier; status: string } | null
}

function prefsOf(raw: unknown): FriendPrefs {
  return { ...DEFAULT_FRIEND_PREFS, ...((raw ?? {}) as Partial<FriendPrefs>) }
}

/** Offre effective affichée sur les cartes (même règle que getEffectivePlan, sans effet de bord). */
function planOf(sub: CardRow['subscription']): PlanTier {
  if (!sub) return 'STARTER'
  return sub.status === 'ACTIVE' || sub.status === 'TRIALING' ? sub.plan : 'STARTER'
}

function toCard(row: CardRow): FriendPlayerCard {
  return {
    userId: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl,
    level: row.level,
    plan: planOf(row.subscription),
  }
}

/**
 * Une amitié = une seule ligne : la paire est toujours stockée dans l'ordre
 * lexicographique (userAId < userBId), le doublon (B, A) est donc impossible.
 */
function orderedPair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a }
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const pair = orderedPair(a, b)
  const found = await prisma.friendship.findUnique({
    where: { userAId_userBId: pair },
    select: { id: true },
  })
  return found !== null
}

function notifyFriendEvent(
  userId: string,
  type: 'FRIEND_REQUEST_RECEIVED' | 'FRIEND_REQUEST_ACCEPTED' | 'FRIEND_REQUEST_DECLINED',
  from: { id: string; username: string },
) {
  return prisma.notification.create({
    data: { userId, type, data: { fromUserId: from.id, fromUsername: from.username } },
  })
}

// ── Liste d'amis ─────────────────────────────────────────────

export async function listFriends(meId: string): Promise<FriendDto[]> {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userAId: meId }, { userBId: meId }] },
    include: { userA: { select: cardSelect }, userB: { select: cardSelect } },
  })

  const now = Date.now()
  return rows
    .map((row) => {
      const other = row.userAId === meId ? row.userB : row.userA
      const prefs = prefsOf(other.friendPrefs)
      return {
        ...toCard(other),
        friendsSince: row.createdAt.toISOString(),
        // Confidentialité : statut et dernière connexion respectent le choix de l'AMI.
        online: prefs.showOnlineStatus
          ? other.lastSeenAt !== null && now - other.lastSeenAt.getTime() < ONLINE_WINDOW_MS
          : null,
        lastSeenAt: prefs.showLastSeen ? (other.lastSeenAt?.toISOString() ?? null) : null,
      }
    })
    .sort((a, b) => a.username.localeCompare(b.username, 'fr'))
}

// ── Recherche par pseudo ─────────────────────────────────────

export async function searchPlayers(meId: string, q: string): Promise<FriendSearchResult[]> {
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: meId }, // jamais soi-même
      username: { contains: q, mode: 'insensitive' },
    },
    orderBy: { username: 'asc' },
    take: SEARCH_RESULTS_MAX + 10, // marge : certains seront filtrés par leurs préférences
    select: cardSelect,
  })

  // Confidentialité : les joueurs qui refusent la recherche n'apparaissent jamais.
  const visible = candidates
    .filter((row) => prefsOf(row.friendPrefs).allowUsernameSearch)
    .slice(0, SEARCH_RESULTS_MAX)
  if (visible.length === 0) return []

  const ids = visible.map((row) => row.id)
  const [friendships, requests] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        OR: [
          { userAId: meId, userBId: { in: ids } },
          { userBId: meId, userAId: { in: ids } },
        ],
      },
      select: { userAId: true, userBId: true },
    }),
    prisma.friendRequest.findMany({
      where: {
        OR: [
          { senderId: meId, receiverId: { in: ids } },
          { receiverId: meId, senderId: { in: ids } },
        ],
      },
      select: { id: true, senderId: true, receiverId: true },
    }),
  ])

  const friendIds = new Set(friendships.map((f) => (f.userAId === meId ? f.userBId : f.userAId)))
  const sentTo = new Map(requests.filter((r) => r.senderId === meId).map((r) => [r.receiverId, r.id]))
  const receivedFrom = new Map(
    requests.filter((r) => r.receiverId === meId).map((r) => [r.senderId, r.id]),
  )

  return visible.map((row) => {
    let relation: FriendRelationStatus = 'none'
    let requestId: string | null = null
    if (friendIds.has(row.id)) relation = 'friend'
    else if (sentTo.has(row.id)) [relation, requestId] = ['pending_sent', sentTo.get(row.id)!]
    else if (receivedFrom.has(row.id))
      [relation, requestId] = ['pending_received', receivedFrom.get(row.id)!]
    return { ...toCard(row), relation, requestId }
  })
}

// ── Demandes ─────────────────────────────────────────────────

export async function listRequests(
  meId: string,
): Promise<{ received: ReceivedFriendRequestDto[]; sent: SentFriendRequestDto[] }> {
  const [received, sent] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { receiverId: meId },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: cardSelect } },
    }),
    prisma.friendRequest.findMany({
      where: { senderId: meId },
      orderBy: { createdAt: 'desc' },
      include: { receiver: { select: cardSelect } },
    }),
  ])
  return {
    received: received.map((r) => ({
      id: r.id,
      sender: toCard(r.sender),
      createdAt: r.createdAt.toISOString(),
    })),
    sent: sent.map((r) => ({
      id: r.id,
      receiver: toCard(r.receiver),
      createdAt: r.createdAt.toISOString(),
    })),
  }
}

/**
 * Envoie une demande d'ami. Toutes les règles sont appliquées ICI, côté
 * serveur : pas de demande à soi-même, pas de doublon, pas de demande à un
 * ami existant, et respect du choix « ne pas recevoir de demandes ».
 * Cas croisé : si la cible m'avait déjà envoyé une demande, l'intention est
 * mutuelle — la demande inverse est acceptée au lieu d'en créer une seconde.
 */
export async function sendRequest(
  meId: string,
  targetId: string,
): Promise<{ status: 'pending' | 'accepted' }> {
  if (targetId === meId) {
    throw new ApiError(400, "Tu ne peux pas t'ajouter toi-même", 'SELF_FRIEND_REQUEST')
  }

  const [me, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: meId }, select: { id: true, username: true } }),
    prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, username: true, friendPrefs: true },
    }),
  ])
  if (!me) throw new ApiError(401, 'Authentification requise', 'UNAUTHENTICATED')
  if (!target) throw new ApiError(404, 'Joueur introuvable', 'USER_NOT_FOUND')

  if (!prefsOf(target.friendPrefs).allowFriendRequests) {
    throw new ApiError(403, "Ce joueur n'accepte pas les demandes d'amis", 'REQUESTS_DISABLED')
  }

  if (await areFriends(meId, targetId)) {
    throw new ApiError(409, 'Vous êtes déjà amis', 'ALREADY_FRIENDS')
  }

  const reverse = await prisma.friendRequest.findUnique({
    where: { senderId_receiverId: { senderId: targetId, receiverId: meId } },
  })
  if (reverse) {
    await acceptRequestRow(reverse.id, meId, me)
    return { status: 'accepted' }
  }

  try {
    await prisma.friendRequest.create({ data: { senderId: meId, receiverId: targetId } })
  } catch (err) {
    // Contrainte d'unicité (senderId, receiverId) : demande déjà en attente.
    if ((err as { code?: string }).code === 'P2002') {
      throw new ApiError(409, 'Demande déjà envoyée à ce joueur', 'REQUEST_EXISTS')
    }
    throw err
  }
  await notifyFriendEvent(targetId, 'FRIEND_REQUEST_RECEIVED', me)
  return { status: 'pending' }
}

/** Cœur de l'acceptation, partagé entre accept() et le cas croisé de sendRequest(). */
async function acceptRequestRow(
  requestId: string,
  accepterId: string,
  accepter: { id: string; username: string },
) {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } })
  if (!request || request.receiverId !== accepterId) {
    throw new ApiError(404, 'Demande introuvable', 'REQUEST_NOT_FOUND')
  }

  const pair = orderedPair(request.senderId, request.receiverId)
  await prisma.$transaction([
    // upsert : idempotent si l'amitié existait déjà (course entre deux clics).
    prisma.friendship.upsert({
      where: { userAId_userBId: pair },
      create: pair,
      update: {},
    }),
    prisma.friendRequest.delete({ where: { id: requestId } }),
  ])
  await notifyFriendEvent(request.senderId, 'FRIEND_REQUEST_ACCEPTED', accepter)
}

export async function acceptRequest(meId: string, requestId: string): Promise<void> {
  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: { id: true, username: true },
  })
  if (!me) throw new ApiError(401, 'Authentification requise', 'UNAUTHENTICATED')
  await acceptRequestRow(requestId, meId, me)
}

export async function declineRequest(meId: string, requestId: string): Promise<void> {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } })
  if (!request || request.receiverId !== meId) {
    throw new ApiError(404, 'Demande introuvable', 'REQUEST_NOT_FOUND')
  }
  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: { id: true, username: true },
  })
  await prisma.friendRequest.delete({ where: { id: requestId } })
  if (me) await notifyFriendEvent(request.senderId, 'FRIEND_REQUEST_DECLINED', me)
}

/** Annulation par l'expéditeur — sans notification (la cible n'a rien à savoir). */
export async function cancelRequest(meId: string, requestId: string): Promise<void> {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } })
  if (!request || request.senderId !== meId) {
    throw new ApiError(404, 'Demande introuvable', 'REQUEST_NOT_FOUND')
  }
  await prisma.friendRequest.delete({ where: { id: requestId } })
}

export async function removeFriend(meId: string, otherId: string): Promise<void> {
  const pair = orderedPair(meId, otherId)
  const { count } = await prisma.friendship.deleteMany({ where: pair })
  if (count === 0) throw new ApiError(404, "Ce joueur n'est pas dans tes amis", 'NOT_FRIENDS')
}
