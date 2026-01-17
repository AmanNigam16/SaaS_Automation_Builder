# SaaS_Automation_Builder
A SaaS automation builder that lets users visually create, connect, and publish workflows using a React Flow–based canvas with integrations like Google, Slack, Notion, Discord, and Stripe-powered billing.

# Fuzzie

A Zapier-like SaaS automation builder that allows users to visually create, connect, and publish workflows using a React Flow–based canvas, with integrations such as Google, Slack, Notion, Discord, and Stripe-powered billing.

## Tech Stack
- Next.js 14 (App Router)
- React Flow
- Prisma + PostgreSQL (Neon)
- Clerk Authentication
- Stripe Billing
- Tailwind CSS

## Getting Started

### Prerequisites
- Node.js (v18 or above)
- npm

### Installation & Run

```bash
# Install dependencies
npm install --legacy-peer-deps

# Generate Prisma client
npx prisma generate

# Sync database schema
npx prisma db push

# Run the development server
npm run dev
```
The application will be available at:
http://localhost:3000
