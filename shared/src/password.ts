/**
 * Politique de mot de passe One Mission — source de vérité unique,
 * partagée entre le client (affichage temps réel) et le serveur (validation).
 */

export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export interface PasswordCriteria {
  minLength: boolean
  uppercase: boolean
  lowercase: boolean
  digit: boolean
  special: boolean
}

/** Libellés affichés dans la checklist temps réel, dans l'ordre d'affichage. */
export const PASSWORD_CRITERIA_LABELS: Record<keyof PasswordCriteria, string> = {
  minLength: `${PASSWORD_MIN_LENGTH} caractères minimum`,
  uppercase: 'Une majuscule',
  lowercase: 'Une minuscule',
  digit: 'Un chiffre',
  special: 'Un caractère spécial (!@#$%…)',
}

/** Tout caractère qui n'est ni lettre, ni chiffre, ni espace compte comme spécial. */
const SPECIAL_RE = /[^a-zA-Z0-9\s]/
const UPPER_RE = /[A-ZÀ-ÖØ-Þ]/
const LOWER_RE = /[a-zà-öø-ÿ]/

export function passwordCriteria(password: string): PasswordCriteria {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: UPPER_RE.test(password),
    lowercase: LOWER_RE.test(password),
    digit: /\d/.test(password),
    special: SPECIAL_RE.test(password),
  }
}

/**
 * Bases de mots de passe trop courants (fr + en). La comparaison se fait
 * après normalisation : minuscules, substitutions leet (@→a, 3→e…), puis
 * suppression des chiffres/spéciaux — « P@ssword123! » est donc rejeté.
 */
const COMMON_BASES = new Set([
  'password', 'motdepasse', 'azerty', 'azertyuiop', 'qwerty', 'qwertyuiop',
  'abcdef', 'abcdefgh', 'letmein', 'welcome', 'bonjour', 'bienvenue', 'salut',
  'admin', 'administrateur', 'administrator', 'root', 'user', 'utilisateur',
  'soleil', 'sunshine', 'dragon', 'monkey', 'football', 'baseball', 'marseille',
  'iloveyou', 'jetaime', 'princess', 'princesse', 'chocolat', 'doudou',
  'onemission', 'mission', 'secret', 'test', 'testtest', 'demo',
])

const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g',
  '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i', '€': 'e', '£': 'l',
}

const LETTERS_RE = /[^a-zà-öø-ÿ]/g

function leet(s: string): string {
  return [...s].map((c) => LEET_MAP[c] ?? c).join('')
}

/**
 * Vrai si le mot de passe n'est qu'une variation d'un mot trop courant.
 * Trois normalisations testées (un match suffit) :
 *  - lettres seules : « azerty123! » → azerty ;
 *  - leet complet : « P@ssw0rd » → password ;
 *  - cœur (préfixe/suffixe non alphabétiques retirés) puis leet :
 *    « P@ssword123! » → p@ssword → password.
 */
export function isCommonPassword(password: string): boolean {
  const lowered = password.toLowerCase()
  const plainLetters = lowered.replace(LETTERS_RE, '')
  // Suites numériques pures ou quasi pures (« 1234567890!! », dates…).
  if (plainLetters.length <= 2) return true

  const core = lowered.replace(/^[^a-zà-öø-ÿ]+|[^a-zà-öø-ÿ]+$/g, '')
  const variants = [
    plainLetters,
    leet(lowered).replace(LETTERS_RE, ''),
    leet(core).replace(LETTERS_RE, ''),
  ]
  return variants.some((v) => COMMON_BASES.has(v))
}

/** Vrai si tous les critères sont remplis et le mot de passe n'est pas trivial. */
export function isPasswordAcceptable(password: string): boolean {
  if (password.length > PASSWORD_MAX_LENGTH) return false
  if (isCommonPassword(password)) return false
  return Object.values(passwordCriteria(password)).every(Boolean)
}

export type PasswordStrength = 'faible' | 'moyen' | 'fort' | 'tres_fort'

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  faible: 'Faible',
  moyen: 'Moyen',
  fort: 'Fort',
  tres_fort: 'Très fort',
}

/**
 * Robustesse indicative affichée sous le champ. Un mot de passe « Fort »
 * remplit tous les critères ; « Très fort » y ajoute la longueur (16+).
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return 'faible'
  const met = Object.values(passwordCriteria(password)).filter(Boolean).length
  if (isCommonPassword(password) || met <= 3) return 'faible'
  if (met === 4) return 'moyen'
  return password.length >= 16 ? 'tres_fort' : 'fort'
}
