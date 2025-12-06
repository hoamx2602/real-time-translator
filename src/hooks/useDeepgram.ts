import { useState, useRef, useCallback } from 'react'

type DeepgramOptions = {
  language?: string
  model?: string
  punctuate?: boolean
  interim_results?: boolean
  smart_format?: boolean
}

type TranscriptSegment = {
  text: string
  timestamp: Date
  isFinal: boolean
}

export function useDeepgram() {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const connect = useCallback(async (apiKey: string, options: DeepgramOptions = {}) => {
    try {
      setError(null)

      // Build WebSocket URL with options
      const params = new URLSearchParams({
        model: options.model || 'nova-2',
        language: options.language || 'en',
        punctuate: String(options.punctuate ?? true),
        interim_results: String(options.interim_results ?? true),
        smart_format: String(options.smart_format ?? true),
      })

      const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`

      // Create WebSocket connection
      const socket = new WebSocket(wsUrl, ['token', apiKey])

      socket.onopen = () => {
        console.log('Deepgram connected')
        setIsConnected(true)
      }

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'Results') {
          const alternative = data.channel?.alternatives?.[0]
          if (alternative) {
            const text = alternative.transcript

            if (data.is_final && text.trim()) {
              // Final result - add to transcript
              setTranscript(prev => [...prev, {
                text: text.trim(),
                timestamp: new Date(),
                isFinal: true
              }])
              setInterimText('')
            } else if (!data.is_final) {
              // Interim result
              setInterimText(text)
            }
          }
        }
      }

      socket.onerror = (event) => {
        console.error('Deepgram error:', event)
        setError('WebSocket connection error')
      }

      socket.onclose = (event) => {
        console.log('Deepgram disconnected:', event.code, event.reason)
        setIsConnected(false)
        setIsRecording(false)
      }

      socketRef.current = socket

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to Deepgram')
      return
    }

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      streamRef.current = stream

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(event.data)
        }
      }

      mediaRecorder.start(250) // Send data every 250ms
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
  }, [])

  const disconnect = useCallback(() => {
    stopRecording()

    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

    setIsConnected(false)
  }, [stopRecording])

  const clearTranscript = useCallback(() => {
    setTranscript([])
    setInterimText('')
  }, [])

  const getFullTranscript = useCallback(() => {
    return transcript.map(s => s.text).join(' ')
  }, [transcript])

  return {
    // State
    isConnected,
    isRecording,
    transcript,
    interimText,
    error,
    // Actions
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearTranscript,
    getFullTranscript,
  }
}
