# LifeLink - Blood Donation Management System (BDMS)

Comprehensive documentation for the LifeLink platform, covering technology stack, project architecture, and system workflows.

## 1. Project Overview
LifeLink is a full-stack blood donation management system designed to connect donors and recipients through a streamlined administrative portal.

## 2. Technology Stack
- **Frontend**: Single-Page Application (SPA) using HTML5, Vanilla CSS3, and JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **Database**: MySQL/MariaDB.
- **ORM**: Prisma (for schema management and query building).
- **Auth**: JWT (JSON Web Tokens) with Role-Based Access Control (RBAC).

## 3. Project Architecture
The project is divided into two main layers:

### A. Backend Layer (`/backend`)
- **Controllers**: Logic for Auth, Admin, Donations, and Requests.
- **Routes**: Modular routing for API endpoints.
- **Middleware**: Authentication and authorization (Role-check) logic.
- **Prisma**: Database models and migrations.

### B. Frontend Layer (`/frontend/LifeLink`)
- **`index.html`**: The unified UI container for all portals.
- **`script.js`**: Core frontend engine handling SPA routing and API interaction.
- **`styles.css`**: Design system and animations.

## 4. Key Workflows

### Donation Workflow
1. **Donor** schedules a donation via their dashboard.
2. **Admin** views the scheduled donation in the "Donations" tab.
3. Once the donation is performed, **Admin** marks it as "COMPLETED".
4. The system automatically **increments** the inventory for that specific blood group.

### Request Workflow
1. **Recipient** submits a blood request indicating urgency and blood group.
2. **Admin** views the pending request in the "Requests" tab.
3. **Admin** approves/rejects the request.
4. If approved, the system checks stock and **decrements** the inventory automatically.

## 5. Development Setup

### Backend
1. `cd backend`
2. `npm install`
3. Configure `.env` (Database URL, JWT Secret)
4. `npx prisma migrate dev`
5. `node prisma/seed.js`
6. `npm run dev`

### Frontend
- Serve the `frontend/LifeLink` directory using any static file server (e.g., Live Server, `npx serve .`).

---
*Documented on April 19, 2026*
