import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Clock, BookOpen, Play, Pause, Volume2, Sparkles, Edit2, Check, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, deleteAudio, parseTranscript, type Recording } from '@/lib/supabase'
import { SummaryModal } from '@/components/SummaryModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [isRecordingListCollapsed, setIsRecordingListCollapsed] = useState(false)
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

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ open: true, id })
  }

  const handleDelete = async () => {
    if (!deleteConfirm.id || !user) return

    const id = deleteConfirm.id

    // Find the recording to delete its audio file
    const recordingToDelete = recordings.find(r => r.id === id)

    const { error } = await supabase
      .from('recordings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (!error) {
      // Delete audio file from storage
      if (recordingToDelete?.audio_url) {
        await deleteAudio(recordingToDelete.audio_url)
      }

      setRecordings(prev => prev.filter(r => r.id !== id))
      if (selectedRecording?.id === id) {
        setSelectedRecording(null)
      }
      
      toast({
        variant: 'success',
        title: 'Deleted successfully',
        description: 'The recording has been deleted.',
      })
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to delete',
        description: 'There was an error deleting the recording.',
      })
    }

    setDeleteConfirm({ open: false, id: null })
  }

  const handleStartEdit = (recording: Recording) => {
    setEditingId(recording.id)
    setEditTitle(recording.title)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim() || !user) {
      if (!editTitle.trim()) {
        toast({
          variant: 'destructive',
          title: 'Invalid title',
          description: 'Title cannot be empty.',
        })
      }
      return
    }

    const { error } = await supabase
      .from('recordings')
      .update({ title: editTitle.trim() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (!error) {
      setRecordings(prev =>
        prev.map(r => r.id === id ? { ...r, title: editTitle.trim() } : r)
      )
      if (selectedRecording?.id === id) {
        setSelectedRecording({ ...selectedRecording, title: editTitle.trim() })
      }
      setEditingId(null)
      setEditTitle('')
      
      toast({
        variant: 'success',
        title: 'Updated successfully',
        description: 'The recording title has been updated.',
      })
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to update',
        description: 'There was an error updating the recording.',
      })
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
    <div className="h-full flex flex-col bg-background p-4 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Recording History</h1>
        </div>

        <div className={`grid gap-4 flex-1 min-h-0 transition-all ${isRecordingListCollapsed ? 'md:grid-cols-[80px_1fr]' : 'md:grid-cols-3'}`}>
          {/* Recording List */}
          <Card className={`flex flex-col h-full transition-all ${isRecordingListCollapsed ? 'md:col-span-1' : 'md:col-span-1'}`}>
            <CardHeader className="flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-lg">{isRecordingListCollapsed ? '' : 'Recordings'}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRecordingListCollapsed(!isRecordingListCollapsed)}
                className="h-8 w-8"
              >
                {isRecordingListCollapsed ? (
                  <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                ) : (
                  <ChevronDown className="h-4 w-4 rotate-90" />
                )}
              </Button>
            </CardHeader>
            <CardContent className={`flex-1 min-h-0 overflow-hidden p-4 ${isRecordingListCollapsed ? 'hidden' : ''}`}>
              <ScrollArea className="h-full">
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
                            ? 'bg-primary/10 border-t border-l border-b border-r border-primary'
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                        style={selectedRecording?.id === recording.id ? {
                          borderRightWidth: '3px'
                        } : {}}
                        onClick={() => editingId !== recording.id && setSelectedRecording(recording)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            {editingId === recording.id ? (
                              <div className="flex items-center gap-2 mb-2">
                                <Input
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.stopPropagation()
                                      handleSaveEdit(recording.id)
                                    } else if (e.key === 'Escape') {
                                      e.stopPropagation()
                                      handleCancelEdit()
                                    }
                                  }}
                                  autoFocus
                                  className="h-8 text-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSaveEdit(recording.id)
                                  }}
                                >
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelEdit()
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <h3 className="font-medium truncate">
                                {recording.title}
                              </h3>
                            )}
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
                          {editingId !== recording.id && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartEdit(recording)
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClick(recording.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Transcript View */}
          <Card className={`flex flex-col h-full ${isRecordingListCollapsed ? 'md:col-span-1' : 'md:col-span-2'}`}>
            <CardHeader className="flex flex-row items-center justify-between shrink-0">
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
            <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {selectedRecording ? (
                <div className="space-y-4 flex flex-col flex-1 min-h-0">
                  {/* Audio Player */}
                  {selectedRecording.audio_url && (
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3 shrink-0">
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

                  <ScrollArea className="flex-1 min-h-0">
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

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          open={deleteConfirm.open}
          onOpenChange={(open) => setDeleteConfirm({ open, id: deleteConfirm.id })}
          onConfirm={handleDelete}
          title="Delete Recording"
          description="Are you sure you want to delete this recording? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </div>
    </div>
  )
}
