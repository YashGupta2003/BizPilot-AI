import api from './api'

export const getTaxReport = async (fyStart = null) =>
  (await api.get('/tax/report', { params: fyStart ? { fy_start: fyStart } : {} })).data

export const getTaxChecklist = async () =>
  (await api.get('/tax/checklist')).data