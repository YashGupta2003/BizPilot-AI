import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function ActivityFeed() {
  const [events, setEvents] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/activity/feed?limit=6')
      .then((res) => setEvents(res.data || []))
      .catch(() => {})
  }, [])

  if (!events.length) return null

  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid var(--sidebar-border)', marginTop: 8 }}>
      <p style={{
        fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.7px',
        marginBottom: 8, padding: '0 10px'
      }}>
        Recent Activity
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {events.slice(0, 5).map((event, i) => (
          <div
            key={i}
            onClick={() => navigate(event.link)}
            style={{
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.35, fontWeight: 500 }}>
              {event.title}
            </p>
            {event.subtitle && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {event.subtitle.slice(0, 38)}{event.subtitle.length > 38 ? '…' : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}