import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Clock, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type Recording } from '@/lib/supabase'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return

    const { error } = await supabase
      .from('recordings')
      .delete()
      .eq('id', id)

    if (!error) {
      setRecordings(prev => prev.filter(r => r.id !== id))
      if (selectedRecording?.id === id) {
        setSelectedRecording(null)
      }
    }
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
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedRecording ? selectedRecording.title : 'Select a recording'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedRecording ? (
                <ScrollArea className="h-[calc(80vh-6rem)]">
                  <div className="space-y-6">
                    {/* English */}
                    <div>
                      <h4 className="font-medium text-blue-500 mb-2">English</h4>
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedRecording.transcript_en}
                      </p>
                    </div>

                    {/* Vietnamese */}
                    {selectedRecording.transcript_vi && (
                      <div>
                        <h4 className="font-medium text-green-500 mb-2">Tiếng Việt</h4>
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedRecording.transcript_vi}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Select a recording to view transcript
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
