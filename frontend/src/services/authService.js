import api from './api'

export async function signup({ name, email, password, business_name }) {
  const res = await api.post('/auth/signup', { name, email, password, business_name })
  return res.data
}

export async function login(email, password) {
  // FastAPI's OAuth2PasswordRequestForm expects form-urlencoded data with
  // "username" and "password" fields specifically (even though we use email as username)
  const form = new URLSearchParams()
  form.append('username', email)
  form.append('password', password)

  const res = await api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return res.data
}

export async function getMe() {
  const res = await api.get('/auth/me')
  return res.data
}
