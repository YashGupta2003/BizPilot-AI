import api from './api'

export const getClients = async () => (await api.get('/clients')).data
export const getClient = async (id) => (await api.get(`/clients/${id}`)).data
export const createClient = async (data) => (await api.post('/clients', data)).data
export const updateClient = async (id, data) => (await api.put(`/clients/${id}`, data)).data
export const deleteClient = async (id) => (await api.delete(`/clients/${id}`)).data
