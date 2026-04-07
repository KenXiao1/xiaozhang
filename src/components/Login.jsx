import { useState } from 'preact/hooks'
import { login } from '../lib/auth.js'

export function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const user = await login(username, password)
      onLogin(user)
    } catch {
      setError('用户名或密码错误')
    }
  }

  return (
    <div class="login-wrap">
      <form class="login-form" onSubmit={handleSubmit}>
        <h2>Cheny & Xiao</h2>
        <input placeholder="用户名" value={username} onInput={e => setUsername(e.target.value)} />
        <input type="password" placeholder="密码" value={password} onInput={e => setPassword(e.target.value)} />
        {error && <p class="error">{error}</p>}
        <button type="submit">登录</button>
      </form>
    </div>
  )
}
