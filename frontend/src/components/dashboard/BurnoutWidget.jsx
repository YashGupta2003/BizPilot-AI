import { useEffect, useState } from 'react'
import { TrendingDown, AlertTriangle, CheckCircle2, Loader2, Activity } from 'lucide-react'
import { getBurnoutPrediction } from '../../services/burnoutService'

const BURNOUT_COLORS = {
  Healthy: { bg: '#dcfce7', border: '#86efac', text: '#15803d', bar: '#22c55e' },
  Caution: { bg: '#fef9c3', border: '#fde047', text: '#854d0e', bar: '#eab308' },
  Warning: { bg: '#ffedd5', border: '#fdba74', text: '#9a3412', bar: '#f97316' },
  Critical: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', bar: '#ef4444' },
}

export default function BurnoutWidget() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getBurnoutPrediction()
      .then(setData)
      .catch((err) => setError(err.response?.data?.detail || 'Could not load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Activity size={16} color="#4f46e5" />
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Income Stability</h3>
      </div>
      <Loader2 size={20} className="spin" color="#4f46e5" />
    </div>
  )

  if (error) return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Activity size={16} color="#4f46e5" />
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Income Stability</h3>
      </div>
      <p style={{ fontSize: 13, color: '#9ca3af' }}>{error}</p>
    </div>
  )

  if (!data) return null

  const colors = BURNOUT_COLORS[data.burnout_label] || BURNOUT_COLORS.Caution
  const pct = data.burnout_score

  return (
    <div className="card" style={{ border: `1px solid ${colors.border}`, background: colors.bg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} color={colors.text} />
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1d23' }}>Income Stability</h3>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'white', color: colors.text }}>
          {data.burnout_label}
        </span>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: colors.text }}>Burnout Risk</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{data.burnout_score}/100</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 99 }}>
          <div style={{ height: 8, borderRadius: 99, width: `${pct}%`, background: colors.bar, transition: 'width 0.8s' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 7, padding: '8px 10px' }}>
          <p style={{ fontSize: 11, color: colors.text, marginBottom: 2 }}>Gap Risk (Next Month)</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{data.gap_probability_next_month}%</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 7, padding: '8px 10px' }}>
          <p style={{ fontSize: 11, color: colors.text, marginBottom: 2 }}>Income Volatility</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{data.volatility_label}</p>
        </div>
      </div>

      {data.recommendations?.[0] && (
        <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 6 }}>
          <AlertTriangle size={13} color={colors.text} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
            <strong style={{ color: colors.text }}>{data.recommendations[0].priority}:</strong>{' '}
            {data.recommendations[0].action}
          </p>
        </div>
      )}
    </div>
  )
}