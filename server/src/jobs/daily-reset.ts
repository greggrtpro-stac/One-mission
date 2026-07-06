import { resetOutdatedDailies } from '../modules/quests/quests.service.js'

/**
 * Tâche de minuit : décoche les quêtes journalières terminées la veille, pour
 * tous les joueurs. Une passe de rattrapage tourne au démarrage (serveur
 * éteint à minuit) et le service applique en plus un reset paresseux par
 * utilisateur à chaque requête — le comportement reste donc fiable même si
 * personne ne s'est connecté pendant plusieurs jours.
 */
export function startDailyQuestReset(): void {
  const run = () => {
    resetOutdatedDailies().catch((err) => {
      console.error('Réinitialisation quotidienne des quêtes échouée :', err)
    })
  }

  const scheduleNext = () => {
    const now = new Date()
    // 00:00:05 : cinq secondes de marge pour être certain d'être le bon jour.
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
    setTimeout(() => {
      run()
      scheduleNext()
    }, nextMidnight.getTime() - now.getTime())
  }

  run()
  scheduleNext()
}
