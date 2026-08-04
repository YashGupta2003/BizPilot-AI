import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2, UserPlus, Eye, EyeOff, Check } from 'lucide-react'

const perks = [
  'AI-powered invoice & contract generation',
  'Client health tracking & LTV analysis',
  'Smart negotiation & scope protection',
  'Tax assistant & financial forecasting',
]

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', business_name: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setError('')
    setLoading(true)
    try {
      await signup(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 60, alignItems: 'center', maxWidth: 900, width: '100%', padding: '0 24px' }}>
        {/* Left — perks */}
        <div className="fade-in-up" style={{ display: 'none', flexDirection: 'column', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, background: 'var(--brand-grad)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚀</div>
              <span style={{ fontSize: 17, fontWeight: 700 }}>BizPilot AI</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.2, marginBottom: 12 }}>
              Run your freelance business<br />
              <span className="gradient-text">on autopilot</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
              25+ AI-powered tools to manage clients, invoices, contracts, taxes, and more.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {perks.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 22, height: 22, background: 'var(--green-bg)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={12} color="var(--green)" />
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="auth-card fade-in-up">
          <div className="auth-logo">
            <div className="auth-logo-icon">🚀</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>BizPilot AI</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Start free today</div>
            </div>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.4px' }}>
            Create your account
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>
            Your AI co-pilot for freelance success
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div>
              <label className="form-label">Full name</label>
              <input
                className="input-field"
                placeholder="Yash Gupta"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label className="form-label">Business / Freelance name</label>
              <input
                className="input-field"
                placeholder="YG Design Studio"
                value={form.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Email address</label>
              <input
                className="input-field"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  required
                  style={{ paddingRight: 42 }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: 4 }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

          <div className="divider" style={{ margin: '24px 0' }} />

          <p style={{ fontSize: 14, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--brand-2)', fontWeight: 600 }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
