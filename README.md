# Spellbook — AI Co-Author & Contract Collaboration

A real-time collaborative contract editing tool with AI-powered clause analysis.

## What it does

- Upload a contract (`.docx`) and edit it section by section
- Collaborate live with others using a 6-character room code
- Get AI feedback on any clause — issues flagged, suggestions provided
- Owner/editor workflow: editors submit changes, owner reviews and merges them
- Conflict resolution when multiple people edit the same section

## Live App

[spellbook-co-author-concept-kumyzszkt-fazohas-projects.vercel.app](https://spellbook-co-author-concept-kumyzszkt-fazohas-projects.vercel.app)

## Running locally

**Install dependencies:**
```bash
npm install
npm install --prefix server
```

**Add your OpenAI key:**
```bash
# Create a .env file in the project root
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

**Start the app:**
```bash
# Single instance
npm run dev:full

# Two instances (ports 5174, 5175) — for testing collaboration
npm run dev:double

# Three instances (ports 5174, 5175, 5176)
npm run dev:triple
```

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Realtime:** Socket.io
- **AI:** OpenAI API (gpt-4o-mini)
- **Hosting:** Vercel (frontend) + Railway (server)
