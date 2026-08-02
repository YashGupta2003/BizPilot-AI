import api from './api'

export const getEscalationOverview = async () =>
  (await api.get('/escalation/overview')).data

export const generateEscalationDoc = async (invoiceId, stage = null) =>
  (await api.post(`/escalation/generate/${invoiceId}`, { stage })).data

export const logEscalationSent = async (invoiceId, payload) =>
  (await api.post(`/escalation/log-sent/${invoiceId}`, payload)).data

export const getEscalationHistory = async () =>
  (await api.get('/escalation/history')).data