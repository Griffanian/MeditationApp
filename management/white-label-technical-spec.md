# White-Label Technical Spec
## What exists today
The platform is a single-tenant meditation programme builder and player. It has:
- A Django + Supabase backend with 50+ API endpoints
- A React frontend with a full content editor, programme builder, and player
- AI script generation (Claude) and text-to-speech (ElevenLabs)
- An audio assembly pipeline that combines speech, pauses, assets, and loops into finished MP3s
- A 4-role RBAC system (admin, editor, builder, viewer)
- Content sharing (per-meditation, per-category, and per-practice sharing to specific users)
- Supabase Storage for all audio files, served via public URLs
Everything runs on Render (backend + frontend) with Supabase (database + storage).
## The two tiers
### Tier 1: Content creator
Standard platform access. A content creator signs up, builds meditation programmes using the editor, and shares them with their audience through the existing frontend and player.

This is essentially what exists now. The builder role + viewer relationship already supports this — a builder creates content, invites viewers, and viewers access it through the platform.

**What needs to change:** Very little. The current system supports this model. The main additions would be:
- Self-service onboarding (currently invite-only)
- Clearer content creator vs consumer separation in the UI
- Terms of service that define content ownership
### Tier 2: White-label
Everything in the content creator tier, plus: the ability to serve content through their own app with their own branding. This is the Resilient Minds tier.

A white-label client:
- Creates content on the platform (using the builder/editor as normal)
- Serves that content to their end users via API + an embedded player
- Has their own branding (logo, colours, app name)
- Their end users never see or know about the underlying platform
## What needs to be built for white-label
### 1. Multi-tenancy (database layer)
**New model: `Tenant`**
- `name` — organisation name (e.g. "Resilient Minds")
- `slug` — URL-safe identifier
- `branding` — JSON field (logo URL, primary colour, accent colour, app name)
- `custom_domain` — optional, for fully branded access
- `api_key` — for authenticated API access from their frontend
- `created_at`
**Add `tenant_id` to existing models:**
- `UserProfile` — every user belongs to a tenant
- `Meditation`, `Practice`, `Group`, `Category` — all content scoped to a tenant
- `Asset` — tenant-specific reusable audio
- `AssembledOutput` — cached audio scoped to tenant
- `ViewerAccess` — viewer-builder relationships scoped to tenant
**Middleware:**
- A `TenantMiddleware` that extracts the tenant from the request (via API key header, subdomain, or URL path) and injects it into the request context
- All querysets automatically filtered by tenant — no content leaks between organisations

This is the most significant piece of work. Every query that touches content needs to be tenant-aware.
### 2. API access layer
White-label clients need a clean, documented API to pull content into their own apps. The good news is the API already exists — 50+ endpoints that the React frontend calls. The work is:
**API key authentication:**
- New auth method alongside the existing token auth
- API key passed via `X-API-Key` header
- Scoped to a tenant — all responses filtered to that tenant's content
- Rate-limited (to protect against abuse and manage costs)
**Public-facing API subset:**
These are the endpoints a white-label client's frontend would call:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/practices` | List available programmes |
| `GET /api/v1/practices/{name}` | Get programme structure (weeks/days/items) |
| `GET /api/v1/practices/{name}/assemble-day` | Assemble and get audio for a day's session |
| `GET /api/v1/meditations/{name}/meta` | Get meditation metadata |
| `GET /api/v1/meditations/{name}/stages/{id}/script` | Get stage script (for display) |
| `POST /api/v1/meditations/{name}/stages/{id}/assemble` | Assemble stage audio |
| `GET /audio/*` | Audio file URLs (already public via Supabase) |
| `GET /api/v1/tenant/branding` | Get branding config (logo, colours) |
| `POST /api/v1/sessions` | Record a completed session |
| `GET /api/v1/sessions` | Get user's session history |
**Versioned API:**
- Prefix public API with `/api/v1/` so breaking changes don't affect existing integrations
- Internal frontend continues using the existing `/api/` endpoints

