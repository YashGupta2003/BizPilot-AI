import React, { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout'
import { compareContracts, getComparisonHistory, deleteComparison } from '../services/contractComparatorService'
import { getClients } from '../services/clientService'
import { listContracts } from '../services/contractService'
import { Loader2, FileDiff, AlertTriangle, CheckCircle, XCircle, Trash2, ShieldAlert, ArrowRight } from 'lucide-react'

export default function ContractComparatorPage() {
  const [activeTab, setActiveTab] = useState('compare')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Data sets
  const [clients, setClients] = useState([])
  const [contracts, setContracts] = useState([])
  const [history, setHistory] = useState([])
  
  // Form state
  const [yourContract, setYourContract] = useState('')
  const [clientContract, setClientContract] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedContractId, setSelectedContractId] = useState('')
  
  // Results
  const [analysisResult, setAnalysisResult] = useState(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab])

  const fetchInitialData = async () => {
    try {
      const [clientsData, contractsData] = await Promise.all([
        getClients(),
        listContracts()
      ])
      setClients(clientsData || [])
      setContracts(contractsData || [])
    } catch (err) {
      console.error('Error fetching initial data:', err)
    }
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const data = await getComparisonHistory()
      setHistory(data || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleContractSelect = (e) => {
    const id = e.target.value
    setSelectedContractId(id)
    if (id) {
      const selected = contracts.find(c => c._id === id)
      if (selected && selected.contract_text) {
        setYourContract(selected.contract_text)
      } else if (selected && selected.details) {
        setYourContract(selected.details)
      }
    }
  }

  const handleAnalyze = async () => {
    if (!yourContract || !clientContract) {
      setError('Please provide both contract versions')
      return
    }
    
    setLoading(true)
    setError(null)
    setAnalysisResult(null)
    
    try {
      const payload = {
        your_contract: yourContract,
        client_contract: clientContract,
        client_id: selectedClientId || null,
        contract_id: selectedContractId || null
      }
      const data = await compareContracts(payload)
      setAnalysisResult(data.analysis)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze contracts')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this comparison?')) return
    
    try {
      await deleteComparison(id)
      setHistory(history.filter(h => h._id !== id))
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.detail || err.message))
    }
  }

  const viewHistoryItem = (item) => {
    setYourContract(item.your_contract)
    setClientContract(item.client_contract)
    setSelectedClientId(item.client_id || '')
    setSelectedContractId(item.contract_id || '')
    setAnalysisResult(item.analysis)
    setActiveTab('compare')
  }

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'var(--danger-color)'
      case 'high': return '#f97316'
      case 'medium': return 'var(--warning-color)'
      case 'low': return 'var(--success-color)'
      default: return 'var(--text-color)'
    }
  }

  const getSeverityBadge = (severity) => {
    const colors = {
      info: { bg: '#e0f2fe', text: '#0369a1' },
      warning: { bg: '#fef08a', text: '#854d0e' },
      danger: { bg: '#fecaca', text: '#b91c1c' },
      critical: { bg: '#7f1d1d', text: '#fca5a5' }
    }
    const color = colors[severity?.toLowerCase()] || colors.info
    return (
      <span style={{ 
        backgroundColor: color.bg, color: color.text, 
        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
        textTransform: 'uppercase'
      }}>
        {severity}
      </span>
    )
  }

  const getChangeTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'removed': return <span style={{ color: 'var(--danger-color)' }}>🗑️ Removed</span>
      case 'added': return <span style={{ color: 'var(--success-color)' }}>➕ Added</span>
      case 'modified': return <span style={{ color: 'var(--warning-color)' }}>✏️ Modified</span>
      case 'weakened': return <span style={{ color: 'var(--danger-color)' }}>📉 Weakened</span>
      case 'strengthened': return <span style={{ color: 'var(--success-color)' }}>📈 Strengthened</span>
      default: return type
    }
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <FileDiff size={32} color="var(--primary-color)" />
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Contract Comparator</h1>
            <p className="page-subtitle">Analyze client modifications and spot red flags instantly</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button 
            style={{ 
              background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
              fontWeight: activeTab === 'compare' ? 'bold' : 'normal',
              color: activeTab === 'compare' ? 'var(--primary-color)' : 'inherit',
              borderBottom: activeTab === 'compare' ? '2px solid var(--primary-color)' : 'none'
            }}
            onClick={() => setActiveTab('compare')}
          >
            Compare Contracts
          </button>
          <button 
            style={{ 
              background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
              fontWeight: activeTab === 'history' ? 'bold' : 'normal',
              color: activeTab === 'history' ? 'var(--primary-color)' : 'inherit',
              borderBottom: activeTab === 'history' ? '2px solid var(--primary-color)' : 'none'
            }}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {activeTab === 'compare' && (
          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Load Existing Contract (Optional)</label>
                  <select 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    value={selectedContractId}
                    onChange={handleContractSelect}
                  >
                    <option value="">-- Select a Contract --</option>
                    {contracts.map(c => (
                      <option key={c._id} value={c._id}>{c.title || `Contract ${c._id}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Link to Client (Optional)</label>
                  <select 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                  >
                    <option value="">-- Select a Client --</option>
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    Your Version (Baseline)
                  </label>
                  <textarea
                    style={{ width: '100%', height: '300px', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical', fontFamily: 'monospace' }}
                    placeholder="Paste your standard contract here..."
                    value={yourContract}
                    onChange={e => setYourContract(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>
                    Client's Version (Modified)
                  </label>
                  <textarea
                    style={{ width: '100%', height: '300px', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical', fontFamily: 'monospace' }}
                    placeholder="Paste the client's modified contract here..."
                    value={clientContract}
                    onChange={e => setClientContract(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button 
                  className="btn-primary" 
                  onClick={handleAnalyze} 
                  disabled={loading || !yourContract || !clientContract}
                  style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
                >
                  {loading ? <><Loader2 className="spin" size={20} style={{ display: 'inline', marginRight: '8px' }} /> Analyzing...</> : 'Analyze Differences'}
                </button>
              </div>
            </div>

            {analysisResult && (
              <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
                <div style={{ 
                  padding: '1.5rem', 
                  borderRadius: '12px', 
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: analysisResult.safe_to_sign ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${analysisResult.safe_to_sign ? '#10b981' : '#ef4444'}`
                }}>
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: analysisResult.safe_to_sign ? '#047857' : '#b91c1c' }}>
                      {analysisResult.safe_to_sign ? <CheckCircle size={28} /> : <XCircle size={28} />}
                      {analysisResult.safe_to_sign ? 'Safe to Sign' : 'Not Recommended to Sign'}
                    </h2>
                    <p style={{ margin: '0.5rem 0 0 0', fontWeight: '500', color: 'var(--text-secondary)' }}>
                      Overall Risk Level: <span style={{ color: getRiskColor(analysisResult.risk_level), textTransform: 'uppercase', fontWeight: 'bold' }}>{analysisResult.risk_level}</span>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analysisResult.total_clauses_compared}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Clauses</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analysisResult.changes_found}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Changes</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>{analysisResult.red_flags?.length || 0}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Red Flags</div>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h3>Summary</h3>
                  <p>{analysisResult.overall_summary}</p>
                </div>

                {(analysisResult.red_flags?.length > 0 || analysisResult.negotiation_points?.length > 0) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {analysisResult.red_flags?.length > 0 && (
                      <div className="card" style={{ borderLeft: '4px solid var(--danger-color)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-color)' }}>
                          <ShieldAlert size={20} /> Critical Red Flags
                        </h3>
                        <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                          {analysisResult.red_flags.map((flag, idx) => (
                            <li key={idx} style={{ marginBottom: '0.5rem' }}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysisResult.negotiation_points?.length > 0 && (
                      <div className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
                        <h3 style={{ color: 'var(--primary-color)' }}>Key Negotiation Points</h3>
                        <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                          {analysisResult.negotiation_points.map((point, idx) => (
                            <li key={idx} style={{ marginBottom: '0.5rem' }}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <h3 style={{ marginBottom: '1rem' }}>Clause-by-Clause Differences</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {analysisResult.changes?.length > 0 ? (
                    analysisResult.changes.map((change, idx) => (
                      <div key={idx} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                          <h4 style={{ margin: 0 }}>{change.clause_name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {getChangeTypeIcon(change.change_type)}
                            {getSeverityBadge(change.severity)}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                          <div style={{ padding: '1rem', borderRight: '1px solid var(--border-color)', backgroundColor: '#f0fdf4' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#166534', marginBottom: '0.5rem' }}>YOUR VERSION</div>
                            <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{change.your_version}</div>
                          </div>
                          <div style={{ padding: '1rem', backgroundColor: change.change_type === 'removed' || change.change_type === 'weakened' ? '#fef2f2' : '#fefce8' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#991b1b', marginBottom: '0.5rem' }}>CLIENT VERSION</div>
                            <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{change.client_version}</div>
                          </div>
                        </div>
                        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Why this matters:</strong> {change.explanation}
                          </div>
                          <div>
                            <strong>Recommended action:</strong> {change.recommendation}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No significant changes found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <Loader2 className="spin" size={32} color="var(--primary-color)" />
              </div>
            ) : history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {history.map((item) => (
                  <div 
                    key={item._id} 
                    style={{ 
                      padding: '1rem', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    onClick={() => viewHistoryItem(item)}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold' }}>
                          Comparison on {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        {item.analysis?.safe_to_sign ? (
                          <span style={{ color: 'var(--success-color)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Safe</span>
                        ) : (
                          <span style={{ color: 'var(--danger-color)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={14} /> Risky</span>
                        )}
                        <span style={{ color: getRiskColor(item.analysis?.risk_level), fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {item.analysis?.risk_level} Risk
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {item.analysis?.changes_found} changes • {item.analysis?.red_flags?.length || 0} red flags
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        View <ArrowRight size={16} />
                      </button>
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.5rem' }}
                        onClick={(e) => handleDeleteHistory(item._id, e)}
                        title="Delete comparison"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <FileDiff size={48} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
                <p>No comparison history found.</p>
                <button 
                  className="btn-primary" 
                  style={{ marginTop: '1rem' }}
                  onClick={() => setActiveTab('compare')}
                >
                  Start a Comparison
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppLayout>
  )
}
