import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import api from '../../services/api'

const LEVEL_STYLES = {
  HIGH: { bg: '#fee2e2', border: '#fecaca', text: '#b91c1c' },
  MEDIUM: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
  LOW: { bg: '#dcfce7', border: '#86efac', text: '#15803d' },
}

export default function SmartAlerts() {
  const [alerts, setAlerts] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/activity/alerts')
      .then((res) => setAlerts(res.data || []))
      .catch(() => {})
  }, [])

  if (!alerts.length) return null

  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #dc2626' }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#dc2626' }}>
        ⚡ Smart Alerts ({alerts.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((alert, i) => {
          const style = LEVEL_STYLES[alert.level] || LEVEL_STYLES.LOW
          return (
            <div key={i} onClick={() => navigate(alert.link)}
              style={{ padding: '9px 12px', borderRadius: 8, background: style.bg, border: `1px solid ${style.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{alert.icon}</span>
                <p style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.4 }}>{alert.message}</p>
              </div>
              <ChevronRight size={14} color={style.text} style={{ flexShrink: 0 }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}