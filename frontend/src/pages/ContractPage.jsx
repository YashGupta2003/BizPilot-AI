import { useEffect, useState } from 'react'
import {
  FileText, Loader2, AlertTriangle, CheckCircle2,
  Shield, Trash2, Download, Plus
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { generateContract, listContracts, deleteContract } from '../services/contractService'
import { getClients } from '../services/clientService'

const RISK_COLORS = {
  Low: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  Medium: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  High: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
}

const PROJECT_TYPES = [
  'Web Development', 'Mobile App Development', 'Logo Design', 'Brand Identity',
  'UI/UX Design', 'Content Writing', 'SEO Services', 'Social Media Management',
  'Video Editing', 'Photography', 'Consulting', 'Data Analysis', 'Other',
]

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'UAE', 'Singapore', 'Germany', 'Other']

// ─── CONTRACT VIEWER ─────────────────────────────────────────────
function ContractViewer({ contract, onClose }) {
  const c = contract.contract || contract
  const riskLevel = c.risk_level_for_freelancer || 'Medium'
  const riskStyle = RISK_COLORS[riskLevel] || RISK_COLORS.Medium

  const sections = [
    { key: 'parties_section', title: '1. Parties' },
    { key: 'scope_section', title: '2. Scope of Work' },
    { key: 'payment_section', title: '3. Payment Terms' },
    { key: 'revisions_section', title: '4. Revisions Policy' },
    { key: 'ip_section', title: '5. Intellectual Property' },
    { key: 'confidentiality_section', title: '6. Confidentiality' },
    { key: 'kill_fee_section', title: '7. Kill Fee & Cancellation' },
    { key: 'late_payment_section', title: '8. Late Payment Penalties' },
    { key: 'termination_section', title: '9. Termination' },
    { key: 'dispute_section', title: '10. Dispute Resolution' },
  ]

  function copyToClipboard() {
    const text = sections.map(s => `${s.title}\n${c[s.key] || ''}`).join('\n\n')
    navigator.clipboard.writeText(text)
    alert('Contract copied to clipboard!')
  }

  return (
    <div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        ← Back to contracts
      </button>

      <div style={{ padding: '16px 20px', background: riskStyle.bg, border: `1px solid ${riskStyle.border}`, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>{c.contract_title}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{contract.client_name} · {contract.project_type}</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'var(--bg-card)', color: riskStyle.text }}>
            {riskLevel} Risk for Freelancer
          </span>
        </div>
        {c.risk_notes && <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 8 }}>{c.risk_notes}</p>}
      </div>

      {c.plain_english_summary && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #4f46e5' }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--brand)' }}>Plain English Summary</h4>
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600 }}>YOUR PROTECTIONS</p>
            {c.plain_english_summary.what_you_get?.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <CheckCircle2 size={13} color="#15803d" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 12px', background: '#f0f9ff', borderRadius: 8, marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: '#0369a1' }}>💰 Payment flow: {c.plain_english_summary.payment_flow}</p>
          </div>
          {c.plain_english_summary.what_to_watch?.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <AlertTriangle size={13} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{item}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700 }}>Full Contract</h4>
          <button onClick={copyToClipboard} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download size={13} /> Copy Contract
          </button>
        </div>
        {sections.map(({ key, title }) => c[key] ? (
          <div key={key} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <h5 style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)', marginBottom: 6 }}>{title}</h5>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{c[key]}</p>
          </div>
        ) : null)}
      </div>
    </div>
  )
}

