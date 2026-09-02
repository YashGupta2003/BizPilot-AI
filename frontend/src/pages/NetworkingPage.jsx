import React, { useState, useEffect, useCallback } from 'react'
import AppLayout from '../components/layout/AppLayout'
import { Loader2, Trash2, Users, Target, Activity, DollarSign, Brain } from 'lucide-react'
import * as networkingService from '../services/networkingService'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function NetworkingPage() {
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await networkingService.getOpportunities()
      setData(res)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load analysis')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      const res = await networkingService.getHistory()
      setHistory(res)
    } catch (err) {
      console.error(err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchHistory()
  }, [fetchData, fetchHistory])

  const handleDelete = async (id) => {
    try {
      await networkingService.deleteAnalysis(id)
      setHistory(history.filter(h => h.id !== id))
      if (data?.id === id) {
        setData(null)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getConfidenceColor = (confidence) => {
    switch(confidence) {
      case 'HIGH': return '#10b981'
      case 'MEDIUM': return '#f59e0b'
      case 'LOW': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const renderCurrentServices = () => {
    if (!data?.gap_analysis?.current_services) return null
    
    const chartData = Object.entries(data.gap_analysis.current_services).map(([name, value]) => ({
      name, value
    }))

    if (chartData.length === 0) return <p style={{color: 'var(--text-muted)'}}>No current services found.</p>

    return (
      <div style={{ height: 300, width: '100%' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <AppLayout>
      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <Users size={32} style={{ color: 'var(--brand)' }} />
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Networking & Partnership Finder</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>Discover service gaps and strategic partnership opportunities.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={32} className="spin" style={{ color: 'var(--brand)', margin: '0 auto' }} />
            <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Analyzing opportunities...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 24, backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 12, marginBottom: 24 }}>
            {error}
          </div>
        ) : data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Top Row: Current Services & Revenue Opportunity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ backgroundColor: 'var(--bg-card)', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={20} style={{ color: 'var(--brand)' }} />
                  Your Current Services
                </h2>
                {renderCurrentServices()}
              </div>

              <div style={{ backgroundColor: 'var(--bg-card)', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ backgroundColor: '#f0fdf4', padding: 16, borderRadius: '50%', marginBottom: 16 }}>
                  <DollarSign size={48} style={{ color: '#10b981' }} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Revenue Opportunity</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Estimated value of unfulfilled service requests</p>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#10b981' }}>
                  ${data.revenue_opportunity?.toLocaleString() || '0'}
                </div>
              </div>
            </div>

            {/* Service Gaps */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={20} style={{ color: '#ef4444' }} />
                Identified Service Gaps
              </h2>
              {data.gap_analysis?.service_gaps?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {data.gap_analysis.service_gaps.map((gap, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{gap.service_type}</h3>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: 9999, 
                          fontSize: 12, 
                          fontWeight: 600,
                          backgroundColor: `${getConfidenceColor(gap.confidence)}20`,
                          color: getConfidenceColor(gap.confidence)
                        }}>
                          {gap.confidence}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>Demand Signals:</p>
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
                        {gap.demand_signals.map((sig, j) => <li key={j}>{sig}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No clear service gaps identified yet.</p>
              )}
            </div>

            {/* AI Recommendations */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={20} style={{ color: '#8b5cf6' }} />
                AI Partnership Recommendations
              </h2>
              {data.recommendations?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
                  {data.recommendations.map((rec, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, backgroundColor: 'var(--bg-elevated)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Partner: {rec.service_type}</h3>
                        <span style={{ backgroundColor: '#e0e7ff', color: 'var(--brand)', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                          {rec.collaboration_model}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        <strong>Why:</strong> {rec.why_needed}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                        <strong>Suggested Referral Fee:</strong> 
                        <span style={{ color: '#10b981', fontWeight: 600 }}>{rec.referral_fee_percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No recommendations generated.</p>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {!loading && history.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Analysis History</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: 16, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>Analysis from {new Date(item.created_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      Revenue Opp: ${item.revenue_opportunity?.toLocaleString()} | {item.recommendations?.length || 0} Recommendations
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 8 }}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
