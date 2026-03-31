import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { HouseholdProvider, useHousehold } from '@/context/HouseholdContext'
import { ToastProvider } from '@/components/ui/Toast'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Auth pages
import { SignIn } from '@/pages/auth/SignIn'
import { SignUp } from '@/pages/auth/SignUp'
import { AuthCallback } from '@/pages/auth/AuthCallback'
import { OnboardingHousehold } from '@/pages/auth/OnboardingHousehold'

// App pages
import { Dashboard } from '@/pages/Dashboard'
import { Animals } from '@/pages/Animals'
import { AnimalDetail } from '@/pages/AnimalDetail'
import { FeedingLog } from '@/pages/FeedingLog'
import { FeederInventory } from '@/pages/FeederInventory'
import { Expenses } from '@/pages/Expenses'
import { Import } from '@/pages/Import'
import { Settings } from '@/pages/Settings'
import { Terms } from '@/pages/Terms'
import { Privacy } from '@/pages/Privacy'

// Require auth — redirect to sign-in if not logged in
function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a18' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg animate-pulse" style={{ backgroundColor: '#8fbe5a', color: '#1a1a18' }}>
          V
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/auth/signin" replace />
  return <AppShell />
}

// Require household — redirect to onboarding if no household
function RequireHousehold() {
  const { householdId, loading } = useHousehold()

  if (loading) return null
  if (!householdId) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

// Main app layout
function AppShell() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#1a1a18' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route element={<RequireHousehold />}>
            <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="/animals" element={<ErrorBoundary><Animals /></ErrorBoundary>} />
            <Route path="/animals/:id" element={<ErrorBoundary><AnimalDetail /></ErrorBoundary>} />
            <Route path="/feeding" element={<ErrorBoundary><FeedingLog /></ErrorBoundary>} />
            <Route path="/feeders" element={<ErrorBoundary><FeederInventory /></ErrorBoundary>} />
            <Route path="/expenses" element={<ErrorBoundary><Expenses /></ErrorBoundary>} />
            <Route path="/import" element={<ErrorBoundary><Import /></ErrorBoundary>} />
          </Route>
          <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/onboarding" element={<OnboardingHousehold />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HouseholdProvider>
          <ToastProvider>
            <Routes>
              {/* Public auth routes */}
              <Route path="/auth/signin" element={<SignIn />} />
              <Route path="/auth/signup" element={<SignUp />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* All other routes require auth */}
              <Route path="/*" element={<RequireAuth />} />
            </Routes>
          </ToastProvider>
        </HouseholdProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
