import { useState, useEffect, useRef } from 'react'
import { Mic, Square, Trash2, Save, Settings, Languages, History } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDeepgram } from '@/hooks/useDeepgram'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY

export default function TranscribePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const {
    isConnected,
    isRecording,
    transcript,
    interimText,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearTranscript,
    getFullTranscript,
  } = useDeepgram()

  const [showSettings, setShowSettings] = useState(false)
  const [sessionTitle, setSessionTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [enableTranslation, setEnableTranslation] = useState(false)
  const [translatedText, setTranslatedText] = useState<string[]>([])
  const [duration, setDuration] = useState(0)
  const [saving, setSaving] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript, interimText])

  // Duration timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  // Simple translation using Google Translate (free)
  const translateText = async (text: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`
      )
      const data = await response.json()
      return data[0]?.map((item: string[]) => item[0]).join('') || text
    } catch {
      return text
    }
  }

  // Translate new transcript segments
  useEffect(() => {
    if (!enableTranslation) return

    const translateNew = async () => {
      const newSegments = transcript.slice(translatedText.length)
      if (newSegments.length === 0) return

      const translations = await Promise.all(
        newSegments.map(s => translateText(s.text))
      )
      setTranslatedText(prev => [...prev, ...translations])
    }

    translateNew()
  }, [transcript, enableTranslation, translatedText.length])

  const handleConnect = async () => {
    if (!DEEPGRAM_API_KEY) {
      alert('Deepgram API key not configured. Please add VITE_DEEPGRAM_API_KEY to .env')
      return
    }

    if (isConnected) {
      disconnect()
    } else {
      await connect(DEEPGRAM_API_KEY, {
        model: 'nova-2',
        language: 'en',
        punctuate: true,
        interim_results: true,
        smart_format: true,
      })
    }
  }

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      if (!isConnected) {
        await handleConnect()
        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      await startRecording()
      if (duration === 0) {
        setDuration(0)
      }
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase.from('recordings').insert({
        user_id: user.id,
        title: sessionTitle || `Session ${new Date().toLocaleString()}`,
        subject: subject || null,
        transcript_en: getFullTranscript(),
        transcript_vi: enableTranslation ? translatedText.join(' ') : null,
        duration: duration,
      })

      if (error) throw error

      // Reset
      clearTranscript()
      setTranslatedText([])
      setDuration(0)
      setSessionTitle('')
      setSubject('')

      alert('Saved successfully!')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Lecture Translator</h1>
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-gray-400"
            )} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/history')}
            >
              <History className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Session Title</label>
                  <Input
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="e.g., Lecture 1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., CS101"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enableTranslation}
                    onCheckedChange={setEnableTranslation}
                  />
                  <label className="text-sm">Translate to Vietnamese</label>
                </div>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* API Key Warning */}
        {!DEEPGRAM_API_KEY && (
          <div className="bg-yellow-500/10 text-yellow-600 p-3 rounded-lg text-sm">
            Deepgram API key not configured. Add VITE_DEEPGRAM_API_KEY to your .env file.
          </div>
        )}

        {/* Transcript Panels */}
        <div className={cn(
          "grid gap-4",
          enableTranslation ? "md:grid-cols-2" : "grid-cols-1"
        )}>
          {/* English Panel */}
          <Card className="h-[60vh]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-blue-500">English</span>
                {isRecording && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-4rem)]">
              <ScrollArea className="h-full pr-4" ref={scrollRef}>
                <div className="space-y-2">
                  {transcript.map((segment, i) => (
                    <p key={i} className="text-sm">
                      <span className="text-muted-foreground text-xs mr-2">
                        {segment.timestamp.toLocaleTimeString()}
                      </span>
                      {segment.text}
                    </p>
                  ))}
                  {interimText && (
                    <p className="text-sm text-muted-foreground italic">
                      {interimText}
                    </p>
                  )}
                  {transcript.length === 0 && !interimText && (
                    <p className="text-muted-foreground text-center py-8">
                      {isRecording ? 'Listening...' : 'Press the microphone to start'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Vietnamese Panel */}
          {enableTranslation && (
            <Card className="h-[60vh]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Languages className="h-5 w-5 text-green-500" />
                  <span className="text-green-500">Tiếng Việt</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-4rem)]">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-2">
                    {translatedText.map((text, i) => (
                      <p key={i} className="text-sm">
                        <span className="text-muted-foreground text-xs mr-2">
                          {transcript[i]?.timestamp.toLocaleTimeString()}
                        </span>
                        {text}
                      </p>
                    ))}
                    {translatedText.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        Bản dịch sẽ hiện ở đây
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={clearTranscript}
                disabled={transcript.length === 0}
              >
                <Trash2 className="h-5 w-5" />
              </Button>

              <Button
                size="lg"
                className={cn(
                  "rounded-full w-16 h-16",
                  isRecording ? "bg-red-500 hover:bg-red-600" : "bg-primary"
                )}
                onClick={handleToggleRecording}
                disabled={!DEEPGRAM_API_KEY}
              >
                {isRecording ? (
                  <Square className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleSave}
                disabled={transcript.length === 0 || saving || !user}
              >
                <Save className="h-5 w-5" />
              </Button>
            </div>

            <div className="text-center mt-2">
              <span className="text-2xl font-mono">
                {formatDuration(duration)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
