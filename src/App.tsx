import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import TranscribePage from '@/pages/TranscribePage'
import HistoryPage from '@/pages/HistoryPage'
import LoginPage from '@/pages/LoginPage'
import AdminPage from '@/pages/AdminPage'
import { Layout } from '@/components/Layout'
import { Toaster } from '@/components/ui/toaster'
import { getStoredTheme, applyTheme } from '@/lib/theme-config'
import './index.css'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Layout>
            <LoginPage />
          </Layout>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout>
              <TranscribePage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/history"
        element={
          <PrivateRoute>
            <Layout>
              <HistoryPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <Layout>
              <AdminPage />
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

function App() {
  // Apply saved theme on app load
  useEffect(() => {
    const savedTheme = getStoredTheme()
    applyTheme(savedTheme)
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="dark">
          <AppRoutes />
          <Toaster />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
