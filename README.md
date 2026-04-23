<div align="center">

# Vivarium

**The collection management app built for serious reptile keepers.**

Vivarium is a mobile-first PWA that gives reptile hobbyists and breeders one place to manage their entire collection — feeding schedules, health records, shedding events, weight tracking, feeder inventory, and expenses — all shared in real time across a household.

</div>

---

## What is Vivarium?

Keeping reptiles well means staying on top of a lot of moving parts. Feeding windows, weight trends, shed cycles, vet visits, clutch records — and when you're managing a collection of 10, 20, or 50+ animals, spreadsheets and memory don't cut it.

Vivarium was built to solve that. It's designed around the way keepers actually work: quick daily log entries from your phone, at-a-glance feeding status across the whole collection, and a full history for every animal. Share it with a partner or family member and everyone stays in sync automatically.

---

## Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/dashboard.png" width="220"/><br/><sub>Dashboard</sub></td>
    <td align="center"><img src="docs/screenshots/animals.png" width="220"/><br/><sub>Animal collection</sub></td>
    <td align="center"><img src="docs/screenshots/animal-detail.png" width="220"/><br/><sub>Animal profile</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/feeding.png" width="220"/><br/><sub>Feeding log</sub></td>
    <td align="center"><img src="docs/screenshots/feeders.png" width="220"/><br/><sub>Feeder inventory</sub></td>
    <td align="center"><img src="docs/screenshots/expenses.png" width="220"/><br/><sub>Expenses</sub></td>
  </tr>
</table>

---

## Features

### Dashboard
The home screen gives you an immediate read on your collection. See how many animals have been fed this week, how many are overdue, and scroll through your animals sorted by feeding urgency. Recent activity from everyone in the household shows up in a live feed below. A floating action button gives you quick access to log a feeding, shed, weight entry, or expense without leaving the screen.

### Animal Profiles
Every animal gets its own profile with photo, species, morph, sex, date of birth, and feeding schedule. A colour-coded status indicator shows whether each animal is on schedule (green), due soon (amber), or overdue (red) at a glance.

Each profile has dedicated tabs for the full history of that animal:

| Tab | What's tracked |
|---|---|
| **Feeding** | Prey type, size, quantity, refusals, date |
| **Weight** | Logged measurements with a growth chart |
| **Shedding** | Complete or incomplete events with dates |
| **Health** | Observations, vet visits, treatments, costs |
| **Acquisition** | Source, price paid, acquisition date |
| **Breeding** | Pairings, clutch size, egg fertility, hatch dates, outcomes |
| **Exit** | Sale, rehoming, or death records with optional sale price |

All records can be edited or deleted.

### Feeder Inventory
Track live and frozen feeder stock across 20+ built-in presets — Dubia roaches, crickets, pinky mice, adult rats, and more. Each item has a configurable low-stock threshold. When stock drops below it, the item turns amber or red and automatically appears on a generated shopping list. Stock is decremented automatically when feedings are logged.

### Expenses
Monthly expense tracking across six categories: Feeder stock, Veterinary, Enclosure, Acquisition, Supplies, and Misc. Navigate month-by-month, see a category breakdown with proportional bars, and link individual expenses to a specific animal. All amounts are tracked in AUD.

### Bulk Import
Migrate an existing collection in minutes. Upload a `.csv` or `.xlsx` file through a 4-step wizard — Upload → Map → Preview → Import. A downloadable template shows the expected format. Feeding and shedding logs are automatically linked to animals by name. Supports ISO, DD/MM/YYYY, and MM/DD/YYYY date formats.

### Household & Collaboration
Create a shared collection and invite household members via a unique invite code. Owners and members each have their own login. Owners can approve join requests, promote or remove members, and see who logged what in the activity feed. All data syncs in real time.

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Charts | Recharts |
| Spreadsheets | SheetJS |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| PWA | vite-plugin-pwa |
| Build | Vite |
