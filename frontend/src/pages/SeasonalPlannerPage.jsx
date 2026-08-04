import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { 
  getSeasonalPlan, 
  saveSeasonalPlan 
} from '../services/seasonalService';
import { 
  Loader2, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  Save,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const PATTERN_COLORS = {
  slow: { bg: '#fee2e2', text: '#ef4444', border: '#f87171' },
  recovery: { bg: '#fef3c7', text: '#f59e0b', border: '#fbbf24' },
  moderate: { bg: '#f3f4f6', text: '#6b7280', border: '#9ca3af' },
  busy: { bg: '#dcfce7', text: '#22c55e', border: '#4ade80' },
  rush: { bg: '#ffedd5', text: '#f97316', border: '#fb923c' },
  peak: { bg: '#ecfdf5', text: '#10b981', border: '#34d399' }
};

export default function SeasonalPlannerPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [expandedMonth, setExpandedMonth] = useState(new Date().getMonth() + 1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const res = await getSeasonalPlan();
      setData(res);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch seasonal plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!data) return;
    try {
      setSaving(true);
      await saveSeasonalPlan({
        plan_data: data.monthly_plan,
        insights: data.insights,
        notes: "Auto-saved seasonal plan snapshot."
      });
      alert('Seasonal plan saved successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Loader2 className="spin" size={48} style={{ color: '#f97316' }} />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
          <h2>Error</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchPlan} style={{ marginTop: '1rem' }}>Retry</button>
        </div>
      </AppLayout>
    );
  }

  const { monthly_plan, insights } = data;
  const currentMonth = new Date().getMonth() + 1;

  // Chart data formatting
  const chartData = monthly_plan.map(m => ({
    name: m.name.substring(0, 3),
    Predicted: m.predicted_revenue,
    Historical: m.historical_avg_revenue
  }));

  const activeMonthData = monthly_plan.find(m => m.month === expandedMonth) || monthly_plan[0];

  return (
    <AppLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Calendar size={28} color="#f97316" />
              Seasonal Revenue Planner
            </h1>
            <p className="page-subtitle" style={{ margin: '0.5rem 0 0 0' }}>
              Predict busy periods and plan for slow months using the Indian business calendar
            </p>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleSavePlan} 
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Plan Snapshot'}
          </button>
        </div>

        {/* Insights Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Best Quarter</p>
            <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {insights.best_quarter} <TrendingUp size={20} color="#10b981" />
            </h3>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Worst Quarter</p>
            <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {insights.worst_quarter} <TrendingDown size={20} color="#ef4444" />
            </h3>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Seasonality Index</p>
            <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem' }}>
              {insights.seasonality_index}%
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>Variance from average</p>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f97316' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Next Peak In</p>
            <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {insights.months_until_next_peak} Months <Clock size={20} color="#f97316" />
            </h3>
          </div>
        </div>

        {/* Year Overview - Calendar Strip */}
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Year at a Glance</h2>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2rem' }}>
          {monthly_plan.map(m => {
            const colors = PATTERN_COLORS[m.pattern];
            const isCurrent = m.month === currentMonth;
            const isExpanded = m.month === expandedMonth;
            
            return (
              <div 
                key={m.month}
                onClick={() => setExpandedMonth(m.month)}
                style={{
                  minWidth: '100px',
                  padding: '1rem 0.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: colors.bg,
                  border: `2px solid ${isExpanded ? colors.text : colors.border}`,
                  boxShadow: isCurrent ? `0 0 10px ${colors.border}` : 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  transform: isExpanded ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <div style={{ fontWeight: 'bold', color: colors.text, marginBottom: '0.25rem' }}>
                  {m.name.substring(0, 3)}
                </div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: colors.text, opacity: 0.8 }}>
                  {m.pattern}
                </div>
                {isCurrent && (
                  <div style={{ fontSize: '0.65rem', marginTop: '0.5rem', background: colors.text, color: '#fff', borderRadius: '4px', padding: '2px' }}>
                    CURRENT
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Revenue Trend Chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem' }}>Revenue Projection</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Area type="monotone" dataKey="Predicted" stroke="#f97316" fillOpacity={1} fill="url(#colorPredicted)" />
                  <ReferenceLine y={chartData.reduce((acc, curr) => acc + curr.Predicted, 0) / 12} stroke="#9ca3af" strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Detail Section */}
          <div className="card" style={{ padding: '1.5rem', borderTop: `6px solid ${PATTERN_COLORS[activeMonthData.pattern].text}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0', fontSize: '1.5rem' }}>{activeMonthData.name} Plan</h3>
                <span style={{ 
                  display: 'inline-block', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '1rem', 
                  backgroundColor: PATTERN_COLORS[activeMonthData.pattern].bg,
                  color: PATTERN_COLORS[activeMonthData.pattern].text,
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  marginTop: '0.5rem'
                }}>
                  {activeMonthData.pattern} Month
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Prediction</p>
                <h4 style={{ margin: '0', fontSize: '1.5rem', color: '#111827' }}>₹{activeMonthData.predicted_revenue.toLocaleString()}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                  Confidence: <span style={{ fontWeight: 'bold' }}>{activeMonthData.confidence_level}</span>
                </p>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

            {activeMonthData.events.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#4b5563' }}>Key Events</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {activeMonthData.events.map((e, idx) => (
                    <span key={idx} style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ margin: '0 0 0.75rem 0', color: '#4b5563' }}>Action Plan</h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {activeMonthData.recommendations.map((rec, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <CheckCircle size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {activeMonthData.preparation_tasks.length > 0 && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>Proactive Preparation (Do this now)</h5>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {activeMonthData.preparation_tasks.map((task, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#1e3a8a' }}>
                      <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeMonthData.emergency_fund_target > 0 && (
              <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>Emergency Fund Target</h5>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#7f1d1d' }}>
                  Aim to save <strong>₹{activeMonthData.emergency_fund_target.toLocaleString()}</strong> this month to prepare for upcoming slow periods.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
