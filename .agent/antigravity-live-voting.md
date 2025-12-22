# 🏆 Live Voting Application - Antigravity Reference

## Project Overview

A **real-time live voting application** designed for office events (specifically GritFeat's year-end event). The app allows participants to vote on various award categories, with an admin controlling the flow of voting sessions and revealing winners with dramatic animations.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Styling**: TailwindCSS 3.3.6
- **Typography**: IBM Plex Sans (Google Fonts)
- **Icons**: Lucide React
- **Real-time**: Socket.io-client 4.7.4
- **QR Code**: qrcode library
- **Language**: TypeScript

### Backend
- **Runtime**: Node.js with Express 4.18
- **Real-time**: Socket.io 4.7.4
- **Database**: SQLite3 (lightweight, event-scale)
- **Data Import**: csv-parser for awards

### Brand Colors (GritFeat)
- Primary Green: `#7ebd41`
- Dark Gray/Black: `#4c4c4c`

---

## Application Architecture

### Pages & Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page with QR code and links to admin/participant pages |
| `/participant` | Voting interface for participants (mobile-focused) |
| `/admin` | Admin dashboard for controlling sessions and viewing results |

### Backend API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/categories` | GET | Get all award categories with status |
| `/api/results/:categoryId` | GET | Get voting results for a specific category |
| `/api/completed-categories` | GET | Get all completed categories with results |
| `/api/participants` | GET | Get list of connected participants |
| `/api/session` | GET | Get current session state |
| `/api/stats` | GET | Connection and voting statistics |
| `/api/reset` | POST | Reset entire database (clear all votes) |

### Socket.io Events

#### Client → Server
- `join-voting` - Participant joins voting room
- `join-admin` - Admin joins admin room
- `start-category` - Start voting for a category
- `stop-category` - Stop voting for a category
- `submit-vote` - Submit a vote
- `reveal-winner` - Reveal winner for a category
- `end-voting` - End current voting session
- `request-voting-status` - Request current voting status
- `request-admin-status` - Request admin dashboard status
- `request-participant-count` - Request participant count

#### Server → Client
- `category-started` - Voting started for category
- `category-stopped` - Voting stopped for category
- `voting-results` - Real-time vote updates
- `vote-confirmed` - Vote submission confirmed
- `winner-revealed` - Winner revealed for category
- `participant-count` - Updated participant count
- `admin-status` - Admin dashboard state

---

## Key Features

### 1. Participant Experience
- **Confirmation Modal**: Prevents accidental votes - "Are you sure you want to vote for [name]?"
- **No Live Results**: Participants don't see live vote counts (prevents influence)
- **Post-Vote Status**: Shows who they voted for with waiting message
- **Search Functionality**: Can search through nominees
- **Connection Status**: Visual indicator for connected/disconnected

### 2. Admin Experience
- **Category Management**: Start/stop voting per category
- **Live Results**: Real-time vote counts (admin only)
- **Winner Reveal System**: Controlled reveal with confetti animations
- **Session Progress**: Visual progress of completed categories
- **Reset Database**: Clear all voting data to start fresh

### 3. Special Effects
- **Confetti Animation**: Canvas-based particle system on winner reveal
- **Sound Effects**: 
  - "Who Wants to Be a Millionaire" style reveal sound
  - Tick-tock countdown audio

---

## Data Models

### VotingSession
```typescript
interface VotingSession {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  active: boolean;
  startTime: number;
  endTime: number | null;
  results: Record<string, number>;
  options: string[];
  phase: "waiting" | "voting" | "completed" | "revealed";
  adminControlled: boolean;
}
```

### VoterState
```typescript
interface VoterState {
  participantId: string;
  currentCategoryId: string | null;
  hasVoted: boolean;
  selectedOption: string | null;
  viewState: "waiting" | "voting" | "voted" | "session-complete";
}
```

### Category
```typescript
interface Category {
  id: string;
  title: string;
  description: string;
  options: string[];
  completed: boolean;
  results?: Record<string, number>;
  revealed?: boolean;
}
```

---

## File Structure

```
live-voting/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles & theme
│   ├── participant/
│   │   └── page.tsx          # Participant voting page (1000+ lines)
│   ├── admin/
│   │   └── page.tsx          # Admin dashboard (900+ lines)
│   ├── components/
│   │   ├── ConfirmationModal.tsx  # Vote confirmation modal
│   │   ├── WaitingState.tsx       # Waiting screen component
│   │   ├── ResultsReveal.tsx      # Winner reveal with confetti
│   │   ├── ConfettiAnimation.tsx  # Canvas-based confetti
│   │   └── index.ts               # Component exports
│   └── utils/
│       ├── connectionManager.ts       # Socket connection handling
│       └── participantStateManager.ts # Participant state management
├── backend/
│   ├── server.js           # Express + Socket.io server (1100+ lines)
│   ├── voting.db           # SQLite database
│   └── package.json        # Backend dependencies
├── types/
│   ├── index.ts            # Main types export
│   ├── voting.ts           # Voting-related types
│   ├── components.ts       # Component prop types
│   ├── constants.ts        # App constants
│   └── utils.ts            # Utility functions & type guards
├── public/
│   └── assets/
│       ├── gf-logo.svg     # GritFeat logo
│       └── sound-fx.mp3    # Reveal sound effect
├── awards.csv              # Award categories & nominees (48 people!)
└── .kiro/
    └── specs/
        └── voting-ux-redesign/
            ├── requirements.md
            ├── design.md
            └── tasks.md
```

---

## Awards Configuration

The app loads award categories from `awards.csv`:
- **Columns**: Award Title + all 48 participant names
- **Categories**: 20 funny office awards (e.g., "In Progress Forever Award", "Deadline Houdini", "Coffee Dependency Medal")
- **Participants**: 48 team members at GritFeat

---

## Current Issues & Bugs to Fix

### 1. **Hardcoded ngrok URLs** ⚠️ CRITICAL
- `app/page.tsx` line 13-14: Hardcoded ngrok URL
- `app/participant/page.tsx` line 75: Hardcoded socket URL
- `app/admin/page.tsx` line 71, 178, 183-184, 266: Hardcoded URLs
- **Fix**: Use environment variables or dynamic host detection

### 2. **Timer Issue**
- Timer shows but voting is actually admin-controlled (no automatic end)
- `endTime` is set to `null` but frontend still shows countdown

### 3. **State Management Edge Cases**
- Reconnection logic could miss state updates
- `stateManager` might not be initialized on first render

### 4. **Mobile UX Improvements Needed**
- Participant page is responsive but could be improved
- Admin page is not optimized for mobile
- Search input could use better touch handling

### 5. **Missing Error Boundaries**
- No React error boundaries for graceful error handling
- Socket errors could crash the app

---

## Hosting Alternatives (for 50+ participants)

### Current Issue: ngrok Free Tier
- **Limit**: ~20 simultaneous connections on free tier
- **Problem**: Won't support 50 participants

### Recommended Solutions:

#### 1. **Local Network Hosting** (SIMPLEST ✅)
```bash
# Start backend binding to 0.0.0.0 (already done)
cd backend && npm run dev  # Server at PORT 3001

# Start frontend binding to 0.0.0.0
npm run dev  # Already configured with -H 0.0.0.0

# Access via local IP: http://192.168.x.x:3000
```
- **Pros**: Free, unlimited users, low latency
- **Cons**: Requires all devices on same WiFi network
- **How**: Find computer's local IP and share with participants

#### 2. **Cloudflare Tunnel (Free)** 
```bash
# Install cloudflared
cloudflared tunnel --url http://localhost:3001
```
- **Pros**: Free, no connection limits, HTTPS
- **Cons**: Requires Cloudflare account

#### 3. **Tailscale Funnel (Free)**
- **Pros**: Secure, works across networks
- **Cons**: Requires app installation

#### 4. **Deploy to Cloud** (if event is recurring)
- Vercel (frontend) + Railway/Render (backend)
- **Pros**: Professional, scalable
- **Cons**: Requires setup, potential costs

---

## Environment Variables Needed

```bash
# Frontend (.env.local)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Backend (.env)
PORT=3001
NODE_ENV=production
```

---

## How to Run

### Development
```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
npm install
npm run dev
```

### Production
```bash
# Build frontend
npm run build

# Start backend (serves static frontend from /out)
cd backend
npm start
```

Access:
- **Landing**: http://localhost:3001/
- **Participant**: http://localhost:3001/participant
- **Admin**: http://localhost:3001/admin

---

## Priority Improvements

1. **Environment Variables**: Replace hardcoded URLs
2. **Mobile Admin View**: Make admin page mobile-friendly
3. **Error Handling**: Add error boundaries
4. **Connection Recovery**: Better reconnection UX
5. **Timer Clarity**: Remove or fix timer display when admin-controlled
6. **PWA Support**: Add for offline resilience

---

*Last Updated: December 19, 2024*
*Created for GritFeat Year-End Event*
