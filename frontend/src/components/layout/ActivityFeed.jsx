import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import api from '../../services/api'

export default function ActivityFeed() {
  const [events, setEvents] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/activity/feed?limit=8')
      .then((res) => setEvents(res.data || []))
      .catch(() => {})
  }, [])

  if (!events.length) return null

  return (
    <div style={{ padding: '16px 0', borderTop: '1px solid #2d3139', marginTop: 8 }}>
      <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10, padding: '0 8px' }}>
        Recent Activity
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {events.slice(0, 6).map((event, i) => (
          <div key={i} onClick={() => navigate(event.link)}
            style={{ padding: '7px 8px', borderRadius: 6, cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <p style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.3 }}>{event.title}</p>
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{event.subtitle?.slice(0, 35)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}