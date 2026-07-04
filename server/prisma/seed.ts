import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' })
const prisma = new PrismaClient({ adapter })

const QUOTES: { text: string; author: string | null }[] = [
  { text: 'La discipline est le pont entre les objectifs et les accomplissements.', author: 'Jim Rohn' },
  { text: 'Nous sommes ce que nous faisons de manière répétée. L’excellence n’est donc pas un acte, mais une habitude.', author: 'Aristote' },
  { text: 'Le succès, c’est la somme de petits efforts répétés jour après jour.', author: 'Robert Collier' },
  { text: 'Ne compte pas les jours, fais que les jours comptent.', author: 'Muhammad Ali' },
  { text: 'La motivation te fait démarrer. L’habitude te fait continuer.', author: 'Jim Ryun' },
  { text: 'Un voyage de mille lieues commence toujours par un premier pas.', author: 'Lao Tseu' },
  { text: 'Le meilleur moment pour planter un arbre était il y a vingt ans. Le deuxième meilleur moment, c’est maintenant.', author: 'Proverbe chinois' },
  { text: 'Celui qui déplace une montagne commence par déplacer de petites pierres.', author: 'Confucius' },
  { text: 'Tu ne montes pas de niveau en restant dans ta zone de confort.', author: null },
  { text: 'La douleur de la discipline pèse quelques grammes ; celle du regret pèse des tonnes.', author: 'Jim Rohn' },
  { text: 'Fais aujourd’hui ce que les autres ne veulent pas faire, tu vivras demain ce que les autres ne peuvent pas vivre.', author: null },
  { text: 'Le champion est celui qui se relève quand il ne le peut plus.', author: 'Jack Dempsey' },
  { text: 'Tes habitudes d’aujourd’hui dessinent ton niveau de demain.', author: null },
  { text: 'L’action est la clé fondamentale de tout succès.', author: 'Pablo Picasso' },
  { text: 'Il n’y a qu’une façon d’échouer, c’est d’abandonner avant d’avoir réussi.', author: 'Georges Clemenceau' },
  { text: 'Vise la lune : même si tu la rates, tu atterriras parmi les étoiles.', author: 'Oscar Wilde' },
  { text: 'Chaque quête terminée est une promesse tenue envers toi-même.', author: null },
  { text: 'Le corps atteint ce que l’esprit croit.', author: null },
  { text: 'Un objectif sans plan n’est qu’un souhait.', author: 'Antoine de Saint-Exupéry' },
  { text: 'La constance bat le talent quand le talent n’est pas constant.', author: null },
]

async function main() {
  const count = await prisma.quote.count()
  if (count === 0) {
    await prisma.quote.createMany({ data: QUOTES })
    console.log(`✅ ${QUOTES.length} citations insérées`)
  } else {
    console.log(`ℹ️ Citations déjà présentes (${count}), rien à faire`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
