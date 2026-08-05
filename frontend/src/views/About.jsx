import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Check } from "lucide-react";
import useRecentIOCs from "../hooks/useRecentIOCs";
import { computeKpis } from "../lib/processor";
import { StatTile } from "../components/ui/StatTile";
import { Group } from "../components/ui/Group";
import { FoxLogo } from "../components/FoxLogo";

// the front door: first visits land here, the logo comes back here
// part hero, part case study, everything on it is the real system

// clicking a piece of the sample row reveals the decision behind it
const ANATOMY = {
  type: {
    label: "The type badge",
    why: "Types are color coded with four reserved chart colors, and the three hash flavors collapse into one so lists stay scannable. The same four colors mean the same four things on every chart in the app.",
  },
  value: {
    label: "The indicator",
    why: "Machine data is always Martian Mono: addresses, hashes, ports, timestamps and counts. Human words are always Schibsted Grotesk. Your eye learns the difference in about a minute, then never confuses data with chrome again.",
  },
  family: {
    label: "The family",
    why: "Every entity on screen pivots to the group it names. This family name is a filter waiting to be clicked, not a label. The design rule behind it: no dead ends anywhere.",
  },
  confidence: {
    label: "The confidence",
    why: "Reporter confidence, 0 to 100, always shown with its label. Three colors are reserved for it and used for nothing else, so amber in this app always means the same thing. Confidence is not severity, and Foxden invents no alert levels.",
  },
};

const FLOW = [
  {
    name: "ThreatFox",
    role: "The feed",
    why: "A free public feed of indicators of compromise run by abuse.ch, a Swiss nonprofit. Researchers worldwide report thousands of live attack indicators to it every day. Foxden also geolocates addresses through ip-api.com.",
  },
  {
    name: "FastAPI proxy",
    role: "The gate",
    why: "A deliberately thin backend. It keeps the API key off the browser, caches responses so the upstream is never hammered, rate limits per client, and compresses a 4 MB feed to about 200 kB. Nothing more.",
  },
  {
    name: "React client",
    role: "The brain",
    why: "The browser does the thinking: every ranking, trend, bucket and map fill is computed client side from one fetch. All date math is UTC end to end because the feed's timestamps are.",
  },
  {
    name: "Six pages",
    role: "The instrument",
    why: "Each fact lives in exactly one home. A metric appears as a headline on its own page and at most one context line elsewhere, so you always know where to look for it.",
  },
];

const PAGES = [
  {
    to: "/",
    name: "Overview",
    owns: "The situation: totals, deltas, the map, what is surging",
    sketch: ["tiles", "map", "rows"],
  },
  {
    to: "/iocs",
    name: "IOC browser",
    owns: "The full feed with facets: type, family, country, port",
    sketch: ["rail", "rows"],
  },
  {
    to: "/families",
    name: "Families",
    owns: "Every family ranked, with a campaign timing heatmap",
    sketch: ["heat", "rows"],
  },
  {
    to: "/tags",
    name: "Tags",
    owns: "The label landscape as a treemap, plus noise stats",
    sketch: ["tree", "rows"],
  },
  {
    to: "/family/Mirai",
    name: "Family profile",
    owns: "One campaign in depth, with links out to Malpedia",
    sketch: ["tiles", "rows"],
  },
  {
    to: "/tag/ClickFix",
    name: "Tag explorer",
    owns: "One tag, the families using it, the IOCs carrying it",
    sketch: ["tiles", "rows"],
  },
];

const TOKEN_ROWS = [
  {
    title: "The neutral ladder",
    note: "Over 90 percent of any screen. Elevation is lightness, shadows exist only under overlays.",
    tokens: [
      ["bg", "#10141a"],
      ["raised", "#161b23"],
      ["lifted", "#1c222c"],
      ["overlay", "#232a35"],
      ["line", "#2a303b"],
      ["ink-low", "#6f7683"],
      ["ink-mid", "#a2a9b4"],
      ["ink", "#e8ebef"],
    ],
  },
  {
    title: "One accent",
    note: "Glaucous marks everything interactive and nothing decorative.",
    tokens: [["accent", "#7180b9"]],
  },
  {
    title: "The confidence contract",
    note: "Reserved for certainty, never used for anything else.",
    tokens: [
      ["conf-high", "#5c9c7f"],
      ["conf-med", "#ffb020"],
      ["conf-low", "#ff5470"],
    ],
  },
  {
    title: "Chart types",
    note: "Four colors, one per indicator type, identical on every chart.",
    tokens: [
      ["t-ip", "#6e9bd1"],
      ["t-domain", "#9179c9"],
      ["t-url", "#c9a86b"],
      ["t-hash", "#56a8a0"],
    ],
  },
];

