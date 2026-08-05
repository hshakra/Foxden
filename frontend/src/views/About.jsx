import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import useRecentIOCs from "../hooks/useRecentIOCs";
import { computeKpis } from "../lib/processor";
import { StatTile } from "../components/ui/StatTile";
import { Group } from "../components/ui/Group";
import { FoxLogo } from "../components/FoxLogo";

// the front door: first visits land here, the logo comes back here
// it sells the tool and what you can do with it, on live numbers

// clicking a piece of the sample row explains what that piece is for
const ANATOMY = {
  type: {
    label: "The type",
    why: "Indicators come in four shapes: server addresses, domains, URLs and file hashes. The shape tells you what to do with one. An address goes on a firewall blocklist, a domain into DNS filtering, a hash into an antivirus hunt.",
  },
  value: {
    label: "The indicator",
    why: "The evidence itself, one click to copy. This is what you paste into your firewall, your log search, or the lookup here. If this address shows up in your network traffic, one of your machines is likely talking to an attacker.",
  },
  family: {
    label: "The family",
    why: "Indicators rarely travel alone. The family names the malware operation behind this one, and clicking it anywhere in the app shows the whole campaign: its other servers, its pace, its targets. One click takes you from a single address to the operation running it.",
  },
  confidence: {
    label: "The confidence",
    why: "How sure the reporter is, from 0 to 100. Block on high confidence without second guessing, treat the rest as leads worth checking. Foxden shows it on every indicator so you never act on weak evidence by accident.",
  },
};

const FLOW = [
  {
    name: "ThreatFox",
    role: "The source",
    why: "Security researchers worldwide report live attack indicators to ThreatFox, a free public feed run by abuse.ch, a Swiss nonprofit. Thousands arrive every day. Foxden adds geolocation so every malicious server also has a place on the map.",
  },
  {
    name: "A small backend",
    role: "The gate",
    why: "A thin proxy keeps the feed key private, caches responses so pages load instantly, and rate limits abuse so the free upstream stays healthy. It does nothing else on purpose: the less it does, the less can break.",
  },
  {
    name: "Your browser",
    role: "The brain",
    why: "One fetch becomes everything you see. Rankings, trends, deltas and the map are all computed on your machine, which is why filtering and pivoting feel instant: there is no waiting on a server to answer.",
  },
  {
    name: "Six pages",
    role: "The tool",
    why: "Each page answers one kind of question, so you always know where to look: the situation on the overview, the raw feed in the browser, campaigns under families, labels under tags.",
  },
];

const PAGES = [
  {
    to: "/",
    name: "Overview",
    does: "What is attacking right now: totals, trends, a world map of origins, and which campaigns are surging",
    sketch: ["tiles", "map", "rows"],
  },
  {
    to: "/iocs",
    name: "IOC browser",
    does: "Narrow thousands of indicators by type, family, country or port, then export your slice as CSV",
    sketch: ["rail", "rows"],
  },
  {
    to: "/families",
    name: "Families",
    does: "Every malware operation ranked, with a timing heatmap showing when each one works",
    sketch: ["heat", "rows"],
  },
  {
    to: "/tags",
    name: "Tags",
    does: "The community's labels sized by use, and which are meaningful versus noise",
    sketch: ["tree", "rows"],
  },
  {
    to: "/family/Mirai",
    name: "Family profile",
    does: "One campaign in depth: its rhythm, its infrastructure, its latest indicators",
    sketch: ["tiles", "rows"],
  },
  {
    to: "/tag/ClickFix",
    name: "Tag explorer",
    does: "One label in depth, and which malware operations are using it",
    sketch: ["tiles", "rows"],
  },
];

const MOMENTS = [
  {
    title: "A strange IP in your logs",
    how: "Press /, paste it, and know in a second whether it is a known attacker, which malware it belongs to, and how confident the report is.",
  },
  {
    title: "First coffee of the shift",
    how: "The overview shows what changed since you left: how volume moved, which campaigns surged overnight, and what arrived since your last visit.",
  },
  {
    title: "The firewall needs feeding",
    how: "Filter the browser to what you defend against, by country, port or confidence, and export a clean CSV ready for a blocklist.",
  },
  {
    title: "A campaign worth watching",
    how: "Hit watch on any family or tag. Every time you come back, the overview reports what your watchlist did while you were gone.",
  },
];

