import { SignJWT } from 'jose'
import { createHash } from 'crypto'

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex')
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const { username, password } = await req.json()
  const hash = hashPassword(password)

  const users = {
    [process.env.USER_A_NAME]: process.env.USER_A_PASSWORD_HASH,
    [process.env.USER_B_NAME]: process.env.USER_B_PASSWORD_HASH,
  }

  // DEBUG - 部署后删除
  console.log('ENV_A_NAME:', JSON.stringify(process.env.USER_A_NAME))
  console.log('INPUT_USER:', JSON.stringify(username))
  console.log('INPUT_HASH:', hash)
  console.log('STORED_HASH:', users[username])

  if (!users[username] || users[username] !== hash) {
    return new Response(JSON.stringify({ error: '用户名或密码错误', debug: { envA: process.env.USER_A_NAME, inputUser: username, inputHash: hash, storedHash: users[username] } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/auth' }
