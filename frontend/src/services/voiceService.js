import api from './api'

export const transcribeVoiceToInvoice = async (audioBlob) => {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')

  const res = await api.post('/voice/to-invoice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}