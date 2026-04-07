export const getToken = () => localStorage.getItem('token')
export const getUser = () => {
  const t = getToken()
  if (!t) return null
  try {
    return JSON.parse(atob(t.split('.')[1]))
  } catch { return null }
}
export const setToken = (token) => localStorage.setItem('token', token)
export const clearToken = () => localStorage.removeItem('token')

export async function login(username, password) {
  const res = await fetch('/.netlify/functions/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!res.ok) throw new Error('认证失败')
  const { token } = await res.json()
  setToken(token)
  return getUser()
}
