import { levelFromTotalXp, type XpResult } from '@one-mission/shared'
import { prisma } from '../../lib/prisma.js'

const DAY_MS = 24 * 60 * 60 * 1000

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * Seul point d'entrée pour créditer ou retirer de l'XP.
 * Recalcule niveau, XP courante et série d'activité de façon atomique.
 * `amount` peut être négatif (quête décochée, suppression d'une quête terminée).
 */
export async function awardXp(userId: string, amount: number): Promise<XpResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })

    const totalXp = Math.max(0, user.totalXp + amount)
    const { level, currentXp, xpForNext } = levelFromTotalXp(totalXp)
    const leveledUp = level > user.level

    // Série d'activité : seule une action positive compte comme « jour actif ».
    let { currentStreak, longestStreak, lastActivityAt } = user
    if (amount > 0) {
      const now = new Date()
      const today = startOfUtcDay(now)
      const last = lastActivityAt ? startOfUtcDay(lastActivityAt) : null

      if (last === null || last < today - DAY_MS) currentStreak = 1
      else if (last === today - DAY_MS) currentStreak += 1
      // last === today → la série ne bouge pas

      longestStreak = Math.max(longestStreak, currentStreak)
      lastActivityAt = now
    }

    await tx.user.update({
      where: { id: userId },
      data: { totalXp, level, currentXp, currentStreak, longestStreak, lastActivityAt },
    })

    return { xpGained: amount, totalXp, level, currentXp, xpForNext, leveledUp, currentStreak, longestStreak }
  })
}
