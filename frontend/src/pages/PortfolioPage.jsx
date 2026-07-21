import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, Zap, AlertTriangle,
  Loader2, BarChart3, Users, DollarSign, Star
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { getPortfolioInsights } from '../services/portfolioService'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

const CHART_COLORS = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#4338ca', '#047857']

const ALERT_STYLES = {
  opportunity: { bg: '#dcfce7', border: '#86efac', text: '#15803d', Icon: TrendingUp },
  insight: { bg: '#eef2ff', border: '#c7d2fe', text: '#4f46e5', Icon: Zap },
  warning: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', Icon: AlertTriangle },
}

function formatCurrency(n) {
  return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function PortfolioPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getPortfolioInsights()
      .then(setData)
      .catch((err) => setError(err.response?.data?.detail || 'Could not load insights.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <AppLayout>
      <h1 className="page-title">Portfolio ROI</h1>
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Loader2 size={32} className="spin" color="#4f46e5" />
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 12 }}>Analyzing your service revenue...</p>
      </div>
    </AppLayout>
  )

  if (error || !data?.has_data) return (
    <AppLayout>
      <h1 className="page-title">Portfolio ROI</h1>
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <BarChart3 size={32} color="#9ca3af" />
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 12 }}>{error || data?.message}</p>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>Mark invoices as 'paid' to see revenue insights by service type.</p>
      </div>
    </AppLayout>
  )

  const pieData = data.service_breakdown.map((s, i) => ({
    name: s.service_type, value: s.total_revenue, color: CHART_COLORS[i % CHART_COLORS.length]
  }))

  return (
    <AppLayout>
      <h1 className="page-title">Portfolio ROI Tracker</h1>
      <p className="page-subtitle">Revenue intelligence from your invoice history — discover your most profitable skills</p>

      {/* Summary stats */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Revenue', value: formatCurrency(data.total_revenue), color: '#15803d', icon: DollarSign },
          { label: 'Total Projects', value: data.total_projects, color: '#4f46e5', icon: BarChart3 },
          { label: 'Avg Project Value', value: formatCurrency(data.avg_project_value), color: '#1d4ed8', icon: TrendingUp },
          { label: 'Services Offered', value: data.unique_services, color: '#7c3aed', icon: Star },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon size={14} color={color} />
              <p style={{ fontSize: 12, color: '#6b7280' }}>{label}</p>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {data.alerts?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {data.alerts.map((alert, i) => {
            const style = ALERT_STYLES[alert.type] || ALERT_STYLES.insight
            const Icon = style.Icon
            return (
              <div key={i} style={{ padding: '12px 16px', borderRadius: 10, background: style.bg, border: `1px solid ${style.border}`, marginBottom: 8, display: 'flex', gap: 10 }}>
                <Icon size={16} color={style.text} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.5 }}>{alert.message}</p>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Revenue by service bar chart */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Revenue by Service Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.service_breakdown} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="service_type" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="total_revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                {data.service_breakdown.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Revenue Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service breakdown table */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Service Performance Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Revenue</th>
              <th>Projects</th>
              <th>Avg Value</th>
              <th>₹/Hour</th>
              <th>Clients</th>
            </tr>
          </thead>
          <tbody>
            {data.service_breakdown.map((s, i) => (
              <tr key={s.service_type}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5 }}>{s.service_type}</span>
                    {i === 0 && <span style={{ fontSize: 10, background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: 999, fontWeight: 600 }}>Top</span>}
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(s.total_revenue)}</td>
                <td>{s.project_count}</td>
                <td>{formatCurrency(s.avg_project_value)}</td>
                <td>{s.revenue_per_hour ? formatCurrency(s.revenue_per_hour) : '—'}</td>
                <td>{s.unique_clients}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top clients */}
      {data.client_insights?.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={15} color="#4f46e5" /> Top Clients by Revenue
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.client_insights.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: 8 }}>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600 }}>{c.client_name}</p>
                  <p style={{ fontSize: 12, color: '#9ca3af' }}>{c.project_count} projects · avg {formatCurrency(c.avg_project_value)}</p>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#4f46e5' }}>{formatCurrency(c.total_paid)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  )
}