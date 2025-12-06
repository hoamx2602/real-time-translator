import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

export type TranscriptSegment = {
  text: string
  timestamp: string // ISO string
}

export type Recording = {
  id: string
  user_id: string
  title: string
  subject: string | null
  transcript_en: string // JSON string of TranscriptSegment[]
  transcript_vi: string | null // JSON string of TranscriptSegment[] or null
  duration: number
  audio_url: string | null
  summary: string | null
  created_at: string
}

// Helper to parse transcript JSON
export function parseTranscript(json: string | null): TranscriptSegment[] {
  if (!json) return []
  try {
    return JSON.parse(json)
  } catch {
    // Fallback for old format (plain text)
    return [{ text: json, timestamp: new Date().toISOString() }]
  }
}

// Upload audio to Supabase Storage
export async function uploadAudio(userId: string, audioBlob: Blob): Promise<string | null> {
  const fileName = `${userId}/${Date.now()}.webm`

  const { error } = await supabase.storage
    .from('recordings')
    .upload(fileName, audioBlob, {
      contentType: 'audio/webm',
      cacheControl: '3600',
    })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data } = supabase.storage
    .from('recordings')
    .getPublicUrl(fileName)

  return data.publicUrl
}

// Delete audio from Supabase Storage
export async function deleteAudio(audioUrl: string): Promise<void> {
  // Extract path from URL
  const match = audioUrl.match(/recordings\/(.+)$/)
  if (!match) return

  const path = match[1]
  await supabase.storage.from('recordings').remove([path])
}
