import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', business_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
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
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 400 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Create your account</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Start automating your business admin</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input-field" placeholder="Your name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          <input className="input-field" placeholder="Business name" value={form.business_name} onChange={(e) => update('business_name', e.target.value)} required />
          <input className="input-field" type="email" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          <input className="input-field" type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={(e) => update('password', e.target.value)} required />
          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ fontSize: 14, marginTop: 20, textAlign: 'center', color: '#6b7280' }}>
          Already have an account? <Link to="/login" style={{ color: '#4f46e5', fontWeight: 500 }}>Log in</Link>
        </p>
      </div>
    </div>
  )
}
