-- Supabase SQL Schema for Lecture Translator
-- Run this in your Supabase SQL Editor

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  transcript_en TEXT NOT NULL,
  transcript_vi TEXT,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own recordings
CREATE POLICY "Users can view own recordings" ON recordings
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own recordings
CREATE POLICY "Users can insert own recordings" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own recordings
CREATE POLICY "Users can update own recordings" ON recordings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own recordings
CREATE POLICY "Users can delete own recordings" ON recordings
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS recordings_user_id_idx ON recordings(user_id);
CREATE INDEX IF NOT EXISTS recordings_created_at_idx ON recordings(created_at DESC);
