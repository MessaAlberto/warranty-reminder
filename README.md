# Warranty Vault

Warranty Vault is a private, mobile-first PWA for storing household receipts and tracking product warranties.

The app is designed for a very small private household setup: two authorized Google accounts share one Google Drive archive. A receipt can contain multiple products, each with its own warranty duration and expiration date.

The normal app flow is:

```text
Receipt photo(s)
      ↓
Client-side image preprocessing
      ↓
Google Cloud Vision OCR
      ↓
Groq structured extraction
      ↓
Editable review form
      ↓
Google Drive storage
      ↓
Warranty tracking and automatic cleanup
```

Receipt images are not loaded in the normal Home/Search views. They are fetched only when the user explicitly opens the original receipt.

---

## Features

- Google Sign-In with an exact two-user allowlist
- Shared Google Drive storage
- No traditional database
- One or multiple photos per receipt
- Client-side image resizing/compression before upload
- Google Cloud Vision OCR
- Structured receipt extraction through Groq
- Editable OCR/AI suggestions before saving
- Multiple products on one receipt
- Independent warranty duration for each product
- Default 24-month warranty with editable duration
- Product search and warranty status
- Lazy-loaded private receipt images
- Internal archive/trash with restore support
- Automatic daily warranty cleanup through Vercel Cron
- Installable PWA for iPhone and Android
- Mobile-first UI with iPhone safe-area support

---

## Tech stack

| Area | Technology |
|---|---|
| Frontend | React 19 |
| Full-stack framework | TanStack Start |
| Routing | TanStack Router |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Hosting | Vercel |
| Authentication | Google OAuth / OpenID Connect |
| Persistent storage | Google Drive |
| OCR | Google Cloud Vision |
| Structured extraction | Groq API |
| Default extraction model | `qwen/qwen3.8-27b` |
| Metadata database | None |
| Scheduled cleanup | Vercel Cron |
| Mobile distribution | PWA |

---

## Requirements

For local development:

- **Node.js 22.12.0 or newer**
- **npm 10 or newer**
- Git
- A Google account
- A Google Cloud project
- A Groq account/API key

For the production deployment used by this project:

- Vercel account
- HTTPS deployment URL
- Google OAuth configuration for the production domain

The repository uses npm and includes `package-lock.json`.

Check installed versions with:

```bash
node --version
npm --version
```

---

# Local setup

## 1. Clone the repository

```bash
git clone https://github.com/MessaAlberto/warranty-reminder.git
cd warranty-reminder
```

Install the exact dependency versions from the lock file:

```bash
npm ci
```

---

## 2. Create the local environment file

Copy the example file:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Never commit `.env.local` or real secrets.

The application uses the following variables.

| Variable | Type | Purpose |
|---|---|---|
| `GOOGLE_AUTH_CLIENT_ID` | Config | Google OAuth client ID |
| `GOOGLE_AUTH_CLIENT_SECRET` | Secret | Google OAuth client secret |
| `AUTH_SECRET` | Secret | Encrypts/signs the application session |
| `ALLOWED_USER_EMAILS` | Config | Exact comma-separated Google accounts allowed to sign in |
| `APP_URL` | Config | Application base URL |
| `GOOGLE_DRIVE_OWNER_EMAIL` | Config | Google account that owns the Warranty Vault storage |
| `GOOGLE_PICKER_API_KEY` | Config | Browser-visible restricted key used by Google Picker |
| `GOOGLE_PROJECT_NUMBER` | Config | Google Cloud project number used by Picker |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Config | ID of the shared `WarrantyVault` folder |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Secret | Long-lived Drive authorization used by the backend |
| `GOOGLE_CLOUD_VISION_API_KEY` | Secret | Server-side Google Cloud Vision key |
| `GROQ_API_KEY` | Secret | Server-side Groq API key |
| `CRON_SECRET` | Secret | Protects the automatic cleanup endpoint |

Optional:

```env
GROQ_RECEIPT_MODEL=qwen/qwen3.8-27b
```

If omitted, the application uses `qwen/qwen3.8-27b`.

For local development:

```env
APP_URL=http://localhost:3000
```

---

# Google configuration

## 3. Create a Google Cloud project

Create a dedicated Google Cloud project for Warranty Vault.

Enable the services used by the app:

- Google Drive API
- Google Cloud Vision API

Configure the OAuth consent screen.

If the OAuth application is still in testing mode, add the two authorized accounts as test users when required.

---

## 4. Create the Google OAuth client

Create a **Web application** OAuth client.

For local development, add these redirect URIs:

```text
http://localhost:3000/auth/google/callback
http://localhost:3000/auth/drive/callback
```

For production, add the equivalent URLs for the Vercel domain:

```text
https://your-domain.vercel.app/auth/google/callback
https://your-domain.vercel.app/auth/drive/callback
```

Copy the client ID and client secret into:

