import { ShieldAlert, ShieldCheck, AlertTriangle, X } from 'lucide-react'

const RISK_COLORS = {
  high: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
  medium: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  low: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
}

function RiskBadge({ level }) {
  const colors = RISK_COLORS[level] || RISK_COLORS.medium
  return (
    <span
      className="badge"
      style={{ background: colors.bg, color: colors.text, textTransform: 'capitalize' }}
    >
      {level} risk
    </span>
  )
}

export default function RiskReportPanel({ report, onClose }) {
  if (!report) return null

  const colors = RISK_COLORS[report.overall_risk_level] || RISK_COLORS.medium

  return (
    <div className="card" style={{ marginBottom: 16, border: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {report.overall_risk_level === 'low' ? (
            <ShieldCheck size={20} color={colors.text} />
          ) : (
            <ShieldAlert size={20} color={colors.text} />
          )}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Contract Risk Report</h3>
            <p style={{ fontSize: 12, color: '#6b7280' }}>{report.filename}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RiskBadge level={report.overall_risk_level} />
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={16} color="#9ca3af" />
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: 13.5, color: '#374151', marginBottom: 14, lineHeight: 1.5 }}>
        {report.summary}
      </p>

      {report.flags && report.flags.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Flagged issues</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.flags.map((flag, i) => {
              const flagColors = RISK_COLORS[flag.severity] || RISK_COLORS.medium
              return (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: flagColors.bg, border: `1px solid ${flagColors.border}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: flagColors.text }}>{flag.category}</span>
                    <span style={{ fontSize: 11, color: flagColors.text, textTransform: 'uppercase' }}>{flag.severity}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{flag.finding}</p>
                  <p style={{ fontSize: 12.5, color: '#4b5563' }}>
                    <strong>Suggestion:</strong> {flag.recommendation}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {report.missing_clauses && report.missing_clauses.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} color="#b91c1c" />
            Missing from this contract
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {report.missing_clauses.map((clause, i) => (
              <span
                key={i}
                style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 999,
                  background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca',
                }}
              >
                {clause}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}