import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Activity } from 'lucide-react'
import { getBurnoutPrediction } from '../../services/burnoutService'

const LEVEL_COLORS = {
  Healthy:  { color: 'var(--green)',  bg: 'var(--green-bg)',  bar: 'var(--green)' },
  Caution:  { color: 'var(--blue)',   bg: 'var(--blue-bg)',   bar: 'var(--blue)' },
  Warning:  { color: 'var(--amber)',  bg: 'var(--amber-bg)',  bar: 'var(--amber)' },
  Critical: { color: 'var(--red)',    bg: 'var(--red-bg)',    bar: 'var(--red)' },
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
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 14 }}>
      <Loader2 size={16} className="spin" style={{ color: 'var(--brand)' }} /> Loading stability data…
    </div>
  )

  if (error || !data) return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Activity size={16} color="var(--brand)" />
        <h3 className="section-title" style={{ marginBottom: 0 }}>Income Stability</h3>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{error || 'No data yet.'}</p>
    </div>
  )

  const colors = LEVEL_COLORS[data.burnout_label] || LEVEL_COLORS.Caution
  const pct = Math.min(100, data.burnout_score || 0)

  return (
    <div className="card" style={{ borderLeft: `3px solid ${colors.color}` }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={15} color={colors.color} />
          <h3 className="section-title" style={{ marginBottom: 0 }}>Income Stability</h3>
        </div>
        <span className="badge" style={{ background: colors.bg, color: colors.color }}>
          {data.burnout_label}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Burnout Risk Score</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.color }}>{pct}/100</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: colors.bar, transition: 'width 1s ease' }} />
        </div>
      </div>

      {/* Mini stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Gap Risk (Next Month)</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: colors.color }}>{data.gap_probability_next_month}%</p>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Volatility</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{data.volatility_label}</p>
        </div>
      </div>

      {/* Recommendation */}
      {data.recommendations?.[0] && (
        <div style={{ background: colors.bg, border: `1px solid ${colors.color}22`, borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8 }}>
          <AlertTriangle size={13} color={colors.color} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong style={{ color: colors.color }}>{data.recommendations[0].priority}:</strong>{' '}
            {data.recommendations[0].action}
          </p>
        </div>
      )}
    </div>
  )
}