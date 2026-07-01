import api from './api'

export const getOverduePreviews = async () =>
  (await api.get('/reminders/overdue-previews')).data

export const sendReminder = async ({ invoice_id, client_phone, message }) =>
  (await api.post('/reminders/send', { invoice_id, client_phone, message })).data

export const getReminderHistory = async () =>
  (await api.get('/reminders/history')).data