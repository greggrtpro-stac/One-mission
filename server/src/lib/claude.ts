import Anthropic from '@anthropic-ai/sdk'
import { env } from '../config/env.js'

/**
 * Client Anthropic partagé par toutes les fonctionnalités IA
 * (analyse du journal, coach addictions…).
 * `aiAvailable` vaut false si aucune clé n'est configurée : chaque
 * fonctionnalité doit alors se dégrader proprement côté client.
 */
export const anthropic = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null

export const aiAvailable = anthropic !== null

export const CLAUDE_MODEL = 'claude-opus-4-8'
