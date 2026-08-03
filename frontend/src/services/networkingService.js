import api from './api'

const networkingService = {
  getOpportunities: () => api.get('/networking/opportunities'),
  analyzeForClient: (clientId) => api.post('/networking/analyze', { client_id: clientId }),
  getHistory: () => api.get('/networking/history'),
  deleteAnalysis: (id) => api.delete(`/networking/history/${id}`),
}

export default networkingService
