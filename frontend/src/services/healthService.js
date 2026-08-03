import api from './api'

export const getAllHealthScores = async () =>
  (await api.get('/health/all')).data

export const getClientHealthScore = async (clientId) =>
  (await api.get(`/health/client/${clientId}`)).data