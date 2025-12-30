# Unpayd

A beautiful, fast, and free AI chat application powered by open-source models via OpenRouter. Works as a PWA on iOS, Android, and Web.

## ✨ Features

- **4 Free AI Models**
  - ⚡ Quick (Xiaomi MiMo) - Fast responses
  - 💬 General (Hermes 3 405B) - Everyday chat
  - 💻 Coding (Qwen3 Coder) - Programming help
  - 🧠 Deep Think (Kimi K2) - Complex reasoning

- **Premium Features**
  - 🎤 Voice input with Web Speech API
  - 📎 File and image upload
  - 🔍 Web search toggle
  - 💾 Chat history & archives
  - 🌙 Beautiful dark Grok-like interface

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 20+)
- [OpenRouter API Key](https://openrouter.ai/keys) (2 recommended for failover)
- [PocketHost Account](https://pockethost.io/) (for auth)
- [Turso Account](https://turso.tech/) (for chat storage)

### 1. Clone and Install

```bash
git clone <your-repo>
cd unpayd
bun install
```

### 2. Configure Environment

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
OPENROUTER_KEY_1=sk-or-v1-your-first-key
OPENROUTER_KEY_2=sk-or-v1-your-second-key
NEXT_PUBLIC_POCKETBASE_URL=https://your-instance.pockethost.io
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Setup PocketHost

1. Create a new instance at [pockethost.io](https://pockethost.io)
2. The default `users` collection works out of the box
3. Enable email verification in Settings → Mail settings

### 4. Setup Turso

1. Create a database at [turso.tech](https://turso.tech)
2. Get your database URL and auth token
3. Tables are created automatically on first use

### 5. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the image
docker build -t unpayd .

# Run with environment variables
docker run -p 3000:3000 --env-file .env.local unpayd
```

### Docker Compose

```bash
# Start the application
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## ☁️ Vercel Deployment

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard
4. Deploy!

The free tier includes:
- Unlimited static page visits
- 100GB bandwidth
- Edge functions

## 📱 PWA Installation

On mobile or desktop:
1. Open the app in Chrome/Safari
2. Click "Add to Home Screen" / "Install"
3. The app works offline and feels native

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 19 |
| Styling | Tailwind CSS, shadcn/ui |
| Auth | PocketBase (PocketHost) |
| Database | Turso (libSQL) |
| LLM | OpenRouter API |
| Analytics | Plausible (optional) |

## 📊 OpenRouter Rate Limits

| Account Type | Daily Limit | RPM |
|--------------|-------------|-----|
| Free (no credits) | 50 requests | 20 |
| With $10 credit | 1,000 requests | 20 |

Using 2 API keys doubles your capacity!

## 🔐 Security

- All API calls are server-side (keys never exposed)
- Auth handled by PocketBase with email verification
- No data used for model training

## 📄 License

MIT

---

Built with ❤️ for families who want free AI chat
