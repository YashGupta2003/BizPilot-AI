import { useEffect, useState } from 'react'
import {
  MessageSquare, Send, Clock, CheckCircle2, AlertTriangle,
  Phone, Edit3, RefreshCw, Loader2
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { getOverduePreviews, sendReminder } from '../services/reminderService'

const SEVERITY_COLORS = {
  low: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', label: 'Gentle reminder' },
  medium: { bg: '#fee2e2', border: '#fecaca', text: '#b91c1c', label: 'Follow-up needed' },
  high: { bg: '#fdf2f8', border: '#f5d0fe', text: '#86198f', label: 'Urgent' },
}

function getSeverity(daysOverdue) {
  if (daysOverdue <= 7) return 'low'
  if (daysOverdue <= 20) return 'medium'
  return 'high'
}

function formatCurrency(amount) {
  return `₹${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function ReminderCard({ item, onSendSuccess }) {
  const [phone, setPhone] = useState(item.client_phone || '')
  const [message, setMessage] = useState(item.drafted_message)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const severity = getSeverity(item.days_overdue)
  const colors = SEVERITY_COLORS[severity]

  async function handleSend() {
    if (!phone.trim()) { setError("Enter the client's WhatsApp number first."); return }
    if (!message.trim()) { setError('Message cannot be empty.'); return }
    setSending(true)
    setError('')
    try {
      await sendReminder({ invoice_id: item.invoice_id, client_phone: phone, message })
      setSent(true)
      onSendSuccess?.()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send. Check Twilio credentials in .env')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="card" style={{ borderLeft: '4px solid #15803d' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 600 }}>Reminder sent to {item.client_name}</span>
        </div>
        <p style={{ fontSize: 12.5, color: '#6b7280', marginTop: 4 }}>
          {item.invoice_number} — {formatCurrency(item.total)} — Sent to {phone}
        </p>
      </div>
    )
  }

  return (
    <div className="card" style={{ border: `1px solid ${colors.border}`, background: colors.bg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{item.client_name}</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: colors.border, color: colors.text, fontWeight: 500 }}>
              {colors.label}
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: '#6b7280' }}>
            {item.invoice_number} · {formatCurrency(item.total)} ·
            <strong style={{ color: colors.text }}> {item.days_overdue} days overdue</strong>
            · {item.reminder_count > 0 ? `${item.reminder_count} reminder(s) sent` : 'No reminders yet'}
          </p>
        </div>
        {item.already_sent_today && (
          <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '4px 10px', borderRadius: 999 }}>
            Already sent today
          </span>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <Phone size={12} /> WhatsApp number (with country code, e.g. +919876543210)
        </label>
        <input
          className="input-field"
          placeholder="+919876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ background: 'white' }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <label style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
            <MessageSquare size={12} /> AI-drafted message (edit before sending)
          </label>
          <button onClick={() => setEditing(!editing)} style={{ fontSize: 12, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Edit3 size={12} /> {editing ? 'Done' : 'Edit'}
          </button>
        </div>
        {editing ? (
          <textarea className="input-field" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} style={{ background: 'white', resize: 'vertical' }} />
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap', background: 'white', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            {message}
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: '#dc2626', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <AlertTriangle size={13} /> {error}
        </p>
      )}

      <button
        className="btn-primary"
        onClick={handleSend}
        disabled={sending || item.already_sent_today}
        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
      >
        {sending ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
        {sending ? 'Sending...' : item.already_sent_today ? 'Already sent today' : 'Send via WhatsApp'}
      </button>
    </div>
  )
}

export default function RemindersPage() {
  const [previews, setPreviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sentCount, setSentCount] = useState(0)

  useEffect(() => { loadPreviews() }, [])

  async function loadPreviews() {
    setLoading(true)
    setError('')
    try {
      const data = await getOverduePreviews()
      setPreviews(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load overdue invoices.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Payment Reminders</h1>
          <p className="page-subtitle">AI-drafted WhatsApp reminders for overdue invoices — review and approve before sending</p>
        </div>
        <button className="btn-secondary" onClick={loadPreviews} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #4f46e5', background: '#eef2ff' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#4f46e5' }}>Twilio WhatsApp Setup (one-time, free)</h3>
        <ol style={{ fontSize: 13, color: '#4b5563', lineHeight: 2, paddingLeft: 18 }}>
          <li>Sign up free at <strong>console.twilio.com</strong></li>
          <li>Go to <strong>Messaging → Try it Out → Send a WhatsApp message</strong></li>
          <li>From your phone WhatsApp, send <code style={{ background: '#e0e7ff', padding: '1px 6px', borderRadius: 4 }}>join [your-sandbox-word]</code> to <strong>+14155238886</strong></li>
          <li>Copy <strong>Account SID</strong> + <strong>Auth Token</strong> from the Twilio console dashboard</li>
          <li>Add to <code style={{ background: '#e0e7ff', padding: '1px 6px', borderRadius: 4 }}>backend/.env</code>: <code style={{ background: '#e0e7ff', padding: '1px 6px', borderRadius: 4 }}>TWILIO_ACCOUNT_SID=ACxxxx</code> and <code style={{ background: '#e0e7ff', padding: '1px 6px', borderRadius: 4 }}>TWILIO_AUTH_TOKEN=xxxx</code></li>
          <li>Restart backend → done!</li>
        </ol>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Loader2 size={28} className="spin" color="#4f46e5" />
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 12 }}>Scanning invoices and drafting reminders...</p>
        </div>
      ) : error ? (
        <div className="card"><p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p></div>
      ) : previews.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircle2 size={36} color="#15803d" />
          <p style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>No overdue invoices!</p>
          <p style={{ fontSize: 13.5, color: '#6b7280', marginTop: 4 }}>All your sent invoices are within their due dates.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16, fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} />
            {previews.length} overdue invoice{previews.length !== 1 ? 's' : ''} found.
            {sentCount > 0 && <span style={{ color: '#15803d', fontWeight: 600 }}> {sentCount} reminder(s) sent this session.</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {previews.map((item) => (
              <ReminderCard key={item.invoice_id} item={item} onSendSuccess={() => setSentCount((c) => c + 1)} />
            ))}
          </div>
        </>
      )}
    </AppLayout>
  )
}