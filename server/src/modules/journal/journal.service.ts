import type { JournalAnalysis } from '@one-mission/shared'
import { anthropic, CLAUDE_MODEL, aiAvailable } from '../../lib/claude.js'
import { ApiError } from '../../middleware/error.js'

export { aiAvailable }

const SYSTEM_PROMPT = `Tu es le coach bienveillant de One Mission, une application de développement personnel gamifiée.
On te confie l'entrée de journal d'un joueur pour la journée écoulée.
Analyse-la avec honnêteté et bienveillance, en français, en tutoyant le joueur.
Règles :
- "score" note la journée de 0 à 10 (10 = journée pleinement alignée avec ses objectifs).
- "summary" : 1 à 2 phrases qui résument la journée.
- "positives" : 2 à 4 points positifs concrets tirés du texte.
- "improvements" : 1 à 3 axes d'amélioration, formulés sans jugement.
- "advice" : 1 à 3 conseils actionnables pour demain.
Appuie-toi uniquement sur ce que le joueur a écrit.`

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer', description: 'Note de la journée, de 0 à 10.' },
    summary: { type: 'string' },
    positives: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    advice: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'summary', 'positives', 'improvements', 'advice'],
  additionalProperties: false,
} as const

/** Analyse une entrée de journal avec Claude et renvoie le résultat structuré. */
export async function analyzeEntry(dateLabel: string, content: string): Promise<JournalAnalysis> {
  if (!anthropic) {
    throw new ApiError(503, "L'analyse IA n'est pas configurée sur ce serveur")
  }

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: ANALYSIS_SCHEMA } },
    messages: [
      { role: 'user', content: `Entrée de journal du ${dateLabel} :\n\n${content}` },
    ],
  })

  if (response.stop_reason === 'refusal') {
    throw new ApiError(422, "L'IA n'a pas pu analyser cette entrée")
  }

  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) throw new ApiError(502, "Réponse d'analyse vide")

  const parsed = JSON.parse(text) as JournalAnalysis
  return {
    score: Math.min(10, Math.max(0, Math.round(parsed.score))),
    summary: parsed.summary,
    positives: parsed.positives,
    improvements: parsed.improvements,
    advice: parsed.advice,
  }
}
