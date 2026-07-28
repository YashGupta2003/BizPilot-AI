import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, MessageSquare,
  Bell, Globe, Swords, Brain, Activity, ScrollText,
  Mic2, PieChart, LogOut
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ActivityFeed from './ActivityFeed'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/contracts', label: 'Contracts', icon: ScrollText },
  { to: '/meetings', label: 'Meeting Notes', icon: Mic2 },
  { to: '/reminders', label: 'Reminders', icon: Bell },
  { to: '/burnout', label: 'Income Stability', icon: Activity },
  { to: '/portfolio', label: 'Portfolio ROI', icon: PieChart },
  { to: '/currency', label: 'Currency & GST', icon: Globe },
  { to: '/negotiate', label: 'Negotiation Sim', icon: Swords },
  { to: '/profiler', label: 'Client Profiler', icon: Brain },
  { to: '/assistant', label: 'AI Assistant', icon: MessageSquare },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  return (
    <aside style={{ width: 230, background: '#1a1d23', color: '#fff', display: 'flex', flexDirection: 'column', padding: '18px 12px', overflowY: 'auto', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 2, padding: '0 6px' }}>BizPilot AI</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16, padding: '0 6px' }}>{user?.business_name}</div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 9px', borderRadius: 7, fontSize: 13, fontWeight: 500,
            color: isActive ? '#fff' : '#9ca3af',
            background: isActive ? '#4f46e5' : 'transparent',
            textDecoration: 'none',
          })}>
            <Icon size={15} />{label}
          </NavLink>
        ))}
      </nav>

      <ActivityFeed />

      <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', borderRadius: 7, fontSize: 13, color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 8 }}>
        <LogOut size={15} />Log out
      </button>
    </aside>
  )
}