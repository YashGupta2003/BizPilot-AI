import api from './api'

export const resolveDispute = async (dispute_message, client_id = null, client_name = null) =>
  (await api.post('/disputes/resolve', { dispute_message, client_id, client_name })).data

export const getDisputeHistory = async () =>
  (await api.get('/disputes/history')).data

export const deleteDispute = async (id) =>
  (await api.delete(`/disputes/${id}`)).data