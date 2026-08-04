import { useEffect, useState } from 'react'
import { Globe, Calculator, FileText, RefreshCw, Loader2, TrendingUp, Info } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import GSTCalculator from '../components/invoices/GSTCalculator'
import { getExchangeRates, getSACList } from '../services/currencyService'

const CURRENCY_META = {
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  AED: { name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
  JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
}

const GST_SLAB_COLORS = {
  0: '#15803d', 5: '#1d4ed8', 12: '#7c3aed', 18: '#b45309', 28: '#b91c1c'
}

function Tab({ label, active, onClick, icon: Icon }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '9px 18px', borderRadius: 8, fontSize: 14,
      border: 'none', cursor: 'pointer', fontWeight: active ? 600 : 400,
      background: active ? '#4f46e5' : 'transparent',
      color: active ? '#fff' : 'var(--text-muted)',
    }}>
      <Icon size={15} /> {label}
    </button>
  )
}

function ExchangeRatesTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    getExchangeRates().then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <Loader2 size={28} className="spin" color="#4f46e5" />
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>Fetching live rates...</p>
    </div>
  )

  const rates = data?.rates_to_inr || {}

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <TrendingUp size={16} color="#15803d" />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Live rates — updated hourly from ECB</span>
        <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
        {Object.entries(CURRENCY_META).map(([code, meta]) => (
          <div key={code} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{meta.flag}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{code}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{meta.name}</p>
              </div>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              ₹{rates[code] ? rates[code].toFixed(2) : '—'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>per 1 {code}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function GSTSlabsTab() {
  const [sacList, setSacList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getSACList().then((d) => setSacList(d.sac_codes || [])).finally(() => setLoading(false))
  }, [])

  const filtered = sacList.filter((s) =>
    s.description.toLowerCase().includes(search.toLowerCase()) || s.sac_code.includes(search)
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[0, 5, 12, 18, 28].map((slab) => (
          <span key={slab} style={{
            padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
            background: GST_SLAB_COLORS[slab] + '18', color: GST_SLAB_COLORS[slab],
            border: `1px solid ${GST_SLAB_COLORS[slab]}40`,
          }}>{slab}% GST</span>
        ))}
      </div>

      <div style={{ padding: '10px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
        <span>
          Most IT, design, consulting and content services: <strong>18% GST (SAC 9983)</strong>.
          Foreign-currency invoices are <strong>zero-rated (0%)</strong> as export of services.
        </span>
      </div>

      <input className="input-field" placeholder="Search by service type (e.g. website, logo, consulting)..."
        value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 14 }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Loader2 size={24} className="spin" color="#4f46e5" /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr><th>SAC Code</th><th>Service Description</th><th>GST Rate</th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.sac_code}>
                  <td><code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{s.sac_code}</code></td>
                  <td style={{ fontSize: 13 }}>{s.description}</td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: GST_SLAB_COLORS[s.gst_rate] + '18', color: GST_SLAB_COLORS[s.gst_rate] }}>
                      {s.gst_rate}%
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No matching SAC codes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function CurrencyGSTPage() {
  const [tab, setTab] = useState('calculator')

  return (
    <AppLayout>
      <h1 className="page-title">Currency & GST</h1>
      <p className="page-subtitle">Live exchange rates, GST calculator, and SAC code reference</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg-elevated)', padding: 6, borderRadius: 10, width: 'fit-content' }}>
        <Tab label="GST Calculator" active={tab === 'calculator'} onClick={() => setTab('calculator')} icon={Calculator} />
        <Tab label="Exchange Rates" active={tab === 'rates'} onClick={() => setTab('rates')} icon={Globe} />
        <Tab label="GST & SAC Codes" active={tab === 'slabs'} onClick={() => setTab('slabs')} icon={FileText} />
      </div>

      {tab === 'calculator' && <GSTCalculator />}
      {tab === 'rates' && <ExchangeRatesTab />}
      {tab === 'slabs' && <GSTSlabsTab />}
    </AppLayout>
  )
}