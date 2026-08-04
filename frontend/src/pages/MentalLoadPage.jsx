import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { getMentalLoadScore, getMentalLoadHistory, getMentalLoadItems } from '../services/mentalLoadService'
import { Loader2, AlertTriangle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CATEGORY_ICONS = {
  active_projects: '📋', pending_proposals: '📨', overdue_invoices: '💰',
  unresolved_disputes: '⚖️', follow_ups: '📬', relationship_stress: '🎭',
}
const CATEGORY_LABELS = {
  active_projects: 'Active Projects', pending_proposals: 'Pending Proposals',
  overdue_invoices: 'Overdue Invoices', unresolved_disputes: 'Unresolved Disputes',
  follow_ups: 'Follow-up Items', relationship_stress: 'Relationship Stress',
}
const CATEGORY_LINKS = {
  active_projects: '/contracts', pending_proposals: '/winrate',
  overdue_invoices: '/invoices', unresolved_disputes: '/disputes',
  follow_ups: '/reminders', relationship_stress: '/tone',
}

export default function MentalLoadPage() {
  const navigate = useNavigate()
  const [scoreData, setScoreData] = useState(null);
  const [history, setHistory] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scoreRes, historyRes, itemsRes] = await Promise.all([
        getMentalLoadScore(),
        getMentalLoadHistory(),
        getMentalLoadItems()
      ]);
      setScoreData(scoreRes);
      setHistory(historyRes.reverse()); // oldest to newest for chart
      setItems(itemsRes);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load mental load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <Loader2 className="spin" size={32} />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div style={{ color: '#dc2626', padding: '1rem', border: '1px solid #dc2626', borderRadius: '8px' }}>
           {error}
        </div>
      </AppLayout>
    )
  }

  const { score = 0, zone = 'Green Zone', zone_color = 'green', message = '', detail = '', breakdown = {}, recommendations = [], total_open_items = 0 } = scoreData || {}

  const getZoneColor = (s) => {
    if (s <= 30) return '#10b981'; // Green
    if (s <= 50) return '#f59e0b'; // Yellow
    if (s <= 70) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const ringColor = getZoneColor(score);
  const strokeDashoffset = 283 - (283 * score) / 100;

  const chartData = history.map(h => ({
    date: new Date(h.created_at).toLocaleDateString(),
    score: h.score
  }));

  return (
    <AppLayout>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Mental Load Index</h1>
        <p className="page-subtitle">Track your cognitive load and prevent burnout.</p>
      </div>

      {score > 50 && (
        <div style={{ 
          background: ringColor + '20', 
          borderLeft: `4px solid ${ringColor}`,
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <AlertTriangle size={24} color={ringColor} />
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: ringColor }}>{zone}</h3>
            <p style={{ margin: 0 }}>{message}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="200" height="200" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke={ringColor} 
                strokeWidth="10" 
                strokeDasharray="283" 
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <span style={{ fontSize: '3rem', fontWeight: 'bold', color: ringColor }}>{score}</span>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>/ 100</div>
            </div>
          </div>
          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: ringColor }}>{zone}</h3>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
            {total_open_items} open items across your workspace
          </p>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: 15, fontWeight: 600 }}>
            🧠 Load Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {Object.entries(breakdown).map(([key, count]) => (
              <div key={key}
                onClick={() => navigate(CATEGORY_LINKS[key] || '/')}
                style={{ background: '#f9fafb', padding: '12px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid #e5e7eb', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ fontSize: 16 }}>{CATEGORY_ICONS[key]}</span>
                  {CATEGORY_LABELS[key]}
                </div>
                <strong style={{ fontSize: 18, color: count > 0 ? (key === 'unresolved_disputes' || key === 'overdue_invoices' ? '#dc2626' : '#1a1d23') : '#9ca3af' }}>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Historical Trend</h3>
          {chartData.length > 0 ? (
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ringColor} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={ringColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke={ringColor} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
              Not enough historical data yet. Check back after a few visits.
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, fontWeight: 600 }}>🎯 Close These First</h3>
          {(recommendations?.length > 0 ? recommendations : items).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(recommendations || []).slice(0, 6).map((rec, i) => (
                <div key={i}
                  onClick={() => navigate(rec.link || '/')}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f9fafb', padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                    borderLeft: `4px solid ${rec.priority === 'CRITICAL' ? '#dc2626' : rec.priority === 'HIGH' ? '#f97316' : rec.priority === 'MEDIUM' ? '#f59e0b' : '#10b981'}`,
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>{rec.icon}</span>
                      <span style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600,
                        color: rec.priority === 'CRITICAL' ? '#dc2626' : rec.priority === 'HIGH' ? '#f97316' : '#6b7280'
                      }}>{rec.priority}</span>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{rec.action}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{rec.detail}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', minWidth: 100 }}>{rec.impact}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
              ✅ No immediate items requiring your attention. You're all caught up!
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
