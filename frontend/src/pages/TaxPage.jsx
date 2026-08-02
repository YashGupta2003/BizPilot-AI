import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Loader2, CheckCircle2, AlertTriangle,
  Calendar, DollarSign, RefreshCw, ChevronRight,
  Info, TrendingUp, Globe, Calculator
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { getTaxReport } from '../services/taxService'

const PRIORITY_STYLES = {
  HIGH:   { bg: '#fee2e2', border: '#fecaca', text: '#b91c1c' },
  MEDIUM: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  LOW:    { bg: '#dcfce7', border: '#86efac', text: '#15803d' },
}

const QUARTER_LABELS = {1: 'Q1 Apr-Jun', 2: 'Q2 Jul-Sep', 3: 'Q3 Oct-Dec', 4: 'Q4 Jan-Mar'}

function fmt(n) {
  return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function StatCard({ label, value, sub, color = '#4f46e5', icon: Icon }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={14} color={color} />}
        <p style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

function AdvanceTaxTimeline({ advance }) {
  if (!advance.required) {
    return (
      <div style={{ padding: '12px 16px', background: '#dcfce7', borderRadius: 10, display: 'flex', gap: 8 }}>
        <CheckCircle2 size={16} color="#15803d" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13.5, color: '#15803d' }}>{advance.message}</p>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#374151', marginBottom: 14 }}>
        Net tax after TDS: <strong>{fmt(advance.net_tax_after_tds)}</strong>
      </p>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {advance.installments.map((inst) => (
          <div key={inst.installment} style={{
            minWidth: 160, padding: '12px 14px', borderRadius: 10, flexShrink: 0,
            background: inst.is_overdue ? '#fee2e2' : inst.is_upcoming ? '#fef9c3' : '#f9fafb',
            border: `1px solid ${inst.is_overdue ? '#fecaca' : inst.is_upcoming ? '#fde047' : '#e5e7eb'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: inst.is_overdue ? '#b91c1c' : inst.is_upcoming ? '#854d0e' : '#6b7280' }}>
                {inst.label}
              </span>
              {inst.is_overdue && <span style={{ fontSize: 10, color: '#b91c1c', fontWeight: 700 }}>OVERDUE</span>}
              {inst.is_upcoming && <span style={{ fontSize: 10, color: '#854d0e', fontWeight: 700 }}>SOON</span>}
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1d23' }}>{fmt(inst.this_installment_amount)}</p>
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{inst.due_date}</p>
            <p style={{ fontSize: 11, color: '#9ca3af' }}>{inst.cumulative_percent}% cumulative</p>
            {inst.days_until_due !== null && (
              <p style={{ fontSize: 11, color: inst.days_until_due <= 14 ? '#dc2626' : '#6b7280', marginTop: 4, fontWeight: 600 }}>
                {inst.days_until_due} days left
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function GSTQuartersTable({ quarters, currentQ }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Quarter</th>
          <th>Revenue</th>
          <th>GST Collected</th>
          <th>GST Payable</th>
          <th>Filing Due</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {quarters.map((q) => (
          <tr key={q.quarter} style={{ background: q.quarter === currentQ ? '#fafafa' : 'white' }}>
            <td style={{ fontWeight: q.quarter === currentQ ? 700 : 400 }}>
              {q.label} {q.quarter === currentQ && '← Current'}
            </td>
            <td>{fmt(q.revenue)}</td>
            <td>{fmt(q.gst_collected)}</td>
            <td style={{ fontWeight: 600 }}>{fmt(q.gst_payable)}</td>
            <td style={{ fontSize: 12 }}>{q.filing_due}</td>
            <td>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                background: q.status === 'overdue' ? '#fee2e2' : q.status === 'upcoming' ? '#fef3c7' : '#f3f4f6',
                color: q.status === 'overdue' ? '#b91c1c' : q.status === 'upcoming' ? '#92400e' : '#9ca3af',
              }}>
                {q.status === 'overdue' ? '⚠️ Overdue' : q.status === 'upcoming' ? '📅 Due Soon' : '📆 Future'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Checklist({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => {
        const style = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.LOW
        return (
          <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: style.bg, border: `1px solid ${style.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: 'white', color: style.text }}>
                    {item.priority}
                  </span>
                  <span style={{ fontSize: 11, color: style.text, fontWeight: 600 }}>{item.category}</span>
                  {item.is_overdue && <span style={{ fontSize: 10, color: '#b91c1c', fontWeight: 700 }}>OVERDUE</span>}
                </div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', marginBottom: 3 }}>{item.task}</p>
                <p style={{ fontSize: 12, color: '#6b7280' }}>Due: {item.due}</p>
                <p style={{ fontSize: 12, color: '#4f46e5', marginTop: 4 }}>→ {item.action}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Form26AS({ form26as }) {
  return (
    <div>
      <div style={{ padding: '10px 14px', background: '#eef2ff', borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#4338ca', display: 'flex', gap: 8 }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{form26as.note}</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
          Estimated total TDS: <strong style={{ color: '#4f46e5' }}>{fmt(form26as.estimated_tds)}</strong>
        </p>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>{form26as.section}</p>
      </div>

      {form26as.client_breakdown?.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Amount Paid to You</th>
              <th>Estimated TDS (10%)</th>
            </tr>
          </thead>
          <tbody>
            {form26as.client_breakdown.map((c, i) => (
              <tr key={i}>
                <td>{c.client_name}</td>
                <td>{fmt(c.total_paid)}</td>
                <td style={{ fontWeight: 600, color: '#4f46e5' }}>{fmt(c.estimated_tds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 12, padding: '10px 14px', background: '#f9fafb', borderRadius: 8 }}>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>How to verify Form 26AS:</p>
        {[
          "Go to incometax.gov.in → Login → View Form 26AS",
          "Check Part A for TDS by deductors (your clients)",
          "Match each entry with your invoice records",
          "If TDS is missing, contact the client for TDS certificate (Form 16A)",
        ].map((step, i) => (
          <p key={i} style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 3 }}>
            {i + 1}. {step}
          </p>
        ))}
      </div>
    </div>
  )
}

function PlainSummary({ bullets }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bullets.map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{b.icon}</span>
          <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>{b.text}</p>
        </div>
      ))}
    </div>
  )
}

const TABS = [
  { key: 'summary', label: 'Summary', icon: Info },
  { key: 'advance', label: 'Advance Tax', icon: Calendar },
  { key: 'gst', label: 'GST Quarters', icon: Calculator },
  { key: 'tds', label: 'Form 26AS / TDS', icon: FileText },
  { key: 'checklist', label: 'Filing Checklist', icon: CheckCircle2 },
]

export default function TaxPage() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('summary')
  const [fyStart, setFyStart] = useState(null)
  const navigate = useNavigate()

  const currentFY = new Date().getMonth() >= 3
    ? new Date().getFullYear()
    : new Date().getFullYear() - 1

  useEffect(() => { load() }, [fyStart])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await getTaxReport(fyStart)
      setReport(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not generate tax report.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Tax Filing Assistant</h1>
          <p className="page-subtitle">India-specific tax intelligence from your invoice data — advance tax, GST, TDS, and filing checklist</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="input-field"
            value={fyStart || currentFY}
            onChange={e => setFyStart(parseInt(e.target.value))}
            style={{ fontSize: 13 }}
          >
            {[currentFY, currentFY - 1, currentFY - 2].map(y => (
              <option key={y} value={y}>FY {y}-{String(y + 1).slice(-2)}</option>
            ))}
          </select>
          <button onClick={load} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={32} className="spin" color="#4f46e5" />
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 12 }}>
            Calculating taxes from your invoice history...
          </p>
        </div>
      ) : error ? (
        <div className="card"><p style={{ color: '#dc2626' }}>{error}</p></div>
      ) : !report ? null : (
        <>
          {/* Urgent alert */}
          {report.urgent_count > 0 && (
            <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <AlertTriangle size={16} color="#b91c1c" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 13.5, color: '#b91c1c', fontWeight: 600 }}>
                  {report.urgent_count} urgent tax action{report.urgent_count !== 1 ? 's' : ''} require your attention
                </p>
              </div>
              <button onClick={() => setTab('checklist')} style={{ fontSize: 12, color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                View checklist <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            <StatCard label="Total Revenue" value={fmt(report.tax_data.total_received)} color="#4f46e5" icon={DollarSign} sub={report.fy_label} />
            <StatCard label="Estimated Tax" value={fmt(report.presumptive_tax.recommended_tax)} color="#dc2626" icon={Calculator} sub="After TDS credit" />
            <StatCard label="GST Collected" value={fmt(report.tax_data.gst_collected)} color="#d97706" icon={FileText} sub="All quarters" />
            <StatCard label="TDS Est." value={fmt(report.tax_data.tds_deducted_estimate)} color="#15803d" icon={TrendingUp} sub="By clients (10%)" />
          </div>

          {/* Regime recommendation */}
          <div style={{ padding: '10px 14px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#4338ca' }}>
            💡 Recommended: <strong>{report.presumptive_tax.recommended_regime === 'new' ? 'New Tax Regime' : 'Old Tax Regime'}</strong>
            {' '}(Section 44ADA presumptive — 50% of gross receipts = ₹{report.presumptive_tax.presumptive_income.toLocaleString('en-IN')} income).
            Saves you ₹{Math.abs(report.presumptive_tax.new_regime_total_with_cess - report.presumptive_tax.old_regime_total_with_cess).toLocaleString('en-IN')} vs the other regime.
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', padding: 5, borderRadius: 10, overflowX: 'auto' }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, fontSize: 13, border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, background: tab === key ? '#4f46e5' : 'transparent', color: tab === key ? '#fff' : '#6b7280', whiteSpace: 'nowrap' }}>
                <Icon size={14} /> {label}
                {key === 'checklist' && report.urgent_count > 0 && (
                  <span style={{ background: '#dc2626', color: 'white', borderRadius: 999, fontSize: 10, padding: '1px 5px', fontWeight: 700 }}>
                    {report.urgent_count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="card">
            {tab === 'summary' && <PlainSummary bullets={report.plain_summary} />}

            {tab === 'advance' && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                  Advance Tax Schedule — {report.fy_label}
                </h3>
                <AdvanceTaxTimeline advance={report.advance_tax} />
                <div style={{ marginTop: 14, padding: '10px 14px', background: '#f9fafb', borderRadius: 8 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>How to pay advance tax:</p>
                  <p style={{ fontSize: 12.5, color: '#6b7280' }}>
                    Go to <strong>incometaxindia.gov.in</strong> → e-Pay Tax → Challan 280 → (300) Self Assessment Tax / (100) Advance Tax → Enter PAN and amount → Pay via net banking
                  </p>
                </div>
              </div>
            )}

            {tab === 'gst' && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                  GST Quarterly Breakdown — {report.fy_label}
                </h3>
                <GSTQuartersTable quarters={report.gst_quarters} currentQ={report.current_quarter} />
                {report.tax_data.foreign_currency_revenue > 0 && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: '#dcfce7', borderRadius: 8, fontSize: 13, color: '#15803d', display: 'flex', gap: 8 }}>
                    <Globe size={14} style={{ flexShrink: 0 }} />
                    Foreign currency revenue {fmt(report.tax_data.foreign_currency_revenue)} is zero-rated (export). No GST on these invoices.
                  </div>
                )}
              </div>
            )}

            {tab === 'tds' && <Form26AS form26as={report.form_26as} />}

            {tab === 'checklist' && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                  Filing Checklist — Q{report.current_quarter} {QUARTER_LABELS[report.current_quarter]}
                </h3>
                <Checklist items={report.checklist} />
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#f9fafb', borderRadius: 8 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Important links:</p>
                  {[
                    ['Income Tax Portal', 'incometaxindia.gov.in'],
                    ['GST Portal', 'gst.gov.in'],
                    ['TDS / Challan Payment', 'tin.tin.nsdl.com'],
                    ['Form 26AS', 'incometaxindia.gov.in → View Form 26AS'],
                  ].map(([label, url]) => (
                    <p key={label} style={{ fontSize: 12.5, color: '#4f46e5', marginBottom: 3 }}>
                      🔗 {label}: <span style={{ color: '#6b7280' }}>{url}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  )
}