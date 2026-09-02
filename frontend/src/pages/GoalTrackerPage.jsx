import { useState, useEffect, useCallback } from 'react'
import AppLayout from '../components/layout/AppLayout'
import { Target, TrendingUp, Calendar, CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react'
import { createGoal, getCurrentGoal, getHistory as getGoalHistory, deleteGoal } from '../services/goalService'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function GoalTrackerPage() {
  const [currentGoal, setCurrentGoal] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    monthly_target: '',
    month: new Date().toISOString().slice(0, 7),
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [currentRes, historyRes] = await Promise.all([
        getCurrentGoal(),
        getGoalHistory()
      ])
      setCurrentGoal(currentRes)
      setHistory(historyRes)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load goals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateGoal = async (e) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      await createGoal({
        monthly_target: parseFloat(formData.monthly_target),
        month: formData.month,
        notes: formData.notes
      })
      await fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create goal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return
    try {
      await deleteGoal(id)
      await fetchData()
    } catch (err) {
      setError('Failed to delete goal')
    }
  }

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`

  const getProgressColor = (percent) => {
    if (percent >= 80) return '#10b981' // Green
    if (percent >= 40) return '#f59e0b' // Amber
    return '#ef4444' // Red
  }

  return (
    <AppLayout>
      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={28} color="#4f46e5" />
            Income Goal Tracker
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Set targets, track progress, and use reverse planning to close the gap.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={32} className="spin" style={{ color: 'var(--brand)', margin: '0 auto' }} />
          </div>
        ) : error ? (
          <div style={{ padding: 16, backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 12, marginBottom: 24 }}>
            {error}
          </div>
        ) : (
          <>
            {!currentGoal ? (
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Set Your Goal for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Monthly Target (₹)</label>
                    <input 
                      type="number" 
                      required 
                      value={formData.monthly_target}
                      onChange={(e) => setFormData({...formData, monthly_target: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-light)' }}
                      placeholder="e.g., 100000"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Month</label>
                    <input 
                      type="month" 
                      required 
                      value={formData.month}
                      onChange={(e) => setFormData({...formData, month: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-light)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Notes (Optional)</label>
                    <textarea 
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-light)', minHeight: 80 }}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    style={{ backgroundColor: 'var(--brand)', color: 'var(--bg-card)', padding: '10px 16px', borderRadius: 6, border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                  >
                    {isSubmitting ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
                    Set Goal
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
                {/* Progress Dashboard */}
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 600 }}>Current Progress ({currentGoal.month})</h2>
                    <button onClick={() => handleDelete(currentGoal.goal_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 500 }}>{currentGoal.completion_percentage.toFixed(1)}% Completed</span>
                      <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(currentGoal.earned)} / {formatCurrency(currentGoal.monthly_target)}</span>
                    </div>
                    <div style={{ height: 16, backgroundColor: 'var(--bg-elevated)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.min(currentGoal.completion_percentage, 100)}%`, 
                        backgroundColor: getProgressColor(currentGoal.completion_percentage),
                        transition: 'width 0.5s ease-in-out'
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div style={{ padding: 16, backgroundColor: 'var(--bg-elevated)', borderRadius: 8, borderLeft: '4px solid #4f46e5' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>Target</p>
                      <p style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(currentGoal.monthly_target)}</p>
                    </div>
                    <div style={{ padding: 16, backgroundColor: 'var(--bg-elevated)', borderRadius: 8, borderLeft: '4px solid #10b981' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>Earned (Paid)</p>
                      <p style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(currentGoal.earned)}</p>
                    </div>
                    <div style={{ padding: 16, backgroundColor: 'var(--bg-elevated)', borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>Pending</p>
                      <p style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(currentGoal.pending)}</p>
                    </div>
                    <div style={{ padding: 16, backgroundColor: 'var(--bg-elevated)', borderRadius: 8, borderLeft: '4px solid #ef4444' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>Gap to Close</p>
                      <p style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(currentGoal.gap)}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 24, marginTop: 24, padding: 16, backgroundColor: 'var(--bg-card)', borderRadius: 8, color: 'var(--brand)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={20} />
                      <span style={{ fontWeight: 500 }}>Days Remaining: {currentGoal.days_remaining}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={20} />
                      <span style={{ fontWeight: 500 }}>Daily Target Needed: {formatCurrency(Math.round(currentGoal.daily_target))}</span>
                    </div>
                  </div>
                </div>

                {/* Reverse Plan Section */}
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Reverse Plan to Close the Gap</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {currentGoal.reverse_plan_options.map((opt, idx) => (
                      <div key={idx} style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 8, backgroundColor: 'var(--bg-card)' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{opt.title}</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>{opt.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Items */}
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Recommended Actions</h2>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {currentGoal.action_items.map((item, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <CheckCircle size={20} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{item.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Pipeline Section */}
                {currentGoal.pipeline_items && currentGoal.pipeline_items.length > 0 && (
                  <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Active Pipeline</h2>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '12px 8px' }}>Proposal</th>
                            <th style={{ padding: '12px 8px' }}>Value</th>
                            <th style={{ padding: '12px 8px' }}>Win Probability</th>
                            <th style={{ padding: '12px 8px' }}>Expected Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentGoal.pipeline_items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{item.title}</td>
                              <td style={{ padding: '12px 8px' }}>{formatCurrency(item.amount)}</td>
                              <td style={{ padding: '12px 8px' }}>{Math.round(item.win_probability * 100)}%</td>
                              <td style={{ padding: '12px 8px', color: 'var(--brand)' }}>{formatCurrency(item.expected_value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* History Section */}
            {history.length > 0 && (
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Goal History</h2>
                <div style={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={history.slice().reverse()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(val) => `₹${val/1000}k`} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="monthly_target" name="Target" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="earned" name="Earned" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
