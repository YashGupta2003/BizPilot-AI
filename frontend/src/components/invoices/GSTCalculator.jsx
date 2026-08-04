import { useState, useEffect, useCallback } from 'react'
import { Calculator, RefreshCw, Info } from 'lucide-react'
import { calculateGST, getExchangeRates } from '../../services/currencyService'

const GST_SLABS = [0, 5, 12, 18, 28]

const CURRENCIES = {
  INR: { name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  AED: { name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
}

function BreakdownRow({ label, value, bold, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: bold ? '#1a1d23' : 'var(--text-muted)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: color || (bold ? '#1a1d23' : 'var(--text-secondary)') }}>{value}</span>
    </div>
  )
}

export default function GSTCalculator({ initialSubtotal = '', initialCurrency = 'INR', onTaxCalculated }) {
  const [subtotal, setSubtotal] = useState(String(initialSubtotal))
  const [currency, setCurrency] = useState(initialCurrency)
  const [gstRate, setGstRate] = useState(18)
  const [isInterState, setIsInterState] = useState(true)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [rates, setRates] = useState(null)

  useEffect(() => {
    getExchangeRates().then((d) => setRates(d.rates_to_inr)).catch(() => {})
  }, [])

  const isExport = currency !== 'INR'

  const calculate = useCallback(async () => {
    const amount = parseFloat(subtotal)
    if (!amount || amount <= 0) return
    setLoading(true)
    try {
      const res = await calculateGST({
        subtotal: amount,
        currency,
        gst_rate: gstRate,
        is_export: isExport,
        is_inter_state: isInterState,
      })
      setResult(res)
      onTaxCalculated?.(res)
    } catch {
      // keep last valid result
    } finally {
      setLoading(false)
    }
  }, [subtotal, currency, gstRate, isInterState, isExport, onTaxCalculated])

  useEffect(() => {
    const t = setTimeout(() => { if (subtotal && parseFloat(subtotal) > 0) calculate() }, 600)
    return () => clearTimeout(t)
  }, [calculate])

  const sym = CURRENCIES[currency]?.symbol || currency
  const fmt = (n) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '0'
  const fmtInr = (n) => `₹${n?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '0'}`

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Calculator size={18} color="#4f46e5" />
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>GST + Currency Calculator</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Amount</label>
          <input className="input-field" type="number" placeholder="0.00"
            value={subtotal} onChange={(e) => setSubtotal(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Currency</label>
          <select className="input-field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code}>{info.flag} {code} — {info.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!isExport && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>GST Rate</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {GST_SLABS.map((slab) => (
              <button key={slab} onClick={() => setGstRate(slab)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                border: gstRate === slab ? '2px solid #4f46e5' : '1px solid #d1d5db',
                background: gstRate === slab ? '#eef2ff' : 'var(--bg-card)',
                color: gstRate === slab ? '#4f46e5' : 'var(--text-secondary)',
                fontWeight: gstRate === slab ? 700 : 400,
              }}>{slab}%</button>
            ))}
          </div>
        </div>
      )}

      {!isExport && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Supply type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[true, false].map((val) => (
              <button key={String(val)} onClick={() => setIsInterState(val)} style={{
                flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                border: isInterState === val ? '2px solid #4f46e5' : '1px solid #d1d5db',
                background: isInterState === val ? '#eef2ff' : 'var(--bg-card)',
                color: isInterState === val ? '#4f46e5' : 'var(--text-secondary)',
                fontWeight: isInterState === val ? 600 : 400,
              }}>
                {val ? 'Inter-state (IGST)' : 'Intra-state (CGST+SGST)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {isExport && (
        <div style={{ padding: '8px 12px', background: '#dcfce7', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={14} />
          Foreign currency — 0% GST (Export of services, zero-rated under IGST Act)
        </div>
      )}

      {currency !== 'INR' && rates && (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12, background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 6 }}>
          Live rate: 1 {currency} = ₹{rates[currency]?.toFixed(2) || '—'}
          <span style={{ color: 'var(--text-muted)' }}> (updated hourly)</span>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
          <RefreshCw size={16} className="spin" /> Calculating...
        </div>
      )}

      {result && !loading && (
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 14px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Breakdown</p>
          <BreakdownRow label="Subtotal" value={`${sym} ${fmt(result.subtotal)}`} />
          {result.igst_amount > 0 && <BreakdownRow label={`IGST @ ${result.igst_rate}%`} value={`${sym} ${fmt(result.igst_amount)}`} color="#dc2626" />}
          {result.cgst_amount > 0 && <BreakdownRow label={`CGST @ ${result.cgst_rate}%`} value={`${sym} ${fmt(result.cgst_amount)}`} color="#dc2626" />}
          {result.sgst_amount > 0 && <BreakdownRow label={`SGST @ ${result.sgst_rate}%`} value={`${sym} ${fmt(result.sgst_amount)}`} color="#dc2626" />}
          {result.total_gst === 0 && <BreakdownRow label="GST" value="₹0 (Zero-rated)" color="#15803d" />}
          <BreakdownRow label="Total" value={`${sym} ${fmt(result.total_with_gst)}`} bold />
          {currency !== 'INR' && <BreakdownRow label="Total in INR" value={fmtInr(result.total_inr)} bold color="#4f46e5" />}
          <div style={{ marginTop: 10, padding: '6px 8px', background: '#eef2ff', borderRadius: 6, fontSize: 11.5, color: '#4338ca' }}>
            {result.gst_compliance_note}
          </div>
        </div>
      )}
    </div>
  )
}