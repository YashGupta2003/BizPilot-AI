import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle, Loader2 } from 'lucide-react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { getCashFlowForecast } from '../../services/forecastService'

const CONFIDENCE_STYLES = {
  high:               { color: 'var(--green)',  label: 'High confidence' },
  medium:             { color: 'var(--amber)',  label: 'Medium confidence' },
  low:                { color: 'var(--red)',    label: 'Low confidence' },
  insufficient_data:  { color: 'var(--text-muted)', label: 'Not enough data' },
}

const TREND_ICON = {
  increasing: TrendingUp,
  decreasing: TrendingDown,
  flat: Minus,
  unknown: AlertCircle,
}

function formatCurrency(amount) {
  return `₹${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

// Custom dark-mode tooltip for Recharts
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function CashFlowForecast() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getCashFlowForecast(3)
      .then(setData)
      .catch((err) => setError(err.response?.data?.detail || 'Could not load forecast'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 14 }}>
        <Loader2 size={16} className="spin" /> Loading forecast…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card">
        <h3 className="section-title">Cash Flow Forecast</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {error || 'No forecast data available yet.'}
        </p>
      </div>
    )
  }

  const confidence = CONFIDENCE_STYLES[data.confidence_level] || CONFIDENCE_STYLES.low
  const TrendIcon = TREND_ICON[data.trend_direction] || Minus

  const chartData = [
    ...data.history.map((h) => ({ month: h.month_label, actual: h.total_revenue })),
    ...data.forecast.map((f) => ({ month: f.month_label, predicted: f.predicted_revenue, band: [f.lower_bound, f.upper_bound] })),
  ]

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: 2 }}>Cash Flow Forecast</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Based on {data.months_used} month(s) of paid invoices
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: confidence.color, fontSize: 12, fontWeight: 600 }}>
          <TrendIcon size={14} />
          {confidence.label}
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
        {data.confidence_explanation}
      </p>

      {data.forecast.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area dataKey="band" fill="rgba(108,92,231,0.15)" stroke="none" fillOpacity={1} name="Confidence range" connectNulls />
              <Line type="monotone" dataKey="actual" stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--brand)' }} name="Actual" connectNulls />
              <Line type="monotone" dataKey="predicted" stroke="var(--amber)" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: 'var(--amber)' }} name="Predicted" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="grid-3" style={{ marginTop: 14, gap: 8 }}>
            {data.forecast.map((f, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{f.month_label}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(f.predicted_revenue)}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {formatCurrency(f.lower_bound)} – {formatCurrency(f.upper_bound)}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Mark a few more invoices as paid across different months to unlock forecasting.
        </p>
      )}
    </div>
  )
}