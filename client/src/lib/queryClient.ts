import { QueryClient } from '@tanstack/react-query'

/**
 * Client React Query partagé — dans son propre module (et non main.tsx) pour
 * que la couche API puisse le purger aux changements d'identité : les clés de
 * requêtes (['journal'], ['dashboard']…) ne sont pas liées à un utilisateur,
 * un changement de compte sans purge afficherait les données du compte
 * précédent le temps du refetch.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})
