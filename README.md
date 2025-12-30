# Unpayd

A beautiful, fast, and free AI chat application powered by open-source models via OpenRouter. Works as a PWA on iOS, Android, and Web.

## ✨ Features

- **Multi-Provider AI (Cerebras + OpenRouter)**
  - ⚡ **Priority**: Cerebras (Free, Fast) -> OpenRouter (Fallback)
  - 🔄 Automatic failover and round-robin load balancing
  - 🔑 Support for multiple API keys per provider

- **Supported Models**
  - **Llama 3.1 8B** (Fast & Efficient)
  - **Llama 3.3 70B** (General Purpose)
  - **Qwen 3 32B** (Coding & Logic)
  - **GPT OSS 120B** (Deep Reasoning)
  - *Plus Preview Models*: Qwen 3 235B, Z.ai GLM 4.6

- **Premium Interface**
  - 🌙 Beautiful dark Grok-like UI
  - 🔍 Web search toggle
  - 💭 Deep Think mode
  - 📱 PWA support (Installable)

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 20+)
- [Cerebras API Key](https://cloud.cerebras.ai/) (Primary - Fast & Free)
- [OpenRouter API Key](https://openrouter.ai/keys) (Backup)
- [Nhost Account](https://nhost.io/) (for Auth & Database)

### 1. Clone and Install

```bash
git clone <your-repo>
cd unpayd
bun install
```

### 2. Configure Environment

Copy the example env file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# AI Providers
CEREBRAS_API_KEY=your-cerebras-key
OPENROUTER_KEY_1=your-openrouter-key
# Add more keys as needed: CEREBRAS_API_KEY_2, OPENROUTER_KEY_2, etc.

# Nhost (Auth & DB)
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-subdomain
NEXT_PUBLIC_NHOST_REGION=your-region

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🐳 Docker Deployment

### Build and Run

```bash
docker build -t unpayd .
docker run -p 3000:3000 --env-file .env.local unpayd
```

## 🔧 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 19 |
| Styling | Tailwind CSS, shadcn/ui |
| Auth | **Nhost** (Postgres + Hasura) |
| Database | **Turso** (LibSQL) |
| AI Inference | **Cerebras** (Primary) + OpenRouter (Fallback) |
| Analytics | Plausible (optional) |

## 📊 Rate Limiting & Failover

The system uses a sophisticated priority queue:
1. **Cerebras**: Tried first. Extremely fast (2000+ tokens/s).
2. **OpenRouter**: Used if Cerebras fails or is rate-limited.
3. **Multiple Keys**: If you add multiple keys (e.g., `CEREBRAS_API_KEY_1`, `CEREBRAS_API_KEY_2`), the app rotates through them to maximize throughput.

## 🔐 Security

- API keys are stored server-side and never exposed to the client.
- Auth is handled via secure Nhost sessions.
- Chat data is encrypted in transit and at rest in Turso.

## 📄 License

MIT

---

Built with ❤️ for speed and accessibility.