**End-user authentication:**
- White-label clients manage their own users
- They pass a user identifier (e.g. JWT or opaque token) that we validate against their system
- Or: we provide a lightweight user-per-tenant system so they can create end-user accounts via API
### 3. Embeddable player
The current player is a full React page. White-label clients need something they can drop into their own app.
**Option A: iframe embed**
- A standalone `/embed/play/{practice_name}` route that renders just the player
- Accepts branding params (or reads from tenant config)
- Client embeds via `<iframe src="https://platform.com/embed/play/...">`
- Simplest to build, works everywhere, fully controlled by us
- Drawback: limited integration with their app's UI
**Option B: JavaScript SDK**
- A lightweight JS bundle (`<script src="https://platform.com/sdk.js">`)
- Exposes `MeditationPlayer.init({ container, apiKey, practice, theme })`
- Renders into a DOM element in their app
- More work but much better UX integration
- Can be styled to match their branding
**Option C: API-only (headless)**
- No player provided — they build their own
- They call the API to get audio URLs and metadata
- They handle playback, progress tracking, session recording
- Most flexible, least work for us, but more work for them
- Suitable for native mobile apps
Recommend starting with **Option A** (fast to ship, validates the model) with a path to **Option C** for clients building native apps. Option B is a later investment.
### 4. Branding and theming
**Tenant branding config (stored in Tenant model):**
```json
{
  "appName": "Resilient Minds",
  "logoUrl": "https://...",
  "primaryColour": "#1a3b5c",
  "accentColour": "#4fa3d1",
  "fontFamily": "Inter",
  "playerBackground": "#0d1117"
}
```
**Applied via:**
- CSS custom properties injected at runtime (for iframe/SDK player)
- Returned from `/api/v1/tenant/branding` (for headless clients)
- The internal editor doesn't need branding — that's always the platform UI
### 5. Storage isolation
Currently all audio lives in flat Supabase Storage paths like:
```
meditations/{name}/components/{seg_id}.mp3
```
Needs to become:
```
tenants/{tenant_id}/meditations/{name}/components/{seg_id}.mp3
```

This requires:
- Updating the storage helper functions to prefix with tenant ID
- A one-time migration of existing files
- Updating all URL generation to include the tenant prefix
### 6. Usage tracking and billing hooks
To support per-seat or usage-based pricing:
**Track per tenant:**
- Active users (unique users who played content in a billing period)
- API calls (for rate limiting and overage billing)
- Storage used (total audio stored)
- Assembly minutes (compute cost proxy — how much audio was generated)
- TTS characters (ElevenLabs costs are per-character, this is the biggest variable cost)
**New model: `UsageRecord`**
- `tenant_id`, `metric` (enum), `value`, `recorded_at`
- Aggregated monthly for billing

This doesn't need to be built day one, but the tenant scoping makes it possible.
## Resilient Minds integration — what it looks like
1. We create a Resilient Minds tenant with their branding
2. Their content creators log into the platform and build programmes (fire service programme, police programme, etc.) — this uses the existing editor, no changes needed
3. Their app calls our API with their API key to list available programmes
4. Their app either embeds our player (iframe) or builds their own player using our audio URLs
5. End users in their app play content, sessions are recorded back to our platform
6. We can report on usage (who's completing what, how often) via the API
## Rough build order
| Phase | Work | Estimate |
|-------|------|----------|
| **Phase 1** | Tenant model, tenant middleware, scope all queries | Medium-large |
| **Phase 2** | API key auth, versioned public API subset | Medium |
| **Phase 3** | Storage path migration (add tenant prefix) | Small-medium |
| **Phase 4** | iframe embeddable player | Small |
| **Phase 5** | Branding/theming system | Small |
| **Phase 6** | Usage tracking | Small |
| **Phase 7** | Headless API + docs for native app builders | Medium |

Phases 1-4 are the minimum for a working white-label integration. Phases 5-7 are enhancements.
## Cost considerations
**Variable costs that scale with white-label usage:**
- **ElevenLabs TTS** — per-character pricing. This is the biggest cost. Each new speech segment generated costs money. Cached/reused segments are free.
- **Supabase Storage** — per-GB. Audio files add up but storage is cheap.
- **Supabase Database** — connection limits and row counts. Fine at small scale.
- **Render compute** — the assembly pipeline (PyDub) uses CPU. Heavy assembly runs could need a bigger instance.
- **Claude API** — if AI script generation is exposed to white-label clients.
**Fixed costs:**
- Render hosting (currently whatever the plan is)
- Supabase project (currently whatever the plan is)

For a POC with under 100 users, costs should be minimal. The main cost driver is TTS generation — once content is generated and cached, serving it is nearly free.
## What doesn't need to change
- The editor and builder UI — white-label clients use the same editor as everyone else to create content. No need to white-label the authoring tools.
- The audio pipeline — generation, caching, assembly all work the same. Just scoped to a tenant.
- The RBAC system — roles work within a tenant. Admin/editor/builder/viewer still make sense per-organisation.
- AI features — script generation, chat assistant. Same tools, scoped to tenant content.
