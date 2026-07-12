import api from './api'

export const generateContract = async (payload) =>
  (await api.post('/contracts/generate', payload)).data

export const listContracts = async () =>
  (await api.get('/contracts/list')).data

export const getContract = async (id) =>
  (await api.get(`/contracts/${id}`)).data

export const deleteContract = async (id) =>
  (await api.delete(`/contracts/${id}`)).data