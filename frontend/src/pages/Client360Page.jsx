import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users, FileText, ScrollText, Mic2, MessageSquare,
  Brain, AlertTriangle, CheckCircle2, TrendingUp,
  Clock, DollarSign, Activity, ChevronRight
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import api from '../services/api'
import { getClientLTV } from '../services/ltvService'

const HEALTH_COLORS = {
  Healthy: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  Fair: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  'At Risk': { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' },
  Critical: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
}

const TIMELINE_ICONS = {
  invoice: { icon: FileText, color: 'var(--brand)' },
  contract: { icon: ScrollText, color: '#15803d' },
  meeting: { icon: Mic2, color: '#7c3aed' },
  reminder: { icon: MessageSquare, color: '#d97706' },
  risk: { icon: AlertTriangle, color: '#dc2626' },
  profile: { icon: Brain, color: '#0891b2' },
}

const SEGMENT_STYLES = {
  Champion:  { bg: '#dcfce7', text: '#15803d' },
  Loyal:     { bg: '#dbeafe', text: '#1d4ed8' },
  Promising: { bg: '#ede9fe', text: '#6d28d9' },
  'At Risk': { bg: '#ffedd5', text: '#9a3412' },
  'One-Time':{ bg: 'var(--bg-elevated)', text: '#4b5563' },
  New:       { bg: '#e0f2fe', text: '#0369a1' },
}

const CONFIDENCE_COLORS = {
  HIGH: '#15803d',
  MEDIUM: '#d97706',
  LOW: 'var(--text-muted)',
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={14} color={color} />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
    </div>
  )
}

function HealthMeter({ score, label, color }) {
  const bgColor  = { green: '#dcfce7', yellow: '#fef3c7', orange: '#ffedd5', red: '#fee2e2' }[color] || '#f3f4f6'
  const fgColor  = { green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444' }[color] || '#6b7280'
  const textColor = { green: '#15803d', yellow: '#854d0e', orange: '#9a3412', red: '#991b1b' }[color] || 'var(--text-secondary)'

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
  const { icon: Icon, color } = TIMELINE_ICONS[event.type] || { icon: Clock, color: 'var(--text-muted)' }
  const date = new Date(event.date)
  const dateStr = isNaN(date) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{event.title}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{event.subtitle}</p>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{dateStr}</span>
    </div>
  )
}

