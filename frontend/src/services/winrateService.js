import api from './api'

export const logProposal = async (payload) =>
  (await api.post('/winrate/proposals/log', payload)).data

export const getWinRateInsights = async () =>
  (await api.get('/winrate/insights')).data

export const predictWin = async (payload) =>
  (await api.post('/winrate/predict', payload)).data

export const getProposals = async () =>
  (await api.get('/winrate/proposals')).data

export const deleteProposal = async (id) =>
  (await api.delete(`/winrate/proposals/${id}`)).data