import { useState, useEffect, useRef } from 'react'
import { Mic, Settings, Languages, History, Volume2, Play, StopCircle, MoreVertical, Type, Palette } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDeepgram } from '@/hooks/useDeepgram'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, uploadAudio } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { SaveModal } from '@/components/SaveModal'
import { useToast } from '@/hooks/use-toast'

type AudioSource = 'microphone' | 'system' | 'tab'

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY
const SETTINGS_KEY = 'lecture-translator-settings'
const FONT_SETTINGS_KEY = 'lecture-translator-font-settings'

type SavedSettings = {
  audioSource: AudioSource
  selectedDeviceId: string
  enableTranslation: boolean
}

export default function TranscribePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const {
    isConnected,
    isRecording,
    transcript,
    interimText,
    error,
    audioDevices,
    selectedDeviceId,
    audioSource,
    recordedAudio,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearTranscript,
    setSelectedDeviceId,
    setAudioSource,
  } = useDeepgram()

  const [showSettings, setShowSettings] = useState(false)
  const [enableTranslation, setEnableTranslation] = useState(false)
  const [translatedText, setTranslatedText] = useState<string[]>([])
  const [duration, setDuration] = useState(0)
  const [saving, setSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testAudioLevel, setTestAudioLevel] = useState(0)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showFontMenu, setShowFontMenu] = useState(false)
  const [showFontMenuVi, setShowFontMenuVi] = useState(false)
  const [fontFamily, setFontFamily] = useState('system')
  const [fontSize, setFontSize] = useState(14)
  const [textColor, setTextColor] = useState('#000000')

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollRefVi = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const testStreamRef = useRef<MediaStream | null>(null)
  const testAnalyserRef = useRef<AnalyserNode | null>(null)
  const testAnimationRef = useRef<number | null>(null)

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      try {
        const settings: SavedSettings = JSON.parse(saved)
        if (settings.audioSource) setAudioSource(settings.audioSource)
        if (settings.selectedDeviceId) setSelectedDeviceId(settings.selectedDeviceId)
        if (settings.enableTranslation !== undefined) setEnableTranslation(settings.enableTranslation)
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }

    // Load font settings
    const fontSettings = localStorage.getItem(FONT_SETTINGS_KEY)
    if (fontSettings) {
      try {
        const settings = JSON.parse(fontSettings)
        if (settings.fontFamily) setFontFamily(settings.fontFamily)
        if (settings.fontSize) setFontSize(settings.fontSize)
        if (settings.textColor) setTextColor(settings.textColor)
      } catch (e) {
        console.error('Failed to load font settings:', e)
      }
    }
  }, [setAudioSource, setSelectedDeviceId])

  // Save settings to localStorage when they change
  useEffect(() => {
    const settings: SavedSettings = {
      audioSource,
      selectedDeviceId,
      enableTranslation,
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [audioSource, selectedDeviceId, enableTranslation])

  // Save font settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem(FONT_SETTINGS_KEY, JSON.stringify({
      fontFamily,
      fontSize,
      textColor,
    }))
  }, [fontFamily, fontSize, textColor])

  // Auto-scroll to bottom for both panels
  useEffect(() => {
    // Scroll English panel
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
    // Scroll Vietnamese panel
    if (scrollRefVi.current) {
      const scrollContainer = scrollRefVi.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [transcript, interimText, translatedText])

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

  // Show save modal when recording stops and there's transcript
  const prevIsRecordingRef = useRef(isRecording)
  useEffect(() => {
    // When recording stops (transitions from true to false)
    if (prevIsRecordingRef.current && !isRecording) {
      // Wait a bit for transcript to be fully updated and disconnect to complete
      const timer = setTimeout(() => {
        if (transcript.length > 0) {
          setShowSaveModal(true)
        } else {
          // If no transcript, just clear everything
          clearTranscript()
          setTranslatedText([])
          setDuration(0)
        }
      }, 500)
      return () => clearTimeout(timer)
    }
    prevIsRecordingRef.current = isRecording
  }, [isRecording, transcript.length, clearTranscript])

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
      toast({
        variant: 'destructive',
        title: 'API Key Required',
        description: 'Deepgram API key not configured. Please add VITE_DEEPGRAM_API_KEY to .env',
      })
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
      // Stop recording and disconnect
      // The useEffect will handle showing the save modal
      stopRecording()
      disconnect()
    } else {
      // Start new recording
      if (!isConnected) {
        await handleConnect()
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      try {
        await startRecording()
        if (duration === 0) {
          setDuration(0)
        }
      } catch (err) {
        console.error('Failed to start recording, attempting reconnect...', err)
        await handleConnect()
        await new Promise(resolve => setTimeout(resolve, 1000))
        await startRecording()
      }
    }
  }

  // Microphone test functions
  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        }
      })

      testStreamRef.current = stream

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256

      source.connect(analyser)
      testAnalyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateLevel = () => {
        if (!testAnalyserRef.current) return
        testAnalyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setTestAudioLevel(average)
        testAnimationRef.current = requestAnimationFrame(updateLevel)
      }

      updateLevel()
      setIsTesting(true)
    } catch (err) {
      console.error('Mic test error:', err)
    }
  }

  const stopMicTest = () => {
    if (testAnimationRef.current) {
      cancelAnimationFrame(testAnimationRef.current)
      testAnimationRef.current = null
    }
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach(track => track.stop())
      testStreamRef.current = null
    }
    testAnalyserRef.current = null
    setIsTesting(false)
    setTestAudioLevel(0)
  }

  const handleSave = async (title: string, subject: string) => {
    if (!user) return

    setSaving(true)
    try {
      // Upload audio file to Supabase Storage
      let audioUrl: string | null = null
      if (recordedAudio) {
        audioUrl = await uploadAudio(user.id, recordedAudio)
      }

      // Format transcripts as JSON with timestamps
      const transcriptEnJson = JSON.stringify(
        transcript.map(s => ({
          text: s.text,
          timestamp: s.timestamp.toISOString()
        }))
      )

      const transcriptViJson = enableTranslation && translatedText.length > 0
        ? JSON.stringify(
            translatedText.map((text, i) => ({
              text,
              timestamp: transcript[i]?.timestamp.toISOString() || new Date().toISOString()
            }))
          )
        : null

      const { error } = await supabase.from('recordings').insert({
        user_id: user.id,
        title: title || `Session ${new Date().toLocaleString()}`,
        subject: subject || null,
        transcript_en: transcriptEnJson,
        transcript_vi: transcriptViJson,
        duration: duration,
        audio_url: audioUrl,
      })

      if (error) throw error

      // Reset
      clearTranscript()
      setTranslatedText([])
      setDuration(0)
      
      toast({
        variant: 'success',
        title: 'Saved successfully',
        description: 'Your recording has been saved.',
      })
    } catch (err) {
      console.error('Save error:', err)
      toast({
        variant: 'destructive',
        title: 'Failed to save',
        description: 'There was an error saving your recording.',
      })
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    clearTranscript()
    setTranslatedText([])
    setDuration(0)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Close font menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Don't close if clicking inside the menu container or Select dropdown
      if (
        !target.closest('.font-menu-container') &&
        !target.closest('[role="listbox"]') &&
        !target.closest('[data-radix-popper-content-wrapper]')
      ) {
        setShowFontMenu(false)
        setShowFontMenuVi(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-muted/20 p-4 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 min-h-0 space-y-6">
        {/* Header */}
        <div className="grid grid-cols-3 items-center bg-card/50 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lecture Translator</h1>
              <p className="text-xs text-muted-foreground">Real-time transcription & translation</p>
            </div>
          </div>
          
          {/* Controls - Center */}
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              className={cn(
                "rounded-full w-16 h-16 shadow-lg transition-all duration-300",
                isRecording 
                  ? "bg-red-500 hover:bg-red-600 scale-110 shadow-red-500/50 animate-pulse" 
                  : "bg-primary hover:bg-primary/90"
              )}
              onClick={handleToggleRecording}
              disabled={!DEEPGRAM_API_KEY}
              title={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <StopCircle className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>

            {/* Timer */}
            <div className="flex items-center gap-2 ml-2">
              <span className={cn(
                "text-xl font-mono font-semibold min-w-[60px]",
                isRecording ? "text-red-500" : "text-foreground"
              )}>
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Recording</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg"
              onClick={() => navigate('/history')}
              title="View history"
            >
              <History className="h-5 w-5" />
            </Button>
            <Button
              variant={showSettings ? "secondary" : "ghost"}
              size="icon"
              className="rounded-lg"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
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
              {/* Audio Source Type Selection */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4" />
                  Audio Source Type
                </label>
                <Select
                  value={audioSource}
                  onValueChange={(value) => setAudioSource(value as AudioSource)}
                  disabled={isRecording}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audio source type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="microphone">Microphone</SelectItem>
                    <SelectItem value="tab">Browser Tab (YouTube, etc.)</SelectItem>
                    <SelectItem value="system">System Audio (BlackHole)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {audioSource === 'tab' && 'Will prompt you to select a browser tab. Check "Share tab audio" option.'}
                  {audioSource === 'system' && 'Requires BlackHole installed. Set up Multi-Output Device in Audio MIDI Setup.'}
                  {audioSource === 'microphone' && 'Capture audio from your microphone.'}
                </p>
              </div>

              {/* Device Selection (for microphone/system) */}
              {audioSource !== 'tab' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Audio Device
                    </label>
                    <Select
                      value={selectedDeviceId}
                      onValueChange={setSelectedDeviceId}
                      disabled={isRecording || isTesting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select audio device" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioDevices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mic Test */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isTesting ? stopMicTest : startMicTest}
                      disabled={isRecording}
                    >
                      {isTesting ? (
                        <>
                          <StopCircle className="h-4 w-4 mr-2" />
                          Stop Test
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Test Mic
                        </>
                      )}
                    </Button>
                    {isTesting && (
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-75"
                          style={{ width: `${Math.min(100, testAudioLevel * 1.5)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

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
          "grid gap-4 flex-1 min-h-0",
          enableTranslation ? "md:grid-cols-2" : "grid-cols-1"
        )}>
          {/* English Panel */}
          <Card className="h-full border-2 shadow-lg flex flex-col">
            <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20 relative">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <Languages className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">English</span>
                {isRecording && (
                  <span className="ml-auto w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                )}
              </CardTitle>
              <div className="absolute top-3 right-3">
                <div className="relative font-menu-container">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowFontMenu(!showFontMenu)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  {showFontMenu && (
                    <div 
                      className="absolute right-0 top-10 z-50 w-64 bg-card border rounded-lg shadow-lg p-4 space-y-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div>
                        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          Font Family
                        </label>
                        <Select value={fontFamily} onValueChange={setFontFamily}>
                          <SelectTrigger onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system">System Default</SelectItem>
                            <SelectItem value="serif">Serif</SelectItem>
                            <SelectItem value="sans-serif">Sans Serif</SelectItem>
                            <SelectItem value="monospace">Monospace</SelectItem>
                            <SelectItem value="cursive">Cursive</SelectItem>
                            <SelectItem value="fantasy">Fantasy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Font Size</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="10"
                            max="24"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm w-12 text-center">{fontSize}px</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Text Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                            className="h-10 w-20 rounded border"
                          />
                          <Input
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                            className="flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-4 overflow-hidden">
              <div ref={scrollRef} className="h-full">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3">
                    {transcript.map((segment, i) => {
                      const fontFamilyMap: Record<string, string> = {
                        system: 'system-ui, -apple-system, sans-serif',
                        serif: 'Georgia, serif',
                        'sans-serif': 'Arial, Helvetica, sans-serif',
                        monospace: 'Monaco, "Courier New", monospace',
                        cursive: '"Comic Sans MS", cursive',
                        fantasy: 'Impact, fantasy',
                      }
                      return (
                        <div key={i} className="group hover:bg-muted/50 rounded-lg p-2 transition-colors">
                          <p className="leading-relaxed" style={{ fontSize: `${fontSize}px`, fontFamily: fontFamilyMap[fontFamily] || fontFamilyMap.system }}>
                            <span className="text-muted-foreground text-xs mr-3 font-mono">
                              {segment.timestamp.toLocaleTimeString()}
                            </span>
                            <span style={{ color: textColor }}>{segment.text}</span>
                          </p>
                        </div>
                      )
                    })}
                    {interimText && (() => {
                      const fontFamilyMap: Record<string, string> = {
                        system: 'system-ui, -apple-system, sans-serif',
                        serif: 'Georgia, serif',
                        'sans-serif': 'Arial, Helvetica, sans-serif',
                        monospace: 'Monaco, "Courier New", monospace',
                        cursive: '"Comic Sans MS", cursive',
                        fantasy: 'Impact, fantasy',
                      }
                      return (
                        <div className="group hover:bg-muted/50 rounded-lg p-2 transition-colors">
                          <p className="leading-relaxed" style={{ fontSize: `${fontSize}px`, fontFamily: fontFamilyMap[fontFamily] || fontFamilyMap.system }}>
                            <span style={{ color: textColor, opacity: 0.7 }}>{interimText}</span>
                          </p>
                        </div>
                      )
                    })()}
                    {transcript.length === 0 && !interimText && !isRecording && (
                      <div className="flex flex-col items-center justify-center h-full py-16">
                        <Mic className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground text-center">
                          Press the microphone to start
                        </p>
                      </div>
                    )}
                    {transcript.length === 0 && !interimText && isRecording && (
                      <div className="flex flex-col items-center justify-center h-full py-16">
                        <p className="text-muted-foreground text-center animate-pulse">
                          Listening...
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Vietnamese Panel */}
          {enableTranslation && (
            <Card className="h-full border-2 shadow-lg flex flex-col">
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/20 relative">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 bg-green-500/10 rounded-lg">
                    <Languages className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="text-green-600 dark:text-green-400 font-semibold">Tiếng Việt</span>
                </CardTitle>
                <div className="absolute top-3 right-3">
                  <div className="relative font-menu-container">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowFontMenuVi(!showFontMenuVi)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {showFontMenuVi && (
                      <div 
                        className="absolute right-0 top-10 z-50 w-64 bg-card border rounded-lg shadow-lg p-4 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                            <Type className="h-4 w-4" />
                            Font Family
                          </label>
                          <Select value={fontFamily} onValueChange={setFontFamily}>
                            <SelectTrigger onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="system">System Default</SelectItem>
                              <SelectItem value="serif">Serif</SelectItem>
                              <SelectItem value="sans-serif">Sans Serif</SelectItem>
                              <SelectItem value="monospace">Monospace</SelectItem>
                              <SelectItem value="cursive">Cursive</SelectItem>
                              <SelectItem value="fantasy">Fantasy</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Font Size</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="10"
                              max="24"
                              value={fontSize}
                              onChange={(e) => setFontSize(Number(e.target.value))}
                              className="flex-1"
                            />
                            <span className="text-sm w-12 text-center">{fontSize}px</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Text Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={textColor}
                              onChange={(e) => setTextColor(e.target.value)}
                              className="h-10 w-20 rounded border"
                            />
                            <Input
                              value={textColor}
                              onChange={(e) => setTextColor(e.target.value)}
                              className="flex-1"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 p-4 overflow-hidden">
                <div ref={scrollRefVi} className="h-full">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      {translatedText.map((text, i) => {
                        const fontFamilyMap: Record<string, string> = {
                          system: 'system-ui, -apple-system, sans-serif',
                          serif: 'Georgia, serif',
                          'sans-serif': 'Arial, Helvetica, sans-serif',
                          monospace: 'Monaco, "Courier New", monospace',
                          cursive: '"Comic Sans MS", cursive',
                          fantasy: 'Impact, fantasy',
                        }
                        return (
                          <div key={i} className="group hover:bg-muted/50 rounded-lg p-2 transition-colors">
                            <p className="leading-relaxed" style={{ fontSize: `${fontSize}px`, fontFamily: fontFamilyMap[fontFamily] || fontFamilyMap.system }}>
                              <span className="text-muted-foreground text-xs mr-3 font-mono">
                                {transcript[i]?.timestamp.toLocaleTimeString()}
                              </span>
                              <span style={{ color: textColor }}>{text}</span>
                            </p>
                          </div>
                        )
                      })}
                      {translatedText.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full py-16">
                          <Languages className="h-12 w-12 text-muted-foreground/30 mb-4" />
                          <p className="text-muted-foreground text-center">
                            Bản dịch sẽ hiện ở đây
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Save Modal */}
      <SaveModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={saving}
      />
    </div>
  )
}
