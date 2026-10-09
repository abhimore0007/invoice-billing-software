# Ruby — Invoice & Billing

A responsive React + Tailwind CSS application with an Express API, PostgreSQL/Prisma, JWT authentication and client-side A4 PDF generation using jsPDF + AutoTable.

## Quick preview

### Install dependencies on another Windows PC

After cloning or downloading this repository, open PowerShell in the project folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-dependencies.ps1
```

The installer installs Node.js LTS if Node.js 22.13+ is missing, runs `npm ci` to install the project's locked dependencies and generate the Prisma client, and installs Docker Desktop if Docker is missing. Internet access and Windows Package Manager (`winget`, provided by Microsoft's App Installer) are required for software downloads. Accept any Windows administrator prompts. Docker Desktop may require first-run WSL setup or a restart.

For demo use without Docker, run the same command with `-DemoOnly`. This file installs dependencies only; follow the database setup section below to configure a connected workspace. Existing database data is not transferred by downloading the repository.

Prerequisite: Node.js 22.13+.

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. The initial screen is an explicitly labeled demo workspace. Demo data and changes are stored only in this browser's local storage. The login page separates **Demo workspace — this browser** from **Connected workspace — database**. Demo login does not grant database access.

### Add a user and log in

1. Open **Users → Add user**, enter a unique username and a password of at least 8 characters, choose Admin or Staff, and leave access enabled.
2. Save, then **Logout**.
3. Select the same workspace where you created the user and log in with their username and password. You will see that user's name and role on the dashboard. Staff cannot access user management.
4. For an administrator login in the demo, edit the existing `admin` user and set a password, or add a new user with the Admin role.

Demo passwords are stored as salted bcrypt hashes. Demo accounts created before this fix did not have saved passwords: use **Explore the demo workspace → Users → Edit**, enter a new password, and save once. Passwords cannot be recovered from the old records. These accounts work only in the same browser profile. Demo mode remains an openly accessible preview, not a security boundary; use the connected workspace for real access control and shared accounts.

## Connect PostgreSQL and use real accounts

1. If `.env` does not exist, copy `.env.example` to `.env`. If it already exists, add the missing settings without replacing the existing JWT secret.
2. Run `node server/configure-secret.js` to generate a secure JWT secret if one is missing. Choose a strong `SEED_ADMIN_PASSWORD` and set `DATABASE_URL` to your PostgreSQL connection.
3. Start the included local database, or use your existing PostgreSQL server:

```sh
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

4. Open http://localhost:5173, click **Sign in to your workspace**, select **Connected workspace — database**, and log in with username `admin` and your `SEED_ADMIN_PASSWORD`.

The seed creates the administrator only; production documents and clients start empty. Re-running the seed does not reset existing passwords. The database's Docker credentials are for local development; replace them for deployments.

## Production

```sh
npm run build
npm start
```

Express serves the built SPA and API on **http://localhost:3001**. Set `PORT` to override. Supply the environment variables to the running server and use HTTPS at your reverse proxy. For managed deployments, create and commit Prisma migrations using `npx prisma migrate dev --name init` and apply with `npx prisma migrate deploy` instead of `db:push`.

## Features

- Login with show/hide password, remember me, request throttling, bcrypt password hashes and expiring JWTs. Current user access is rechecked in the database on every API request.
- Responsive sidebar, search, account menu, payment reminders and dashboard with real-data metrics and a configurable revenue chart.
- Invoice, Proforma, Quotes and Delivery Challan editors, searchable client picker, inline client creation, item rows and automatic tax/discount calculations.
- Client management from the dashboard's **Total clients** card: add, edit, delete, search. Clients linked to documents cannot be deleted.
- History with search, type/client/date/status filters and pagination; preview, edit, download, delete and duplicate actions.
- Admin-only user management with role and access controls. Staff can manage billing and clients. Accounts cannot delete, disable or demote themselves.
- Browser-generated, bordered table-format A4 PDFs with automatic multi-page item tables, GST breakdown, amount in Indian words, signature area and page footer. Delivery Challans omit prices and totals.
- Browser and API validation, deletion confirmation, loading states and toast feedback.

## Reference screenshot and design decisions

