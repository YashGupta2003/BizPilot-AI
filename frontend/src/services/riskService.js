import api from './api'

export const analyzeContract = async (filename, client_id = null) =>
  (await api.post('/risk/analyze', { filename, client_id })).data

export const getRiskReports = async () => (await api.get('/risk/reports')).data

export const getRiskReport = async (id) => (await api.get(`/risk/reports/${id}`)).data

export const deleteRiskReport = async (id) => (await api.delete(`/risk/reports/${id}`)).data