```env
GOOGLE_AUTH_CLIENT_ID=...
GOOGLE_AUTH_CLIENT_SECRET=...
```

---

## 5. Configure the two authorized users

The application is intentionally private.

Example:

```env
ALLOWED_USER_EMAILS=user1@example.com,user2@example.com
GOOGLE_DRIVE_OWNER_EMAIL=user1@example.com
```

Only emails in `ALLOWED_USER_EMAILS` can use the application.

`GOOGLE_DRIVE_OWNER_EMAIL` identifies the account whose Google Drive stores the shared archive.

---

# Google Drive setup

## 6. Create the shared folder

In the owner Google account, create:

```text
WarrantyVault
```

Share only this folder with the second authorized user.

Do **not** share the entire Google Drive.

---

## 7. Configure Google Picker

The app uses Google Picker during the one-time Drive storage setup.

Set:

```env
GOOGLE_PICKER_API_KEY=...
GOOGLE_PROJECT_NUMBER=...
```

The Picker API key is intentionally browser-visible. It must therefore be restricted in Google Cloud.

Recommended restrictions:

- restrict it to the local/production application origins;
- restrict it to only the Google APIs required by the Picker/Drive setup.

Typical allowed website referrers are:

```text
http://localhost:3000/*
https://your-domain.vercel.app/*
```

Do not use the Picker key as a general unrestricted Google API key.

---

## 8. Authorize the Drive storage account

Start the application first:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Sign in as the configured Drive owner.

Go to:

```text
Impostazioni
→ Archiviazione Drive
→ Configura archiviazione
```

Complete the Google authorization flow and select the existing `WarrantyVault` folder.

The Drive flow uses the `drive.file` scope instead of requesting access to the user's entire Google Drive.

After the one-time setup, configure the generated values:

```env
GOOGLE_DRIVE_ROOT_FOLDER_ID=...
GOOGLE_DRIVE_REFRESH_TOKEN=...
```

`GOOGLE_DRIVE_REFRESH_TOKEN` is a secret and must never be committed or exposed to the browser.

Restart the development server after changing environment variables.

---

# OCR and structured extraction

## 9. Configure Google Cloud Vision

Create a server-side Google API key and restrict it to the Cloud Vision API.

Add it to:

```env
GOOGLE_CLOUD_VISION_API_KEY=...
```

Depending on the Google Cloud account/project configuration, Cloud Vision may require billing to be enabled even when usage remains small.

The receipt image is sent to Google Cloud Vision from the backend. The Vision credential is never sent to the browser.

---

## 10. Configure Groq

Create a Groq API key and add:

```env
GROQ_API_KEY=...
```

The current extraction pipeline sends the OCR text, not the original receipt image, to Groq.

The model returns structured data for:

- store name;
- purchase date;
- purchased product names;
- product prices;
- quantities.

The result is only a suggestion. The user can review and edit every extracted field before saving.

---

# Run locally

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Production build:

```bash
npm run build
npm run start
```

Formatting:

```bash
npm run format
npm run format:check
```

---

# Receipt storage

Warranty Vault deliberately does not use a traditional database.

The Google Drive folder is the source of persistent data.

```text
WarrantyVault/
├── index.json
├── receipts/
│   ├── <receipt-id>/
│   │   ├── receipt.json
│   │   ├── receipt_001.jpg
│   │   ├── receipt_002.jpg
│   │   └── ...
│   └── ...
└── trash/
    └── <receipt-id>/
        ├── receipt.json
        └── receipt_*.jpg
```

### `index.json`

Contains lightweight metadata needed by Home/Search.

It intentionally excludes:

- image data;
- receipt thumbnails;
- full OCR text.

### `receipt.json`

Contains the complete metadata for one receipt, including:

- receipt information;
- products;
- independent warranty dates;
- attachment references;
- OCR state/raw OCR data;
- other receipt-specific metadata.

This allows the index to be rebuilt from the individual receipt folders if necessary.

---

# Receipt processing pipeline

When the user adds a receipt:

```text
1. Take/select one or more receipt photos
2. Images are normalized/compressed in the browser
3. Google Cloud Vision extracts the text
4. OCR from multiple photos is merged in order
5. Groq converts OCR text into structured purchase data
6. The user reviews/corrects the fields
7. Receipt metadata and images are saved to Google Drive
```

One receipt may contain multiple products.

Each product has its own:

- price;
- quantity;
- category;
- warranty duration;
- warranty expiration date.

The receipt images remain shared by all products on that receipt.

---

# Warranty expiration and automatic cleanup

Warranty expiration is tracked per **product**, not per receipt.

A receipt can therefore contain, for example:

```text
Product A → warranty ends in 2028
Product B → warranty ends in 2030
```

The receipt is not eligible for automatic archival while at least one product is still covered.

The current cleanup policy is:

