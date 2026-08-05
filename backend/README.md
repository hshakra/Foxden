---
title: Foxden API
sdk: docker
app_port: 7860
pinned: false
---

The FastAPI backend for Foxden, a live threat intelligence dashboard on the
abuse.ch ThreatFox feed. It proxies the feed, keeps the API key server side,
caches responses, and rate limits per client.

Frontend and full project: https://github.com/hshakra/Foxden
