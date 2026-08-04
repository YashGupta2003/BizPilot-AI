import api from './api'

export const getMentalLoadScore = async () =>
  (await api.get('/mental-load/score')).data

export const getMentalLoadHistory = async () =>
  (await api.get('/mental-load/history')).data

export const getMentalLoadItems = async () =>
  (await api.get('/mental-load/items')).data
