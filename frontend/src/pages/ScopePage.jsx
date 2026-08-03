import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, AlertTriangle, CheckCircle2, Loader2,
  Plus, Trash2, ChevronRight, Copy, Lock,
  RefreshCw, Zap, Clock, DollarSign
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import {
  createScopeProject, listScopeProjects,
  getScopeProject, checkDrift, relockScope, deleteScopeProject
} from '../services/scopeService'
import { getClients } from '../services/clientService'
import { listMeetings } from '../services/meetingService'
import { listContracts } from '../services/contractService'

const SEVERITY_STYLES = {
  HIGH:   { bg: '#fee2e2', border: '#fecaca', text: '#b91c1c' },
  MEDIUM: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  LOW:    { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
}

const URGENCY_STYLES = {
  IMMEDIATE: { bg: '#fee2e2', text: '#b91c1c' },
  SOON:      { bg: '#fef3c7', text: '#92400e' },
  LOW:       { bg: '#dcfce7', text: '#15803d' },
}

const SAMPLE_SCOPE = `Project: E-commerce Website for FashionBrand

Deliverables:
- Homepage with hero section and product showcase
- Product listing page with filters (category, price, size)
- Product detail page with image gallery and add to cart
- Shopping cart and checkout with Razorpay integration
- Order confirmation email
- Basic admin panel to add/edit products

NOT included:
- Blog section
- Mobile app
- Social media integration
- Inventory management system
- Multi-vendor support

Revisions: 2 rounds included
Total price: INR 85,000
Timeline: 6 weeks`

const SAMPLE_DRIFT = `Update from client meeting today:

1. Homepage is approved, looks great!
2. By the way, can you also add a blog section? Just 5-6 pages, nothing fancy
3. The product filter is working but client wants to add a wishlist feature
4. Also they mentioned they want WhatsApp chat widget on the website
5. Checkout flow looks good — payment integration tested
6. Admin panel: can you add inventory tracking? Should be simple
7. Client asked if we can add Instagram feed to the homepage`

function fmt(n) {
  return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

// ─── CREATE PROJECT MODAL ─────────────────────────────────────
function CreateProjectModal({ clients, meetings, contracts, onCreated, onClose }) {
  const [form, setForm] = useState({
    project_name: '',
    client_id: '',
    client_name: '',
    hourly_rate: 1500,
    scope_text: '',
    meeting_id: '',
    contract_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sourceTab, setSourceTab] = useState('manual')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleClientChange(id) {
    update('client_id', id)
    const c = clients.find(cl => cl.id === id)
    if (c) update('client_name', c.name)
  }

  async function handleCreate() {
    if (!form.project_name.trim()) { setError('Project name required.'); return }
    if (!form.scope_text && !form.meeting_id && !form.contract_id) {
      setError('Please provide scope text or link to a meeting/contract.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const project = await createScopeProject(form)
      onCreated(project)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="card" style={{ width: 560, maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Lock Project Scope</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Project Name *</label>
            <input className="input-field" value={form.project_name} onChange={e => update('project_name', e.target.value)} placeholder="E-commerce Website" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Hourly Rate (₹)</label>
            <input className="input-field" type="number" value={form.hourly_rate} onChange={e => update('hourly_rate', parseFloat(e.target.value))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Client</label>
            <select className="input-field" value={form.client_id} onChange={e => handleClientChange(e.target.value)}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Or type client name</label>
            <input className="input-field" value={form.client_name} onChange={e => update('client_name', e.target.value)} placeholder="Client name" disabled={!!form.client_id} />
          </div>
        </div>

        {/* Scope source tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: '#f3f4f6', padding: 4, borderRadius: 8 }}>
          {[
            { key: 'manual', label: 'Type Scope' },
            { key: 'meeting', label: 'From Meeting Notes' },
            { key: 'contract', label: 'From Contract' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setSourceTab(key)}
              style={{ flex: 1, padding: '6px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: sourceTab === key ? 600 : 400, background: sourceTab === key ? 'white' : 'transparent', color: sourceTab === key ? '#4f46e5' : '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>

        {sourceTab === 'manual' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 12, color: '#6b7280' }}>Scope Text *</label>
              <button onClick={() => update('scope_text', SAMPLE_SCOPE)}
                style={{ fontSize: 11, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}>
                Load sample
              </button>
            </div>
            <textarea className="input-field" rows={10} value={form.scope_text}
              onChange={e => update('scope_text', e.target.value)}
              placeholder="Paste your project scope, deliverables, what's NOT included, revision limits..."
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
          </div>
        )}

        {sourceTab === 'meeting' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Select Meeting (scope auto-extracted)
            </label>
            <select className="input-field" value={form.meeting_id} onChange={e => update('meeting_id', e.target.value)}>
              <option value="">Select a past meeting</option>
              {meetings.map(m => (
                <option key={m.id} value={m.id}>
                  {m.client_name} — {m.extracted?.project_name || 'Meeting'}
                </option>
              ))}
            </select>
            {form.meeting_id && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#dcfce7', borderRadius: 7, fontSize: 12.5, color: '#15803d' }}>
                ✅ Scope will be auto-extracted from meeting notes
              </div>
            )}
          </div>
        )}

        {sourceTab === 'contract' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Select Contract (scope auto-extracted)
            </label>
            <select className="input-field" value={form.contract_id} onChange={e => update('contract_id', e.target.value)}>
              <option value="">Select a contract</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.client_name} — {c.project_type}
                </option>
              ))}
            </select>
            {form.contract_id && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#dcfce7', borderRadius: 7, fontSize: 12.5, color: '#15803d' }}>
                ✅ Scope will be auto-extracted from contract clauses
              </div>
            )}
          </div>
        )}

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{error}</p>}

        <button className="btn-primary" onClick={handleCreate} disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}>
          {loading ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
          {loading ? 'Locking scope...' : 'Lock Scope & Start Tracking'}
        </button>
      </div>
    </div>
  )
}

// ─── DRIFT RESULT PANEL ───────────────────────────────────────
function DriftResultPanel({ result, project }) {
  const { drift_result, change_order, total_drift_value_accumulated } = result
  const [copied, setCopied] = useState(false)

  function copyEmail() {
    navigator.clipboard.writeText(`Subject: ${change_order.subject}\n\n${change_order.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* Drift header */}
      {drift_result.drift_detected ? (
        <div style={{ padding: '14px 16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <AlertTriangle size={18} color="#b91c1c" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23' }}>
                  Scope Drift Detected!
                </h3>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: URGENCY_STYLES[drift_result.urgency]?.bg, color: URGENCY_STYLES[drift_result.urgency]?.text }}>
                  {drift_result.urgency}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#374151' }}>{drift_result.recommendation}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#9ca3af' }}>Extra value</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#b91c1c' }}>{fmt(drift_result.total_extra_value)}</p>
              <p style={{ fontSize: 11, color: '#9ca3af' }}>{drift_result.total_extra_hours}h extra</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 12, marginBottom: 14, display: 'flex', gap: 8 }}>
          <CheckCircle2 size={18} color="#15803d" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>No scope drift detected!</p>
            <p style={{ fontSize: 13, color: '#374151' }}>{drift_result.recommendation}</p>
          </div>
        </div>
      )}

      {/* Drift items */}
      {drift_result.drift_items?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Out-of-Scope Items ({drift_result.drift_items.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {drift_result.drift_items.map((item, i) => {
              const style = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.MEDIUM
              return (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: style.bg, border: `1px solid ${style.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: style.text }}>{item.severity}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: style.text }}>{fmt(item.estimated_value || 0)}</span>
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', marginBottom: 2 }}>{item.description}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{item.reason}</p>
                  {item.source && (
                    <p style={{ fontSize: 11.5, color: '#9ca3af', fontStyle: 'italic' }}>"{item.source}"</p>
                  )}
                  <p style={{ fontSize: 11, color: style.text, marginTop: 4 }}>~{item.estimated_hours}h additional work</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* In-scope items */}
      {drift_result.items_in_scope?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#15803d' }}>✅ Within Original Scope</h4>
          {drift_result.items_in_scope.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <CheckCircle2 size={13} color="#15803d" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: '#374151' }}>{item}</p>
            </div>
          ))}
        </div>
      )}

      {/* Change order email */}
      {change_order && (
        <div className="card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>📧 Change Order Email (ready to send)</h4>
            <button onClick={copyEmail} className="btn-secondary"
              style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 7, padding: '8px 10px', marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>SUBJECT</p>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{change_order.subject}</p>
          </div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto' }}>
            {change_order.body}
          </div>
        </div>
      )}

      {/* Accumulated total */}
      {total_drift_value_accumulated > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
          ⚠️ Total scope drift accumulated on this project: <strong>{fmt(total_drift_value_accumulated)}</strong>
        </div>
      )}
    </div>
  )
}

// ─── PROJECT DETAIL ───────────────────────────────────────────
function ProjectDetail({ project, onBack, onRefresh }) {
  const navigate = useNavigate()
  const [checkInput, setCheckInput] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)
  const [relockText, setRelockText] = useState('')
  const [relocking, setRelocking] = useState(false)
  const [showRelock, setShowRelock] = useState(false)
  const [tab, setTab] = useState('check')

  const locked = project.locked_scope || {}

  async function handleCheck() {
    if (!checkInput.trim()) return
    setChecking(true)
    setResult(null)
    try {
      const res = await checkDrift(project.id, checkInput)
      setResult(res)
    } finally {
      setChecking(false)
    }
  }

  async function handleRelock() {
    if (!relockText.trim()) return
    setRelocking(true)
    try {
      await relockScope(project.id, relockText)
      setShowRelock(false)
      onRefresh()
    } finally {
      setRelocking(false)
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 13, marginBottom: 16 }}>
        ← All Projects
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{project.project_name}</h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            {project.client_name} · ₹{project.hourly_rate}/hr ·
            {project.drift_checks?.length || 0} check(s) done
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {project.client_id && (
            <button onClick={() => navigate(`/clients/${project.client_id}`)} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
              View Client 360
            </button>
          )}
          <button onClick={() => setShowRelock(!showRelock)} className="btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={12} /> Re-lock Scope
          </button>
        </div>
      </div>

      {/* Drift summary */}
      {project.total_drift_value > 0 && (
        <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13.5, color: '#b91c1c', fontWeight: 600 }}>
            Total scope drift detected on this project
          </p>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#b91c1c' }}>{fmt(project.total_drift_value)}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f3f4f6', padding: 4, borderRadius: 8, width: 'fit-content' }}>
        {[{ key: 'check', label: 'Run Drift Check' }, { key: 'scope', label: 'Locked Scope' }, { key: 'history', label: 'Check History' }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '7px 16px', borderRadius: 6, fontSize: 13, border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, background: tab === key ? '#4f46e5' : 'transparent', color: tab === key ? '#fff' : '#6b7280' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Re-lock panel */}
      {showRelock && (
        <div className="card" style={{ marginBottom: 14, borderLeft: '4px solid #d97706' }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Re-lock Scope (after approved change order)</h4>
          <textarea className="input-field" rows={6} value={relockText}
            onChange={e => setRelockText(e.target.value)}
            placeholder="Paste the updated scope including approved changes..."
            style={{ resize: 'none', marginBottom: 8 }} />
          <button className="btn-primary" onClick={handleRelock} disabled={relocking}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {relocking ? <Loader2 size={14} className="spin" /> : <Lock size={14} />}
            {relocking ? 'Re-locking...' : 'Re-lock Scope'}
          </button>
        </div>
      )}

      {tab === 'check' && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Paste current tasks / client messages</label>
              <button onClick={() => setCheckInput(SAMPLE_DRIFT)}
                style={{ fontSize: 11, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}>
                Load sample
              </button>
            </div>
            <textarea className="input-field" rows={10} value={checkInput}
              onChange={e => setCheckInput(e.target.value)}
              placeholder="Paste your current weekly task list, client's WhatsApp messages, email requests, or meeting notes..."
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
            <button className="btn-primary" onClick={handleCheck} disabled={checking || !checkInput.trim()}
              style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}>
              {checking ? <Loader2 size={17} className="spin" /> : <Zap size={17} />}
              {checking ? 'Analyzing for scope drift...' : 'Check for Scope Drift'}
            </button>
          </div>

          {result && <DriftResultPanel result={result} project={project} />}
        </div>
      )}

      {tab === 'scope' && (
        <div className="card">
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={14} color="#15803d" /> Locked Scope
          </h4>
          <p style={{ fontSize: 13.5, color: '#374151', marginBottom: 12, fontStyle: 'italic' }}>{locked.summary}</p>

          {locked.deliverables?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>✅ INCLUDED</p>
              {locked.deliverables.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                  <CheckCircle2 size={13} color="#15803d" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23' }}>{d.item}</p>
                    {d.description && <p style={{ fontSize: 12, color: '#6b7280' }}>{d.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {locked.explicitly_excluded?.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', marginBottom: 6 }}>❌ NOT INCLUDED</p>
              {locked.explicitly_excluded.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <AlertTriangle size={13} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: '#374151' }}>{item}</p>
                </div>
              ))}
            </div>
          )}

          {locked.revision_limit && (
            <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 10 }}>
              📝 Revision limit: <strong>{locked.revision_limit} rounds</strong>
            </p>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {!project.drift_checks?.length ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No drift checks yet.</p>
          ) : (
            [...project.drift_checks].reverse().map((check, i) => (
              <div key={i} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${check.drift_detected ? '#dc2626' : '#15803d'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      {check.drift_detected
                        ? <AlertTriangle size={14} color="#dc2626" />
                        : <CheckCircle2 size={14} color="#15803d" />}
                      <p style={{ fontSize: 14, fontWeight: 600 }}>
                        {check.drift_detected ? `${check.drift_items_count} drift item(s) found` : 'No drift detected'}
                      </p>
                    </div>
                    <p style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(check.checked_at).toLocaleString('en-IN')}</p>
                  </div>
                  {check.drift_detected && (
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>{fmt(check.total_extra_value)}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function ScopePage() {
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [meetings, setMeetings] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [projs, cls, meets, cons] = await Promise.all([
        listScopeProjects(),
        getClients(),
        listMeetings(),
        listContracts(),
      ])
      setProjects(projs)
      setClients(cls)
      setMeetings(meets)
      setContracts(cons)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    await deleteScopeProject(id)
    setProjects(p => p.filter(x => x.id !== id))
  }

  async function refreshSelected() {
    if (!selectedProject) return
    const fresh = await getScopeProject(selectedProject.id)
    setSelectedProject(fresh)
  }

  function handleCreated(project) {
    setProjects(p => [project, ...p])
    setShowCreate(false)
    setSelectedProject(project)
  }

  if (selectedProject) {
    return (
      <AppLayout>
        <ProjectDetail
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
          onRefresh={refreshSelected}
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Scope Drift Detector</h1>
          <p className="page-subtitle">Lock your project scope, then check weekly for unauthorised scope creep</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> New Project
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={28} className="spin" color="#4f46e5" />
        </div>
      ) : !projects.length ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Shield size={36} color="#9ca3af" />
          <p style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>No tracked projects yet</p>
          <p style={{ fontSize: 13.5, color: '#6b7280', marginTop: 4, marginBottom: 16 }}>
            Lock a project scope to start detecting drift automatically
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Lock First Scope
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.map(p => (
            <div key={p.id} onClick={() => setSelectedProject(p)} className="card"
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>{p.project_name}</p>
                  <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 999, background: '#eef2ff', color: '#4f46e5' }}>
                    {p.drift_checks?.length || 0} checks
                  </span>
                  {p.total_drift_value > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: '#fee2e2', color: '#b91c1c' }}>
                      {fmt(p.total_drift_value)} drift
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>
                  {p.client_name} · ₹{p.hourly_rate}/hr ·
                  {p.locked_scope?.deliverables?.length || 0} deliverables locked
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <ChevronRight size={16} color="#9ca3af" />
                <button onClick={e => handleDelete(p.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={14} color="#dc2626" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          clients={clients}
          meetings={meetings}
          contracts={contracts}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </AppLayout>
  )
}