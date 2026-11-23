# Frontend

A Next.js web app styled as a soft-UI radio. Tap **Listen**, it records 5–10 seconds from the microphone, and (from step 5) the backend tells you which song is playing.

Built mobile-first: one column on phones, the panel centered on tablets, two columns on desktop.

## Run it

The backend must be running on port 8765 (see `backend/README.md`).

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. In development the page calls `/api/...` on the Next.js server, which forwards to the backend (`BACKEND_URL` in `next.config.ts`, default `http://localhost:8765`), so no CORS setup is needed.

Add `?debug=1` to the URL to see a debug panel under the song list. It plays back and downloads the last recording, and shows its sample rate and the mic settings the browser actually applied.

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
| `npm test` | unit tests (Vitest): WAV encoder, listening state machine |
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
├── app/                      # layout (fonts, viewport), page, design tokens in globals.css
├── components/
│   ├── Detector.tsx          # ties together the state machine, recorder, timer and UI
│   ├── DebugPanel.tsx        # ?debug=1
│   ├── device/               # DevicePanel, LcdDisplay, ListenButton, StatusLed, RecentStrip
│   └── songs/                # SongShelf, VinylRecord
├── hooks/useMicRecorder.ts   # start() / stop() → WAV, getLevel()
├── lib/
│   ├── api.ts                # the only module that calls the backend
│   ├── types.ts              # mirrors the backend's JSON
│   ├── detectorState.ts      # listening flow as a state machine
│   └── audio/wav.ts          # Float32 → 16-bit WAV
└── fonts/                    # DSEG7 / DSEG14 LCD fonts (SIL Open Font License, see DSEG-LICENSE.txt)
```

## Deployment

On Vercel, set `NEXT_PUBLIC_API_URL` to the deployed backend's URL (see `.env.example`), and add the Vercel domain to the backend's `SONG_CORS_ORIGINS`.