const FACTS = [
  ["Live", "The feed refreshes every five minutes. Nothing is mocked."],
  ["7 days", "The widest window ThreatFox serves. No fake history."],
  ["0 to 100", "Every indicator shows its reporter's confidence."],
  ["No accounts", "Your watchlist lives in your own browser."],
];

// tiny wireframes for the page map, enough to hint at each layout
function Sketch({ kind }) {
  if (kind === "tiles")
    return (
      <div className="flex gap-1">
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className="h-3 flex-1 rounded-[2px] bg-lifted" />
        ))}
      </div>
    );
  if (kind === "map")
    return <span className="block h-8 rounded-[3px] bg-[#262c47]" />;
  if (kind === "rail")
    return (
      <div className="flex gap-1">
        <span className="h-8 w-1/4 rounded-[2px] bg-lifted" />
        <span className="h-8 flex-1 rounded-[3px] bg-[#1a2029]" />
      </div>
    );
  if (kind === "heat")
    return (
      <div className="grid grid-cols-6 gap-[2px]">
        {["#262c47", "#4a5686", "#7180b9", "#4a5686", "#93a3d6", "#262c47"].map(
          (c, i) => (
            <span key={i} className="h-2 rounded-[2px]" style={{ background: c }} />
          ),
        )}
      </div>
    );
  if (kind === "tree")
    return (
      <div className="flex h-8 gap-[2px]">
        <span className="w-1/2 rounded-[2px] bg-[#4a5686]" />
        <span className="flex-1 rounded-[2px] bg-[#262c47]" />
        <span className="w-1/5 rounded-[2px] bg-[#7180b9]" />
      </div>
    );
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 2 }, (_, i) => (
        <span key={i} className="h-1.5 rounded-[2px] bg-lifted" />
      ))}
    </div>
  );
}

