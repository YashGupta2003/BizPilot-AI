import { useEffect, useState } from 'react'
import { Plus, Trash2, Eye, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import ClientFormModal from '../components/clients/ClientFormModal'
import { createClient, deleteClient } from '../services/clientService'
import api from '../services/api'

const HEALTH_COLORS = {
  Healthy: { bg: '#dcfce7', text: '#15803d' },
  Caution: { bg: '#fef3c7', text: '#92400e' },
  'At Risk': { bg: '#fee2e2', text: '#b91c1c' },
}

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    try {
      const data = await api.get('/client360/summary/all')
      setClients(data.data || [])
    } catch {
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(payload) {
    await createClient(payload)
    setShowModal(false)
    await loadClients()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this client?')) return
    await deleteClient(id)
    await loadClients()
  }

  function formatCurrency(amount) {
    return `₹${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Click any client to see their full 360° view</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add client
        </button>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : clients.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 14 }}>No clients yet. Add your first client.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Total Invoiced</th>
                <th>Total Paid</th>
                <th>Health</th>
                <th>Contract</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const healthStyle = HEALTH_COLORS[c.health_label] || HEALTH_COLORS.Caution
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/clients/${c.id}`)}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ color: '#6b7280' }}>{c.company || '—'}</td>
                    <td>{formatCurrency(c.total_invoiced)}</td>
                    <td style={{ color: '#15803d', fontWeight: 600 }}>{formatCurrency(c.total_paid)}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: healthStyle.bg, color: healthStyle.text }}>
                        {c.health_label} ({c.health_score})
                      </span>
                    </td>
                    <td>
                      {c.has_contract
                        ? <span style={{ fontSize: 11, color: '#15803d' }}>✅ On file</span>
                        : <span style={{ fontSize: 11, color: '#dc2626' }}>⚠️ Missing</span>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => navigate(`/clients/${c.id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Eye size={15} color="#4f46e5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={15} color="#dc2626" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <ClientFormModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </AppLayout>
  )
}