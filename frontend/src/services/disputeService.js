import api from './api'

export const resolveDispute = async (payload) => {
  const { data } = await api.post('/disputes/resolve', payload)
  return data
}
