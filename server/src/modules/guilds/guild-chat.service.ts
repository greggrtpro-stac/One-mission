import type { GuildMessageDto, GuildMessagesResponse } from '@one-mission/shared'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'
import { requireGuildRole } from './guilds.service.js'

/**
 * Chat privé de la guilde. « Temps réel » par interrogation courte côté
 * client (react-query refetchInterval) : aucune infrastructure WebSocket à
 * déployer, et le comportement reste identique derrière n'importe quel proxy.
 */

const PAGE_SIZE = 50
const EXCERPT_LENGTH = 120

type MessageRow = {
  id: string
  content: string
  createdAt: Date
  author: { id: string; username: string; avatarUrl: string | null } | null
  replyTo: {
    id: string
    content: string
    author: { username: string } | null
  } | null
}

const messageInclude = {
  author: { select: { id: true, username: true, avatarUrl: true } },
  replyTo: {
    select: { id: true, content: true, author: { select: { username: true } } },
  },
} as const

function toDto(row: MessageRow, meId: string, iAmLeader: boolean): GuildMessageDto {
  return {
    id: row.id,
    author: row.author
      ? { userId: row.author.id, username: row.author.username, avatarUrl: row.author.avatarUrl }
      : null,
    content: row.content,
    replyTo: row.replyTo
      ? {
          id: row.replyTo.id,
          username: row.replyTo.author?.username ?? null,
          excerpt:
            row.replyTo.content.length > EXCERPT_LENGTH
              ? `${row.replyTo.content.slice(0, EXCERPT_LENGTH)}…`
              : row.replyTo.content,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    // Chacun supprime ses propres messages ; le chef peut supprimer n'importe lequel.
    canDelete: iAmLeader || row.author?.id === meId,
  }
}

/**
 * Messages du chat, du plus ancien au plus récent. `before` pagine vers le
 * haut (messages plus anciens que l'id donné) ; sans curseur, la dernière page.
 */
export async function listMessages(
  meId: string,
  guildId: string,
  before?: string,
): Promise<GuildMessagesResponse> {
  const my = await requireGuildRole(meId, guildId, 'MEMBER')

  const rows = await prisma.guildMessage.findMany({
    where: { guildId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    include: messageInclude,
  })

  const hasMore = rows.length > PAGE_SIZE
  const page = rows.slice(0, PAGE_SIZE).reverse()
  const iAmLeader = my.role === 'LEADER'

  return {
    messages: page.map((row) => toDto(row, meId, iAmLeader)),
    oldestId: page[0]?.id ?? null,
    hasMore,
  }
}

export async function postMessage(
  meId: string,
  guildId: string,
  content: string,
  replyToId?: string,
): Promise<GuildMessageDto> {
  const my = await requireGuildRole(meId, guildId, 'MEMBER')

  if (replyToId) {
    const target = await prisma.guildMessage.findUnique({
      where: { id: replyToId },
      select: { guildId: true },
    })
    // Jamais de citation inter-guildes : le message cité doit venir du même chat.
    if (!target || target.guildId !== guildId) {
      throw new ApiError(404, 'Message cité introuvable', 'MESSAGE_NOT_FOUND')
    }
  }

  const row = await prisma.guildMessage.create({
    data: { guildId, authorId: meId, content, replyToId: replyToId ?? null },
    include: messageInclude,
  })

  // Écrire dans le chat vaut lecture de ce qui précède.
  await prisma.guildMember.update({ where: { id: my.id }, data: { lastReadAt: new Date() } })

  return toDto(row, meId, my.role === 'LEADER')
}

export async function deleteMessage(
  meId: string,
  guildId: string,
  messageId: string,
): Promise<void> {
  const my = await requireGuildRole(meId, guildId, 'MEMBER')
  const message = await prisma.guildMessage.findUnique({
    where: { id: messageId },
    select: { guildId: true, authorId: true },
  })
  if (!message || message.guildId !== guildId) {
    throw new ApiError(404, 'Message introuvable', 'MESSAGE_NOT_FOUND')
  }
  if (message.authorId !== meId && my.role !== 'LEADER') {
    throw new ApiError(403, 'Tu ne peux supprimer que tes propres messages', 'FORBIDDEN')
  }
  await prisma.guildMessage.delete({ where: { id: messageId } })
}

/** Marque le chat comme lu (remet le compteur de non-lus à zéro). */
export async function markRead(meId: string, guildId: string): Promise<void> {
  const my = await requireGuildRole(meId, guildId, 'MEMBER')
  await prisma.guildMember.update({ where: { id: my.id }, data: { lastReadAt: new Date() } })
}