The supplied image is a low-resolution **invoice form**, not a sample PDF. The editor uses its visible fields: quotation/proforma reference, document number, company details, state, GSTIN, date, challan number, PO number/date, vendor code, transport reference, Particular/HSN/Quantity/Rate/Amount item table, document discount, taxable amount, CGST/SGST/IGST, payable amount, rounding and terms. The same form is reused for the other document types. Delivery Challans omit the financial fields.

The screenshot-specific field restriction was prioritized over the conflicting generic list: no extra due-date, notes or per-item discount/tax fields were added. The schema supports a future due date. New live documents begin Pending; change status from the document preview without adding fields to the billing form.

### Client reference PDF

The PDF template follows **Invoice_RHC-26-27-602_v6.pdf**: the extracted RHC/Ruby logo, burgundy page strips, Helvetica typography, invoice metadata, side-by-side gray billing panels, dark table headers, pale-red payable total, amount in words, bank details, terms, signature block, and contact footer. DejaVu fonts provide fallback for non-ASCII text. Company/GST/bank details in `src/pdf.js` are transcribed from the reference. Client data, invoice numbers, dates, items, taxes, amounts, and terms remain dynamic. Multi-page documents repeat table headings and reserve space for the footer. Long client names and addresses expand the billing panels.

The in-app preview renders the actual generated PDF, so it shares the downloaded document's layout. The contact footer aligns with the table margins on every page, with page numbering for multi-page documents. The signature appears only on the final page, after all invoice content. Files in `public/branding/` are required for PDF generation; the DejaVu font license is included. The signature text reproduces the reference's appearance; it is **not a cryptographic digital signature**. The generation process does not attach or validate signing certificates.

To regenerate reference assets if needed:

```sh
node scripts/extract-v6-logo.mjs "E:\Invoice_RHC-26-27-602_v6.pdf"
```

Revenue is the sum of Paid invoices, dated by invoice date. Pending payments include Pending and Overdue invoices. No payment-gateway integration or automatic collection is included. PDFs embed DejaVu fonts; scripts outside that font's coverage need additional fonts. Client details currently reflect the current client record, not an immutable historical snapshot.

## Structure

```text
src/
  main.jsx          Application screens and reusable UI
  styles.css        Tailwind integration and responsive visual design
  demo.js           Browser-local demo fixtures
  pdf.js            Shared A4 document template
  ReferencePreview.jsx Actual PDF preview
  pdfRenderer.js    Lazy-loaded canvas PDF renderer
  LoginScreen.jsx   Demo/connected login
  demoAuth.js       Browser-local demo credential handling
public/branding/    Reference artwork and licensed fonts
server/
  index.js          Express routes, JWT auth, authorization and validation
  seed.js           Administrator bootstrap
  configure-secret.js Secure local JWT configuration
shared/
  billing.js        Shared calculation and amount-in-words functions
prisma/schema.prisma Database models: User, Client, Document
tests/billing.test.js Core financial calculation tests
docker-compose.yml  Local PostgreSQL
.env.example        Environment variable template
```

## API

`POST /api/login` accepts `username`, `password`, and `remember`. All other data routes require `Authorization: Bearer <token>`.

| Route | Methods | Access |
| --- | --- | --- |
| `/api/health` | GET | Public database health |
| `/api/me` | GET | Authenticated |
| `/api/clients` | GET, POST | Authenticated |
| `/api/clients/:id` | PUT, DELETE | Authenticated |
| `/api/documents` | GET, POST | Authenticated |
| `/api/documents/:id` | PUT, DELETE | Authenticated |
| `/api/users` | GET, POST | Admin |
| `/api/users/:id` | PUT, DELETE | Admin |

Document numbers are assigned atomically using a PostgreSQL-generated sequence. The server recalculates all document totals rather than trusting browser totals. Each line contains `description`, `hsn`, `qty`, `rate`. Header data contains `type`, `clientId`, `date`, references, tax rates, discount percentage, rounding and terms. Update a document through PUT with its full data to change its supported status (`Pending`, `Paid`, `Draft`, `Overdue`).

## Checks

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npx prisma validate
```

Prisma validation requires `DATABASE_URL` to be set. Database-backed workflows need a running PostgreSQL instance.
