# MultiElectric Supply - Admin Dashboard

A modern e-commerce admin dashboard for MultiElectric Supply, an electrical supplies company. Built with Next.js 16, featuring a dark mode UI with Britannic Bold typography.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: MongoDB (Mongoose)
- **Payments**: Stripe
- **Image Storage**: AWS S3 + CloudFront (with lazy loading)
- **Hosting**: Vercel

## Features

- **Dashboard**: Overview of key metrics, recent orders, and quick stats
- **Clients Management**: CRUD operations for customer data
- **Products Management**: Product catalog with image uploads, inventory tracking
- **Orders Management**: Order tracking, status updates, payment status
- **Ledger**: Financial tracking for income, expenses, refunds, and adjustments
- **Settings**: Business info, tax settings, payment config, integrations

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Stripe account
- AWS account (for S3 + CloudFront)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/multi-electric-supply.git
cd multi-electric-supply
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment example file:
```bash
cp env.example .env.local
```

4. Update `.env.local` with your credentials:
```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# NextAuth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# AWS S3 + CloudFront
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=multielectric-products
CLOUDFRONT_DOMAIN=...cloudfront.net
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── admin/           # Admin dashboard pages
│   │   ├── clients/     # Client management
│   │   ├── products/    # Product management
│   │   ├── orders/      # Order management
│   │   ├── ledger/      # Financial ledger
│   │   └── settings/    # Settings
│   └── api/             # API routes
├── components/
│   ├── admin/           # Admin-specific components
│   └── ui/              # shadcn/ui components
├── lib/                 # Utilities (MongoDB, Stripe, S3)
└── models/              # Mongoose models
```

## Branches

- `main` - Production-ready code
- `dev` - Development branch

## Deployment

This project is configured for Vercel deployment:

```bash
npm run build
```

## License

Private - MultiElectric Supply
