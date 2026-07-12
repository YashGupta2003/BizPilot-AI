import { useEffect, useState } from 'react'
import { getDashboardSummary } from '../services/chatService'
import AppLayout from '../components/layout/AppLayout'
import CashFlowForecast from '../components/dashboard/CashFlowForecast'
import BurnoutWidget from '../components/dashboard/BurnoutWidget'

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardSummary().then(setSummary).finally(() => setLoading(false))
  }, [])

  function formatCurrency(amount) {
    return `₹${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }

  return (
    <AppLayout>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Overview of your business at a glance</p>

      {loading ? <p>Loading...</p> : (
        <>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <StatCard label="Total earned" value={formatCurrency(summary.total_earned)} color="#15803d" />
            <StatCard label="Pending" value={formatCurrency(summary.total_pending)} color="#1d4ed8" />
            <StatCard label="Overdue" value={formatCurrency(summary.total_overdue)} color="#b91c1c" />
            <StatCard label="Total clients" value={summary.total_clients} color="#4f46e5" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <CashFlowForecast />
            <BurnoutWidget />
          </div>

          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Top clients by revenue</h3>
            {summary.top_clients?.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 14 }}>No invoices yet.</p>
            ) : (
              <table>
                <thead><tr><th>Client</th><th>Total invoiced</th></tr></thead>
                <tbody>
                  {summary.top_clients.map((c, i) => (
                    <tr key={i}><td>{c.name}</td><td>{formatCurrency(c.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AppLayout>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="card">
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 600, color }}>{value}</p>
    </div>
  )
}