function NextActionBanner({ action }) {
  const navigate = useNavigate()
  const priorityColors = {
    URGENT: { bg: '#fee2e2', border: '#fecaca', text: '#b91c1c' },
    HIGH:   { bg: '#ffedd5', border: '#fdba74', text: '#9a3412' },
    MEDIUM: { bg: '#fef3c7', border: '#fde68a', text: '#854d0e' },
    LOW:    { bg: '#dcfce7', border: '#86efac', text: '#15803d' },
  }
  const colors = priorityColors[action.priority] || priorityColors.LOW

  return (
    <div
      onClick={() => navigate(action.link)}
      style={{ padding: '12px 16px', borderRadius: 10, background: colors.bg, border: `1px solid ${colors.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.text, background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 999, marginRight: 8 }}>
          {action.priority}
        </span>
        <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{action.action}</span>
      </div>
      <ChevronRight size={16} color={colors.text} />
    </div>
  )
}

export default function Client360Page() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ltv, setLtv] = useState(null)

  useEffect(() => {
    api.get(`/client360/${clientId}`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))

    getClientLTV(clientId)
      .then(setLtv)
      .catch(() => {})
  }, [clientId])

  if (loading) return (
    <AppLayout>
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Activity size={32} color="#4f46e5" className="spin" />
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>Loading client intelligence...</p>
      </div>
    </AppLayout>
  )

  if (!data) return <AppLayout><p>Client not found.</p></AppLayout>

  const { client, summary, payment_behavior, health_score, next_action, timeline, invoices } = data
  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--bg-card)', fontSize: 18, fontWeight: 700 }}>{client.name?.[0]}</span>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{client.name}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{client.company || client.email || 'No company'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'New Invoice',   icon: FileText,  link: '/invoices'  },
            { label: 'New Contract',  icon: ScrollText, link: '/contracts' },
            { label: 'Log Meeting',   icon: Mic2,       link: '/meetings'  },
          ].map(({ label, icon: Icon, link }) => (
            <button key={label} onClick={() => navigate(link)} className="btn-secondary"
              style={{ fontSize: 12, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Next Action Banner */}
      {next_action && (
        <div style={{ marginBottom: 16 }}>
          <NextActionBanner action={next_action} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16 }}>

        {/* ── LEFT COLUMN ────────────────────────────────────────── */}
        <div>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <StatCard label="Total Invoiced" value={fmt(summary.total_invoiced)} color="#4f46e5"  icon={DollarSign} />
            <StatCard label="Total Paid"     value={fmt(summary.total_paid)}     color="#15803d"  icon={CheckCircle2} />
            <StatCard label="Pending"        value={fmt(summary.total_pending)}  color="#d97706"  icon={Clock} />
            <StatCard label="Overdue"        value={fmt(summary.total_overdue)}  color="#dc2626"  icon={AlertTriangle} />
          </div>

          {/* Payment behavior */}
          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Payment Behavior</h3>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: payment_behavior.score >= 70 ? '#15803d' : payment_behavior.score >= 40 ? '#d97706' : '#dc2626' }}>
                  {payment_behavior.label}
                </p>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{payment_behavior.details}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
                {[
                  { label: 'Invoices',  value: summary.invoice_count  },
                  { label: 'Paid',      value: summary.paid_count     },
                  { label: 'Contracts', value: summary.contract_count },
                  { label: 'Meetings',  value: summary.meeting_count  },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 7, padding: '6px' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Full Activity Timeline</h3>
            {!timeline?.length ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No activity yet.</p>
            ) : (
              timeline.map((event, i) => <TimelineItem key={i} event={event} />)
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ───────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Health score meter */}
          <HealthMeter
            score={health_score.score}
            label={health_score.label}
            color={health_score.color}
          />

          {/* Health recommendation */}
          <div className="card" style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {health_score.recommendation}
          </div>

          {/* ── LTV WIDGET (new) ─────────────────────────────────── */}
          {ltv && (
            <div className="card">
              <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                LTV Prediction
              </h4>

              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Predicted 12-month value</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand)' }}>
                {fmt(ltv.predicted_12m_value)}
              </p>

              {/* Segment + confidence badges */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                  background: (SEGMENT_STYLES[ltv.segment] || SEGMENT_STYLES.New).bg,
                  color:      (SEGMENT_STYLES[ltv.segment] || SEGMENT_STYLES.New).text,
                }}>
                  {ltv.segment}
                </span>
                <span style={{ fontSize: 11, color: CONFIDENCE_COLORS[ltv.confidence] || '#6b7280' }}>
                  {ltv.confidence} confidence
                </span>
              </div>

              {/* Score bar */}
              <div style={{ marginTop: 10, marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>LTV Score</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round(ltv.ltv_score || 0)}/100</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 99 }}>
                  <div style={{ height: 5, borderRadius: 99, width: `${Math.min(100, ltv.ltv_score || 0)}%`, background: 'var(--brand)', transition: 'width 0.8s' }} />
                </div>
              </div>

              {/* Growth trajectory */}
              {ltv.growth_trajectory && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Trend:{' '}
                  <span style={{ fontWeight: 600, color: ltv.growth_trajectory === 'growing' ? '#15803d' : ltv.growth_trajectory === 'declining' ? '#dc2626' : 'var(--text-muted)' }}>
                    {ltv.growth_trajectory} ({ltv.growth_factor}×)
                  </span>
                </p>
              )}

              {/* Retainer recommendation */}
              {ltv.retainer_tip?.should_pitch && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: '#dcfce7', borderRadius: 8, border: '1px solid #86efac' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 2 }}>
                    🔥 Retainer Candidate — {ltv.retainer_tip.urgency}
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {ltv.retainer_tip.message}
                  </p>
                  {ltv.retainer_tip.suggested_retainer_amount && (
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                      Suggested: {fmt(ltv.retainer_tip.suggested_retainer_amount)}/month
                    </p>
                  )}
                </div>
              )}

              {/* Link to full LTV page */}
              <button
                onClick={() => navigate('/ltv')}
                style={{ marginTop: 10, width: '100%', fontSize: 12, padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 7, cursor: 'pointer', color: 'var(--brand)', fontWeight: 600 }}
              >
                <TrendingUp size={13} /> Full LTV Analysis
              </button>
            </div>
          )}

          {/* Recent invoices */}
          {invoices?.length > 0 && (
            <div className="card">
              <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Recent Invoices
              </h4>
              {invoices.map((inv, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{inv.invoice_number}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(inv.total)}</span>
                    <span style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 999,
                      background: inv.status === 'paid' ? '#dcfce7' : inv.status === 'overdue' ? '#fee2e2' : 'var(--bg-elevated)',
                      color:      inv.status === 'paid' ? '#15803d' : inv.status === 'overdue' ? '#b91c1c' : '#4b5563',
                    }}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="card">
            <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Quick Actions
            </h4>
            {[
              { label: 'Profile this client',    icon: Brain,        link: '/profiler'  },
              { label: 'Send reminder',          icon: MessageSquare, link: '/reminders' },
              { label: 'Generate contract',      icon: ScrollText,    link: '/contracts' },
              { label: 'Practice negotiation',   icon: TrendingUp,    link: '/negotiate' },
            ].map(({ label, icon: Icon, link }) => (
              <button key={label} onClick={() => navigate(link)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
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