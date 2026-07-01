import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, MessageSquare, Bell, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/reminders', label: 'Reminders', icon: Bell },
  { to: '/assistant', label: 'AI Assistant', icon: MessageSquare },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside style={{
      width: 240,
      background: '#1a1d23',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, padding: '0 8px' }}>
        BizPilot AI
      </div>
      <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 32, padding: '0 8px' }}>
        {user?.business_name}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? '#fff' : '#9ca3af',
              background: isActive ? '#4f46e5' : 'transparent',
              textDecoration: 'none',
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={logout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 8,
          fontSize: 14,
          color: '#9ca3af',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <LogOut size={18} />
        Log out
      </button>
    </aside>
  )
}