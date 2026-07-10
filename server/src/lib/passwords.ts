import argon2 from 'argon2'

/**
 * Hachage des mots de passe — un seul endroit pour toute l'application.
 * Argon2id avec les paramètres recommandés OWASP : 64 MiB de mémoire,
 * 3 itérations, parallélisme 4. Le mot de passe en clair ne doit JAMAIS
 * être journalisé ni stocké ailleurs que dans ce hash.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024, // KiB → 64 MiB
  timeCost: 3,
  parallelism: 4,
} as const

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

/** `verify` lit les paramètres encodés dans le hash : les anciens hashs restent valides. */
export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}
