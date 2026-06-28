import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { getCashFlowForecast } from '../../services/forecastService'

const CONFIDENCE_STYLES = {
  high: { color: '#15803d', bg: '#dcfce7', label: 'High confidence' },
  medium: { color: '#92400e', bg: '#fef3c7', label: 'Medium confidence' },
  low: { color: '#b91c1c', bg: '#fee2e2', label: 'Low confidence' },
  insufficient_data: { color: '#6b7280', bg: '#f3f4f6', label: 'Not enough data yet' },
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
    return <div className="card"><p style={{ fontSize: 14, color: '#6b7280' }}>Loading forecast...</p></div>
  }

  if (error) {
    return (
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Cash Flow Forecast</h3>
        <p style={{ fontSize: 13.5, color: '#6b7280' }}>{error}</p>
      </div>
    )
  }

  if (!data) return null

  const confidence = CONFIDENCE_STYLES[data.confidence_level] || CONFIDENCE_STYLES.low
  const TrendIcon = TREND_ICON[data.trend_direction] || Minus

  // Merge history + forecast into one chart-friendly array.
  // History months have `actual` set; forecast months have `predicted` + band.
  const chartData = [
    ...data.history.map((h) => ({
      month: h.month_label,
      actual: h.total_revenue,
    })),
    ...data.forecast.map((f) => ({
      month: f.month_label,
      predicted: f.predicted_revenue,
      band: [f.lower_bound, f.upper_bound],
    })),
  ]

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Cash Flow Forecast</h3>
          <p style={{ fontSize: 12.5, color: '#6b7280' }}>Based on {data.months_used} month(s) of paid invoices</p>
        </div>
        <span
          className="badge"
          style={{ background: confidence.bg, color: confidence.color, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <TrendIcon size={13} />
          {confidence.label}
        </span>
      </div>

      <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 14 }}>{data.confidence_explanation}</p>

      {data.forecast.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                dataKey="band"
                fill="#c7d2fe"
                stroke="none"
                fillOpacity={0.4}
                name="Confidence range"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                name="Actual revenue"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 3 }}
                name="Predicted revenue"
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="grid-3" style={{ marginTop: 16 }}>
            {data.forecast.map((f, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '10px 8px', background: '#f9fafb', borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: '#6b7280' }}>{f.month_label}</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#1a1d23' }}>{formatCurrency(f.predicted_revenue)}</p>
                <p style={{ fontSize: 11, color: '#9ca3af' }}>
                  {formatCurrency(f.lower_bound)} – {formatCurrency(f.upper_bound)}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13.5, color: '#6b7280' }}>
          Mark a few more invoices as paid across different months to unlock forecasting.
        </p>
      )}
    </div>
  )
}