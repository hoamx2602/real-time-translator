import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Eye, EyeOff, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  getAIConfig,
  saveAIConfig,
  PROVIDER_INFO,
  type AIConfig,
  type AIProvider,
} from '@/lib/ai-config'
import { cn } from '@/lib/utils'

export default function AdminPage() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<AIConfig>(getAIConfig())
  const [showKeys, setShowKeys] = useState<Record<AIProvider, boolean>>({
    gemini: false,
    openai: false,
    grok: false,
  })
  const [saved, setSaved] = useState(false)

  // Load config on mount
  useEffect(() => {
    setConfig(getAIConfig())
  }, [])

  const handleProviderSelect = (provider: AIProvider) => {
    setConfig(prev => ({ ...prev, activeProvider: provider }))
  }

  const handleApiKeyChange = (provider: AIProvider, apiKey: string) => {
    setConfig(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: { ...prev.providers[provider], apiKey },
      },
    }))
  }

  const handleModelChange = (provider: AIProvider, model: string) => {
    setConfig(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: { ...prev.providers[provider], model },
      },
    }))
  }

  const toggleShowKey = (provider: AIProvider) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))
  }

  const handleSave = () => {
    saveAIConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const providers: AIProvider[] = ['gemini', 'openai', 'grok']

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">AI Configuration</h1>
            <p className="text-sm text-muted-foreground">
              Configure which AI provider to use for generating summaries
            </p>
          </div>
        </div>

        {/* Provider Cards */}
        <div className="space-y-4">
          {providers.map(provider => {
            const info = PROVIDER_INFO[provider]
            const isActive = config.activeProvider === provider
            const providerConfig = config.providers[provider]

            return (
              <Card
                key={provider}
                className={cn(
                  'cursor-pointer transition-all',
                  isActive && 'ring-2 ring-primary'
                )}
                onClick={() => handleProviderSelect(provider)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className={cn(
                        "h-5 w-5",
                        isActive ? "text-yellow-500" : "text-muted-foreground"
                      )} />
                      <div>
                        <CardTitle className="text-lg">{info.name}</CardTitle>
                        <CardDescription>{info.description}</CardDescription>
                      </div>
                    </div>
                    {isActive && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Check className="h-4 w-4" />
                        Active
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4" onClick={e => e.stopPropagation()}>
                  {/* API Key */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">API Key</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showKeys[provider] ? 'text' : 'password'}
                          value={providerConfig.apiKey}
                          onChange={e => handleApiKeyChange(provider, e.target.value)}
                          placeholder={`Enter ${info.name} API key`}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => toggleShowKey(provider)}
                        >
                          {showKeys[provider] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Get your API key from{' '}
                      <a
                        href={info.modelsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {info.modelsUrl}
                      </a>
                    </p>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Model</label>
                    <Input
                      value={providerConfig.model}
                      onChange={e => handleModelChange(provider, e.target.value)}
                      placeholder="Model name"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {provider === 'gemini' && 'e.g., gemini-2.0-flash, gemini-1.5-pro'}
                      {provider === 'openai' && 'e.g., gpt-4o-mini, gpt-4o, gpt-4-turbo'}
                      {provider === 'grok' && 'e.g., grok-beta, grok-2'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>

        {/* Info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> API keys are stored locally in your browser and are never sent to our servers. 
              They are only used to communicate directly with the AI provider's API.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
