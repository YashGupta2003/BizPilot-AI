import api from './api'

export const compareContracts = async (payload) =>
  (await api.post('/contract-compare/analyze', payload)).data

export const getComparisonHistory = async () =>
  (await api.get('/contract-compare/history')).data

export const getComparison = async (id) =>
  (await api.get(`/contract-compare/${id}`)).data

export const deleteComparison = async (id) =>
  (await api.delete(`/contract-compare/${id}`)).data
