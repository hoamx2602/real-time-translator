import { useState, useRef, useCallback, useEffect } from 'react'

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

export type AudioDevice = {
  deviceId: string
  label: string
}

export type AudioSource = 'microphone' | 'system' | 'tab'

export function useDeepgram() {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone')

  const socketRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const currentSegmentRef = useRef<{ text: string; startTime: Date } | null>(null)
  const segmentIntervalMs = 10000 // 10 seconds per segment
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)

  // Get available audio input devices
  const refreshAudioDevices = useCallback(async () => {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true })

      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`
        }))

      setAudioDevices(audioInputs)

      // Set default device if not selected
      if (!selectedDeviceId && audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId)
      }
    } catch (err) {
      console.error('Failed to get audio devices:', err)
    }
  }, [selectedDeviceId])

  // Refresh devices on mount and when devices change
  useEffect(() => {
    refreshAudioDevices()

    navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', refreshAudioDevices)
    }
  }, [refreshAudioDevices])

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
              const now = new Date()

              // Check if we should start a new segment (10 seconds elapsed)
              if (!currentSegmentRef.current) {
                // First segment
                currentSegmentRef.current = { text: text.trim(), startTime: now }
              } else {
                const elapsed = now.getTime() - currentSegmentRef.current.startTime.getTime()

                if (elapsed >= segmentIntervalMs) {
                  // Save current segment and start new one
                  const segmentText = currentSegmentRef.current.text
                  const segmentTime = currentSegmentRef.current.startTime

                  setTranscript(prev => [...prev, {
                    text: segmentText,
                    timestamp: segmentTime,
                    isFinal: true
                  }])

                  // Start new segment
                  currentSegmentRef.current = { text: text.trim(), startTime: now }
                } else {
                  // Append to current segment
                  currentSegmentRef.current.text += ' ' + text.trim()
                }
              }
              setInterimText('')
            } else if (!data.is_final) {
              // Interim result - show current segment + interim
              const currentText = currentSegmentRef.current?.text || ''
              setInterimText(currentText ? currentText + ' ' + text : text)
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

  const startRecording = useCallback(async (deviceId?: string, source?: AudioSource) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to Deepgram')
      return
    }

    try {
      const targetDeviceId = deviceId || selectedDeviceId
      const targetSource = source || audioSource
      let stream: MediaStream

      if (targetSource === 'tab') {
        // Capture browser tab audio using getDisplayMedia
        // This will show a picker to select which tab to capture
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true, // Required, but we won't use it
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        } as DisplayMediaStreamOptions)

        // Stop video track as we only need audio
        stream.getVideoTracks().forEach(track => track.stop())

        // Check if audio track exists
        if (stream.getAudioTracks().length === 0) {
          throw new Error('No audio track captured. Make sure to check "Share tab audio" when selecting the tab.')
        }
      } else {
        // Get audio from microphone or system device (BlackHole)
        const isSystemAudio = targetSource === 'system' || targetDeviceId?.toLowerCase().includes('blackhole')

        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
            channelCount: 1,
            sampleRate: 16000,
            // Disable processing for system audio capture
            echoCancellation: !isSystemAudio,
            noiseSuppression: !isSystemAudio,
            autoGainControl: !isSystemAudio,
          }
        })
      }

      streamRef.current = stream

      // Reset recorded audio
      setRecordedAudio(null)
      audioChunksRef.current = []

      // Create MediaRecorder for Deepgram (sends data frequently)
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

      // Create separate MediaRecorder for saving full audio
      const audioRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      audioRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setRecordedAudio(audioBlob)
      }

      audioRecorder.start() // Record continuously
      audioRecorderRef.current = audioRecorder

      setIsRecording(true)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access audio'
      setError(message)
      console.error('Recording error:', err)
    }
  }, [selectedDeviceId, audioSource])

  const stopRecording = useCallback(() => {
    // Flush the current segment if any
    if (currentSegmentRef.current && currentSegmentRef.current.text.trim()) {
      setTranscript(prev => [...prev, {
        text: currentSegmentRef.current!.text,
        timestamp: currentSegmentRef.current!.startTime,
        isFinal: true
      }])
      currentSegmentRef.current = null
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    // Stop audio recorder (this will trigger onstop and save the blob)
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop()
      audioRecorderRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
    setInterimText('')
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
    currentSegmentRef.current = null
    setRecordedAudio(null)
    audioChunksRef.current = []
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
    audioDevices,
    selectedDeviceId,
    audioSource,
    recordedAudio,
    // Actions
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearTranscript,
    getFullTranscript,
    setSelectedDeviceId,
    setAudioSource,
    refreshAudioDevices,
  }
}
