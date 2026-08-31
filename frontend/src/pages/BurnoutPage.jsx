import { useEffect, useState } from 'react'
import {
  Activity, AlertTriangle, CheckCircle2, Loader2,
  TrendingDown, TrendingUp, Minus, DollarSign, Send,
  Shield, Users, PiggyBank
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { getBurnoutPrediction } from '../services/burnoutService'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const BURNOUT_COLORS = {
  Healthy: { bg: '#dcfce7', border: '#86efac', text: '#15803d', bar: '#22c55e' },
  Caution: { bg: '#fef9c3', border: '#fde047', text: '#854d0e', bar: '#eab308' },
  Warning: { bg: '#ffedd5', border: '#fdba74', text: '#9a3412', bar: '#f97316' },
  Critical: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', bar: '#ef4444' },
}

const PRIORITY_COLORS = {
  HIGH: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
  MEDIUM: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  LOW: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
}

const ACTION_ICONS = {
  send: Send, shield: Shield, alert: AlertTriangle,
  users: Users, piggy: PiggyBank, check: CheckCircle2,
}

function TrendIcon({ trend }) {
  if (trend === 'growing') return <TrendingUp size={16} color="#15803d" />
  if (trend === 'declining') return <TrendingDown size={16} color="#dc2626" />
  return <Minus size={16} color="#6b7280" />
}

function formatCurrency(n) {
  return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function BurnoutPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getBurnoutPrediction()
      .then(setData)
      .catch((err) => setError(err.response?.data?.detail || 'Could not load prediction.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <AppLayout>
      <h1 className="page-title">Income Stability</h1>
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Loader2 size={32} className="spin" color="#4f46e5" />
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>Analyzing your income patterns...</p>
      </div>
    </AppLayout>
  )

  if (error) return (
    <AppLayout>
      <h1 className="page-title">Income Stability</h1>
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <Activity size={32} color="#9ca3af" />
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>{error}</p>
      </div>
    </AppLayout>
  )

  if (!data) return null

  const colors = BURNOUT_COLORS[data.burnout_label] || BURNOUT_COLORS.Caution

  const chartData = data.monthly_stats?.map((m) => ({
    month: m.month,
    revenue: m.paid_revenue,
    invoices: m.invoice_count,
  })) || []

  return (
    <AppLayout>
      <h1 className="page-title">Income Stability Predictor</h1>
      <p className="page-subtitle">
        AI analysis of your income patterns — predict gaps before they happen
      </p>

      {/* Burnout score header */}
      <div style={{ padding: '20px 24px', borderRadius: 12, background: colors.bg, border: `1px solid ${colors.border}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Activity size={18} color={colors.text} />
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Burnout Risk: {data.burnout_label}</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Based on {data.months_analyzed} months of invoice history</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: colors.text, lineHeight: 1 }}>{data.burnout_score}</div>
            <div style={{ fontSize: 12, color: colors.text }}>/ 100 risk</div>
          </div>
        </div>
        <div style={{ height: 10, background: 'rgba(255,255,255,0.5)', borderRadius: 99 }}>
          <div style={{ height: 10, borderRadius: 99, width: `${data.burnout_score}%`, background: colors.bar, transition: 'width 1s' }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Avg Monthly Revenue', value: formatCurrency(data.avg_monthly_revenue), icon: DollarSign, color: '#15803d' },
          { label: 'Gap Risk Next Month', value: `${data.gap_probability_next_month}%`, icon: AlertTriangle, color: data.gap_probability_next_month >= 70 ? '#dc2626' : '#d97706' },
          { label: 'Income Volatility', value: data.volatility_label, icon: Activity, color: 'var(--brand)' },
          { label: 'Income Trend', value: data.income_trend?.replace('_', ' '), icon: ({ size, color }) => <TrendIcon trend={data.income_trend} />, color: 'var(--text-primary)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon size={14} color={color} />
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</p>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color, textTransform: 'capitalize' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Monthly Revenue (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Area type="monotone" dataKey="revenue" stroke="var(--brand)" fill="var(--border)" strokeWidth={2} name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
          {data.best_month && (
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <p style={{ fontSize: 12, color: '#15803d' }}>
                Best: {data.best_month.month} ({formatCurrency(data.best_month.revenue)})
              </p>
              <p style={{ fontSize: 12, color: '#dc2626' }}>
                Worst: {data.worst_month?.month} ({formatCurrency(data.worst_month?.revenue)})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations?.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Action Plan</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.recommendations.map((rec, i) => {
              const pc = PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.LOW
              const ActionIcon = ACTION_ICONS[rec.icon] || CheckCircle2
              return (
                <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: pc.bg, border: `1px solid ${pc.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <ActionIcon size={16} color={pc.text} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{rec.action}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, color: pc.text, background: 'var(--bg-card)', padding: '1px 7px', borderRadius: 999 }}>{rec.priority}</span>
                      </div>
                      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec.reason}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </AppLayout>
  )
}