import type { Addiction, CoachMessage, Relapse } from '../../generated/prisma/client.js'
import { anthropic, CLAUDE_MODEL } from '../../lib/claude.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../middleware/error.js'

const DAY_MS = 24 * 60 * 60 * 1000

/** Fenêtre d'historique envoyée au modèle (le fil complet reste en base). */
const HISTORY_WINDOW = 30

const SYSTEM_PROMPT = `Tu es le coach anti-addiction de One Mission, une application de développement personnel gamifiée. Tu accompagnes un joueur qui essaie de se libérer d'une addiction précise. Tu parles français et tu tutoies.

Ta mission :
- comprendre sa situation et identifier ses déclencheurs (stress, ennui, habitudes, environnement, entourage, moments de la journée…) ;
- proposer un plan d'action personnalisé et des objectifs progressifs, jamais irréalistes ;
- donner des conseils concrets, applicables aujourd'hui même ;
- proposer des habitudes de remplacement adaptées à SON addiction ;
- enseigner des techniques de gestion des envies (respiration, ancrage, activité physique, distraction, report de 10 minutes…) ;
- l'encourager en t'appuyant sur ses chiffres réels (série en cours, record, paliers) ;
- quand il le demande, proposer un défi du jour ou dresser un bilan hebdomadaire de ses progrès à partir des données du contexte.

En cas de rechute : ne juge JAMAIS. Rappelle que la rechute fait partie du processus de changement, aide à identifier objectivement ce qui l'a déclenchée, puis propose un plan concret pour la prochaine fois. Valorise la série perdue comme une preuve de capacité, pas comme un échec.

Règles de forme :
- réponds en 120 mots maximum, sauf pour un plan d'action ou un bilan (300 mots max) ;
- une seule question à la fois ;
- pas de jargon médical, pas de morale ;
- appuie-toi sur le bloc <contexte> (données réelles de l'application) : cite les chiffres quand c'est pertinent ;
- tu n'es pas médecin : si le joueur évoque un danger pour sa santé ou une détresse grave, conseille avec tact d'en parler à un professionnel de santé.`

type AddictionWithRelapses = Addiction & { relapses: Relapse[] }

/** Construit le bloc de contexte injecté à chaque tour (données fraîches). */
export async function buildCoachContext(
  userId: string,
  addiction: AddictionWithRelapses,
): Promise<string> {
  const now = Date.now()
  const streakDays = Math.max(0, Math.floor((now - addiction.startDate.getTime()) / DAY_MS))

  const lines: string[] = [
    `Addiction suivie : ${addiction.name}`,
    `Jours sans rechute (série en cours) : ${streakDays}`,
    `Record personnel : ${Math.max(addiction.bestStreak, streakDays)} jours`,
    `Nombre total de rechutes : ${addiction.relapseCount}`,
    `Suivi commencé le : ${addiction.createdAt.toISOString().slice(0, 10)}`,
  ]

  const lastRelapses = addiction.relapses.slice(-3)
  if (lastRelapses.length > 0) {
    lines.push('Dernières rechutes :')
    for (const r of lastRelapses) {
      lines.push(
        `- ${r.occurredAt.toISOString().slice(0, 10)} (série perdue : ${r.streakLost} j)${r.note ? ` — note du joueur : « ${r.note} »` : ''}`,
      )
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true, totalXp: true, currentStreak: true, longestStreak: true },
  })
  if (user) {
    lines.push(
      `Profil joueur : niveau ${user.level}, ${user.totalXp} XP, série d'activité ${user.currentStreak} j (record ${user.longestStreak} j)`,
    )
  }

  if (addiction.shareJournal) {
    const entries = await prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      select: { date: true, content: true, aiScore: true },
    })
    if (entries.length > 0) {
      lines.push('Extraits du journal (partagés avec ton accord par le joueur) :')
      for (const e of entries) {
        const excerpt = e.content.length > 400 ? `${e.content.slice(0, 400)}…` : e.content
        lines.push(
          `- ${e.date.toISOString().slice(0, 10)}${e.aiScore != null ? ` (journée notée ${e.aiScore}/10)` : ''} : ${excerpt}`,
        )
      }
    }
  } else {
    lines.push(
      "Journal : accès non autorisé par le joueur (il peut l'activer depuis la conversation).",
    )
  }

  lines.push(`Date du jour : ${new Date().toISOString().slice(0, 10)}`)
  return lines.join('\n')
}

/**
 * Envoie la conversation à Claude et renvoie la réponse du coach.
 * L'historique complet vit en base ; on n'envoie que la fenêtre récente.
 */
export async function askCoach(
  context: string,
  history: CoachMessage[],
  userContent: string,
): Promise<string> {
  if (!anthropic) throw new ApiError(503, "Le coach IA n'est pas configuré sur ce serveur")

  const recent = history.slice(-HISTORY_WINDOW)
  // Le fil commence par le message d'accueil du coach : l'API exige que le
  // premier message soit `user`, on saute donc les messages assistants de tête.
  const firstUser = recent.findIndex((m) => m.role === 'USER')
  const window = firstUser === -1 ? [] : recent.slice(firstUser)

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\n<contexte>\n${context}\n</contexte>`,
    messages: [
      ...window.map((m) => ({
        role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user' as const, content: userContent },
    ],
  })

  if (response.stop_reason === 'refusal') {
    throw new ApiError(422, "Le coach n'a pas pu répondre à ce message")
  }

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  if (!text) throw new ApiError(502, 'Réponse du coach vide')
  return text
}

/** Message d'accueil créé avec l'addiction — aucun appel IA nécessaire. */
export function welcomeMessage(addictionName: string): string {
  return (
    `Salut, je suis ton coach pour t'aider à te libérer de « ${addictionName} ». ` +
    `Je connais tes chiffres (série en cours, rechutes, record) et je m'adapte à ta progression.\n\n` +
    `Pour commencer, raconte-moi : dans quelles situations l'envie est-elle la plus forte ? ` +
    `(moment de la journée, lieu, émotion…)`
  )
}

/** Message déposé automatiquement après une rechute — jamais de jugement. */
export function relapseMessage(streakLost: number): string {
  return (
    `J'ai vu que tu as déclaré une rechute. Aucun jugement : la rechute fait partie du processus de changement, ` +
    `et ta série de ${streakLost} jour${streakLost > 1 ? 's' : ''} prouve que tu SAIS tenir.\n\n` +
    `Quand tu es prêt·e, raconte-moi ce qui s'est passé juste avant (où, avec qui, dans quel état d'esprit) — ` +
    `on en tirera un plan concret pour la prochaine fois.`
  )
}
