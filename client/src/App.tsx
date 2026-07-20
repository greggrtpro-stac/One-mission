import { useEffect } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { bootstrapSession } from '@/api/auth'
import { BetaBanner } from '@/components/BetaBanner'
import { CookieBanner } from '@/components/CookieBanner'
import { AppShell } from '@/components/layout/AppShell'
import { AuthPages, HomeGate, RequireAuth } from '@/components/layout/guards'
import { RouteErrorPage } from '@/components/layout/RouteErrorPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { LandingPage } from '@/features/landing/LandingPage'

/** Racine : bandeau bêta + routes + bannière cookies, présents sur tout le site. */
function Root() {
  return (
    <>
      <BetaBanner />
      <Outlet />
      <CookieBanner />
    </>
  )
}

// Découpage du bundle : la landing et le tunnel de connexion restent dans le
// chunk initial (premier rendu instantané) ; chaque autre page est chargée à
// la demande via route.lazy — recharts (Profil), le planning, etc. ne pèsent
// plus sur la première visite.
const router = createBrowserRouter([
  {
    element: <Root />,
    // Filet de sécurité : une erreur de rendu sur n'importe quelle route
    // affiche cette page au lieu de l'écran gris par défaut de React Router.
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/',
        element: (
          <HomeGate>
            <LandingPage />
          </HomeGate>
        ),
      },
      // Pages juridiques — publiques, accessibles connecté ou non.
      {
        path: '/mentions-legales',
        lazy: async () => ({
          Component: (await import('@/features/legal/MentionsLegalesPage')).MentionsLegalesPage,
        }),
      },
      {
        path: '/confidentialite',
        lazy: async () => ({
          Component: (await import('@/features/legal/ConfidentialitePage')).ConfidentialitePage,
        }),
      },
      {
        path: '/cookies',
        lazy: async () => ({
          Component: (await import('@/features/legal/CookiesPage')).CookiesPage,
        }),
      },
      {
        element: <AuthPages />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          {
            path: '/forgot-password',
            lazy: async () => ({
              Component: (await import('@/features/auth/ForgotPasswordPage')).ForgotPasswordPage,
            }),
          },
          {
            path: '/reset-password',
            lazy: async () => ({
              Component: (await import('@/features/auth/ResetPasswordPage')).ResetPasswordPage,
            }),
          },
          {
            path: '/verify-email',
            lazy: async () => ({
              Component: (await import('@/features/auth/VerifyEmailPage')).VerifyEmailPage,
            }),
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/app',
            element: <AppShell />,
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import('@/features/dashboard/DashboardPage')).DashboardPage,
                }),
              },
              {
                path: 'quests',
                lazy: async () => ({
                  Component: (await import('@/features/quests/QuestsPage')).QuestsPage,
                }),
              },
              {
                path: 'weekly',
                lazy: async () => ({
                  Component: (await import('@/features/weekly/WeeklyPage')).WeeklyPage,
                }),
              },
              {
                path: 'routine',
                lazy: async () => ({
                  Component: (await import('@/features/routines/RoutinesPage')).RoutinesPage,
                }),
              },
              {
                path: 'planning',
                lazy: async () => ({
                  Component: (await import('@/features/planning/PlanningPage')).PlanningPage,
                }),
              },
              {
                path: 'deepwork',
                lazy: async () => ({
                  Component: (await import('@/features/deepwork/DeepWorkPage')).DeepWorkPage,
                }),
              },
              {
                path: 'addictions',
                lazy: async () => ({
                  Component: (await import('@/features/addictions/AddictionsPage')).AddictionsPage,
                }),
              },
              {
                path: 'journal',
                lazy: async () => ({
                  Component: (await import('@/features/journal/JournalPage')).JournalPage,
                }),
              },
              {
                path: 'leaderboard',
                lazy: async () => ({
                  Component: (await import('@/features/leaderboard/LeaderboardPage'))
                    .LeaderboardPage,
                }),
              },
              {
                path: 'guilds',
                lazy: async () => ({
                  Component: (await import('@/features/guilds/GuildsPage')).GuildsPage,
                }),
              },
              {
                path: 'guilds/:guildId',
                lazy: async () => ({
                  Component: (await import('@/features/guilds/GuildProfilePage'))
                    .GuildProfilePage,
                }),
              },
              {
                path: 'guilds/:guildId/stats',
                lazy: async () => ({
                  Component: (await import('@/features/guilds/GuildStatsPage')).GuildStatsPage,
                }),
              },
              {
                path: 'friends',
                lazy: async () => ({
                  Component: (await import('@/features/friends/FriendsPage')).FriendsPage,
                }),
              },
              // Profil public d'un joueur, ouvert en cliquant sur sa carte du classement.
              {
                path: 'leaderboard/:userId',
                lazy: async () => ({
                  Component: (await import('@/features/leaderboard/PublicProfilePage'))
                    .PublicProfilePage,
                }),
              },
              // Les statistiques vivent désormais sur le Profil.
              { path: 'stats', element: <Navigate to="/app/profile" replace /> },
              {
                path: 'changelog',
                lazy: async () => ({
                  Component: (await import('@/features/changelog/ChangelogPage')).ChangelogPage,
                }),
              },
              {
                path: 'level-up',
                lazy: async () => ({
                  Component: (await import('@/features/subscription/LevelUpPage')).LevelUpPage,
                }),
              },
              {
                path: 'checkout',
                lazy: async () => ({
                  Component: (await import('@/features/subscription/CheckoutPage')).CheckoutPage,
                }),
              },
              {
                path: 'subscription',
                lazy: async () => ({
                  Component: (await import('@/features/subscription/SubscriptionPage'))
                    .SubscriptionPage,
                }),
              },
              {
                path: 'profile',
                lazy: async () => ({
                  Component: (await import('@/features/profile/ProfilePage')).ProfilePage,
                }),
              },
              {
                path: 'settings',
                lazy: async () => ({
                  Component: (await import('@/features/settings/SettingsPage')).SettingsPage,
                }),
              },
            ],
          },
        ],
      },
    ],
  },
])

export default function App() {
  useEffect(() => {
    void bootstrapSession()
  }, [])

  return <RouterProvider router={router} />
}