const FACTS = [
  ["Live", "The feed refreshes every five minutes. Nothing is mocked."],
  ["7 days", "The widest window ThreatFox serves. No fake history."],
  ["0 to 100", "Every indicator shows its reporter's confidence."],
  ["No accounts", "Your watchlist lives in your own browser."],
];

function Swatch({ name, hex, copied, onCopy }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={`Copy ${hex}`}
      className="group flex items-center gap-1.5 rounded-md border border-line bg-lifted py-1 pl-1.5 pr-2 font-mono text-meta text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink"
    >
      <span
        className="h-4 w-4 rounded-[4px] border border-line-strong"
        style={{ background: hex }}
      />
      {copied ? (
        <span className="flex items-center gap-1 text-conf-high">
          <Check size={10} /> copied
        </span>
      ) : (
        name
      )}
    </button>
  );
}

// tiny wireframes for the page map, drawn from the same tokens
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
  const [copied, setCopied] = useState(null);

  // seeing this page once is the welcome, later visits land on the data
  useEffect(() => {
    localStorage.setItem("foxden-welcomed", "1");
  }, []);

  const iocs = recent.data?.current;
  const kpis = iocs ? computeKpis(iocs) : null;

  function copyToken(name, hex) {
    navigator.clipboard?.writeText(hex);
    setCopied(name);
    setTimeout(() => setCopied((c) => (c === name ? null : c)), 1200);
  }

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
          Researchers report thousands of live attack indicators to ThreatFox,
          a public feed run by the nonprofit abuse.ch. Foxden turns that raw
          stream into a calm, working dashboard for the people who need it:
          analysts on shift, threat researchers, students, and anyone holding
          one suspicious link.
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
            label="Malware families"
            value={kpis ? kpis.familyCount.toLocaleString() : "–"}
            comparison="active in range"
          />
          <StatTile
            label="Community tags"
            value={kpis ? kpis.tagCount.toLocaleString() : "–"}
            comparison="labels in range"
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
        description="Everything here is built from rows like this, click each part for the decision behind it"
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
        title="How the data gets here"
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
        title="Every fact has one home"
        description="The six pages and what each one owns, click any card to visit the real thing"
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
              <p className="mt-0.5 text-secondary text-ink-mid">{p.owns}</p>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-secondary text-ink-low">
          Two more live everywhere: a detail drawer for any indicator, and a
          lookup on the / key that answers is this thing malicious in a second.
        </p>
      </Group>

      <Group
        title="The design system"
        description="A calm instrument where only the data glows, click any token to copy it"
      >
        <div className="flex flex-col gap-4">
          {TOKEN_ROWS.map((row) => (
            <div
              key={row.title}
              className="grid gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0 md:grid-cols-[190px_minmax(0,1fr)]"
            >
              <div>
                <p className="text-body font-medium">{row.title}</p>
                <p className="mt-0.5 text-meta leading-snug text-ink-low">
                  {row.note}
                </p>
              </div>
              <div className="flex flex-wrap content-start gap-1.5">
                {row.tokens.map(([name, hex]) => (
                  <Swatch
                    key={name}
                    name={name}
                    hex={hex}
                    copied={copied === name}
                    onCopy={() => copyToken(name, hex)}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="grid gap-2 border-t border-line pt-3 md:grid-cols-[190px_minmax(0,1fr)]">
            <div>
              <p className="text-body font-medium">The thermal ramp</p>
              <p className="mt-0.5 text-meta leading-snug text-ink-low">
                Brighter means busier. Spent in exactly three places: the map,
                the timing heatmap, the tag treemap.
              </p>
            </div>
            <span
              className="h-5 self-center rounded-md"
              style={{
                background:
                  "linear-gradient(90deg, #262c47, #4a5686, #7180b9, #93a3d6, #bfae8a)",
              }}
            />
          </div>
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
          I am Husam, and Foxden is my portfolio project. I wanted to build a
          real product end to end on live public data: the pipeline, the API,
          the design system and the deploy, with the polish of something
          people rely on. The code, its history, and every decision above are
          open on GitHub.
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