export default function About() {
  const recent = useRecentIOCs();
  const [part, setPart] = useState("value");
  const [node, setNode] = useState(0);

  // seeing this page once is the welcome, later visits land on the data
  useEffect(() => {
    localStorage.setItem("foxden-welcomed", "1");
  }, []);

  const iocs = recent.data?.current;
  const kpis = iocs ? computeKpis(iocs) : null;

  const partClass = (k) =>
    `rounded-md px-1.5 py-0.5 transition-colors duration-150 ${
      part === k
        ? "bg-lifted shadow-[inset_0_0_0_1px_var(--color-accent)]"
        : "hover:bg-lifted/60"
    }`;

  return (
    <div className="reveal mx-auto flex max-w-4xl flex-col gap-12 px-6 py-12">
      <header>
        <div className="mb-5 flex items-center gap-2.5">
          <FoxLogo size={26} />
          <span className="font-medium tracking-tight">Foxden</span>
        </div>
        <h1 className="max-w-[24ch] text-[32px] font-medium leading-tight tracking-tight">
          A live map of what is attacking the internet right now
        </h1>
        <p className="mt-3 max-w-[58ch] text-body leading-relaxed text-ink-mid">
          Somewhere right now, a machine is quietly calling home to an
          attacker. Researchers catch these calls and report them, thousands a
          day, to a public feed. Foxden turns that feed into answers: what is
          attacking, from where, aimed at what, and whether the thing in your
          logs is part of it.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-body font-medium text-white transition-colors duration-150 hover:bg-accent/85"
          >
            Open the dashboard <ArrowRight size={13} />
          </Link>
          <a
            href="https://github.com/hshakra/Foxden"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-line bg-raised px-4 py-2 text-body font-medium text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink"
          >
            <ExternalLink size={13} /> Source on GitHub
          </a>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Indicators right now"
            value={kpis ? kpis.total.toLocaleString() : "–"}
            comparison="in the live 7 day window"
          />
          <StatTile
            label="Malware operations"
            value={kpis ? kpis.familyCount.toLocaleString() : "–"}
            comparison="active in range"
          />
          <StatTile
            label="Community labels"
            value={kpis ? kpis.tagCount.toLocaleString() : "–"}
            comparison="tags in range"
          />
          <StatTile
            label="Average confidence"
            value={kpis ? kpis.avgConfidence : "–"}
            comparison="on a 0 to 100 scale"
          />
        </div>
      </header>

      <Group
        title="Anatomy of one record"
        description="Everything here is built from rows like this, click each part to see what it is for"
      >
        <div className="rounded-lg border border-line bg-raised p-4">
          <div className="flex flex-wrap items-center gap-3 text-body">
            <button
              type="button"
              onClick={() => setPart("type")}
              className={partClass("type")}
            >
              <span className="rounded-md border border-line-strong bg-t-ip/10 px-2 py-0.5 font-mono text-meta text-t-ip">
                ip:port
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPart("value")}
              className={`${partClass("value")} font-mono`}
            >
              114.132.46.254:8443
            </button>
            <button
              type="button"
              onClick={() => setPart("family")}
              className={`${partClass("family")} font-medium text-accent-soft`}
            >
              AsyncRAT
            </button>
            <button
              type="button"
              onClick={() => setPart("confidence")}
              className={`${partClass("confidence")} flex items-center gap-2`}
            >
              <span className="h-1 w-8 rounded-full bg-conf-high" />
              <span className="font-mono text-secondary text-ink-mid">
                100 high
              </span>
            </button>
          </div>
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-secondary font-medium">{ANATOMY[part].label}</p>
            <p className="mt-1 max-w-[70ch] text-secondary leading-relaxed text-ink-mid">
              {ANATOMY[part].why}
            </p>
          </div>
        </div>
      </Group>

      <Group
        title="How the data gets to you"
        description="Four stops from a researcher's report to your screen, hover each one"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          {FLOW.map((f, i) => (
            <button
              key={f.name}
              type="button"
              onMouseEnter={() => setNode(i)}
              onFocus={() => setNode(i)}
              onClick={() => setNode(i)}
              className={`flex-1 rounded-lg border p-3 text-left transition-colors duration-150 ${
                node === i
                  ? "border-accent/60 bg-lifted"
                  : "border-line bg-raised hover:bg-lifted/60"
              }`}
            >
              <span className="block font-mono text-meta text-ink-low">
                {f.role}
              </span>
              <span className="mt-0.5 block text-body font-medium">
                {f.name}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 max-w-[74ch] text-secondary leading-relaxed text-ink-mid">
          {FLOW[node].why}
        </p>
      </Group>

      <Group
        title="What each page answers"
        description="Click any card to open the real thing"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAGES.map((p) => (
            <Link
              key={p.name}
              to={p.to}
              className="group rounded-lg border border-line bg-raised p-4 transition-colors duration-150 hover:border-line-strong hover:bg-lifted/40"
            >
              <div className="flex flex-col gap-1.5">
                {p.sketch.map((kind, i) => (
                  <Sketch key={i} kind={kind} />
                ))}
              </div>
              <p className="mt-3 flex items-center gap-1 text-body font-medium">
                {p.name}
                <ArrowRight
                  size={12}
                  className="text-ink-low transition-colors duration-150 group-hover:text-accent-soft"
                />
              </p>
              <p className="mt-0.5 text-secondary text-ink-mid">{p.does}</p>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-secondary text-ink-low">
          Two more are everywhere: a detail drawer for any indicator, and a
          lookup on the / key that answers is this thing malicious in a second.
        </p>
      </Group>

      <Group
        title="Built for real moments"
        description="The situations this tool exists for"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {MOMENTS.map((m) => (
            <div
              key={m.title}
              className="rounded-lg border border-line bg-raised p-4 shadow-[inset_2px_0_0_var(--color-accent)]"
            >
              <p className="text-body font-medium">{m.title}</p>
              <p className="mt-1 text-secondary leading-relaxed text-ink-mid">
                {m.how}
              </p>
            </div>
          ))}
        </div>
      </Group>

      <Group
        title="The data, honestly"
        description="What this is built on and where its limits are"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {FACTS.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line bg-raised p-4">
              <p className="font-mono text-title font-semibold tracking-tight">
                {k}
              </p>
              <p className="mt-1 text-secondary leading-snug text-ink-mid">{v}</p>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Why it exists">
        <p className="max-w-[64ch] text-body leading-relaxed text-ink-mid">
          I am Husam, and Foxden is my portfolio project. Threat data is
          public, but the tools around it are either enterprise products or
          raw JSON. I wanted to close that gap properly: figure out who would
          actually use this, design for their questions, and polish it until
          it feels like a product people rely on. The code and every decision
          are open on GitHub.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-body font-medium text-white transition-colors duration-150 hover:bg-accent/85"
          >
            Start analyzing <ArrowRight size={13} />
          </Link>
          <a
            href="https://github.com/hshakra/Foxden"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-line bg-raised px-4 py-2 text-body font-medium text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink"
          >
            <ExternalLink size={13} /> Foxden on GitHub
          </a>
        </div>
      </Group>
    </div>
  );
}
