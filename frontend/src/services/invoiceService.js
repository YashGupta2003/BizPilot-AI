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

export const getInvoicePdfUrl = (id) => {
  const token = localStorage.getItem('bizpilot_token')
  return `http://localhost:8000/api/invoices/${id}/pdf?token=${token}`
}
