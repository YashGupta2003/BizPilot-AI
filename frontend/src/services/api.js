import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Automatically attach the JWT token to every request, if we have one stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bizpilot_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If the token is invalid/expired, log the user out automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('bizpilot_token')
      localStorage.removeItem('bizpilot_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
