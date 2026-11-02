# Inventra – My Modules (Team Project)

Inventra is an AI-powered inventory management system built by a team at a hackathon. This repository contains the modules I built: expiry checking, low-stock detection with email notifications, and the landing page.

- **My repository:** https://github.com/NagaTejaSriCore/Final_inventra_project
- **Team repository:** https://github.com/hasinipabba/Inventra

## 1. Problem Statement

Stores lose money when products expire before they are sold or run out of stock without warning. Checking inventory by hand makes these problems easy to miss.

Inventra monitors stock levels and expiry dates automatically and sends alerts, so store owners can act in time.

## 2. Flowchart

```text
        Scheduled Cron Trigger
                  |
                  v
       Protected Cron Endpoint
                  |
                  v
          PostgreSQL Database
                  |
          +-------+-------+
          |               |
          v               v
    Expiry Checker   Low-Stock Checker
          |               |
          v               v
     Expiry Alerts    Stock Alerts
          |               |
          +-------+-------+
                  |
                  v
            Notifications
                  |
                  v
      Email (Nodemailer / SMTP)
```

## 3. My Contributions

### Expiry Checker
- Checks product batches against their expiry dates.
- Flags expired and soon-to-expire products.
- Creates alerts so stock can be used or removed before it is wasted.

### Low-Stock Detection and Email Notifications
- Compares current stock with each product's minimum stock level.
- Detects low-stock and out-of-stock products.
- Sends automated email notifications through Nodemailer.

### Landing Page
- Built the landing page with React and Tailwind CSS.
- Responsive layout with a Get Started button that leads to the login page.

## 4. Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend |
| TypeScript | Type-safe application code |
| Tailwind CSS | Styling |
| Node.js | Backend and API handling |
| PostgreSQL | Inventory data storage |
| Nodemailer | Email notifications |
| Groq API | AI inventory recommendation feature|

## 5. Run Locally

**Prerequisites:** Node.js, npm, Git, and a PostgreSQL database.

```bash
git clone https://github.com/NagaTejaSriCore/Final_inventra_project.git
cd Final_inventra_project
npm install
```

Create the environment file (see `.env.example` for the exact variable names). It needs:

- the PostgreSQL connection string
- `CRON_SECRET`
- the SMTP settings for Nodemailer
- the Groq API key (only for the team's recommendation feature)

Then start the app:

```bash
npm run dev
```

Never commit real API keys, database credentials, email passwords or cron secrets to GitHub.

## 6. What I Learned

- Writing the checks that compare expiry dates and stock levels against the database.
- Protecting a scheduled endpoint with a secret.
- Sending automated emails and avoiding repeated alerts
- Working in a team using Git and GitHub.
