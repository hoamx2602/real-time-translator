import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Clock, BookOpen, Play, Pause, Volume2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, deleteAudio, parseTranscript, type Recording } from '@/lib/supabase'
import { SummaryModal } from '@/components/SummaryModal'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchRecordings = async () => {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRecordings(data)
      }
      setLoading(false)
    }

    fetchRecordings()
  }, [user])

  // Stop audio when selecting a different recording
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
    setCurrentTime(0)
    setAudioDuration(0)
  }, [selectedRecording])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return

    // Find the recording to delete its audio file
    const recordingToDelete = recordings.find(r => r.id === id)

    const { error } = await supabase
      .from('recordings')
      .delete()
      .eq('id', id)

    if (!error) {
      // Delete audio file from storage
      if (recordingToDelete?.audio_url) {
        await deleteAudio(recordingToDelete.audio_url)
      }

      setRecordings(prev => prev.filter(r => r.id !== id))
      if (selectedRecording?.id === id) {
        setSelectedRecording(null)
      }
    }
  }

  const togglePlayPause = () => {
    if (!selectedRecording?.audio_url) return

    if (!audioRef.current) {
      audioRef.current = new Audio(selectedRecording.audio_url)
      audioRef.current.onloadedmetadata = () => {
        setAudioDuration(audioRef.current?.duration || 0)
      }
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0)
      }
      audioRef.current.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleSummaryGenerated = (summary: string) => {
    // Update the recording in local state
    if (selectedRecording) {
      const updated = { ...selectedRecording, summary }
      setSelectedRecording(updated)
      setRecordings(prev =>
        prev.map(r => r.id === updated.id ? updated : r)
      )
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in to view your recordings</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Recording History</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Recording List */}
          <Card className="md:col-span-1 h-[80vh]">
            <CardHeader>
              <CardTitle className="text-lg">Recordings</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(80vh-6rem)]">
                {loading ? (
                  <p className="text-muted-foreground text-center py-4">Loading...</p>
                ) : recordings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No recordings yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recordings.map((recording) => (
                      <div
                        key={recording.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedRecording?.id === recording.id
                            ? 'bg-primary/10 border border-primary'
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                        onClick={() => setSelectedRecording(recording)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {recording.title}
                            </h3>
                            {recording.subject && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {recording.subject}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(recording.duration)}
                              <span className="mx-1">•</span>
                              {formatDate(recording.created_at)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(recording.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Transcript View */}
          <Card className="md:col-span-2 h-[80vh]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                {selectedRecording ? selectedRecording.title : 'Select a recording'}
              </CardTitle>
              {selectedRecording && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSummaryModal(true)}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  {selectedRecording.summary ? 'View Summary' : 'AI Summary'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {selectedRecording ? (
                <div className="space-y-4">
                  {/* Audio Player */}
                  {selectedRecording.audio_url && (
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={togglePlayPause}
                          className="h-10 w-10"
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <Slider
                            value={[currentTime]}
                            max={audioDuration || selectedRecording.duration}
                            step={0.1}
                            onValueChange={handleSeek}
                            className="cursor-pointer"
                          />
                        </div>
                        <span className="text-sm text-muted-foreground min-w-[80px] text-right">
                          {formatTime(currentTime)} / {formatTime(audioDuration || selectedRecording.duration)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Volume2 className="h-3 w-3" />
                        <span>Audio recording available</span>
                      </div>
                    </div>
                  )}

                  <ScrollArea className="h-[calc(80vh-12rem)]">
                    <div className="space-y-6">
                      {/* English */}
                      <div>
                        <h4 className="font-medium text-blue-500 mb-3">English</h4>
                        <div className="space-y-2">
                          {parseTranscript(selectedRecording.transcript_en).map((segment, i) => (
                            <p key={i} className="text-sm">
                              <span className="text-muted-foreground text-xs mr-2">
                                {new Date(segment.timestamp).toLocaleTimeString()}
                              </span>
                              {segment.text}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Vietnamese */}
                      {selectedRecording.transcript_vi && (
                        <div>
                          <h4 className="font-medium text-green-500 mb-3">Tiếng Việt</h4>
                          <div className="space-y-2">
                            {parseTranscript(selectedRecording.transcript_vi).map((segment, i) => (
                              <p key={i} className="text-sm">
                                <span className="text-muted-foreground text-xs mr-2">
                                  {new Date(segment.timestamp).toLocaleTimeString()}
                                </span>
                                {segment.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Select a recording to view transcript
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Modal */}
        <SummaryModal
          recording={selectedRecording}
          open={showSummaryModal}
          onOpenChange={setShowSummaryModal}
          onSummaryGenerated={handleSummaryGenerated}
        />
      </div>
    </div>
  )
}
