import { useState } from 'react'
import { Sparkles, Loader2, Copy, Check, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { generateSummary, type SummaryOptions } from '@/lib/ai-summary'
import { getAIConfig, PROVIDER_INFO } from '@/lib/ai-config'
import { supabase, parseTranscript, type Recording } from '@/lib/supabase'

type Props = {
  recording: Recording | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSummaryGenerated?: (summary: string) => void
}

export function SummaryModal({ recording, open, onOpenChange, onSummaryGenerated }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [language, setLanguage] = useState<'en' | 'vi'>('en')
  const [style, setStyle] = useState<'brief' | 'detailed' | 'bullet-points'>('detailed')

  const aiConfig = getAIConfig()
  const activeProvider = PROVIDER_INFO[aiConfig.activeProvider]

  // Reset state when modal opens with new recording
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && recording) {
      // Load existing summary if available
      setSummary(recording.summary || null)
      setError(null)
    }
    onOpenChange(isOpen)
  }

  const handleGenerate = async () => {
    if (!recording) return

    setLoading(true)
    setError(null)

    try {
      // Get full text from transcript
      const segments = parseTranscript(recording.transcript_en)
      const fullText = segments.map(s => s.text).join(' ')

      if (!fullText.trim()) {
        throw new Error('No transcript text to summarize')
      }

      const options: SummaryOptions = { language, style }
      const generatedSummary = await generateSummary(fullText, options)
      
      setSummary(generatedSummary)

      // Save summary to database
      if (user) {
        await supabase
          .from('recordings')
          .update({ summary: generatedSummary })
          .eq('id', recording.id)
          .eq('user_id', user.id)
      }

      onSummaryGenerated?.(generatedSummary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!summary) return
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI Summary
          </DialogTitle>
          <DialogDescription>
            {recording?.title || 'Generate an AI-powered summary of this recording'}
          </DialogDescription>
        </DialogHeader>

        {/* Active Provider Info */}
        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span>Using: <strong>{activeProvider.name}</strong></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenChange(false)
              navigate('/admin')
            }}
          >
            <Settings className="h-4 w-4 mr-1" />
            Configure
          </Button>
        </div>

        <div className="space-y-4">
          {/* Options */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Language</label>
              <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'vi')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Style</label>
              <Select value={style} onValueChange={(v) => setStyle(v as typeof style)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Brief (2-3 sentences)</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="bullet-points">Bullet Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {summary ? 'Regenerate Summary' : 'Generate Summary'}
              </>
            )}
          </Button>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Summary Result */}
          {summary && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Summary</h4>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <ScrollArea className="h-[200px] rounded-lg border p-4">
                <p className="text-sm whitespace-pre-wrap">{summary}</p>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
