import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Zap } from 'lucide-react'
import api from '../../services/api'

const LEVEL_MAP = {
  HIGH:   { cls: 'alert-error',   dot: 'var(--red)' },
  MEDIUM: { cls: 'alert-warning', dot: 'var(--amber)' },
  LOW:    { cls: 'alert-success', dot: 'var(--green)' },
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
    <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--red)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Zap size={14} color="var(--red)" />
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
          Smart Alerts ({alerts.length})
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((alert, i) => {
          const level = LEVEL_MAP[alert.level] || LEVEL_MAP.LOW
          return (
            <div
              key={i}
              onClick={() => navigate(alert.link)}
              className={`alert ${level.cls}`}
              style={{ cursor: 'pointer', justifyContent: 'space-between', marginBottom: 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{alert.icon}</span>
                <p style={{ fontSize: 13, lineHeight: 1.4 }}>{alert.message}</p>
              </div>
              <ChevronRight size={14} style={{ flexShrink: 0 }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}