// ─── CONTRACT FORM ────────────────────────────────────────────────
function ContractForm({ clients, onGenerated }) {
  const [form, setForm] = useState({
    project_type: 'Web Development',
    client_name: '',
    client_id: '',
    amount: '',
    currency: 'INR',
    duration_weeks: 4,
    milestones: 2,
    client_country: 'India',
    project_description: '',
    special_requirements: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleClientChange(clientId) {
    const client = clients.find((c) => c.id === clientId)
    update('client_id', clientId)
    if (client) update('client_name', client.name)
  }

  async function handleGenerate() {
    if (!form.client_name || !form.amount) {
      setError('Please fill in client name and project amount.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await generateContract({ ...form, amount: parseFloat(form.amount) })
      onGenerated(result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate contract.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Generate New Contract</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Project Type</label>
          <select className="input-field" value={form.project_type} onChange={(e) => update('project_type', e.target.value)}>
            {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Select Existing Client (optional)</label>
          <select className="input-field" value={form.client_id} onChange={(e) => handleClientChange(e.target.value)}>
            <option value="">Type manually below</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client Name</label>
          <input className="input-field" value={form.client_name} onChange={(e) => update('client_name', e.target.value)} placeholder="Client name" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Project Amount</label>
          <input className="input-field" type="number" value={form.amount} onChange={(e) => update('amount', e.target.value)} placeholder="50000" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Currency</label>
          <select className="input-field" value={form.currency} onChange={(e) => update('currency', e.target.value)}>
            {['INR', 'USD', 'EUR', 'GBP', 'AUD'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client Country (for jurisdiction)</label>
          <select className="input-field" value={form.client_country} onChange={(e) => update('client_country', e.target.value)}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Duration (weeks)</label>
          <input className="input-field" type="number" min="1" value={form.duration_weeks} onChange={(e) => update('duration_weeks', parseInt(e.target.value))} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Number of Milestones</label>
          <input className="input-field" type="number" min="1" max="10" value={form.milestones} onChange={(e) => update('milestones', parseInt(e.target.value))} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Project Description (helps generate accurate scope)</label>
        <textarea className="input-field" rows={3} value={form.project_description}
          onChange={(e) => update('project_description', e.target.value)}
          placeholder="e.g. Build a 5-page marketing website with contact form, SEO optimization, and CMS integration" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Special Requirements or Concerns</label>
        <input className="input-field" value={form.special_requirements}
          onChange={(e) => update('special_requirements', e.target.value)}
          placeholder="e.g. Client wants to own all source code, NDA required, strict NDA..." />
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <button className="btn-primary" onClick={handleGenerate} disabled={loading}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}>
        {loading ? <Loader2 size={17} className="spin" /> : <Shield size={17} />}
        {loading ? 'Generating contract...' : 'Generate Contract'}
      </button>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function ContractPage() {
  const [tab, setTab] = useState('generate')
  const [clients, setClients] = useState([])
  const [contracts, setContracts] = useState([])
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [viewingContract, setViewingContract] = useState(null)

  useEffect(() => {
    getClients().then(setClients).catch(() => {})
  }, [])

  async function loadContracts() {
    setLoadingContracts(true)
    try {
      const data = await listContracts()
      setContracts(data)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoadingContracts(false)
    }
  }

  useEffect(() => {
    if (tab === 'history') {
      loadContracts()
    }
  }, [tab])

  async function handleGenerated(contract) {
    setViewingContract(contract)
    setTab('history')
    try {
      const updated = await listContracts()
      setContracts(updated)
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this contract?')) return
    try {
      await deleteContract(id)
      setContracts((c) => c.filter((item) => item.id !== id))
      if (viewingContract?.id === id) setViewingContract(null)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  return (
    <AppLayout>
      <h1 className="page-title">Contract Generator</h1>
      <p className="page-subtitle">
        AI-generated, legally-aware freelance contracts — tailored to your project type, amount, and client country
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg-elevated)', padding: 6, borderRadius: 10, width: 'fit-content' }}>
        {[{ key: 'generate', label: 'Generate Contract', icon: Plus }, { key: 'history', label: 'My Contracts', icon: FileText }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); setViewingContract(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, background: tab === key ? '#4f46e5' : 'transparent', color: tab === key ? '#fff' : 'var(--text-muted)' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'generate' && <ContractForm clients={clients} onGenerated={handleGenerated} />}

      {tab === 'history' && (
        viewingContract ? (
          <ContractViewer contract={viewingContract} onClose={() => setViewingContract(null)} />
        ) : loadingContracts ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={28} className="spin" color="#4f46e5" /></div>
        ) : contracts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <FileText size={32} color="#9ca3af" />
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>No contracts yet. Generate your first one!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contracts.map((c) => {
              const riskLevel = c.contract?.risk_level_for_freelancer || 'Medium'
              const riskStyle = RISK_COLORS[riskLevel] || RISK_COLORS.Medium
              return (
                <div key={c.id} onClick={() => setViewingContract(c)} className="card"
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{c.contract?.contract_title || c.project_type}</p>
                      <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: riskStyle.bg, color: riskStyle.text, fontWeight: 600 }}>
                        {riskLevel} Risk
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {c.client_name} · {c.currency} {c.amount?.toLocaleString('en-IN')} · {c.duration_weeks} weeks
                    </p>
                  </div>
                  <button onClick={(e) => handleDelete(c.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={15} color="#dc2626" />
                  </button>
                </div>
              )
            })}
          </div>
        )
      )}
    </AppLayout>
  )
}