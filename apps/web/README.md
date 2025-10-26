# Autorepost Web Console

Foundational Next.js 15 dashboard for the multi-tenant TikTok → multi-platform automation system.

## Local development

```bash
npm run dev -- --filter=@autorepost/web --parallel
```

By default the app expects the API gateway on `http://localhost:4000`. Override via:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

## Tech stack

- Next.js 15 (App Router) + React 18  
- Tailwind CSS + shadcn-style component primitives (buttons, cards, popovers, etc.)  
- Theme switching via `next-themes`  
- TypeScript with shared utilities from the monorepo

## Directory structure

```
apps/web
├── app
│   ├── (console)       # Dashboard routes with shared AppShell layout
│   └── globals.css     # Tailwind tokens & CSS variables
├── components          # Layout primitives, UI controls, shared widgets
├── lib                 # Helpers and configuration
├── public              # (reserved for static assets)
└── tailwind.config.ts  # Tailwind + design tokens
```

## Next steps

- Wire navigation pages (`/connections`, `/rules`, etc.) to real API endpoints as they land.  
- Integrate authentication (NextAuth or custom JWT) once the backend exposes session APIs.  
- Build reusable data grids (TanStack Table) for tenants, users, and job monitoring.  
- Add real-time activity streaming via WebSockets when the worker publishes job updates.  
- Extend UI kit with modals, forms, and skeleton states for the auto-post rule builder.
