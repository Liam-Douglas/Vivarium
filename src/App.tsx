import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { HouseholdProvider, useHousehold } from '@/context/HouseholdContext'
import { ToastProvider } from '@/components/ui/Toast'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAnimals } from '@/hooks/useAnimals'
import { useOverdueNotification } from '@/hooks/useOverdueNotification'

// Auth pages
import { SignIn } from '@/pages/auth/SignIn'
import { SignUp } from '@/pages/auth/SignUp'
import { AuthCallback } from '@/pages/auth/AuthCallback'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { OnboardingHousehold } from '@/pages/auth/OnboardingHousehold'

// App pages
import { Dashboard } from '@/pages/Dashboard'
import { Animals } from '@/pages/Animals'
import { AnimalDetail } from '@/pages/AnimalDetail'
import { FeedingLog } from '@/pages/FeedingLog'
import { Expenses } from '@/pages/Expenses'
import { Settings } from '@/pages/Settings'
import { Stats } from '@/pages/Stats'
import { Reminders } from '@/pages/Reminders'
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

function OverdueWatcher() {
  const { data: animals } = useAnimals()
  useOverdueNotification(animals)
  return null
}

// Main app layout
function AppShell() {
  const { householdId } = useHousehold()
  // Every destination in the nav is household-scoped, so it has nothing to
  // offer someone who isn't in a household yet. Onboarding and the waiting
  // screen used to render a full nav bar whose every link bounced straight
  // back here.
  const showNav = !!householdId

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#1a1a18' }}>
      {showNav && <Sidebar />}
      {/* index.html sets viewport-fit=cover, which extends the page under the
          status bar and the notch. BottomNav has always compensated at the
          bottom with env(safe-area-inset-bottom); nothing did at the top, so
          installed as a PWA every page began underneath the clock — most
          visibly on an animal's profile, where the name sits over a full-bleed
          hero with no padding to absorb it. The inset is zero in a browser tab
          and on desktop, so this only pays where it is needed. */}
      <main
        className="flex-1 flex flex-col min-w-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Routes>
          <Route element={<RequireHousehold />}>
            <Route path="/" element={<><OverdueWatcher /><ErrorBoundary><Dashboard /></ErrorBoundary></>} />
            <Route path="/animals" element={<ErrorBoundary><Animals /></ErrorBoundary>} />
            <Route path="/animals/:id" element={<ErrorBoundary><AnimalDetail /></ErrorBoundary>} />
            <Route path="/feeding" element={<ErrorBoundary><FeedingLog /></ErrorBoundary>} />
            <Route path="/calendar" element={<Navigate to="/feeding" replace />} />
            <Route path="/feeders" element={<ErrorBoundary><Expenses initialTab="feeders" /></ErrorBoundary>} />
            <Route path="/expenses" element={<ErrorBoundary><Expenses /></ErrorBoundary>} />
            <Route path="/import" element={<ErrorBoundary><Settings initialTab="import" /></ErrorBoundary>} />
            <Route path="/stats" element={<ErrorBoundary><Stats /></ErrorBoundary>} />
            <Route path="/reminders" element={<ErrorBoundary><Reminders /></ErrorBoundary>} />
          </Route>
          <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/onboarding" element={<OnboardingHousehold />} />
        </Routes>
      </main>
      {showNav && <BottomNav />}
    </div>
  )
}

// Reload the page when a new service worker takes control (ensures fresh JS is loaded)
function useSWUpdateReload() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let refreshing = false
    const handler = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', handler)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handler)
  }, [])
}

export default function App() {
  useSWUpdateReload()
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
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset" element={<ResetPassword />} />

              {/* All other routes require auth */}
              <Route path="/*" element={<RequireAuth />} />
            </Routes>
          </ToastProvider>
        </HouseholdProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
