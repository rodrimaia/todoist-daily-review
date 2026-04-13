import { defineHandler, sendRedirect, getQuery, getCookie, deleteCookie, createError } from 'h3'
import { getAuthToken } from '@doist/todoist-sdk'

export default defineHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string | undefined
  const state = query.state as string | undefined
  const error = query.error as string | undefined

  if (error) {
    return sendRedirect(event, '/?auth_error=access_denied', 302)
  }

  if (!code || !state) {
    throw createError({ statusCode: 400, statusMessage: 'Missing code or state' })
  }

  const storedState = getCookie(event, 'oauth_state')
  deleteCookie(event, 'oauth_state')

  if (!storedState || storedState !== state) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid state parameter' })
  }

  const clientId = process.env.TODOIST_CLIENT_ID!
  const clientSecret = process.env.TODOIST_CLIENT_SECRET!

  const { accessToken } = await getAuthToken({ clientId, clientSecret, code })

  return sendRedirect(event, `/?token=${encodeURIComponent(accessToken)}`, 302)
})
