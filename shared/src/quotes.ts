/**
 * Citation du jour — liste centralisée, aucun stockage en base nécessaire.
 *
 * `getDailyQuote()` est déterministe : à date locale égale, elle renvoie
 * toujours la même citation (même après rechargement ou reconnexion), et
 * change automatiquement au changement de date. Elle doit être appelée côté
 * client avec l'horloge du navigateur (`new Date()` par défaut) : c'est ce
 * qui fait correspondre le changement de citation à minuit dans le fuseau
 * horaire de l'UTILISATEUR, pas celui du serveur.
 */

export interface MotivationalQuote {
  text: string
  author: string | null
}

// ── Discipline ───────────────────────────────────────────────
const DISCIPLINE: MotivationalQuote[] = [
  { text: 'La discipline est le pont entre les objectifs et les accomplissements.', author: 'Jim Rohn' },
  { text: 'La douleur de la discipline pèse quelques grammes ; celle du regret pèse des tonnes.', author: 'Jim Rohn' },
  { text: 'La discipline, c’est se souvenir de ce que tu veux vraiment.', author: 'David Campbell' },
  { text: 'Ce n’est pas la motivation qui crée la discipline, c’est la discipline qui entretient la motivation.', author: null },
  { text: 'La discipline est le choix entre ce que tu veux maintenant et ce que tu veux le plus.', author: null },
  { text: 'Sans discipline, un rêve reste un vœu pieux.', author: null },
  { text: 'La liberté commence là où finit l’excuse.', author: null },
  { text: 'Fais-le même les jours où tu n’en as pas envie : c’est précisément ça, la discipline.', author: null },
  { text: 'Un esprit discipliné mène à la liberté.', author: 'Aristote' },
  { text: 'La discipline est le carburant qui fonctionne même sans l’étincelle de la motivation.', author: null },
  { text: 'Ce que tu tolères aujourd’hui, tu le répéteras demain.', author: null },
  { text: 'La rigueur n’est pas une prison, c’est le chemin le plus court vers la liberté que tu veux.', author: null },
  { text: 'Maîtrise-toi toi-même, et tu maîtriseras le reste.', author: 'Sénèque' },
  { text: 'La discipline te donne aujourd’hui la liberté que tu chercheras en vain demain sans elle.', author: null },
  { text: 'Ceux qui progressent sont rarement ceux qui se sentent motivés — ce sont ceux qui agissent quand même.', author: null },
  { text: 'La rigueur d’aujourd’hui écrit la réputation de demain.', author: null },
  { text: 'Un cadre solide libère plus de créativité qu’une liberté totale.', author: null },
]

// ── Habitudes ────────────────────────────────────────────────
const HABITUDES: MotivationalQuote[] = [
  { text: 'Nous sommes ce que nous faisons de manière répétée. L’excellence n’est donc pas un acte, mais une habitude.', author: 'Aristote' },
  { text: 'La motivation te fait démarrer. L’habitude te fait continuer.', author: 'Jim Ryun' },
  { text: 'Tes habitudes d’aujourd’hui dessinent ton niveau de demain.', author: null },
  { text: 'Les habitudes sont d’abord des fils, puis des câbles.', author: 'Proverbe espagnol' },
  { text: 'On devient ce que l’on répète : la réussite n’est pas un acte, c’est une habitude.', author: null },
  { text: 'Change tes habitudes, tu changeras ta vie — pas l’inverse.', author: null },
  { text: 'Chaque petite habitude que tu tiens aujourd’hui construit la personne que tu seras dans un an.', author: null },
  { text: 'Sème une habitude, récolte un caractère ; sème un caractère, récolte un destin.', author: 'Proverbe attribué à Charles Reade' },
  { text: 'Les bonnes habitudes se forment dans la répétition, pas dans la perfection.', author: null },
  { text: 'Ce que tu fais tous les jours compte plus que ce que tu fais de temps en temps.', author: 'Gretchen Rubin' },
  { text: 'Une habitude coûte peu chaque jour et rapporte énormément sur la durée.', author: null },
  { text: 'On ne s’élève pas au niveau de ses objectifs, on retombe au niveau de ses habitudes.', author: 'James Clear' },
  { text: 'Une habitude n’a pas besoin d’être parfaite pour être efficace, elle a juste besoin d’être répétée.', author: null },
  { text: 'Les jours où tu n’as pas envie sont ceux qui comptent le plus pour ton habitude.', author: null },
  { text: 'Le secret n’est pas de faire plus, c’est de ne jamais rater deux fois de suite.', author: 'James Clear' },
  { text: 'On ne construit pas une habitude en un jour, on la détruit en un jour d’abandon.', author: null },
]

