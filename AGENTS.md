# AGENTS.md

## Overview

This repository supports a multi-environment development workflow across the following environments:

### Environment 1: Gemini 2.5 Pro Canvas
- Used for prototyping with AI.
- Limited to a single-page app.
- Cannot use external libraries directly but **can reference public files** (e.g. JSON) hosted via Environment 3.
- Code can reference `.json`, `.md`, and static assets deployed via the public Cloudflare Pages instance.

### Environment 2: Dev Server
- A full React app created with `create-cloudflare`.
- Local development via `npm run dev`.
- Git-tracked and used for all version control.
- Includes custom setup for React + Cloudflare Pages (see "Deploy" section below).

### Environment 3: Production (Cloudflare Pages)
- Deployed at: `https://hoursappcf.pages.dev/`
- Hosts static files like `ndisrates2025.json` for public access.
- Used as the source for external references in Gemini Canvas (Environment 1).
- Deployed from Environment 2 using `npm run deploy`.

---

## File Structure Guidelines

- All prototyping logic (Canvas or experimental workflows) should stay isolated or commented clearly.
- Any files meant for public access (JSON, CSV, docs) must be added to the appropriate `/public` folder and deployed via Environment 3.
- Internal scripts or handlers must be designed assuming SPA constraints unless noted.
