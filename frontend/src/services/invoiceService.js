import api from './api'

export const getInvoices = async (status) =>
  (await api.get('/invoices', { params: status ? { status } : {} })).data

export const getInvoice = async (id) => (await api.get(`/invoices/${id}`)).data

export const createInvoice = async (data) => (await api.post('/invoices', data)).data

export const generateInvoiceFromText = async (data) =>
  (await api.post('/invoices/generate-from-text', data)).data

export const updateInvoiceStatus = async (id, status) =>
  (await api.patch(`/invoices/${id}/status`, { status })).data

export const deleteInvoice = async (id) => (await api.delete(`/invoices/${id}`)).data

export const downloadInvoicePdf = async (id) => {
  const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
  return window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
}

/**
 * @deprecated Use downloadInvoicePdf instead to avoid token exposure in URL.
 */
export const getInvoicePdfUrl = (id) => {
  const userStr = localStorage.getItem('bizpilot_user')
  const user = userStr ? JSON.parse(userStr) : null
  const token = user?.token || ''
  return `http://localhost:8000/api/invoices/${id}/pdf?token=${token}`
}
