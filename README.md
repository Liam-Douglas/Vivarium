# Vivarium

A collaborative collection management app for reptile keepers and breeders. Track feeding schedules, health events, breeding records, feeder inventory, and expenses — all in one place, shared across your household.

---

## Features

### Animal Management
- Add animals with photo, species, morph, sex, date of birth, and feeding schedule
- Colour-coded feeding status indicators (on schedule / due soon / overdue)
- Full lifecycle tracking: acquisition → care → breeding → exit
- Free tier supports up to 5 animals; Pro tier is unlimited

### Per-Animal Record Keeping
Each animal has a dedicated hub with tabs for:
- **Feeding logs** — prey type, size, quantity, refusals
- **Weight tracking** — logged measurements with a line chart showing growth trends
- **Shedding events** — complete or incomplete, with dates and notes
- **Health events** — observations, vet visits, and treatments with optional cost tracking
- **Acquisition records** — source, price paid, and date acquired
- **Breeding records** — pairings, clutch size, egg fertility, hatch dates, and outcomes
- **Exit records** — reason for leaving the collection (sale, rehoming, death) with optional sale price

### Feeder Inventory
- Track stock levels for insects, rodents, and other feeders
- Visual stock gauge with low-stock threshold alerts (green / amber / red)
- 20+ built-in presets (Dubia roaches, crickets, pinky mice, rats, etc.)
- Log purchases with quantity, unit cost, and notes
- Auto-generates a shopping list of items below threshold
- Stock automatically decremented when feedings are logged

### Expenses
- Monthly expense tracking across 6 categories: Feeder stock, Veterinary, Enclosure, Acquisition, Supplies, and Misc
- Month-by-month navigation with category breakdowns
- Link individual expenses to specific animals
- Costs tracked in AUD

### Bulk Import
- Import animals, feeding logs, and shedding records from `.csv` or `.xlsx` files
- 4-step wizard: Upload → Map → Preview → Import
- Downloadable template with example data
- Intelligently links feeding/shedding logs to animals by name
- Supports multiple date formats (ISO, DD/MM/YYYY, MM/DD/YYYY)

### Household & Collaboration
- Share a collection with multiple people via invite code
- Owner and Member roles with permission controls
- Owners can promote members, remove members, and manage join requests
- Activity feed on the dashboard shows recent actions across the whole household

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Spreadsheets | SheetJS (xlsx) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| PWA | vite-plugin-pwa |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

```bash
git clone https://github.com/liam-douglas/vivarium.git
cd vivarium
npm install
```

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## Deployment

The app is deployed on [Vercel](https://vercel.com). Connect your repository, set the environment variables, and Vercel handles the rest.
