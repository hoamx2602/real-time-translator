# Lecture Translator Web

Real-time lecture transcription and translation PWA using Deepgram API.

## Features

- Real-time speech-to-text using Deepgram Nova-2
- Vietnamese translation (Google Translate)
- PWA - installable on mobile/desktop
- Save recordings to Supabase
- Dark mode UI

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Deepgram WebSocket API
- Supabase (Auth + Database)
- PWA (vite-plugin-pwa)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run the SQL in `supabase-schema.sql` in SQL Editor
3. Enable Google/GitHub OAuth in Authentication > Providers

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key
```

### 4. Run development server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

## Usage

1. Sign in with Google or GitHub
2. Enter your Deepgram API key in Settings
3. Press the microphone button to start recording
4. Speak in English - text will appear in real-time
5. Toggle "Translate to Vietnamese" for translations
6. Press Save to store the transcript

## Getting API Keys

### Deepgram
1. Go to [console.deepgram.com](https://console.deepgram.com)
2. Create a new API key
3. Copy and paste into the app

### Supabase
1. Go to your project Settings > API
2. Copy the Project URL and anon/public key

## PWA Installation

On Chrome/Edge:
- Click the install icon in the address bar

On Safari (iOS):
- Share > Add to Home Screen
