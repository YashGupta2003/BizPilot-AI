import api from './api'

const toneService = {
  analyzeTone: (data) => api.post('/tone/analyze', data),
  getHistory: () => api.get('/tone/history'),
  getAnalysis: (id) => api.get(`/tone/history/${id}`),
  getClientTones: (clientId) => api.get(`/tone/client/${clientId}`),
  deleteAnalysis: (id) => api.delete(`/tone/history/${id}`),
}

export default toneService
