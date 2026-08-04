import ipaddress
import os
import time

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# DONT FORGET TO ACTIVATE VENV
# source venv/bin/activate

_ = load_dotenv()
app = FastAPI()

# naive per client rate limit
# CORS only stops browsers, this stops anyone burning our upstream quota
_hits: dict[str, list[float]] = {}
RATE_LIMIT = 60  # requests per minute per client


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    recent = [t for t in _hits.get(client_ip, []) if now - t < 60]
    if len(recent) >= RATE_LIMIT:
        return JSONResponse(status_code=429, content={"detail": "Too many requests"})
    recent.append(now)
    _hits[client_ip] = recent
    # keep the tracking dict from growing forever
    if len(_hits) > 10000:
        for key in list(_hits)[:5000]:
            del _hits[key]
    return await call_next(request)

# comma-separated list in prod, e.g. "https://foxden.vercel.app"
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

threatfox_api_key = os.getenv("THREATFOX_API_KEY", "")

THREATFOX_URL = "https://threatfox-api.abuse.ch/api/v1/"
TIMEOUT = httpx.Timeout(15.0)

# simple TTL cache so repeat queries don't hammer ThreatFox
_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL = 60  # seconds
CACHE_MAX = 256  # entries


async def threatfox(payload: dict, cache_key: str) -> dict:
    # serve from cache while fresh
    hit = _cache.get(cache_key)
    if hit and hit[0] > time.time():
        return hit[1]

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            response = await client.post(
                THREATFOX_URL,
                headers={"Auth-Key": threatfox_api_key},
                json=payload,
            )
        except httpx.HTTPError:
            raise HTTPException(status_code=502, detail="ThreatFox is unreachable")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="ThreatFox returned an error")

    data = response.json()

    # drop oldest entries once the cache is full
    if len(_cache) >= CACHE_MAX:
        oldest = sorted(_cache, key=lambda k: _cache[k][0])[: CACHE_MAX // 4]
        for key in oldest:
            del _cache[key]
    _cache[cache_key] = (time.time() + CACHE_TTL, data)

    return data


@app.get("/")
def root():
    return {"app": "foxden", "docs": "/docs"}


# RECENT ENDPOINT


class RecentRequest(BaseModel):
    # ThreatFox rejects anything above 7 days
    days: int = Field(ge=1, le=7)


@app.post("/api/recent")
async def get_recent(recent: RecentRequest):
    return await threatfox(
        {"query": "get_iocs", "days": recent.days},
        cache_key=f"recent:{recent.days}",
    )


# TAG ENDPOINT


class TagRequest(BaseModel):
    tag: str = Field(min_length=1, max_length=100)
    # limit of results
    limit: int = Field(default=300, ge=1, le=1000)


@app.post("/api/tag")
async def get_tag(tag: TagRequest):
    return await threatfox(
        {"query": "taginfo", "tag": tag.tag, "limit": tag.limit},
        cache_key=f"tag:{tag.tag}:{tag.limit}",
    )


# FAMILY ENDPOINT


class FamilyRequest(BaseModel):
    malware: str = Field(min_length=1, max_length=100)
    # limit of results
    limit: int = Field(default=300, ge=1, le=1000)


@app.post("/api/family")
async def get_family(family: FamilyRequest):
    return await threatfox(
        {"query": "malwareinfo", "malware": family.malware, "limit": family.limit},
        cache_key=f"family:{family.malware}:{family.limit}",
    )


# SEARCH ENDPOINT, looks up a single IOC


class SearchRequest(BaseModel):
    ioc: str = Field(min_length=3, max_length=500)


@app.post("/api/search")
async def search_ioc(search: SearchRequest):
    return await threatfox(
        {"query": "search_ioc", "search_term": search.ioc},
        cache_key=f"search:{search.ioc}",
    )


# GEO ENDPOINT, batch geolocates IPs for the origin map
# uses the free ip-api.com batch API, 100 IPs per request
# an in-memory cache keeps repeat lookups free

_geo_cache: dict[str, dict] = {}
GEO_CACHE_MAX = 20000

# ip-api.com's free tier allows 15 batch calls a minute, stay under it
_geo_batches: list[float] = []
GEO_BATCHES_PER_MIN = 12


def geo_budget_left() -> bool:
    now = time.time()
    while _geo_batches and now - _geo_batches[0] > 60:
        _geo_batches.pop(0)
    return len(_geo_batches) < GEO_BATCHES_PER_MIN


def is_public_ip(value: str) -> bool:
    # only real, public IPv4/IPv6 addresses go out to the geo API
    try:
        return ipaddress.ip_address(value).is_global
    except ValueError:
        return False


class GeoRequest(BaseModel):
    ips: list[str] = Field(max_length=500)


@app.post("/api/geo")
async def get_geo(geo: GeoRequest):
    # dedupe and reject anything that isn't a public IP
    ips = [ip for ip in dict.fromkeys(geo.ips) if is_public_ip(ip)]
    missing = [ip for ip in ips if ip not in _geo_cache]

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        for start in range(0, len(missing), 100):
            # serve whatever is cached once the upstream budget runs out
            if not geo_budget_left():
                break
            _geo_batches.append(time.time())
            batch = missing[start : start + 100]
            try:
                # plain http, free tier only. these IPs are already public
                # threat feed data so nothing sensitive crosses this wire
                response = await client.post(
                    "http://ip-api.com/batch",
                    json=[
                        {
                            "query": ip,
                            "fields": "status,countryCode,country,lat,lon,query",
                        }
                        for ip in batch
                    ],
                )
            except httpx.HTTPError:
                break
            if response.status_code != 200:
                break
            for row in response.json():
                if row.get("status") == "success":
                    _geo_cache[row["query"]] = {
                        "ip": row["query"],
                        "countryCode": row["countryCode"],
                        "country": row["country"],
                        "lat": row["lat"],
                        "lon": row["lon"],
                    }

    # keep the cache from growing forever
    if len(_geo_cache) > GEO_CACHE_MAX:
        for key in list(_geo_cache)[: GEO_CACHE_MAX // 4]:
            del _geo_cache[key]

    return {"data": [_geo_cache[ip] for ip in ips if ip in _geo_cache]}


@app.get("/api/health")
def get_health():
    return {"status": "ok"}
