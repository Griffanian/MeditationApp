# Infrastructure

## Hosting

- **Provider:** [[Render]]
- **Backend:** Django web service — [Dashboard](https://dashboard.render.com/web/srv-d8ni960js32c73doddpg)
  - Root directory: `app/backend`
  - Build: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
  - Start: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
  - URL: `meditation-backend-43a3.onrender.com`
- **Frontend:** Vite static site — [Dashboard](https://dashboard.render.com/static/srv-d8nf3iok1i2s73d9sou0)
  - Root directory: `app/frontend`
  - Build: `npm install && npm run build`
  - URL: `meditationapp-a6eg.onrender.com`
- Auto-deploys on push to `main`

## Database

- **Provider:** [[Supabase]] (Postgres)
- Host: `db.ytxxmbbuhpmkwysoszzm.supabase.co`
- Dashboard: [Supabase](https://supabase.com/dashboard)

## Storage

- **Provider:** [[Supabase]] Storage (S3-compatible)
- Bucket: `meditation-audio`

## APIs

- [[Anthropic]] — Claude API for script generation
- [[ElevenLabs]] — Speech synthesis for guided audio
- [[Granola]] — Meeting notes sync (cron every 15 min)

## Repo

- [GitHub](https://github.com/Griffanian/MeditationApp)

## Finances

[[management/Finances.xlsx]]