// ── Objectifs ────────────────────────────────────────────────
const OBJECTIFS: MotivationalQuote[] = [
  { text: 'Un objectif sans plan n’est qu’un souhait.', author: 'Antoine de Saint-Exupéry' },
  { text: 'Un objectif bien défini est à moitié atteint.', author: 'Abraham Lincoln' },
  { text: 'Vise la lune : même si tu la rates, tu atterriras parmi les étoiles.', author: 'Oscar Wilde' },
  { text: 'Écris tes objectifs à l’encre, pas au crayon.', author: null },
  { text: 'Un objectif sans échéance n’est qu’une idée.', author: null },
  { text: 'Ceux qui n’ont pas d’objectif finissent souvent par travailler pour ceux qui en ont un.', author: null },
  { text: 'Sais où tu vas : le vent n’aide jamais un navire sans destination.', author: 'Sénèque' },
  { text: 'On n’atteint jamais un but qu’on n’a pas osé fixer.', author: null },
  { text: 'Découpe ta montagne en cailloux, et gravis-la un caillou à la fois.', author: null },
  { text: 'Ton avenir se construit par ce que tu fais aujourd’hui, pas demain.', author: 'Mahatma Gandhi' },
  { text: 'Un rêve devient un objectif le jour où tu lui donnes une date.', author: null },
  { text: 'Ce qui se mesure s’améliore.', author: 'Peter Drucker' },
  { text: 'Un objectif flou produit des efforts flous.', author: null },
  { text: 'Ce que tu ne mesures pas, tu ne peux pas l’améliorer.', author: null },
  { text: 'Fixe ton cap avant de compter tes rames.', author: null },
  { text: 'La clarté de ton objectif détermine la clarté de ton chemin.', author: null },
]

// ── Persévérance ─────────────────────────────────────────────
const PERSEVERANCE: MotivationalQuote[] = [
  { text: 'Il n’y a qu’une façon d’échouer, c’est d’abandonner avant d’avoir réussi.', author: 'Georges Clemenceau' },
  { text: 'Le champion est celui qui se relève quand il ne le peut plus.', author: 'Jack Dempsey' },
  { text: 'La persévérance transforme l’échec en accomplissement extraordinaire.', author: null },
  { text: 'On n’échoue pas quand on tombe, on échoue quand on refuse de se relever.', author: null },
  { text: 'La souffrance est temporaire, abandonner dure toujours.', author: 'Lance Armstrong' },
  { text: 'Ce n’est pas la charge qui te brise, c’est la façon dont tu la portes.', author: null },
  { text: 'Tombe sept fois, relève-toi huit.', author: 'Proverbe japonais' },
  { text: 'Le succès n’est pas final, l’échec n’est pas fatal : c’est le courage de continuer qui compte.', author: 'Winston Churchill' },
  { text: 'Ce n’est pas parce que les choses sont difficiles que nous n’osons pas, c’est parce que nous n’osons pas qu’elles sont difficiles.', author: 'Sénèque' },
  { text: 'Continue à marcher, même lentement : c’est déjà plus loin que celui qui s’est arrêté.', author: null },
  { text: 'Un fleuve devient puissant en refusant de s’arrêter à chaque pierre.', author: null },
  { text: 'La goutte d’eau finit par percer la roche, non par sa force, mais par sa persévérance.', author: null },
  { text: 'Ne juge pas chaque journée par la récolte que tu en tires, mais par les graines que tu plantes.', author: 'Robert Louis Stevenson' },
  { text: 'Rien au monde ne remplace la persévérance.', author: 'Calvin Coolidge' },
  { text: 'La patience et la ténacité valent mieux que la force et la fureur.', author: 'Edmund Burke' },
  { text: 'Le dernier kilomètre est toujours le plus silencieux — et le plus décisif.', author: null },
  { text: 'Ce n’est pas la vitesse qui compte, c’est de ne jamais t’arrêter complètement.', author: null },
  { text: 'Un guerrier n’est pas celui qui ne tombe jamais, mais celui qui se relève à chaque fois.', author: null },
  { text: 'Les obstacles sont ces choses effrayantes que tu vois quand tu détournes les yeux de ton objectif.', author: 'Henry Ford' },
]

