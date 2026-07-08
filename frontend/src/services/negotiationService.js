import api from './api'

export const getScenarios = async () =>
  (await api.get('/negotiate/scenarios')).data

export const startSession = async (payload) =>
  (await api.post('/negotiate/start', payload)).data

export const sendNegotiationMessage = async (session_id, message) =>
  (await api.post('/negotiate/message', { session_id, message })).data

export const endSession = async (session_id) =>
  (await api.post(`/negotiate/end/${session_id}`)).data

export const getNegotiationSessions = async () =>
  (await api.get('/negotiate/sessions')).data

export const getNegotiationSession = async (id) =>
  (await api.get(`/negotiate/sessions/${id}`)).data