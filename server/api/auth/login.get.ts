import { defineHandler, sendRedirect, setCookie, createError } from 'h3'
import { getAuthStateParameter, getAuthorizationUrl } from '@doist/todoist-sdk'

export default defineHandler(async (event) => {
  const clientId = process.env.TODOIST_CLIENT_ID
  if (!clientId) {
    throw createError({ statusCode: 500, statusMessage: 'TODOIST_CLIENT_ID not configured' })
  }

  const state = getAuthStateParameter()

  setCookie(event, 'oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })

  const authUrl = getAuthorizationUrl({
    clientId,
    permissions: ['data:read_write', 'data:delete', 'project:delete'],
    state,
  })

  return sendRedirect(event, authUrl, 302)
})
