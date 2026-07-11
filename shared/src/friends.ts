import type { PlanTier } from './subscriptions.js'

// ── Système d'amis ───────────────────────────────────────────

/**
 * Préférences de confidentialité du système d'amis (Paramètres → Confidentialité).
 * Stockées dans User.friendPrefs (Json, null = valeurs par défaut ci-dessous).
 * Elles sont respectées partout côté serveur : un réglage désactivé ne peut
 * pas être contourné par un client modifié.
 */
export interface FriendPrefs {
  /** Recevoir des demandes d'amis. */
  allowFriendRequests: boolean
  /** Apparaître dans la recherche par pseudo. */
  allowUsernameSearch: boolean
  /** Montrer aux amis le statut « En ligne ». */
  showOnlineStatus: boolean
  /** Montrer aux amis la dernière connexion. */
  showLastSeen: boolean
  /** Afficher les statistiques d'addictions sur le profil public. */
  showAddictionsPublicly: boolean
}

export const DEFAULT_FRIEND_PREFS: FriendPrefs = {
  allowFriendRequests: true,
  allowUsernameSearch: true,
  showOnlineStatus: true,
  showLastSeen: true,
  showAddictionsPublicly: true,
}

/** Relation entre moi et un joueur trouvé par la recherche. */
export type FriendRelationStatus = 'none' | 'friend' | 'pending_sent' | 'pending_received'

/** Carte joueur commune aux résultats de recherche et à la liste d'amis. */
export interface FriendPlayerCard {
  userId: string
  username: string
  avatarUrl: string | null
  level: number
  plan: PlanTier
}

export interface FriendSearchResult extends FriendPlayerCard {
  relation: FriendRelationStatus
  /** Id de la demande en attente (pour accepter/annuler directement), sinon null. */
  requestId: string | null
}

export interface FriendDto extends FriendPlayerCard {
  /** Depuis quand nous sommes amis. */
  friendsSince: string
  /** null si l'ami a masqué son statut en ligne. */
  online: boolean | null
  /** null si l'ami a masqué sa dernière connexion (ISO sinon). */
  lastSeenAt: string | null
}

export interface ReceivedFriendRequestDto {
  id: string
  sender: FriendPlayerCard
  createdAt: string
}

export interface SentFriendRequestDto {
  id: string
  receiver: FriendPlayerCard
  createdAt: string
}

export interface FriendsListResponse {
  friends: FriendDto[]
}

export interface FriendRequestsResponse {
  received: ReceivedFriendRequestDto[]
  sent: SentFriendRequestDto[]
}

export interface FriendSearchResponse {
  results: FriendSearchResult[]
}

// ── Notifications (centre de notifications à venir) ─────────

export type NotificationKind =
  | 'FRIEND_REQUEST_RECEIVED'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'FRIEND_REQUEST_DECLINED'

export interface NotificationDto {
  id: string
  type: NotificationKind
  /** Charge utile libre selon le type ({ fromUserId, fromUsername… }). */
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

export interface NotificationsResponse {
  notifications: NotificationDto[]
  unreadCount: number
}