// ── Réussite ─────────────────────────────────────────────────
const REUSSITE: MotivationalQuote[] = [
  { text: 'Le succès, c’est la somme de petits efforts répétés jour après jour.', author: 'Robert Collier' },
  { text: 'L’action est la clé fondamentale de tout succès.', author: 'Pablo Picasso' },
  { text: 'Le seul endroit où le succès précède le travail, c’est dans le dictionnaire.', author: 'Vidal Sassoon' },
  { text: 'Le succès, c’est se planter neuf fois et se relever dix.', author: null },
  { text: 'Il n’y a pas de secret pour réussir : c’est le résultat de la préparation, du travail et de l’apprentissage.', author: 'Colin Powell' },
  { text: 'Le succès n’est pas un accident, c’est un choix quotidien.', author: null },
  { text: 'La réussite appartient à ceux qui se lèvent une fois de plus qu’ils ne tombent.', author: null },
  { text: 'On ne réussit pas seul un jour, on réussit chaque jour, un peu.', author: null },
  { text: 'Le succès est la capacité d’aller d’échec en échec sans perdre son enthousiasme.', author: 'Winston Churchill' },
  { text: 'Ta réussite de demain se construit dans les efforts que personne ne voit aujourd’hui.', author: null },
  { text: 'Ce que tu deviens en poursuivant tes objectifs vaut bien plus que ce que tu obtiens.', author: 'Henry David Thoreau' },
  { text: 'Ceux qui réussissent ont commencé avant de se sentir prêts.', author: null },
  { text: 'La chance sourit à ceux qui ne cessent de se préparer.', author: null },
  { text: 'Réussir, c’est simplement ne pas s’arrêter au bon moment — celui juste avant que ça marche.', author: null },
  { text: 'Le succès silencieux d’aujourd’hui est la preuve visible de demain.', author: null },
  { text: 'On ne voit jamais le nombre d’essais derrière une réussite, seulement la réussite elle-même.', author: null },
]

// ── Sport & effort physique ──────────────────────────────────
const SPORT: MotivationalQuote[] = [
  { text: 'La force ne vient pas de la victoire. Tes luttes développent tes forces.', author: 'Arnold Schwarzenegger' },
  { text: 'Le sportif ne compte pas les efforts, il compte les progrès.', author: null },
  { text: 'Le corps atteint ce que l’esprit croit.', author: null },
  { text: 'La douleur que tu ressens aujourd’hui sera la force que tu ressentiras demain.', author: null },
  { text: 'Ne compte pas les jours, fais que les jours comptent.', author: 'Muhammad Ali' },
  { text: 'Un champion se révèle dans les répétitions que personne n’applaudit.', author: null },
  { text: 'Impossible n’est qu’un mot brandi par les hommes qui trouvent plus facile de vivre dans le monde qu’on leur a donné.', author: 'Muhammad Ali' },
  { text: 'Le corps réalise ce que l’esprit répète.', author: null },
  { text: 'L’entraînement le plus dur forge le mental le plus fort.', author: null },
  { text: 'Chaque séance compte, même celle où tu n’as rien donné de spectaculaire.', author: null },
  { text: 'Tu ne bats pas ton adversaire, tu bats la version d’hier de toi-même.', author: null },
  { text: 'La sueur d’aujourd’hui est la victoire de demain.', author: null },
  { text: 'Le muscle se construit dans le repos, le mental se construit dans l’effort.', author: null },
  { text: 'Ce que tu refuses de faire aujourd’hui, un autre le fera à ta place demain.', author: null },
  { text: 'La régularité bat l’intensité sur la durée.', author: null },
  { text: 'Chaque répétition compte, même celle que personne ne voit.', author: null },
]

