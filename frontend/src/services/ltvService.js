import api from './api'

export const getLTVLeaderboard = async () =>
  (await api.get('/ltv/leaderboard')).data

export const getClientLTV = async (clientId) =>
  (await api.get(`/ltv/client/${clientId}`)).data