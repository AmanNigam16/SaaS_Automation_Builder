import { resolveExpression, type WorkflowContext, type WorkflowNodeConfig, type WorkflowValue } from '@/lib/workflow-semantics'

const REQUEST_TIMEOUT_MS = 30_000
const MODEL = 'gemini-2.5-flash'

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}

const modeInstruction: Record<NonNullable<WorkflowNodeConfig['aiMode']>, string> = {
  generate: 'Complete the request accurately.',
  summarize: 'Summarize the supplied content clearly and concisely.',
  classify: 'Classify the supplied content according to the requested categories.',
  extract: 'Extract only the requested information from the supplied content.',
}

export const executeAiAction = async (
  config: WorkflowNodeConfig,
  context: WorkflowContext
): Promise<Record<string, WorkflowValue>> => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('AI provider is not configured')
  const prompt = String(resolveExpression(config.prompt ?? '', context)).trim()
  if (!prompt) throw new Error('AI prompt is required')
  const systemInstruction = [
    modeInstruction[config.aiMode ?? 'generate'],
    config.systemInstruction
      ? String(resolveExpression(config.systemInstruction, context))
      : '',
  ].filter(Boolean).join('\n')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature ?? 0.3,
          maxOutputTokens: config.maxOutputTokens ?? 1024,
          ...(config.structuredOutput ? { responseMimeType: 'application/json' } : {}),
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  )
  if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}`)
  const payload = await response.json() as GeminiResponse
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
  if (!text) throw new Error('AI provider returned no content')
  let result: WorkflowValue = text
  if (config.structuredOutput) {
    try {
      result = JSON.parse(text) as WorkflowValue
    } catch {
      throw new Error('AI provider returned invalid structured JSON')
    }
  }
  return {
    result,
    text,
    inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
  }
}
