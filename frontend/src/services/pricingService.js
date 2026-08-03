import api from './api'

export const getPricingSuggestion = async (payload) =>
  (await api.post('/pricing/suggest', payload)).data

export const getPricingHistory = async () =>
  (await api.get('/pricing/history')).data