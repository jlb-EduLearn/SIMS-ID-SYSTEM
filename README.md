# School ID Management & Printing System

Multi-tenant web application for managing student IDs across 50+ schools.

## Workflow

**Select School → Select School Year → Manage Students → Design Template → Print**

## Setup

```bash
npm install
npm run db:setup   # create DB + seed demo data
npm run dev        # http://localhost:3000
```

**Demo:** `admin@demo.org` / `password123`

## Key Features

### School & school year isolation
- Each school has **separate templates** and **separate student records per school year** (e.g. 2025-2026 vs 2024-2025)
- Switch school or year from the sidebar without mixing data

### Student categories
| Category | Grades |
|----------|--------|
| Pre-Kinder | Pre-Kinder |
| Kinder | Kinder |
| Grade School | Grade 1–6 |
| Junior High | Grade 7–10 |
| Senior High | Grade 11–12 |
| Tertiary | Free-form year level + course name |

### Template editor
- **Portrait** or **Landscape** orientation
- Drag-and-drop elements, front/back designs
- Templates belong to **one school only**

### Students UI
- Photo avatar on the left, ID number, name, category, and grade
- Filter by category, grade, section
- CSV import with category support

## Stack

Next.js 15 · Prisma · SQLite · NextAuth · Tailwind · react-rnd
