import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { bootstrapSession } from '@/api/auth'
import { AppShell } from '@/components/layout/AppShell'
import { ComingSoon } from '@/components/layout/ComingSoon'
import { GuestOnly, RequireAuth } from '@/components/layout/guards'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { QuestsPage } from '@/features/quests/QuestsPage'
import { WeeklyPage } from '@/features/weekly/WeeklyPage'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/app',
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'quests', element: <QuestsPage /> },
          { path: 'weekly', element: <WeeklyPage /> },
          { path: 'deepwork', element: <ComingSoon title="DeepWork" /> },
          { path: 'addictions', element: <ComingSoon title="Addictions" /> },
          { path: 'journal', element: <ComingSoon title="Journal" /> },
          { path: 'leaderboard', element: <ComingSoon title="Classement" /> },
          { path: 'stats', element: <ComingSoon title="Statistiques" /> },
          { path: 'profile', element: <ComingSoon title="Profil" /> },
          { path: 'settings', element: <ComingSoon title="Paramètres" /> },
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
