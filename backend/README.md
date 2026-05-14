# LifeLink Backend Setup

## Requirements
- Node.js v18+
- MySQL (XAMPP recommended)
- Create a database named `lifelink` in phpMyAdmin

## Setup Steps
1. Copy `.env.example` to `.env` and fill in your values
2. Run: `npm install`
3. Run: `npx prisma migrate dev`
4. Run: `node prisma/seed.js`
5. Run: `npm run dev`

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lifelink.com | admin123 |
| Donor | donor@test.com | admin123 |
| Recipient | recipient@test.com | admin123 |

## API runs on http://localhost:5001
