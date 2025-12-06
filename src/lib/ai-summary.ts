import { getActiveProviderConfig } from './ai-config'

export type SummaryOptions = {
  language?: 'en' | 'vi'
  style?: 'brief' | 'detailed' | 'bullet-points'
}

function buildPrompt(text: string, options: SummaryOptions): string {
  const { language = 'en', style = 'detailed' } = options

  const stylePrompts = {
    brief: 'Provide a brief 2-3 sentence summary.',
    detailed: 'Provide a comprehensive summary with main points and key takeaways.',
    'bullet-points': 'Provide a summary in bullet points format, highlighting key points.',
  }

  const languagePrompts = {
    en: 'Respond in English.',
    vi: 'Respond in Vietnamese (Tiếng Việt).',
  }

  return `You are a helpful assistant that summarizes lecture transcripts.

${stylePrompts[style]}
${languagePrompts[language]}

Here is the transcript to summarize:

${text}

Summary:`
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Gemini API error')
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callOpenAI(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'OpenAI API error')
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callGrok(prompt: string, apiKey: string, model: string): Promise<string> {
  // Grok uses OpenAI-compatible API
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Grok API error')
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function generateSummary(
  text: string,
  options: SummaryOptions = {}
): Promise<string> {
  const { provider, apiKey, model } = getActiveProviderConfig()

  if (!apiKey) {
    throw new Error(`API key not configured for ${provider}. Go to /admin to configure.`)
  }

  const prompt = buildPrompt(text, options)

  let summary: string

  switch (provider) {
    case 'gemini':
      summary = await callGemini(prompt, apiKey, model)
      break
    case 'openai':
      summary = await callOpenAI(prompt, apiKey, model)
      break
    case 'grok':
      summary = await callGrok(prompt, apiKey, model)
      break
    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }

  if (!summary.trim()) {
    throw new Error('No summary generated')
  }

  return summary.trim()
}
