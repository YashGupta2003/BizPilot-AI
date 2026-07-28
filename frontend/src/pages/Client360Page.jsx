import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users, FileText, ScrollText, Mic2, MessageSquare,
  Brain, AlertTriangle, CheckCircle2, TrendingUp,
  Clock, DollarSign, Activity, ArrowRight, ChevronRight
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import api from '../services/api'

const HEALTH_COLORS = {
  Healthy: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  Fair: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  'At Risk': { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  Critical: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
}

const TIMELINE_ICONS = {
  invoice: { icon: FileText, color: '#4f46e5' },
  contract: { icon: ScrollText, color: '#15803d' },
  meeting: { icon: Mic2, color: '#7c3aed' },
  reminder: { icon: MessageSquare, color: '#d97706' },
  risk: { icon: AlertTriangle, color: '#dc2626' },
  profile: { icon: Brain, color: '#0891b2' },
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={14} color={color} />
        <p style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
    </div>
  )
}

function HealthMeter({ score, label, color }) {
  const bgColor = { green: '#dcfce7', yellow: '#fef3c7', orange: '#ffedd5', red: '#fee2e2' }[color] || '#f3f4f6'
  const fgColor = { green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444' }[color] || '#6b7280'
  const textColor = { green: '#15803d', yellow: '#854d0e', orange: '#9a3412', red: '#991b1b' }[color] || '#374151'

  return (
    <div style={{ textAlign: 'center', padding: '16px', background: bgColor, borderRadius: 12 }}>
      <div style={{ fontSize: 40, fontWeight: 900, color: textColor, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: 12, color: textColor, fontWeight: 600, marginTop: 2 }}>/100</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: textColor, marginTop: 4 }}>{label}</div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.5)', borderRadius: 99, marginTop: 8 }}>
        <div style={{ height: 6, borderRadius: 99, width: `${score}%`, background: fgColor, transition: 'width 1s' }} />
      </div>
    </div>
  )
}

function TimelineItem({ event }) {
  const { icon: Icon, color } = TIMELINE_ICONS[event.type] || { icon: Clock, color: '#6b7280' }
  const date = new Date(event.date)
  const dateStr = isNaN(date) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: 14, borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23' }}>{event.title}</p>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>{event.subtitle}</p>
      </div>
      <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{dateStr}</span>
    </div>
  )
}

function NextActionBanner({ action }) {
  const priorityColors = {
    URGENT: { bg: '#fee2e2', border: '#fecaca', text: '#b91c1c' },
    HIGH: { bg: '#ffedd5', border: '#fdba74', text: '#9a3412' },
    MEDIUM: { bg: '#fef3c7', border: '#fde68a', text: '#854d0e' },
    LOW: { bg: '#dcfce7', border: '#86efac', text: '#15803d' },
  }
  const navigate = useNavigate()
  const colors = priorityColors[action.priority] || priorityColors.LOW

  return (
    <div
      onClick={() => navigate(action.link)}
      style={{ padding: '12px 16px', borderRadius: 10, background: colors.bg, border: `1px solid ${colors.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.text, background: 'white', padding: '2px 8px', borderRadius: 999, marginRight: 8 }}>
          {action.priority}
        </span>
        <span style={{ fontSize: 13.5, color: '#374151' }}>{action.action}</span>
      </div>
      <ChevronRight size={16} color={colors.text} />
    </div>
  )
}

export default function Client360Page() {
  const { clientId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get(`/client360/${clientId}`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return (
    <AppLayout>
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Activity size={32} color="#4f46e5" className="spin" />
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 12 }}>Loading client intelligence...</p>
      </div>
    </AppLayout>
  )

  if (!data) return <AppLayout><p>Client not found.</p></AppLayout>

  const { client, summary, payment_behavior, health_score, next_action, timeline,
    invoices, contracts, meetings } = data

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>{client.name?.[0]}</span>
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700 }}>{client.name}</h1>
              <p style={{ fontSize: 13, color: '#6b7280' }}>{client.company || client.email || 'No company'}</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'New Invoice', icon: FileText, link: '/invoices' },
            { label: 'New Contract', icon: ScrollText, link: '/contracts' },
            { label: 'Log Meeting', icon: Mic2, link: '/meetings' },
          ].map(({ label, icon: Icon, link }) => (
            <button key={label} onClick={() => navigate(link)}
              className="btn-secondary"
              style={{ fontSize: 12, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Next Action */}
      {next_action && (
        <div style={{ marginBottom: 16 }}>
          <NextActionBanner action={next_action} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <StatCard label="Total Invoiced" value={fmt(summary.total_invoiced)} color="#4f46e5" icon={DollarSign} />
            <StatCard label="Total Paid" value={fmt(summary.total_paid)} color="#15803d" icon={CheckCircle2} />
            <StatCard label="Pending" value={fmt(summary.total_pending)} color="#d97706" icon={Clock} />
            <StatCard label="Overdue" value={fmt(summary.total_overdue)} color="#dc2626" icon={AlertTriangle} />
          </div>

          {/* Payment behavior */}
          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Payment Behavior</h3>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: payment_behavior.score >= 70 ? '#15803d' : payment_behavior.score >= 40 ? '#d97706' : '#dc2626' }}>
                  {payment_behavior.label}
                </p>
                <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{payment_behavior.details}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
                {[
                  { label: 'Invoices', value: summary.invoice_count },
                  { label: 'Paid', value: summary.paid_count },
                  { label: 'Contracts', value: summary.contract_count },
                  { label: 'Meetings', value: summary.meeting_count },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center', background: '#f9fafb', borderRadius: 7, padding: '6px' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23' }}>{value}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Full Activity Timeline</h3>
            {timeline.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>No activity yet.</p>
            ) : (
              <div>
                {timeline.map((event, i) => <TimelineItem key={i} event={event} />)}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Health score */}
          <HealthMeter
            score={health_score.score}
            label={health_score.label}
            color={health_score.color}
          />
          <div className="card" style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.5 }}>
            {health_score.recommendation}
          </div>

          {/* Recent invoices */}
          {invoices?.length > 0 && (
            <div className="card">
              <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#6b7280', textTransform: 'uppercase' }}>Recent Invoices</h4>
              {invoices.map((inv, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5 }}>{inv.invoice_number}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>₹{inv.total?.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: inv.status === 'paid' ? '#dcfce7' : inv.status === 'overdue' ? '#fee2e2' : '#f3f4f6', color: inv.status === 'paid' ? '#15803d' : inv.status === 'overdue' ? '#b91c1c' : '#4b5563' }}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick links */}
          <div className="card">
            <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#6b7280', textTransform: 'uppercase' }}>Quick Actions</h4>
            {[
              { label: 'Profile this client', icon: Brain, link: '/profiler' },
              { label: 'Send reminder', icon: MessageSquare, link: '/reminders' },
              { label: 'Generate contract', icon: ScrollText, link: '/contracts' },
              { label: 'Practice negotiation', icon: TrendingUp, link: '/negotiate' },
            ].map(({ label, icon: Icon, link }) => (
              <button key={label} onClick={() => navigate(link)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#374151' }}>
                <Icon size={14} color="#4f46e5" /> {label}
                <ChevronRight size={13} color="#9ca3af" style={{ marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}