```text
Last product warranty expires
        ↓
Receipt remains visible/searchable for 90 days
        ↓
Moved to the app's internal Archive / WarrantyVault/trash/
        ↓
Recoverable for another 30 days
        ↓
Permanently deleted
```

A receipt marked to be preserved (`autoDelete = false`) is excluded from automatic cleanup.

The Vercel Cron job runs daily:

```text
0 3 * * *
```

and calls:

```text
/api/cleanup
```

The endpoint is protected by:

```env
CRON_SECRET=...
```

---

# Deploy to Vercel

## 1. Import the GitHub repository

Create a new Vercel project and connect this repository.

The project is configured as a TanStack Start application.

---

## 2. Add environment variables

Add the same production values used locally.

Recommended Vercel classification:

### Secrets

```text
GOOGLE_AUTH_CLIENT_SECRET
AUTH_SECRET
GOOGLE_DRIVE_REFRESH_TOKEN
GOOGLE_CLOUD_VISION_API_KEY
GROQ_API_KEY
CRON_SECRET
```

### Config

```text
GOOGLE_AUTH_CLIENT_ID
ALLOWED_USER_EMAILS
APP_URL
GOOGLE_DRIVE_OWNER_EMAIL
GOOGLE_PICKER_API_KEY
GOOGLE_PROJECT_NUMBER
GOOGLE_DRIVE_ROOT_FOLDER_ID
```

`GOOGLE_PICKER_API_KEY` is browser-visible by design and must be protected through Google Cloud API/referrer restrictions.

Set:

```env
APP_URL=https://your-production-domain.vercel.app
```

---

## 3. Update Google configuration

After the production URL exists, update Google Cloud with the production OAuth callback URLs:

```text
https://your-production-domain.vercel.app/auth/google/callback
https://your-production-domain.vercel.app/auth/drive/callback
```

Also add the production domain to the allowed referrers for the Picker API key.

Redeploy after changing Vercel environment variables.

---

# Install as a PWA

Warranty Vault can be installed directly from the deployed website.

Core application operations require an internet connection; full offline receipt storage is intentionally not implemented.

## iPhone / iOS

1. Open the production URL in **Safari**.
2. Tap the Share button.
3. Choose **Add to Home Screen**.
4. Confirm the app name.
5. Launch Warranty Vault from its Home Screen icon.

The installed app opens in standalone mode rather than as a normal Safari tab.

## Android / Samsung

Using Chrome or Samsung Internet:

1. Open the production URL.
2. Open the browser menu.
3. Choose **Install app** or **Add to Home screen**.
4. Confirm installation.
5. Launch Warranty Vault from the app/Home Screen icon.

---

# Security notes

Warranty Vault handles receipt data that may contain purchase dates, transaction identifiers, store information, payment details, or loyalty information.

Important rules:

- all privileged credentials stay server-side;
- never commit `.env.local`;
- never expose the OAuth client secret, Drive refresh token, Vision key, Groq key, or cron secret;
- the Google Drive folder should remain private;
- share only the dedicated `WarrantyVault` folder;
- receipt images are served through authenticated application routes;
- Home/Search do not automatically download receipt images;
- raw OCR data is not stored in the lightweight index;
- production logs should not contain full tokens, credentials, receipt images, or raw OCR text.

The only intentionally browser-visible Google credential is `GOOGLE_PICKER_API_KEY`, which must be strongly restricted in Google Cloud.

---

# Project structure

```text
src/
├── auth/                   Google login, sessions and authorization
├── components/vault/       Warranty Vault UI components
├── drive/                  Google Drive storage and receipt repository
├── lib/                    Shared types, warranty logic and image helpers
├── ocr/                    Google Vision + Groq receipt analysis
├── routes/                 TanStack file-based routes and API routes
└── styles.css              Application design system

public/
├── apple-touch-icon.png
├── favicon.svg
├── site.webmanifest
├── web-app-manifest-192x192.png
└── web-app-manifest-512x512.png
```

`src/routeTree.gen.ts` is generated by TanStack Router and should not be edited manually.

---

# Main routes

```text
/                         Login
/home                     Warranty list
/add                      Add receipt
/search                   Search receipts/products
/archive                  Internal archive/trash
/settings                 Settings
/purchase/:id             Receipt/product details

/auth/google/callback     Google login callback
/auth/drive/callback      Drive authorization callback

/api/cleanup              Vercel automatic cleanup
```

There are additional internal API routes used for authenticated receipt images and OCR/testing functionality.

---

# Design principles

Warranty Vault intentionally remains small.

The project does **not** currently need:

- PostgreSQL/Supabase;
- public user registration;
- expense analytics;
- accounting features;
- a native iOS application;
- a native Android application;
- receipt thumbnails in Home/Search;
- a separate product database.

Google Drive remains both the document archive and the persistent metadata store.

---

# License / usage

This project is currently intended as a private household application.

Do not deploy a public instance without reviewing authentication, Google Cloud configuration, data retention, API quotas, and privacy requirements.