// ── Productivité & travail ────────────────────────────────────
const PRODUCTIVITE: MotivationalQuote[] = [
  { text: 'Le meilleur moment pour planter un arbre était il y a vingt ans. Le deuxième meilleur moment, c’est maintenant.', author: 'Proverbe chinois' },
  { text: 'Celui qui déplace une montagne commence par déplacer de petites pierres.', author: 'Confucius' },
  { text: 'Un voyage de mille lieues commence toujours par un premier pas.', author: 'Lao Tseu' },
  { text: 'Ne remets jamais à demain ce que tu peux faire aujourd’hui, surtout si ça te rapproche de qui tu veux devenir.', author: null },
  { text: 'Fais une chose à la fois, mais fais-la bien.', author: null },
  { text: 'Le travail acharné bat le talent quand le talent ne travaille pas assez.', author: 'Tim Notke' },
  { text: 'L’ordre est la moitié de la maîtrise de sa vie.', author: null },
  { text: 'Une heure de concentration profonde vaut mieux qu’une journée dispersée.', author: null },
  { text: 'Le temps que tu perds aujourd’hui, personne ne te le rendra demain.', author: null },
  { text: 'Fais aujourd’hui ce que les autres ne veulent pas faire, tu vivras demain ce que les autres ne peuvent pas vivre.', author: null },
  { text: 'Le travail que tu évites reste toujours plus lourd que celui que tu fais.', author: null },
  { text: 'La procrastination est le voleur silencieux de tous les objectifs.', author: null },
  { text: 'Le mieux est parfois l’ennemi du fait.', author: null },
  { text: 'Une tâche commencée est à moitié terminée.', author: 'Proverbe' },
  { text: 'Le temps que tu organises aujourd’hui, tu ne le chercheras pas demain.', author: null },
  { text: 'La simplicité est la sophistication suprême de l’organisation.', author: null },
]

// ── Développement personnel & confiance ──────────────────────
const DEVELOPPEMENT: MotivationalQuote[] = [
  { text: 'Tu ne montes pas de niveau en restant dans ta zone de confort.', author: null },
  { text: 'La constance bat le talent quand le talent n’est pas constant.', author: null },
  { text: 'Deviens la meilleure version de toi-même, un jour à la fois.', author: null },
  { text: 'Il n’est jamais trop tard pour être ce que tu aurais pu être.', author: 'George Eliot' },
  { text: 'Ce que tu fais aujourd’hui peut améliorer tous tes lendemains.', author: 'Ralph Marston' },
  { text: 'Ta seule vraie limite est celle que tu acceptes.', author: null },
  { text: 'Connais-toi toi-même : c’est le début de toute sagesse.', author: 'Socrate' },
  { text: 'Les grandes choses ne sont jamais faites par impulsion, mais par une série de petites choses réunies.', author: 'Vincent van Gogh' },
  { text: 'Rien ne vaut plus que ce jour.', author: 'Johann Wolfgang von Goethe' },
  { text: 'Tu n’as pas besoin d’être extraordinaire pour commencer, mais tu dois commencer pour devenir extraordinaire.', author: 'Zig Ziglar' },
  { text: 'Deviens le genre de personne qui inspire la version future de toi-même.', author: null },
  { text: 'La croyance que tu peux, c’est déjà la moitié du chemin.', author: 'Theodore Roosevelt' },
  { text: 'On ne change pas de vie en changeant de décor, mais en changeant de discipline.', author: null },
  { text: 'Ce que tu penses de toi-même compte bien plus que ce que les autres pensent de toi.', author: 'Sénèque' },
  { text: 'Le doute tue plus de rêves que l’échec jamais ne le fera.', author: null },
  { text: 'Sois le changement que tu veux voir dans ta propre vie.', author: null },
  { text: 'Chaque expert a un jour été un débutant qui a refusé d’abandonner.', author: null },
  { text: 'Tu n’es pas en retard, tu es exactement là où tes efforts t’ont menés — et tu peux encore avancer.', author: null },
  { text: 'La confiance en soi se construit une preuve à la fois, pas un discours à la fois.', author: null },
  { text: 'Investis en toi-même : c’est le seul projet qui te suit partout.', author: null },
  { text: 'Deviens l’architecte de tes journées, pas leur spectateur.', author: null },
  { text: 'Le regard que tu portes sur toi-même façonne la vie que tu construis.', author: null },
  { text: 'Grandir, c’est accepter d’être débutant plus souvent qu’on ne le voudrait.', author: null },
  { text: 'Chaque version de toi que tu deviens commence par une décision que tu prends aujourd’hui.', author: null },
]

