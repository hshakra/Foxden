import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# DONT FORGET TO ACTIVATE VENV
# source venv/bin/activate

_ = load_dotenv()
app = FastAPI()

origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

threatfox_api_key = os.getenv("THREATFOX_API_KEY", "")


@app.get("/")
def root():
    return {"Foxdex": "Test"}


# RECENT ENDPOINT


class RecentRequest(BaseModel):
    days: int


@app.post("/api/recent")
async def get_recent(recent: RecentRequest):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://threatfox-api.abuse.ch/api/v1/",
            headers={"Auth-Key": threatfox_api_key},
            json={"query": "get_iocs", "days": recent.days},
        )
        return response.json()


# TAG ENDPOINT


class TagRequest(BaseModel):
    tag: str
    # limit of results
    limit: int


@app.post("/api/tag")
async def get_tag(tag: TagRequest):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://threatfox-api.abuse.ch/api/v1/",
            headers={"Auth-Key": threatfox_api_key},
            json={
                "query": "taginfo",
                "tag": tag.tag,
                "limit": tag.limit,
            },
        )
        return response.json()


# FAMILY ENDPOINT


class FamilyRequest(BaseModel):
    malware: str
    # limit of results
    limit: int


@app.post("/api/family")
async def get_family(family: FamilyRequest):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://threatfox-api.abuse.ch/api/v1/",
            headers={"Auth-Key": threatfox_api_key},
            json={
                "query": "malwareinfo",
                "malware": family.malware,
                "limit": family.limit,
            },
        )
        return response.json()


# SEARCH ENDPOINT — look up a single IOC


class SearchRequest(BaseModel):
    ioc: str


@app.post("/api/search")
async def search_ioc(search: SearchRequest):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://threatfox-api.abuse.ch/api/v1/",
            headers={"Auth-Key": threatfox_api_key},
            json={"query": "search_ioc", "search_term": search.ioc},
        )
        return response.json()


# GEO ENDPOINT — batch-geolocate IPs for the origin map.
# Uses ip-api.com's free batch API (100 IPs/request, 15 requests/min);
# an in-memory cache keeps repeat lookups free.

_geo_cache: dict[str, dict] = {}


class GeoRequest(BaseModel):
    ips: list[str]


@app.post("/api/geo")
async def get_geo(geo: GeoRequest):
    # cap the request and dedupe; cache handles the rest
    ips = list(dict.fromkeys(geo.ips))[:500]
    missing = [ip for ip in ips if ip not in _geo_cache]

    async with httpx.AsyncClient() as client:
        for start in range(0, len(missing), 100):
            batch = missing[start : start + 100]
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

    return {"data": [_geo_cache[ip] for ip in ips if ip in _geo_cache]}


@app.get("/api/health")
def get_health():
    return {"status": "ok"}
