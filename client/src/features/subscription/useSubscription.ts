import { planIncludes, type FeatureKey, type PlanTier } from '@one-mission/shared'
import { useQuery } from '@tanstack/react-query'
import { subscriptionApi } from '@/api/subscription'

/** Abonnement du joueur, partagé par toute l'app (cache react-query). */
export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.me,
    staleTime: 60_000,
  })
}

/**
 * Offre effective + test de permission côté client.
 * Le serveur reste l'autorité (403 UPGRADE_REQUIRED) ; ce hook sert à
 * afficher la bonne interface (contenu ou invitation à upgrader).
 */
export function usePlan() {
  const { data, isLoading } = useSubscription()
  const active = data && (data.status === 'ACTIVE' || data.status === 'TRIALING')
  const plan: PlanTier = active ? data.plan : 'STARTER'
  return {
    plan,
    isLoading,
    has: (feature: FeatureKey) => planIncludes(plan, feature),
  }
}
