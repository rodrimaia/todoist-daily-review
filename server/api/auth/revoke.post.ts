import { defineHandler, readBody } from 'h3'
import { revokeToken } from '@doist/todoist-sdk'

export default defineHandler(async (event) => {
  const { token } = await readBody(event)
  if (!token) return { ok: false }

  const clientId = process.env.TODOIST_CLIENT_ID!
  const clientSecret = process.env.TODOIST_CLIENT_SECRET!

  await revokeToken({ clientId, clientSecret, token })

  return { ok: true }
})
