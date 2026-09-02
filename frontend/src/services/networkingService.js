import api from './api'

export const getOpportunities = async () => (await api.get('/networking/opportunities')).data

export const analyzeForClient = async (clientId) =>
  (await api.post('/networking/analyze', { client_id: clientId })).data

export const getHistory = async () => (await api.get('/networking/history')).data

export const deleteAnalysis = async (id) => (await api.delete(`/networking/history/${id}`)).data
