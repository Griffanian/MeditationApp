# MeditationApp

An AI-powered guided meditation builder and editor. Generate structured meditation scripts with Claude, synthesize speech with ElevenLabs, and assemble multi-part audio — all through an interactive editing UI.

## Features

- **AI script generation** — describe a meditation technique and Claude generates a structured script with speech, pauses, loops, and audio assets
- **Text-to-speech** — ElevenLabs voice synthesis with component caching (only regenerates what changed)
- **Interactive editor** — drag-and-drop segment reordering, inline editing, variable configuration, and waveform audio playback
- **Multi-stage meditations** — build complex meditations with multiple stages, nested loops, and per-stage variables
- **Audio assembly** — combines speech, silence, and pre-recorded assets into a single output file

## Prerequisites

- Python 3
- Node.js
- A [Supabase](https://supabase.com/) project (PostgreSQL + Storage)
- An [Anthropic API key](https://console.anthropic.com/)
- An [ElevenLabs API key](https://elevenlabs.io/)

## Setup


1. **Set up the Python environment:**

   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Install frontend dependencies:**

   ```bash
   cd frontend
   npm install
   ```
3. **Configure environment variables:**

   Create a `.env` file in the project root:

   ```
   ANTHROPIC_API_KEY=your-anthropic-key
   ELEVENLABS_API_KEY=your-elevenlabs-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_DB_PASSWORD=your-db-password
   SUPABASE_STORAGE_BUCKET=meditation-audio
   SUPABASE_STORAGE_ACCESS_KEY=your-s3-access-key
   SUPABASE_STORAGE_SECRET_KEY=your-s3-secret-key
   ```
4. **Run database migrations:**

   ```bash
   cd backend
   python manage.py migrate
   ```

## Running locally

```bash
cd backend && source ../venv/bin/activate
python manage.py runserver 5555 &
cd ../frontend && npm run dev
```

This starts the Django API server on port 5555 and the Vite dev server on port 5173. Vite proxies `/api`, `/audio`, and `/pdf` requests to the backend.

Open [http://localhost:5173](http://localhost:5173) to use the app.

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
├── .env                           # Environment variables (not committed)
├── backend/
│   ├── manage.py                  # Django management entry point
│   ├── requirements.txt           # Python dependencies
│   ├── config/                    # Django project settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── meditations/               # Django app
│   │   ├── models.py              # Meditation, Stage, Component, Asset models
│   │   ├── admin.py               # Django admin registration
│   │   ├── urls.py                # API URL routing
│   │   ├── views/                 # API views by domain
│   │   │   ├── meditations.py     # List, meta, instructions, PDF, loops
│   │   │   ├── scripts.py         # Script CRUD (root + stage)
│   │   │   ├── stages.py          # Stage variables
│   │   │   ├── components.py      # Component status, TTS, upload, serving
│   │   │   ├── assembly.py        # Audio assembly
│   │   │   ├── trim.py            # Trim metadata & operations
│   │   │   └── assets.py          # Asset management
│   │   ├── services/              # Business logic
│   │   │   ├── synthesize.py      # TTS generation & audio assembly
│   │   │   ├── generate_script.py # Claude AI script generation
│   │   │   └── storage.py         # Supabase Storage helpers
│   │   └── management/commands/
│   │       └── import_legacy.py   # One-time data migration
│   ├── assets/                    # Local reusable audio files
│   └── main.py                    # CLI generation tool
└── frontend/
    ├── src/
    │   ├── App.jsx                # Router setup
    │   ├── pages/                 # Dashboard & Editor views
    │   ├── components/            # Timeline, Segment, AudioPlayer, etc.
    │   └── api.js                 # API client
    ├── package.json
    └── vite.config.js             # Dev server & API proxy config
```

## Django Admin

The Django admin interface allows direct management of all database records (Groups, Categories, Meditations, Stages, Components, Assets, Practices, Assembled Outputs).


| Environment    | URL                                                 |
| -------------- | --------------------------------------------------- |
| **Production** | https://meditation-backend-43a3.onrender.com/admin/ |
| **Local**      | http://localhost:5555/admin/                        |

To create a superuser for admin access:

```bash
cd backend
source ../venv/bin/activate
python manage.py createsuperuser
```

## Data Model

### Database Models (Supabase PostgreSQL)


| Model               | Fields                                                                                                        | Description                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Meditation**      | `name`, `display_name`, `category`, `instructions` (JSON), `script` (JSON)                                    | A meditation exercise                        |
| **Stage**           | `meditation` (FK), `stage_id`, `script` (JSON), `variables` (JSON)                                            | A stage within a meditation                  |
| **Component**       | `meditation` (FK), `stage` (FK), `seg_id`, `text_hash`, `timestamps` (JSON), `trim_meta` (JSON), `audio_file` | Generated speech audio for a segment         |
| **Asset**           | `filename`, `audio_file`, `trim_meta` (JSON)                                                                  | Reusable audio file (bell, breath cue, etc.) |
| **AssembledOutput** | `meditation` (FK), `stage` (FK), `script_hash`, `audio_file`, `duration`                                      | Cached assembled audio                       |

### Segment Types (in scripts)


| Type     | Key Fields                                      | Description                                                       |
| -------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| `speech` | `id`, `text`                                    | Spoken instruction. Text can contain`{variableName}` placeholders |
| `pause`  | `id`, `duration_seconds`                        | Silent pause. Duration can be a number or`"{variableName}"`       |
| `asset`  | `id`, `file`                                    | Play a pre-recorded audio clip from assets                        |
| `loop`   | `id`, `repeat`, `segments`, `variable`, `label` | Repeat a sequence. If`label` is set, renders as a named section   |

### Component Status

- `"missing"` — no audio file exists
- `"current"` — audio exists and hash matches current text
- `"stale"` — audio exists but text has changed (needs regeneration)

### Variable Substitution

Variables defined in stages control loop repeat counts and are substituted into speech text. Numbers are converted to words (3 → "three") for natural TTS output. An MD5 hash of the substituted text detects when audio needs regeneration.

## API Endpoints

### Meditations


| Method          | Endpoint                                   | Description               |
| --------------- | ------------------------------------------ | ------------------------- |
| GET             | `/api/meditations`                         | List all meditations      |
| GET/PUT         | `/api/meditations/{name}/meta`             | Meditation metadata       |
| GET/PUT         | `/api/meditations/{name}/instructions`     | Instructions (JSON)       |
| GET/POST/DELETE | `/api/meditations/{name}/instructions-pdf` | Instructions PDF          |
| PUT             | `/api/meditations/{name}/loops`            | Update loop repeat counts |
| POST            | `/api/meditations/{name}/assemble`         | Assemble full audio       |

### Stages


| Method  | Endpoint                                                            | Description          |
| ------- | ------------------------------------------------------------------- | -------------------- |
| GET/PUT | `/api/meditations/{name}/stages/{stage_id}/script`                  | Stage script         |
| GET/PUT | `/api/meditations/{name}/stages/{stage_id}/variables`               | Stage variables      |
| GET     | `/api/meditations/{name}/stages/{stage_id}/components`              | Component statuses   |
| GET     | `/api/meditations/{name}/stages/{stage_id}/timestamps/{seg_id}`     | Word timestamps      |
| POST    | `/api/meditations/{name}/stages/{stage_id}/generate-audio/{seg_id}` | Generate TTS         |
| POST    | `/api/meditations/{name}/stages/{stage_id}/assemble`                | Assemble stage audio |

### Audio Serving

All `/audio/...` and `/pdf/...` routes redirect to Supabase Storage public URLs.
