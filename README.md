# MeditationApp

An AI-powered guided meditation builder and player. Generate structured meditation scripts with Claude, synthesize speech with ElevenLabs, and assemble multi-part audio — all through an interactive editing UI. Share exercises and programmes with clients via invite links.

## Features

- **AI script generation** — describe a meditation technique and Claude generates a structured script with speech, pauses, loops, and audio assets
- **Text-to-speech** — ElevenLabs voice synthesis with component caching (only regenerates what changed)
- **Interactive editor** — drag-and-drop segment reordering, inline editing, variable configuration, and waveform audio playback
- **Multi-stage meditations** — build complex meditations with multiple stages, nested loops, and per-stage variables
- **Audio assembly** — combines speech, silence, and pre-recorded assets into a single output file
- **Programmes** — organise exercises into week/day structures with progressive variable overrides
- **AI assistant** — sidebar chat powered by Claude with tool use for script editing, generation, and exercise management
- **Role-based access** — admin, editor, builder, and viewer roles with invite-only signup
- **Client management** — builders can invite viewers, share content, and monitor session history
- **Session tracking** — viewers log completed practice sessions with duration and progress
- **Analytics** — PostHog integration for session replay, event tracking, and user behaviour analysis

## Prerequisites

- Python 3
- Node.js
- A [Supabase](https://supabase.com/) project (PostgreSQL + Storage)
- An [Anthropic API key](https://console.anthropic.com/)
- An [ElevenLabs API key](https://elevenlabs.io/)
- A [PostHog](https://posthog.com/) project (optional, for analytics)

## Setup

1. **Set up the Python environment:**

   ```bash
   cd app/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Install frontend dependencies:**

   ```bash
   cd app/frontend
   npm install
   ```

3. **Configure environment variables:**

   Backend — create `app/.env`:

   ```
   ANTHROPIC_API_KEY=your-anthropic-key
   ELEVENLABS_API_KEY=your-elevenlabs-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_DB_HOST=db.your-project.supabase.co
   SUPABASE_DB_PASSWORD=your-db-password
   SUPABASE_STORAGE_BUCKET=meditation-audio
   SUPABASE_STORAGE_ACCESS_KEY=your-s3-access-key
   SUPABASE_STORAGE_SECRET_KEY=your-s3-secret-key
   ```

   Frontend — create `app/frontend/.env`:

   ```
   VITE_POSTHOG_KEY=phc_your-posthog-project-key
   ```

4. **Run database migrations:**

   ```bash
   cd app/backend
   python manage.py migrate
   ```

## Running locally

```bash
# Backend (port 5555)
cd app/backend && python manage.py runserver 5555

# Frontend (port 3000)
cd app/frontend && npm run dev
```

- Backend API: http://localhost:5555
- Frontend: http://localhost:3000

## Analytics (PostHog)

The app uses [PostHog](https://posthog.com/) for product analytics and session replay. Set the `VITE_POSTHOG_KEY` env var in `app/frontend/.env` to enable it.

PostHog provides:
- **Session replay** — video playback of every user session
- **Autocapture** — clicks, pageviews, and form interactions tracked automatically
- **User identification** — events are tied to the authenticated user's username and role

The integration lives in `app/frontend/src/posthog.js`. Users are identified on login/signup and reset on logout.

## Deployment (Render)

The app is deployed on [Render](https://render.com/) with auto-deploy from the `main` branch on GitHub (`Griffanian/MeditationApp`).

| Service                | Type                          | URL                                          | Region    |
| ---------------------- | ----------------------------- | -------------------------------------------- | --------- |
| **Meditation Backend** | Web Service (Python/Gunicorn) | https://meditation-backend-43a3.onrender.com | Frankfurt |
| **MeditationApp**      | Static Site (React/Vite)      | https://meditationapp-a6eg.onrender.com      | —         |

- **Backend** builds with `pip install -r requirements.txt && python manage.py collectstatic --noinput` and runs `gunicorn config.wsgi:application`
- **Frontend** builds with `npm install && npm run build`, publishes from `dist/`
- Both services share the same environment group on Render
- Database is hosted on **Supabase** (PostgreSQL), not Render
- Audio files and assets are stored in **Supabase Storage**

### Render Dashboard

- Backend: https://dashboard.render.com/web/srv-d8ni960js32c73doddpg
- Frontend: https://dashboard.render.com/static/srv-d8nf3iok1i2s73d9sou0

## Project Structure

```
MeditationApp/
├── .env                           # Project-level keys (not committed)
├── app/
│   ├── .env                       # Backend secrets (not committed)
│   ├── backend/
│   │   ├── manage.py
│   │   ├── requirements.txt
│   │   ├── config/                # Django project settings
│   │   │   ├── settings.py
│   │   │   ├── urls.py
│   │   │   └── wsgi.py
│   │   └── meditations/           # Django app
│   │       ├── models.py          # All database models
│   │       ├── authentication.py  # Token auth
│   │       ├── permissions.py     # RBAC helpers
│   │       ├── urls.py            # API URL routing
│   │       ├── views/             # API views by domain
│   │       │   ├── auth.py        # Login, signup, join, profile
│   │       │   ├── users.py       # Admin user management, viewer management
│   │       │   ├── invites.py     # Invite link CRUD
│   │       │   ├── meditations.py # Exercise list, meta, instructions
│   │       │   ├── scripts.py     # Script CRUD (root + stage)
│   │       │   ├── stages.py      # Stage variables, script generation
│   │       │   ├── components.py  # TTS, uploads, audio serving
│   │       │   ├── assembly.py    # Audio assembly
│   │       │   ├── practices.py   # Programme CRUD
│   │       │   ├── sharing.py     # Content sharing
│   │       │   ├── clone.py       # Exercise/programme cloning
│   │       │   ├── assistant.py   # AI chat (threads + messages)
│   │       │   ├── history.py     # Practice session logging
│   │       │   ├── trim.py        # Trim metadata
│   │       │   └── assets.py      # Asset management
│   │       └── services/
│   │           ├── synthesize.py  # TTS & audio assembly
│   │           ├── generate_script.py  # Claude script generation
│   │           ├── agent.py       # AI assistant agent
│   │           └── storage.py     # Supabase Storage helpers
│   └── frontend/
│       ├── .env                   # Frontend config (not committed)
│       ├── src/
│       │   ├── App.jsx            # Router, auth, layout
│       │   ├── posthog.js         # PostHog analytics integration
│       │   ├── api.js             # API client
│       │   ├── AuthContext.jsx    # Auth state & RBAC context
│       │   ├── playback.js        # Audio playback engine
│       │   ├── pages/
│       │   │   ├── Home.jsx       # Dashboard with onboarding
│       │   │   ├── Dashboard.jsx  # Exercise management
│       │   │   ├── Editor.jsx     # Exercise builder
│       │   │   ├── Practices.jsx  # Programme list
│       │   │   ├── PracticeBuilder.jsx  # Programme builder
│       │   │   ├── Player.jsx     # Programme player
│       │   │   ├── ExercisePlayer.jsx   # Single exercise player
│       │   │   ├── Clients.jsx    # Viewer management (builder)
│       │   │   ├── UserManagement.jsx   # User admin
│       │   │   ├── History.jsx    # Session history
│       │   │   ├── Account.jsx    # Profile settings
│       │   │   ├── Login.jsx      # Login page
│       │   │   ├── Signup.jsx     # Personal invite signup
│       │   │   ├── Join.jsx       # Generic link signup
│       │   │   └── Preview.jsx    # UX preview tool
│       │   ├── components/
│       │   │   ├── AssistantSidebar.jsx  # AI chat sidebar
│       │   │   ├── StageEditor.jsx      # Stage timeline editor
│       │   │   ├── Timeline.jsx         # Segment timeline
│       │   │   ├── TimelineGuide.jsx    # Interactive guide
│       │   │   ├── Segment.jsx          # Individual segment
│       │   │   ├── PreSignupOnboarding.jsx  # Builder onboarding slides
│       │   │   └── ...
│       │   └── hooks/
│       │       └── useAssistantRuntime.js   # AI chat runtime
│       ├── package.json
│       └── vite.config.js
```

## Roles & Access

| Role      | Can create | Can edit others' | Admin panel | Invited by    |
| --------- | ---------- | ---------------- | ----------- | ------------- |
| **Admin** | Yes        | Yes              | Yes         | —             |
| **Editor**| Yes        | Yes              | No          | Admin         |
| **Builder** | Yes      | No               | No          | Admin         |
| **Viewer** | No        | No               | No          | Builder       |

- Signup is invite-only (personal invite links or permanent join links)
- Builders see onboarding slides before creating their account
- Viewers land on a simplified home page focused on playing shared content

## Data Model

### Core Models

| Model               | Description                                  |
| ------------------- | -------------------------------------------- |
| **UserProfile**     | Role, display name, signup token, invited_by |
| **InviteLink**      | Personal invite with token, expiry, usage    |
| **ViewerAccess**    | Viewer-builder relationship                  |
| **Meditation**      | An exercise with instructions and script     |
| **Stage**           | A stage within a meditation                  |
| **Component**       | Generated speech audio for a segment         |
| **Asset**           | Reusable audio file (bell, music, etc.)      |
| **AssembledOutput** | Cached assembled audio                       |
| **Practice**        | A programme of exercises over weeks/days     |
| **PracticeSession** | Completed practice log                       |
| **Thread**          | AI chat conversation thread                  |
| **Message**         | Individual AI chat message                   |
| **Group**           | Exercise grouping                            |
| **Category**        | Exercise categorisation                      |

## Django Admin

| Environment    | URL                                                 |
| -------------- | --------------------------------------------------- |
| **Production** | https://meditation-backend-43a3.onrender.com/admin/ |
| **Local**      | http://localhost:5555/admin/                        |

```bash
cd app/backend
python manage.py createsuperuser
```
