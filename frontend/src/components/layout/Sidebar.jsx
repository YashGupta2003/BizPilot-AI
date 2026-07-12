import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, MessageSquare,
  Bell, Globe, Swords, Brain, Activity, ScrollText, LogOut
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/contracts', label: 'Contracts', icon: ScrollText },
  { to: '/reminders', label: 'Reminders', icon: Bell },
  { to: '/burnout', label: 'Income Stability', icon: Activity },
  { to: '/currency', label: 'Currency & GST', icon: Globe },
  { to: '/negotiate', label: 'Negotiation Sim', icon: Swords },
  { to: '/profiler', label: 'Client Profiler', icon: Brain },
  { to: '/assistant', label: 'AI Assistant', icon: MessageSquare },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  return (
    <aside style={{ width: 240, background: '#1a1d23', color: '#fff', display: 'flex', flexDirection: 'column', padding: '20px 14px' }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, padding: '0 8px' }}>BizPilot AI</div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 24, padding: '0 8px' }}>{user?.business_name}</div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 10px', borderRadius: 7, fontSize: 13.5, fontWeight: 500,
            color: isActive ? '#fff' : '#9ca3af',
            background: isActive ? '#4f46e5' : 'transparent',
            textDecoration: 'none',
          })}>
            <Icon size={16} />{label}
          </NavLink>
        ))}
      </nav>
      <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 7, fontSize: 13.5, color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer' }}>
        <LogOut size={16} />Log out
      </button>
    </aside>
  )
}