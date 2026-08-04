import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, MessageSquare,
  Bell, Globe, Swords, Brain, Activity, ScrollText,
  Mic2, PieChart, Receipt, Gavel, Shield, DollarSign, LogOut, Scale, TrendingUp, Target,
  Handshake, Crosshair, MessageCircleWarning, Zap, FileDiff, CalendarDays,
  ChevronRight
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ActivityFeed from './ActivityFeed'

const navSections = [
  {
    label: 'Main',
    items: [
      { to: '/',          label: 'Dashboard',      icon: LayoutDashboard },
      { to: '/clients',   label: 'Clients',         icon: Users },
      { to: '/invoices',  label: 'Invoices',        icon: FileText },
      { to: '/meetings',  label: 'Meeting Notes',   icon: Mic2 },
      { to: '/reminders', label: 'Reminders',       icon: Bell },
    ]
  },
  {
    label: 'Finance & Growth',
    items: [
      { to: '/pricing',   label: 'Smart Pricing',   icon: DollarSign },
      { to: '/goals',     label: 'Income Goals',    icon: Crosshair },
      { to: '/portfolio', label: 'Portfolio ROI',   icon: PieChart },
      { to: '/ltv',       label: 'Client LTV',      icon: TrendingUp },
      { to: '/winrate',   label: 'Win Rate',        icon: Target },
      { to: '/tax',       label: 'Tax Assistant',   icon: Receipt },
      { to: '/currency',  label: 'Currency & GST',  icon: Globe },
      { to: '/seasonal',  label: 'Seasonal Planner',icon: CalendarDays },
    ]
  },
  {
    label: 'Client Intelligence',
    items: [
      { to: '/health',    label: 'Client Health',   icon: Activity },
      { to: '/profiler',  label: 'Client Profiler', icon: Brain },
      { to: '/networking',label: 'Networking',      icon: Handshake },
      { to: '/disputes',  label: 'Dispute Resolver',icon: Scale },
      { to: '/escalation',label: 'Escalation',      icon: Gavel },
    ]
  },
  {
    label: 'AI Tools',
    items: [
      { to: '/assistant',        label: 'AI Assistant',     icon: MessageSquare },
      { to: '/contracts',        label: 'Contracts',        icon: ScrollText },
      { to: '/contract-compare', label: 'Contract Diff',    icon: FileDiff },
      { to: '/scope',            label: 'Scope Detector',   icon: Shield },
      { to: '/negotiate',        label: 'Negotiation Sim',  icon: Swords },
      { to: '/tone',             label: 'Tone Analyzer',    icon: MessageCircleWarning },
      { to: '/mental-load',      label: 'Mental Load',      icon: Zap },
      { to: '/burnout',          label: 'Income Stability', icon: Activity },
    ]
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'BP'

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🚀</div>
        <span className="sidebar-logo-text">BizPilot AI</span>
      </div>

      {/* User chip */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name || 'User'}</div>
          <div className="sidebar-user-biz">{user?.business_name || 'My Business'}</div>
        </div>
      </div>

      {/* Navigation sections */}
      {navSections.map(section => (
        <div key={section.label}>
          <div className="sidebar-section-label">{section.label}</div>
          <nav className="sidebar-nav">
            {section.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <Icon size={14} className="sidebar-link-icon" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}

      {/* Activity feed */}
      <ActivityFeed />

      {/* Bottom: logout */}
      <div className="sidebar-bottom">
        <button onClick={logout} className="sidebar-logout">
          <LogOut size={14} />
          Log out
        </button>
      </div>
    </aside>
  )
}