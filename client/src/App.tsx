import { useEffect } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { bootstrapSession } from '@/api/auth'
import { AppShell } from '@/components/layout/AppShell'
import { GuestOnly, RequireAuth } from '@/components/layout/guards'
import { AddictionsPage } from '@/features/addictions/AddictionsPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DeepWorkPage } from '@/features/deepwork/DeepWorkPage'
import { JournalPage } from '@/features/journal/JournalPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { LeaderboardPage } from '@/features/leaderboard/LeaderboardPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { QuestsPage } from '@/features/quests/QuestsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
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
          { path: 'deepwork', element: <DeepWorkPage /> },
          { path: 'addictions', element: <AddictionsPage /> },
          { path: 'journal', element: <JournalPage /> },
          { path: 'leaderboard', element: <LeaderboardPage /> },
          // Les statistiques vivent désormais sur le Profil.
          { path: 'stats', element: <Navigate to="/app/profile" replace /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'settings', element: <SettingsPage /> },
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
