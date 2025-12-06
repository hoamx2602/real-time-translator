export type AIProvider = 'gemini' | 'openai' | 'grok'

export type AIConfig = {
  activeProvider: AIProvider
  providers: {
    gemini: { apiKey: string; model: string }
    openai: { apiKey: string; model: string }
    grok: { apiKey: string; model: string }
  }
}

const AI_CONFIG_KEY = 'lecture-translator-ai-config'

const DEFAULT_CONFIG: AIConfig = {
  activeProvider: 'gemini',
  providers: {
    gemini: { apiKey: '', model: 'gemini-2.0-flash' },
    openai: { apiKey: '', model: 'gpt-4o-mini' },
    grok: { apiKey: '', model: 'grok-beta' },
  },
}

export function getAIConfig(): AIConfig {
  try {
    const saved = localStorage.getItem(AI_CONFIG_KEY)
    if (saved) {
      const config = JSON.parse(saved)
      // Merge with defaults to handle new fields
      return {
        ...DEFAULT_CONFIG,
        ...config,
        providers: {
          ...DEFAULT_CONFIG.providers,
          ...config.providers,
        },
      }
    }
  } catch (e) {
    console.error('Failed to load AI config:', e)
  }
  return DEFAULT_CONFIG
}

export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config))
}

export function getActiveProviderConfig() {
  const config = getAIConfig()
  const provider = config.activeProvider
  const providerConfig = config.providers[provider]
  return {
    provider,
    apiKey: providerConfig.apiKey,
    model: providerConfig.model,
  }
}

export const PROVIDER_INFO: Record<AIProvider, { name: string; description: string; modelsUrl: string }> = {
  gemini: {
    name: 'Google Gemini',
    description: 'Google AI models (Gemini Pro, Flash)',
    modelsUrl: 'https://ai.google.dev/',
  },
  openai: {
    name: 'OpenAI',
    description: 'ChatGPT models (GPT-4, GPT-4o)',
    modelsUrl: 'https://platform.openai.com/',
  },
  grok: {
    name: 'xAI Grok',
    description: 'Grok AI models from xAI',
    modelsUrl: 'https://x.ai/',
  },
}
