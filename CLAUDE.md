# MeditationApp

## Dev servers
- Backend (Django): http://localhost:5555
- Frontend (React): http://localhost:3000

## Frontend visual verification

When making any HTML/CSS/JS changes, follow this workflow:

1. **Batch edits** — group related changes before verifying visually.
2. **Navigate & screenshot** — after edits, use the Playwright MCP to navigate to the relevant page on `localhost:3000`, take a screenshot, and inspect the rendered result.
3. **Compare against intent** — check spacing, alignment, overlap, hierarchy, and overall polish. If anything is off, fix it and re-screenshot before reporting done.
4. **Check console** — after each screenshot, run `browser_console_messages` at error level. Fix any errors before moving on.
5. **Iterate** — repeat screenshot-fix cycles until the result matches the intended design. Do not tell the user you're done until the visual output is confirmed correct.

### Playwright MCP tools reference
- `mcp__playwright__browser_navigate` — go to a URL
- `mcp__playwright__browser_take_screenshot` — capture visual screenshot (for seeing the page)
- `mcp__playwright__browser_snapshot` — accessibility tree snapshot (for interacting with elements)
- `mcp__playwright__browser_console_messages` — check for JS errors/warnings
