import api from './api'

export const getBurnoutPrediction = async () =>
  (await api.get('/burnout/prediction')).data