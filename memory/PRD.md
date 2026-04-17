# Plannr — Smart Schedule Planner

## Problem Statement
Smart schedule planner web app. Onboarding picks profile type: **Student**, **Freelancer**, or **Content Creator**. Dashboard and features customize by profile.

- **Student**: Study session planner, exam countdown, subject-wise task tracker, revision reminders
- **Freelancer**: Deadline tracker, client-wise task management, work hour logger, payment due reminders
- **Content Creator**: Content calendar, platform-wise posting schedule, idea bank, upload reminders

Common: daily/weekly view, recurring tasks, in-app reminders (toasts + browser Notification API), clean UI, dark mode, smooth onboarding. No payments. Free.

## User Choices (confirmed)
- Auth: **Emergent-managed Google Auth + MongoDB** (no user-provided Firebase keys required)
- Reminders: in-app toasts + browser Notification API (no FCM)
- Profile type switchable from Settings (yes)
- Design: productivity-focused (Notion/Linear) + modern minimalist; theme default: **system**

## Architecture
- Backend: FastAPI + MongoDB via motor
- Frontend: React 19 + Tailwind + shadcn/ui + next-themes + sonner + react-router-dom
- Auth: Emergent OAuth (session_id → /auth/session) stored as httpOnly cookie + also accepted as Bearer header
- State: React context (AuthContext), per-page local state, axios client with withCredentials

### MongoDB Collections
`users`, `user_sessions`, `tasks`, `subjects`, `exams`, `clients`, `time_logs`, `payments`, `ideas`  
All documents use custom UUID ids (`user_id`, `task_id`, …). `_id` always excluded from responses.

## What's Implemented (2026-02 initial build)
- Landing page with 3-profile preview and CTA
- Google auth flow: landing → auth.emergentagent.com → `/#session_id=…` → AuthCallback → `/onboarding` or `/dashboard`
- Onboarding profile selection (Student/Freelancer/Creator) with animated selection card
- Role-based AppShell sidebar with theme dropdown (Light / Dark / System) and logout
- Dashboard: greeting, stats grid, today & upcoming tasks, role-specific widget column
- Tasks page: list grouped by date, tabs (All / Pending / Done), search, full-featured TaskDialog (date, time, duration, priority, recurring, category, subject/client/platform)
- Calendar: Day & Week toggle, nav, quick-add per day
- Student: Subjects (CRUD, colors), Exams (with countdown)
- Freelancer: Clients (CRUD), Time tracker (live timer + manual entry + history), Payments (pending/received, overdue flag)
- Creator: Content schedule (platform filter tabs), Idea bank (status cycle)
- Settings: name, profile switch, theme
- Full dark mode, Manrope + IBM Plex Sans + JetBrains Mono typography
- All interactive elements have `data-testid`

### Iteration 2 (2026-02)
- **Student / Exams**: exams now support **multiple subjects** (checkbox multi-select); exam cards render all linked subject pills with colors. Backend: `Exam.subject_ids: List[str]`.
- **Student / Tasks**: TaskDialog adds optional **"Link to exam"** selector when profile is student. Backend: `Task.exam_id`.
- **Creator / Platforms**: fully user-managed. New `/api/platforms` CRUD. A "Platforms" button opens a manage-dialog where users can add custom platforms (name + color), use quick-add suggestion chips, and remove platforms. Content schedule tabs and Task/Idea platform dropdowns are now dynamic. Empty state prompts the user to add their first platform.

## Backlog
- P1: Browser push notifications hook (Notification API) + reminder scheduler for upcoming exams/deadlines/uploads
- P1: Recurring task materialization (currently stored as metadata, not auto-expanded)
- P2: Kanban view for freelancer tasks per client
- P2: Content calendar visual view (month grid per platform)
- P2: Weekly summary email / shareable plan
- P2: Export tasks (.ics / .csv)

## Test Credentials
Emergent Google Auth — no passwords. Seed session via mongosh per `/app/auth_testing.md`.
