# GRIND — Workout Tracker

A mobile-first workout tracker built with **Next.js 16**, **Prisma**, **PostgreSQL**, and **NextAuth.js**. Configure your weekly split, log sets with drop-set support, and review session history — all behind per-user authentication.

## Tech Stack

| Layer          | Technology                            |
|----------------|---------------------------------------|
| Framework      | Next.js 16 (App Router, Turbopack)    |
| Auth           | NextAuth.js (JWT + Credentials)       |
| Database       | PostgreSQL                            |
| ORM            | Prisma 6                              |
| Styling        | Inline styles (dark theme, no CSS framework) |
| Fonts          | Syne (headings), JetBrains Mono (data)|
| Language       | TypeScript                            |

## Features

- **Auth** — Email/password signup & login with bcrypt hashing
- **Workout tab** — Shows today's muscle groups based on your weekly schedule; tap into a group to log sets
- **Set logging** — Stepper controls for weight (kg) & reps, mark sets done, undo
- **Drop sets** — Add a drop set after any completed set (auto-decrements weight)
- **Config tab** — Create muscle groups, add exercises with target sets, assign groups to days of the week
- **History tab** — Browse past sessions with expandable exercise detail and total volume
- **Per-user data** — Each user has their own config and session history stored in PostgreSQL

## Project Structure

```
grind-app/
├── app/
│   ├── page.tsx                         # Login / Signup page
│   ├── layout.tsx                       # Root layout (Google Fonts, SessionProvider)
│   ├── globals.css                      # Minimal CSS reset
│   ├── providers.tsx                    # NextAuth SessionProvider (client component)
│   ├── workout/
│   │   └── page.tsx                     # Main workout tracker (Workout, Config, History tabs)
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts   # NextAuth handler (Credentials provider)
│       │   └── signup/route.ts          # POST /api/auth/signup
│       ├── config/route.ts              # GET/POST /api/config
│       └── sessions/route.ts            # GET/POST /api/sessions
├── lib/
│   └── prisma.ts                        # Prisma client singleton
├── prisma/
│   ├── schema.prisma                    # Database schema (User, UserConfig, WorkoutSession)
│   └── migrations/                      # Auto-generated migration files
├── types/
│   └── next-auth.d.ts                   # NextAuth type augmentations
├── .env                                 # Environment variables (used by Prisma CLI)
├── .env.local                           # Environment variables (used by Next.js at runtime)
└── tsconfig.json
```

## Database Schema

```
User
  id        Int      @id @autoincrement
  email     String   @unique
  password  String   (bcrypt hash)
  name      String?
  createdAt DateTime

UserConfig
  id        Int      @id @autoincrement
  userId    Int      @unique → User
  config    Json     (weekPlan, groups, exercises)
  updatedAt DateTime

WorkoutSession
  id          Int      @id @autoincrement
  userId      Int      → User
  sessionData Json     (date, groupName, exercises[], totalVol)
  createdAt   DateTime
```

## API Routes

| Method | Endpoint               | Auth | Description                              |
|--------|------------------------|------|------------------------------------------|
| POST   | `/api/auth/signup`     | No   | Create account (email, password, name?)  |
| *      | `/api/auth/[...nextauth]` | —  | NextAuth sign-in/sign-out/session        |
| GET    | `/api/config`          | Yes  | Fetch user's workout config              |
| POST   | `/api/config`          | Yes  | Save/update workout config (upsert)      |
| GET    | `/api/sessions`        | Yes  | Fetch all workout sessions               |
| POST   | `/api/sessions`        | Yes  | Save a completed workout session         |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    Edit .env and .env.local with your DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Run database migration
npx prisma migrate dev --name init

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

### Environment Variables

| Variable         | Description                              | Example                                          |
|------------------|------------------------------------------|--------------------------------------------------|
| `DATABASE_URL`   | PostgreSQL connection string             | `postgresql://user:pass@localhost:5432/grind`     |
| `NEXTAUTH_SECRET`| Secret for JWT signing                   | Run `openssl rand -base64 32` to generate        |
| `NEXTAUTH_URL`   | App URL                                  | `http://localhost:3000`                           |