// ── Thème quête / mission (spécifique One Mission) ────────────
const MISSION: MotivationalQuote[] = [
  { text: 'Chaque quête terminée est une promesse tenue envers toi-même.', author: null },
  { text: 'Une vie. Une mission. Un jour à la fois.', author: null },
  { text: 'Chaque XP gagné aujourd’hui est un pas vers le joueur que tu deviens.', author: null },
  { text: 'Ta progression ne se voit pas toujours dans le miroir, mais elle s’accumule dans tes quêtes.', author: null },
  { text: 'Un niveau de plus, c’est une preuve de plus que tu tiens tes engagements envers toi-même.', author: null },
  { text: 'Le vrai boss final, c’est la version de toi qui remet tout au lendemain.', author: null },
  { text: 'Aucune quête n’est trop petite si elle te rapproche de ta mission principale.', author: null },
  { text: 'La discipline est ta compétence la plus puissante — et elle monte en niveau à chaque usage.', author: null },
  { text: 'Ta série d’activité ne mesure pas ta perfection, elle mesure ta présence.', author: null },
  { text: 'Chaque jour où tu te présentes est une victoire que le classement ne montre pas.', author: null },
  { text: 'Ne compare ta partie à celle de personne : chacun joue sa propre mission.', author: null },
  { text: 'Ce que tu accomplis aujourd’hui, personne ne pourra te l’enlever demain.', author: null },
  { text: 'Le tableau de bord ne ment jamais : il reflète ce que tu as vraiment fait, pas ce que tu voulais faire.', author: null },
  { text: 'Chaque quête est un choix silencieux entre qui tu es et qui tu veux devenir.', author: null },
  { text: 'Tu n’as pas besoin de finir la mission aujourd’hui, juste d’avancer d’une quête.', author: null },
  { text: 'Le classement changera, ta discipline restera.', author: null },
]

// ── Sagesse antique (domaine public) ──────────────────────────
const SAGESSE: MotivationalQuote[] = [
  { text: 'Maîtrise ton esprit, ou il te maîtrisera.', author: 'Horace' },
  { text: 'Ce n’est pas parce que c’est difficile que nous n’osons pas, mais parce que nous n’osons pas que c’est difficile.', author: 'Sénèque' },
  { text: 'La roue tourne toujours pour celui qui continue de marcher.', author: 'Marc Aurèle' },
  { text: 'L’homme qui a commencé s’est déjà donné la moitié de l’ouvrage.', author: 'Horace' },
  { text: 'Notre vie est ce que nos pensées en font.', author: 'Marc Aurèle' },
  { text: 'Il n’existe pas de vent favorable pour celui qui ne sait où aller.', author: 'Sénèque' },
  { text: 'Ce n’est pas parce que les choses sont difficiles que nous manquons de courage, c’est parce que nous manquons de courage qu’elles sont difficiles.', author: 'Sénèque' },
  { text: 'La roche que la vague ne peut briser use pourtant la vague, à force de patience.', author: 'Proverbe grec' },
  { text: 'Celui qui vainc les autres est fort ; celui qui se vainc lui-même est puissant.', author: 'Lao Tseu' },
  { text: 'Le sage construit son avenir chaque jour, pierre après pierre.', author: null },
  { text: 'Le sage ne cherche pas la perfection, il cherche la constance.', author: null },
  { text: 'Il faut à l’arbre des années pour pousser des racines profondes, et une seule tempête pour les tester.', author: null },
  { text: 'Ne cherche pas à devenir un homme qui a réussi, mais plutôt un homme qui a de la valeur.', author: 'Albert Einstein' },
  { text: 'Le vrai voyage ne consiste pas à chercher de nouveaux paysages, mais à avoir de nouveaux yeux.', author: 'Marcel Proust' },
]

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  ...DISCIPLINE,
  ...HABITUDES,
  ...OBJECTIFS,
  ...PERSEVERANCE,
  ...REUSSITE,
  ...SPORT,
  ...PRODUCTIVITE,
  ...DEVELOPPEMENT,
  ...MISSION,
  ...SAGESSE,
]

/**
 * Date locale au format YYYY-MM-DD à partir des composants locaux du Date
 * (PAS toISOString, qui bascule sur UTC — on veut le jour tel que
 * l'utilisateur le vit dans son propre fuseau horaire).
 */
function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Hash de chaîne stable et simple (djb2). Un hash de la date complète
 * (année incluse) plutôt qu'un simple "jour de l'année % longueur" : ce
 * dernier ferait revenir la même citation au même calendrier chaque année.
 */
function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return hash >>> 0 // entier non signé, pour un modulo toujours positif
}

/**
 * Citation du jour, déterministe : identique toute la journée locale de
 * l'appelant (même après rechargement ou reconnexion), change
 * automatiquement à minuit dans SON fuseau horaire puisque `date` vient de
 * l'horloge de son appareil. Aucun appel réseau, aucun stockage : la liste
 * vit entièrement dans ce module, partagé entre client et serveur.
 */
export function getDailyQuote(date: Date = new Date()): MotivationalQuote {
  const index = hashString(localDateKey(date)) % MOTIVATIONAL_QUOTES.length
  return MOTIVATIONAL_QUOTES[index]!
}
