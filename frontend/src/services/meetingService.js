import api from './api'

export const extractMeeting = async (notes, client_id = null) =>
  (await api.post('/meetings/extract', { notes, client_id })).data

export const listMeetings = async () =>
  (await api.get('/meetings/list')).data

export const getMeeting = async (id) =>
  (await api.get(`/meetings/${id}`)).data

export const deleteMeeting = async (id) =>
  (await api.delete(`/meetings/${id}`)).data