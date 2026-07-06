import api from './api'

export const getExchangeRates = async () =>
  (await api.get('/currency/rates')).data

export const getSupportedCurrencies = async () =>
  (await api.get('/currency/supported')).data

export const calculateGST = async (payload) =>
  (await api.post('/currency/calculate-gst', payload)).data

export const searchSACCodes = async (q) =>
  (await api.get('/currency/sac-search', { params: { q } })).data

export const getSACList = async () =>
  (await api.get('/currency/sac-list')).data