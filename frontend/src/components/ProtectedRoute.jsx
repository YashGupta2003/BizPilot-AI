import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{
          width: 44, height: 44,
          background: 'var(--brand-grad)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, boxShadow: 'var(--brand-glow)'
        }}>🚀</div>
        <Loader2 size={20} className="spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
