import api from './api'

export const analyzeTone = async (data) => (await api.post('/tone/analyze', data)).data

export const getHistory = async () => (await api.get('/tone/history')).data

export const getAnalysis = async (id) => (await api.get(`/tone/history/${id}`)).data

export const getClientTones = async (clientId) => (await api.get(`/tone/client/${clientId}`)).data

export const deleteAnalysis = async (id) => (await api.delete(`/tone/history/${id}`)).data
