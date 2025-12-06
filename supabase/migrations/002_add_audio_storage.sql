-- Migration: 002_add_audio_storage
-- Description: Add audio_url column and setup storage bucket for audio files

-- Add audio_url column to recordings table
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies

-- Allow authenticated users to upload their own audio
CREATE POLICY "Users can upload their own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own audio
CREATE POLICY "Users can view their own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to view audio (for playback)
CREATE POLICY "Public can view audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recordings');

-- Allow authenticated users to delete their own audio
CREATE POLICY "Users can delete their own audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
