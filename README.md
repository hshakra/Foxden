# Foxden

A live threat intelligence dashboard built on the [abuse.ch ThreatFox](https://threatfox.abuse.ch/) feed.
It shows what is attacking, from where, right now.

![Foxden overview](docs/screenshots/overview.png)

## What it does

Foxden takes the raw ThreatFox stream of IOCs (indicators of compromise, meaning malicious IPs, domains, URLs, and file hashes) and turns it into a dashboard you can actually work in. The home screen gives you the overview, filters let you narrow down, and details open in place.

- Signal strip with the headline numbers and the IOC type breakdown for the selected range (24h, 3d, or 7d)
- Live origin map that geolocates malicious IPs onto a dotted world map, with a toggle between volume and confidence
- Live IOC feed, newest first, with filters for type, confidence, and family. Bursts from one family collapse into an expandable row, and the list is virtualized so it stays fast
- Click any IOC and a detail panel opens next to the feed with copy, tags, and links out to VirusTotal, Malpedia, and ThreatFox
- Family and tag pages you can share, with stats, an activity sparkline, and that entity's IOCs
- Press / anywhere to look up any IP, domain, URL, or hash
- Keyboard support in the feed: j and k to move, enter to open, esc to close

![Family profile](docs/screenshots/family.png)

## Stack

Frontend: React 19, Vite, Tailwind v4, TanStack Query, Recharts, dotted-map.
Backend: FastAPI. A small proxy that keeps the ThreatFox key on the server, validates input, and caches responses.
Type: Schibsted Grotesk for the interface, Martian Mono for all data values.
Data: ThreatFox API from abuse.ch, plus ip-api.com for geolocation.

The design system lives in [DESIGN.md](DESIGN.md) and the build plan in [THREATSCOPE.md](THREATSCOPE.md).

## Run it locally

Backend. You need a free Auth-Key from https://auth.abuse.ch/

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # paste your THREATFOX_API_KEY
uvicorn main:app --port 8000 --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev            # opens on http://localhost:5173
```

The Vite dev server proxies /api to the backend, so there is nothing else to configure in dev.

## Deploy

Backend on Render: render.yaml is a ready blueprint. Set THREATFOX_API_KEY and ALLOWED_ORIGINS (your frontend URL) in the dashboard.

Frontend on Vercel: import the frontend folder and set VITE_API_BASE_URL to the deployed API URL. vercel.json already handles routing for the single page app.

## Security notes

- The ThreatFox key never reaches the browser. Every upstream call goes through the backend.
- Every endpoint validates its input bounds. The geo endpoint only forwards valid public IPs.
- CORS is locked to ALLOWED_ORIGINS and responses are cached to respect upstream rate limits.
