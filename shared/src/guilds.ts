// ── Guildes ──────────────────────────────────────────────────

/** Taille maximale d'une guilde (valeur par défaut de Guild.maxMembers). */
export const GUILD_MAX_MEMBERS = 20

/** Couleur par défaut d'une nouvelle guilde — le violet One Mission. */
export const DEFAULT_GUILD_COLOR = '#8B5CF6'

/** Emoji par défaut d'une nouvelle guilde. */
export const DEFAULT_GUILD_ICON = '🛡️'

export type GuildRole = 'LEADER' | 'OFFICER' | 'MEMBER'

export const GUILD_ROLE_LABELS: Record<GuildRole, string> = {
  LEADER: 'Chef',
  OFFICER: 'Officier',
  MEMBER: 'Membre',
}

/**
 * Pondération du Score global d'une guilde, calculé côté serveur à partir des
 * totaux de ses membres : XP totale + quêtes terminées + série cumulée.
 * Une seule définition, partagée, pour que le client puisse l'expliquer.
 */
export const GUILD_SCORE_WEIGHTS = {
  xp: 1,
  questsDone: 20,
  streak: 30,
} as const

export function computeGuildScore(totals: {
  totalXp: number
  questsDone: number
  totalStreak: number
}): number {
  return (
    totals.totalXp * GUILD_SCORE_WEIGHTS.xp +
    totals.questsDone * GUILD_SCORE_WEIGHTS.questsDone +
    totals.totalStreak * GUILD_SCORE_WEIGHTS.streak
  )
}

// ── Cartes & fiches ──────────────────────────────────────────

/** Identité visuelle minimale d'une guilde (badge du profil, lignes de listes). */
export interface GuildBadgeDto {
  id: string
  name: string
  icon: string
  color: string
}

/** Ligne du classement des guildes (et des résultats de recherche). */
export interface GuildLeaderboardEntry extends GuildBadgeDto {
  rank: number
  memberCount: number
  maxMembers: number
  avgLevel: number
  totalXp: number
  totalStreak: number
  questsDone: number
  score: number
  minLevel: number
  isOpen: boolean
  /** Vraie pour la guilde du joueur connecté. */
  isMine: boolean
}

export interface GuildLeaderboardResponse {
  entries: GuildLeaderboardEntry[]
  totalGuilds: number
  /** Id de ma guilde, ou null — permet au client d'adapter les actions. */
  myGuildId: string | null
}

export interface GuildSearchResponse {
  results: GuildLeaderboardEntry[]
}

/** Membre affiché sur une fiche de guilde. */
export interface GuildMemberDto {
  userId: string
  username: string
  avatarUrl: string | null
  level: number
  totalXp: number
  currentStreak: number
  role: GuildRole
  joinedAt: string
}

/** Relation entre le joueur connecté et une guilde consultée. */
export type GuildRelation =
  | { kind: 'member'; role: GuildRole }
  | { kind: 'request_pending'; requestId: string }
  | { kind: 'invited'; invitationId: string }
  | { kind: 'none' }

/** Fiche complète d'une guilde (page publique + page « Ma guilde »). */
export interface GuildDto extends GuildBadgeDto {
  description: string | null
  minLevel: number
  isOpen: boolean
  maxMembers: number
  memberCount: number
  createdAt: string
  leader: { userId: string; username: string; avatarUrl: string | null } | null
  members: GuildMemberDto[]
  /** Statistiques agrégées des membres actuels. */
  totals: {
    totalXp: number
    avgLevel: number
    questsDone: number
    avgStreak: number
    totalStreak: number
    score: number
  }
  /** Rang mondial de la guilde (classement par score). */
  rank: number
  totalGuilds: number
  relation: GuildRelation
}

export interface GuildResponse {
  guild: GuildDto
}

/** Demande d'adhésion que J'AI envoyée (affichée tant que je n'ai pas de guilde). */
export interface MyGuildRequestDto {
  id: string
  guild: GuildBadgeDto & { memberCount: number; maxMembers: number }
  createdAt: string
}

/** Ma guilde — null si le joueur n'en a pas. Enrichie des données de gestion. */
export interface MyGuildResponse {
  guild: GuildDto | null
  /** Demandes d'adhésion en attente — présentes uniquement pour chef/officier. */
  joinRequests: GuildJoinRequestDto[]
  /** Messages du chat non lus depuis ma dernière lecture. */
  unreadMessages: number
  /** Mes demandes en attente (renseignées uniquement sans guilde). */
  myRequests: MyGuildRequestDto[]
}

export interface GuildJoinRequestDto {
  id: string
  user: { userId: string; username: string; avatarUrl: string | null; level: number }
  message: string | null
  createdAt: string
}

/** Invitation reçue par le joueur connecté. */
export interface GuildInvitationDto {
  id: string
  guild: GuildBadgeDto & { memberCount: number; maxMembers: number }
  inviter: { userId: string; username: string }
  createdAt: string
}

export interface GuildInvitationsResponse {
  invitations: GuildInvitationDto[]
}

// ── Chat ─────────────────────────────────────────────────────

export const GUILD_MESSAGE_MAX_LENGTH = 1000

export interface GuildMessageDto {
  id: string
  author: { userId: string; username: string; avatarUrl: string | null } | null
  content: string
  /** Extrait du message cité, ou null (message libre ou citation supprimée). */
  replyTo: { id: string; username: string | null; excerpt: string } | null
  createdAt: string
  /** Le joueur connecté peut-il supprimer ce message (le sien, ou chef). */
  canDelete: boolean
}

export interface GuildMessagesResponse {
  messages: GuildMessageDto[]
  /** Curseur : id du message le plus ancien retourné (pagination vers le haut). */
  oldestId: string | null
  hasMore: boolean
}

// ── Statistiques de guilde ───────────────────────────────────

/** Point quotidien des graphiques d'évolution (date YYYY-MM-DD). */
export interface GuildStatPoint {
  date: string
  totalXp: number
  memberCount: number
  rank: number
  score: number
}

/** Quêtes terminées par la guilde sur une semaine (lundi YYYY-MM-DD). */
export interface GuildWeekPoint {
  weekStart: string
  questsDone: number
}

export interface GuildStatsResponse {
  guild: GuildBadgeDto
  /** Instantanés quotidiens, du plus ancien au plus récent (90 jours max). */
  history: GuildStatPoint[]
  /** 12 dernières semaines de quêtes terminées par les membres actuels. */
  weeks: GuildWeekPoint[]
  totals: {
    /** Temps DeepWork cumulé des membres actuels (secondes). */
    focusSeconds: number
    /** Addictions suivies par les membres (« combattues »). */
    addictionsCount: number
    /** Jours cumulés sans rechute, toutes addictions des membres confondues. */
    cleanDaysTotal: number
    /** Somme des séries d'activité en cours des membres. */
    totalStreak: number
    /** Meilleure série d'activité parmi les membres. */
    bestStreak: number
  }
}

// ── Payloads ─────────────────────────────────────────────────

export interface CreateGuildPayload {
  name: string
  description?: string
  icon?: string
  color?: string
  minLevel?: number
  isOpen?: boolean
}

export type UpdateGuildPayload = Partial<CreateGuildPayload>

/** Résultat d'une tentative de rejoindre : direct ou demande en attente. */
export interface JoinGuildResult {
  status: 'joined' | 'requested'
}
