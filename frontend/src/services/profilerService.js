import api from './api'

export const analyzeClient = async (client_text, client_id = null) =>
  (await api.post('/profiler/analyze', { client_text, client_id })).data

export const getProfileHistory = async () =>
  (await api.get('/profiler/history')).data

export const getProfile = async (id) =>
  (await api.get(`/profiler/history/${id}`)).data

export const deleteProfile = async (id) =>
  (await api.delete(`/profiler/history/${id}`)).data