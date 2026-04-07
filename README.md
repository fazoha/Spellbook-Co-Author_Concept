# Spellbook Co-Author — AI-Powered Contract Collaboration

A real-time collaborative contract editing platform with automatic AI clause analysis. Built as an MVP to explore how legal teams could work together on documents with AI assistance embedded directly into the workflow.

**Live:** [spellbook-co-author-concept-kumyzszkt-fazohas-projects.vercel.app](https://spellbook-co-author-concept-kumyzszkt-fazohas-projects.vercel.app)

---

## What it does

**Real-time collaboration**
- Upload a `.docx` contract and invite collaborators via a 6-character room code
- Owner controls the official document; editors work on independent branches
- Changes sync live across all participants via WebSockets

**Git-style document workflow**
- Editors work on a local copy and submit it for the owner's review
- Owner compares changes section by section and accepts or rejects each one
- 3-way merge detects conflicts when the official version moves forward while an editor is still working — prompts the editor to resolve overlaps before submitting

**Automatic AI clause analysis**
- On document load, the server scans every clause via OpenAI and returns a list of flagged phrases with issues and suggested replacements
- Flagged text is underlined in amber directly in the document
- Clicking a flag expands a side card showing the issue — with a confirmation step before any suggestion is applied to the text
- Re-scans automatically when the owner pushes a new official version during a live session

---

## Architecture

```
Browser (React + TypeScript)
    ↕ WebSocket (Socket.io)         ↕ HTTP (fetch)
Collab Server (Node.js)
    ↕ OpenAI API
```

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS  
**Server** — Node.js with Socket.io, no framework  
**AI** — OpenAI chat completions API (model configurable via env)  
**Hosting** — Vercel (frontend) + Railway (server)

The server is stateless per deployment — rooms live in memory and are cleaned up when the owner disconnects. The frontend manages document state locally and syncs only the necessary deltas over WebSocket events.

---

## Document workflow states

```
Official Version
    → Start Working → Working Copy (editing)
        → Send for Review → Working Copy (in review)
            → Accept / Reject sections → Make Official → new Official Version
                → (if in live session) pushed to all editors automatically
```

Conflict resolution happens via a 3-way merge: if both the editor and the owner modified the same section, the editor sees both versions side by side and chooses which to keep before resubmitting.

---

## Running locally

**Install dependencies:**
```bash
npm install
npm install --prefix server
```

**Create a `.env` file in the project root:**
```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini   # any OpenAI chat model works
```

**Start the app:**
```bash
npm run dev:full      # collab server + one browser instance

npm run dev:double    # collab server + two instances (ports 5174, 5175)
npm run dev:triple    # collab server + three instances (ports 5174–5176)
```

Open multiple browser windows to simulate different collaborators on the same session.

---

## Key design decisions

**Why a git-style workflow instead of live co-editing?**  
Legal documents require controlled changes with a clear chain of custody. A branch-and-review model mirrors how legal teams actually work — one party proposes, the other reviews — rather than forcing simultaneous editing that could create ambiguous document states.

**Why server-side AI scanning instead of client-side?**  
The OpenAI API key never reaches the browser. All AI calls are proxied through the server, so the key stays private regardless of how the frontend is deployed.

**Why highlight only on card click instead of always?**  
Showing all highlights at once made it hard to tell which flag corresponded to which annotation. Activating the highlight only when a card is selected creates a clear one-to-one relationship between the comment and the text.
