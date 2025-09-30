# Cloudflare Speed Test

Next.js 14 single-page application that reproduces Cloudflare's speed test methodology to measure download, upload, ping, and jitter. The experience is tuned for Vercel deployment with Tailwind CSS styling, dark mode, and local history persistence.

## Features

- Cloudflare CDN download tests for 1 MB, 5 MB, and 10 MB files with retry logic
- Upload, latency, and jitter measurements using Cloudflare endpoints
- Animated progress speedometer, responsive glassmorphism UI, and dark/light themes
- Prevents concurrent tests, includes cancellation, and surfaces friendly errors
- Local test history with ISP metadata where available
- App Router architecture with TypeScript, Tailwind CSS, and Vercel-ready configuration

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000.

3. **Lint**
   ```bash
   npm run lint
   ```

4. **Build for production**
   ```bash
   npm run build
   npm run start
   ```

## Deploying to Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Import the project into [Vercel](https://vercel.com/import).
3. Choose the Next.js framework preset. No extra environment variables are required.
4. Vercel will install dependencies, run `npm run build`, and deploy automatically.

`next.config.js` supplies immutable caching headers for static assets, removes production `console.*` calls, and optimizes package imports for smaller bundles. The app runs entirely client-side, making it ideal for the Vercel Edge Network.

## Project Structure

```
.
├── app
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components
│   ├── ResultCard.tsx
│   └── SpeedTest.tsx
├── lib
│   └── speedtest.ts
├── public
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .eslintrc.json
├── .gitignore
├── next-env.d.ts
└── README.md
```

## Notes

- Speed tests rely on Cloudflare's public endpoints (`speed.cloudflare.com`). If a network blocks these domains the test may fail.
- The browser must support the Fetch API, `AbortController`, and `crypto.getRandomValues`. Modern evergreen browsers are recommended.
- History and theme preference persist via `localStorage`. Clearing browser storage removes them.
