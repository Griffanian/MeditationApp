# Users & Permissions

## Roles
There are four roles, in order of privilege:

| Role | Description |
|------|-------------|
| **Admin** | Full access. Manage users, roles, all content, Django admin. |
| **Editor** | Edit all content (any owner's). No user management, no Django admin. |
| **Builder** | Create and manage own content. View and clone public content. Share own content with viewers. Invite viewers. |
| **Viewer** | View public content and content explicitly shared with them. No editing. |

## How Access Works
There is no public signup. All accounts are created via invite links.

### Invite Flow
1. **Admin** creates a **builder** invite link (User Management page)
2. Admin sends the link to the builder
3. Builder signs up via the link, sets their username and password
4. **Builder** creates **viewer** invite links (Account Settings page)
5. Builder sends the link to the viewer
6. Viewer signs up via the link

### Content Sharing
Builders control what their viewers see at three levels:

| Level | Effect |
|-------|--------|
| **Group** | Share a whole group — viewer sees all categories and exercises in it |
| **Category** | Share a category — viewer sees all exercises in it |
| **Exercise** | Share a single exercise |

Sharing is done via the three-dot menu on groups, categories, and exercises (in the "My Exercises" view). Click "Viewers" to toggle which viewers have access.

Programmes have their own sharing — three-dot menu on each programme card.

### Public Content
- All pre-existing content is public by default
- New content created by admins/editors defaults to public
- New content created by builders defaults to private
- Builders can choose per-viewer whether they can see public content (Account Settings > My Viewers > "See public" checkbox)

## User Management (Admin)
Accessible via the "Users" link in the nav bar.

### Users Table
- Organised by role: admins, editors, builders (with their viewers indented below), unlinked viewers
- Change any user's role via the dropdown
- Deactivating a builder also deactivates all their viewers
- Deactivated users can be reactivated
- Filter between Active / Inactive / All

### Invite Links
- Create builder or viewer invites with a name
- Copy the signup link to send to the person
- Revoke unused invites
- Once accepted, the invite disappears — the user appears in the Users table

## Account Settings (All Users)
Accessible via "Account Settings" in the top right.

### Profile
- Change display name and username
- Change password (requires current password)

### My Viewers (Builders Only)
- See all linked viewers
- Toggle "See public" per viewer
- Add viewers by username
- Remove viewers

### Invite Links (Builders Only)
- Create viewer invites
- Copy signup links
- Revoke unused invites

## Data Model

| Model | Purpose |
|-------|---------|
| **UserProfile** | One-to-one with Django User. Stores role and display name. |
| **InviteLink** | Token-based invite with name, role, expiry. Single-use. |
| **ViewerAccess** | Links a viewer to a builder. Has `show_public` toggle. |
| **shared_with** | On Meditation, Practice, Group, Category. Links content to specific viewers who can see it. |
