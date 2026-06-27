import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import ClientFormModal from '../components/clients/ClientFormModal'
import { getClients, createClient, deleteClient } from '../services/clientService'

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    setLoading(true)
    const data = await getClients()
    setClients(data)
    setLoading(false)
  }

  async function handleSave(payload) {
    await createClient(payload)
    setShowModal(false)
    await loadClients()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this client? This cannot be undone.')) return
    await deleteClient(id)
    await loadClients()
  }

  function formatCurrency(amount) {
    return `₹${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Manage your client relationships</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add client
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading...</p>
        ) : clients.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 14 }}>No clients yet. Add your first client to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Company</th><th>Email</th>
                <th>Total invoiced</th><th>Pending</th><th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.company || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{formatCurrency(c.total_invoiced)}</td>
                  <td>{formatCurrency(c.total_pending)}</td>
                  <td>
                    <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none' }}>
                      <Trash2 size={16} color="#dc2626" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <ClientFormModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </AppLayout>
  )
}
