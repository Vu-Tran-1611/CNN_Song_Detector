# Frontend

A Next.js web app styled as a soft-UI radio. Tap **Listen**, it records 5–10 seconds from the microphone, sends the recording to the backend, and shows which song is playing.

## What you see

| Result | LCD | Song screen (under the LCD) | Shelf | LED |
|---|---|---|---|---|
| Recognized (≥ 80%) | `RECOGNIZED` / `98.4 %` | NOW PLAYING: **Attention**, Charlie Puth (orange) | the record gets an orange ring and spins | green |
| Not sure (< 80%) | `NOT SURE` / `62.0 %` | BEST GUESS: **Maybe Attention?** (amber) | dashed outline on the best guess | amber |
| Error | `NO SERVER`, `MIC BLOCKED`, `TOO SHORT`… / `Err` | No song | | red |

Long LCD text scrolls. With the system's "reduce motion" setting on, nothing scrolls or spins. If the server needs more than 4 seconds (e.g. a free host waking up), the LCD shows `WAKING UP`.

The **recent strip** keeps the last 3 results, saved in this browser only (`localStorage`). Nothing is sent anywhere else. The small **Clear** knob empties it; the **Info** knob opens a "How it works" sheet (the same content is also shown under the song shelf).

When a song is recognized, the LCD percent rolls up, the record pops into place and spins, and Android phones give a short buzz. With "reduce motion" on, all animations are skipped.

The app has its own icon (generated in `src/app/icon.tsx` and `apple-icon.tsx`) and a web app manifest, so "Add to Home Screen" on a phone opens it full-screen like an app.

Built mobile-first: one column on phones, the panel centered on tablets, two columns on desktop.

## Run it

The backend must be running on port 8765 (see `backend/README.md`).

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. In development the page calls `/api/...` on the Next.js server, which forwards to the backend (`BACKEND_URL` in `next.config.ts`, default `http://localhost:8765`), so no CORS setup is needed.

Add `?debug=1` to the URL to see a debug panel under the song list. It plays back and downloads the last recording, and shows its sample rate, the mic settings the browser actually applied, and the raw backend response.

### Testing on a phone

Browsers only allow the microphone over HTTPS (or on `localhost` on the same computer). To try it on a phone on the same Wi-Fi:

```bash
npm run dev:phone
```

This starts the dev server with a self-signed HTTPS certificate on all network interfaces. On the phone, open `https://<your-computer's-local-IP>:3000` and accept the certificate warning once.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | dev server on http://localhost:3000 |
| `npm run dev:phone` | HTTPS dev server reachable from your local network |
| `npm test` | unit tests (Vitest): WAV encoder, state machine, LCD text, recent list, API errors |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | production build |

## How recording works

1. `getUserMedia` with **echo cancellation, noise suppression and auto gain control off**. Those are tuned for voice calls and treat music as noise.
2. An AudioWorklet (`public/worklets/recorder-processor.js`) collects raw mono samples off the main thread. An AnalyserNode drives the level ring.
3. Stop unlocks after 5 seconds (the model needs one full 5-second chunk), and recording stops automatically at 10 seconds.
4. The samples are saved as a 16-bit mono WAV at the mic's own sample rate. The backend resamples to 22,050 Hz with torchaudio, the same resampler used in training.

## Layout

```
src/
├── app/                      # layout, page, design tokens (globals.css), icon/apple-icon/manifest
├── components/
│   ├── Detector.tsx          # ties together the state machine, recorder, timer and UI
│   ├── DebugPanel.tsx        # ?debug=1
│   ├── device/               # DevicePanel, LcdDisplay, NowPlayingScreen, ListenButton, RoundButton, StatusLed, RecentStrip
│   ├── HowItWorks.tsx, InfoSheet.tsx
│   ├── brand/AppIconArt.tsx  # the app icon artwork
│   └── songs/                # SongShelf, VinylRecord
├── hooks/useMicRecorder.ts   # start() / stop() → WAV, getLevel()
├── lib/
│   ├── api.ts                # the only module that calls the backend
│   ├── types.ts              # mirrors the backend's JSON
│   ├── detectorState.ts      # idle → requesting → listening → analyzing → result / error
│   ├── detectorView.ts       # what the LCD, LED, button and shelf show for each state
│   ├── recent.ts             # last 3 results, saved in localStorage
│   └── audio/wav.ts          # Float32 → 16-bit WAV
└── fonts/                    # DSEG7 / DSEG14 LCD fonts (SIL Open Font License, see DSEG-LICENSE.txt)
```

## Deployment

On Vercel, set `NEXT_PUBLIC_API_URL` to the deployed backend's URL (see `.env.example`), and add the Vercel domain to the backend's `SONG_CORS_ORIGINS`.
