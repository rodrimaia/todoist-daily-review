import { defineHandler, readBody, createError } from 'h3'

export default defineHandler(async (event) => {
  const apiKey = process.env.LLM_API_KEY
  const baseUrl = process.env.LLM_BASE_URL || 'https://api.deepseek.com'
  const model = process.env.LLM_MODEL || 'deepseek-chat'

  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'LLM_API_KEY not configured' })
  }

  const { taskContent, taskDescription, existingProjects } = await readBody(event)

  if (!taskContent) {
    throw createError({ statusCode: 400, statusMessage: 'taskContent is required' })
  }

  const projectList = (existingProjects as string[])?.join(', ') || 'none'

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `Suggest a short project name (2-4 words, no emojis) for this Todoist task. The project name should be a category/area of responsibility, not the task itself. Reply with ONLY the project name, nothing else.

Task: ${taskContent}${taskDescription ? `\nDescription: ${taskDescription}` : ''}

Existing projects for reference (avoid duplicates): ${projectList}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw createError({ statusCode: 502, statusMessage: `LLM API error: ${err}` })
  }

  const data = await response.json()
  const suggestion = data.choices?.[0]?.message?.content?.trim() || 'New Project'

  return { suggestion }
})
