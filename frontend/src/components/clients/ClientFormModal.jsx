import { useState } from 'react'

export default function ClientFormModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', default_rate: '' })
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, default_rate: form.default_rate ? parseFloat(form.default_rate) : null }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div className="card" style={{ width: 420 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Add new client</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input-field" placeholder="Client name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          <input className="input-field" type="email" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          <input className="input-field" placeholder="Company" value={form.company} onChange={(e) => update('company', e.target.value)} />
          <input className="input-field" type="number" placeholder="Default hourly rate (₹)" value={form.default_rate} onChange={(e) => update('default_rate', e.target.value)} />

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving...' : 'Save client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
