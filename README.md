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

## Deployment to Vercel

### Cách 1: Deploy qua Vercel CLI

1. **Cài đặt Vercel CLI** (nếu chưa có):
```bash
npm i -g vercel
```

2. **Đăng nhập Vercel**:
```bash
vercel login
```

3. **Deploy project**:
```bash
vercel
```

4. **Thêm Environment Variables**:
Sau khi deploy lần đầu, thêm các biến môi trường:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_DEEPGRAM_API_KEY  # Optional
```

Hoặc thêm qua Vercel Dashboard:
- Vào project trên Vercel Dashboard
- Settings > Environment Variables
- Thêm các biến:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_DEEPGRAM_API_KEY` (optional)

5. **Redeploy** sau khi thêm env vars:
```bash
vercel --prod
```

### Cách 2: Deploy qua GitHub (Khuyến nghị)

1. **Push code lên GitHub**:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

2. **Kết nối với Vercel**:
   - Truy cập [vercel.com](https://vercel.com)
   - Đăng nhập và chọn "Add New Project"
   - Import repository từ GitHub
   - Vercel sẽ tự động detect Vite project

3. **Cấu hình Environment Variables**:
   - Trong màn hình cấu hình project, thêm các biến môi trường:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_DEEPGRAM_API_KEY` (optional)
   - Chọn environment: Production, Preview, Development

4. **Deploy**:
   - Click "Deploy"
   - Vercel sẽ tự động build và deploy
   - Mỗi lần push code mới, Vercel sẽ tự động deploy lại

### Cấu hình Supabase cho Production

1. **Thêm Vercel URL vào Supabase**:
   - Vào Supabase Dashboard > Authentication > URL Configuration
   - Thêm Vercel URL vào "Site URL" và "Redirect URLs"
   - Format: `https://your-project.vercel.app`

2. **Kiểm tra CORS settings** (nếu cần):
   - Đảm bảo Supabase Storage bucket cho phép requests từ Vercel domain

### Lưu ý

- File `vercel.json` đã được tạo sẵn với cấu hình tối ưu cho PWA
- Service Worker sẽ hoạt động đúng với cấu hình headers trong `vercel.json`
- Tất cả routes sẽ được redirect về `index.html` để hỗ trợ React Router
- Cache headers đã được tối ưu cho assets và service worker
