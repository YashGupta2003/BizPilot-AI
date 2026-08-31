import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, DollarSign, AlertCircle, Users,
  ChevronRight, Loader2, WifiOff, RefreshCw,
  ArrowUpRight, FileText, Zap, Activity
} from 'lucide-react'
import { getDashboardSummary } from '../services/chatService'
import AppLayout from '../components/layout/AppLayout'
import CashFlowForecast from '../components/dashboard/CashFlowForecast'
import BurnoutWidget from '../components/dashboard/BurnoutWidget'
import SmartAlerts from '../components/dashboard/SmartAlerts'
import { getTaxChecklist } from '../services/taxService'

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState(false)
  const [taxAlerts, setTaxAlerts] = useState(null)
  const navigate = useNavigate()

  function fetchData() {
    setLoading(true)
    setServerError(false)
    getDashboardSummary()
      .then(setSummary)
      .catch(() => setServerError(true))
      .finally(() => setLoading(false))
    getTaxChecklist().then(setTaxAlerts).catch(() => {})
  }

  useEffect(() => { fetchData() }, [])

  function formatCurrency(amount) {
    return `₹${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }

  const quickActions = [
    { label: 'New Invoice', icon: FileText,   to: '/invoices',  color: 'var(--blue)' },
    { label: 'AI Tools',    icon: Zap,         to: '/assistant', color: 'var(--purple)' },
    { label: 'Client LTV',  icon: TrendingUp,  to: '/ltv',      color: 'var(--green)' },
    { label: 'Tax Check',   icon: Activity,    to: '/tax',      color: 'var(--amber)' },
  ]

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your business at a glance</p>
        </div>
        {!loading && (
          <button onClick={fetchData} className="btn-ghost btn-sm" title="Refresh">
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {/* Smart Alerts */}
      <SmartAlerts />

      {/* Tax Alert Banner */}
      {taxAlerts?.urgent_count > 0 && (
        <div
          onClick={() => navigate('/tax')}
          className="alert alert-warning"
          style={{ cursor: 'pointer', justifyContent: 'space-between', marginBottom: 20 }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>🧾</span>
            <span style={{ fontWeight: 600 }}>
              {taxAlerts.urgent_count} tax filing action{taxAlerts.urgent_count !== 1 ? 's' : ''} pending this quarter
            </span>
          </div>
          <ChevronRight size={16} />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading-state">
          <Loader2 size={28} className="spin" style={{ color: 'var(--brand)' }} />
          <span>Loading your dashboard…</span>
        </div>
      )}

      {/* Server offline state */}
      {!loading && serverError && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div className="empty-state-icon">
              <WifiOff size={22} color="var(--text-muted)" />
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Cannot reach the server</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
            Make sure the backend is running at <code>http://localhost:8000</code>
          </p>
          <button onClick={fetchData} className="btn-primary btn-sm">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Main content */}
      {!loading && !serverError && summary && (
        <>
          {/* Stat cards */}
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <StatCard
              label="Total Earned"
              value={formatCurrency(summary.total_earned)}
              icon={DollarSign}
              color="var(--green)"
              colorBg="var(--green-bg)"
            />
            <StatCard
              label="Pending"
              value={formatCurrency(summary.total_pending)}
              icon={TrendingUp}
              color="var(--blue)"
              colorBg="var(--blue-bg)"
            />
            <StatCard
              label="Overdue"
              value={formatCurrency(summary.total_overdue)}
              icon={AlertCircle}
              color="var(--red)"
              colorBg="var(--red-bg)"
            />
            <StatCard
              label="Total Clients"
              value={summary.total_clients || 0}
              icon={Users}
              color="var(--purple)"
              colorBg="var(--purple-bg)"
            />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <CashFlowForecast />
            <BurnoutWidget />
          </div>

          {/* Quick actions + Top clients */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
            {/* Quick actions */}
            <div className="card">
              <h3 className="section-title">Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {quickActions.map(({ label, icon: Icon, to, color }) => (
                  <button
                    key={to}
                    onClick={() => navigate(to)}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  >
                    <div style={{ width: 30, height: 30, background: color, opacity: 0.85, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={15} color="white" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Top clients */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>Top Clients by Revenue</h3>
                <button onClick={() => navigate('/clients')} className="btn-ghost btn-sm">
                  View all <ArrowUpRight size={12} />
                </button>
              </div>

              {!summary.top_clients?.length ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-state-icon"><Users size={20} color="var(--text-muted)" /></div>
                  <span>No invoices yet. Add your first client!</span>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th style={{ textAlign: 'right' }}>Total Invoiced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.top_clients.map((c, i) => (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => navigate('/clients')}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 28, height: 28,
                              background: `hsl(${(i * 60) % 360}, 60%, 20%)`,
                              borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                              color: `hsl(${(i * 60) % 360}, 80%, 70%)`,
                              flexShrink: 0
                            }}>
                              {c.name?.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 500 }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>
                          {formatCurrency(c.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  )
}

function StatCard({ label, value, icon: Icon, color, colorBg }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="stat-label">{label}</span>
        <div style={{ width: 34, height: 34, background: colorBg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  )
}