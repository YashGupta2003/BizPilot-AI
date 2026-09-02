import React, { useState, useEffect, useCallback } from 'react'
import AppLayout from '../components/layout/AppLayout'
import { Loader2, MessageSquare, AlertTriangle, TrendingDown, TrendingUp, Heart, Trash2, Send, Users } from 'lucide-react'
import * as toneService from '../services/toneService'
import * as clientService from '../services/clientService'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

export default function ToneAnalyzerPage() {
  const [text, setText] = useState('')
  const [clientId, setClientId] = useState('')
  const [commType, setCommType] = useState('email')
  
  const [clients, setClients] = useState([])
  const [history, setHistory] = useState([])
  const [result, setResult] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchClients = useCallback(async () => {
    try {
      const data = await clientService.getClients()
      setClients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load clients', err)
      setError('Failed to load clients.')
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      const res = await toneService.getHistory()
      setHistory(res || [])
    } catch (err) {
      console.error('Failed to load history', err)
      setError('Failed to load history.')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
    fetchHistory()
  }, [fetchClients, fetchHistory])

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please enter communication text to analyze.')
      return
    }
    setError('')
    setLoading(true)
    
    try {
      const payload = {
        communication_text: text,
        communication_type: commType,
      }
      if (clientId) payload.client_id = clientId
      
      const res = await toneService.analyzeTone(payload)
      setResult(res)
      fetchHistory()
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async (id) => {
    try {
      await toneService.deleteAnalysis(id)
      fetchHistory()
      if (result && (result.id || result._id) === id) {
        setResult(null)
      }
    } catch (err) {
      console.error('Failed to delete', err)
      setError('Failed to delete analysis.')
    }
  }

  const getSentimentColor = (sentiment) => {
    switch(sentiment?.toLowerCase()) {
      case 'positive': return '#10b981'
      case 'negative': return '#ef4444'
      case 'mixed': return '#f59e0b'
      default: return '#3b82f6'
    }
  }
  
  const getAlertColor = (level) => {
    switch(level?.toLowerCase()) {
      case 'critical': return '#ef4444'
      case 'warning': return '#f59e0b'
      default: return '#3b82f6'
    }
  }

  const renderRadarChart = (dimensions) => {
    if (!dimensions || dimensions.length === 0) return null;
    const data = dimensions.map(d => ({
      subject: d.dimension,
      A: d.score,
      fullMark: 100,
    }))
    
    return (
      <div style={{ height: 300, width: '100%' }}>
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Radar name="Score" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <AppLayout>
      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <MessageSquare size={32} color="#4f46e5" style={{ marginRight: 12 }} />
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Communication Tone Analyzer</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Analyze client messages to uncover hidden sentiments and risks.</p>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: 16, borderRadius: 8, marginBottom: 24 }}>
            {error}
          </div>
        )}

        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: 'var(--text-secondary)' }}>Client (Optional)</label>
              <select 
                value={clientId} 
                onChange={e => setClientId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-light)' }}
              >
                <option value="">Select a client...</option>
                {clients.map(c => (
                  <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: 'var(--text-secondary)' }}>Communication Type</label>
              <select 
                value={commType} 
                onChange={e => setCommType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-light)' }}
              >
                <option value="email">Email Thread</option>
                <option value="whatsapp">WhatsApp / SMS</option>
                <option value="slack">Slack / Teams</option>
                <option value="meeting_notes">Meeting Notes</option>
              </select>
            </div>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: 'var(--text-secondary)' }}>Message Text</label>
            <textarea 
              rows={8}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste the email thread, message history, or notes here..."
              style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid var(--border-light)', resize: 'vertical' }}
            />
          </div>
          
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            style={{ 
              background: 'var(--brand)', color: 'var(--bg-card)', padding: '10px 24px', borderRadius: 6, 
              border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? <Loader2 size={18} className="spin" style={{ marginRight: 8 }} /> : <Send size={18} style={{ marginRight: 8 }} />}
            {loading ? 'Analyzing...' : 'Analyze Tone'}
          </button>
        </div>

        {result && result.analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>Analysis Results</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <h3 style={{ fontSize: 16, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>Overall Sentiment</h3>
                <div style={{ 
                  display: 'inline-block', padding: '8px 24px', borderRadius: 999, 
                  background: getSentimentColor(result.analysis.overall_sentiment) + '20',
                  color: getSentimentColor(result.analysis.overall_sentiment),
                  fontSize: 24, fontWeight: 700, textTransform: 'capitalize'
                }}>
                  {result.analysis.overall_sentiment} ({result.analysis.overall_score}/100)
                </div>
                <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: 14 }}>{result.analysis.summary}</p>
              </div>

              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: 16, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>Relationship Health</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <Heart size={32} color={result.analysis.relationship_health === 'critical' ? '#ef4444' : '#10b981'} />
                  <span style={{ fontSize: 20, fontWeight: 600, textTransform: 'capitalize' }}>{result.analysis.relationship_health}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ background: 'var(--bg-elevated)', padding: '4px 12px', borderRadius: 16, fontSize: 14 }}>Style: {result.analysis.communication_style}</span>
                  <span style={{ background: 'var(--bg-elevated)', padding: '4px 12px', borderRadius: 16, fontSize: 14 }}>Speed: {result.analysis.response_pattern?.response_speed}</span>
                  <span style={{ background: 'var(--bg-elevated)', padding: '4px 12px', borderRadius: 16, fontSize: 14 }}>Initiative: {result.analysis.response_pattern?.initiative}</span>
                </div>
              </div>
            </div>

            {result.analysis.tone_shift?.detected && (
              <div style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: 20, borderRadius: '0 12px 12px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d97706', fontWeight: 600, marginBottom: 8 }}>
                  <TrendingDown size={20} />
                  <span>Tone Shift Detected: {result.analysis.tone_shift.direction}</span>
                </div>
                <p style={{ margin: 0, color: '#92400e' }}>{result.analysis.tone_shift.description}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: 16, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>Tone Dimensions</h3>
                {renderRadarChart(result.analysis.tone_dimensions)}
              </div>
              
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: 16, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>Dimension Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {result.analysis.tone_dimensions?.map((dim, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                        <span style={{ fontWeight: 500 }}>{dim.dimension}</span>
                        <span>{dim.score}/100</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${dim.score}%`, background: 'var(--brand)' }} />
                      </div>
                      {dim.evidence && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0', fontStyle: 'italic' }}>"{dim.evidence}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {(result.analysis.alerts?.length > 0 || result.analysis.recommended_actions?.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                {result.analysis.alerts?.length > 0 && (
                  <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontSize: 16, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>Alerts</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {result.analysis.alerts.map((alert, i) => (
                        <div key={i} style={{ padding: 12, borderRadius: 8, background: getAlertColor(alert.level) + '15', borderLeft: `3px solid ${getAlertColor(alert.level)}` }}>
                          <div style={{ fontWeight: 600, color: getAlertColor(alert.level), marginBottom: 4 }}>{alert.level.toUpperCase()}</div>
                          <p style={{ margin: '0 0 4px 0', fontSize: 14 }}>{alert.message}</p>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}><strong>Action:</strong> {alert.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.analysis.recommended_actions?.length > 0 && (
                  <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontSize: 16, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>Recommended Actions</h3>
                    <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.analysis.recommended_actions.map((action, i) => (
                        <li key={i} style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{action}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px 0' }}>Past Analyses</h2>
          {historyLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={24} className="spin" color="#4f46e5" style={{ margin: '0 auto' }}/></div>
          ) : history.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 12, textAlign: 'center', color: 'var(--text-muted)' }}>No past analyses found.</div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {history.map(item => (
                <div key={item.id || item._id} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {item.client_name || 'Unknown Client'} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 14 }}>via {item.communication_type}</span>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleString()} • 
                      <span style={{ color: getSentimentColor(item.analysis?.overall_sentiment), marginLeft: 8, fontWeight: 500 }}>
                        {item.analysis?.overall_sentiment} ({item.analysis?.overall_score})
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      onClick={() => setResult(item)}
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id || item._id)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px', borderRadius: 6, cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
