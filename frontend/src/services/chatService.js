import api from './api'

export const sendChatMessage = async (message, client_id = null) =>
  (await api.post('/chat', { message, client_id })).data

export const uploadDocument = async (file, client_id = null) => {
  const formData = new FormData()
  formData.append('file', file)
  if (client_id) formData.append('client_id', client_id)

  const res = await api.post('/chat/upload-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export const getDashboardSummary = async () => (await api.get('/dashboard/summary')).data
