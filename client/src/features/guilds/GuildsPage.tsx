import { useQuery } from '@tanstack/react-query'
import { guildsApi } from '@/api/guilds'
import { Card, Spinner } from '@/components/ui'
import { usePageTitle } from '@/lib/usePageTitle'
import { GuildDiscovery } from './GuildDiscovery'
import { GuildHome } from './GuildHome'

/**
 * Onglet Guildes : page « Ma guilde » (chat, membres, gestion) si le joueur
 * en a une, sinon découverte (recherche, classement, invitations, création).
 */
export function GuildsPage() {
  usePageTitle('Guildes')
  const query = useQuery({ queryKey: ['my-guild'], queryFn: guildsApi.mine })

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="text-accent" />
      </div>
    )
  }

  if (!query.data) {
    return (
      <Card className="mx-auto mt-6 max-w-3xl p-8 text-center text-sm text-muted">
        Impossible de charger les guildes.
      </Card>
    )
  }

  const { guild, joinRequests, unreadMessages, myRequests } = query.data
  return guild ? (
    <GuildHome guild={guild} joinRequests={joinRequests} unreadMessages={unreadMessages} />
  ) : (
    <GuildDiscovery myRequests={myRequests} />
  )
}
