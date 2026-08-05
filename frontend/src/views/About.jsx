import { ExternalLink } from "lucide-react";
import { TopBar } from "../components/TopBar";
import { Group } from "../components/ui/Group";

// the site's own story: what foxden is, who it serves, how it is built
// analysts read it for data provenance, recruiters read it as a case study

const USERS = [
  {
    role: "SOC analyst on shift",
    question: "What is attacking right now, is this indicator bad?",
    gets: "Fresh feed, verdicts, export",
  },
  {
    role: "Threat intel researcher",
    question: "How is this campaign evolving, what infrastructure does it use?",
    gets: "Family and tag pages, timing, pivots",
  },
  {
    role: "Security student",
    question: "What does real threat data look like?",
    gets: "Self explaining pages, links out",
  },
  {
    role: "Quick checker",
    question: "Is this one IP, domain or hash malicious?",
    gets: "Lookup, instant verdict, leave",
  },
];

const FACTS = [
  {
    k: "Source",
    v: "ThreatFox, a free public feed of indicators of compromise run by abuse.ch, a nonprofit. Geolocation comes from ip-api.com.",
  },
  {
    k: "Freshness",
    v: "The feed refreshes every five minutes. Nothing on screen is mocked or replayed.",
  },
  {
    k: "The window",
    v: "ThreatFox serves at most the last 7 days, so that is the widest range here. No fake history.",
  },
  {
    k: "Certainty",
    v: "Every indicator carries the reporter's confidence, 0 to 100, and it is always shown. Confidence is not severity, so Foxden invents no alert levels.",
  },
  {
    k: "Accounts",
    v: "None. The watchlist and your settings live in your own browser.",
  },
];

const DECISIONS = [
  {
    k: "A thin backend on purpose",
    v: "A small FastAPI proxy keeps the ThreatFox key off the browser, caches responses so the upstream is never hammered, and rate limits per client.",
  },
  {
    k: "The browser does the thinking",
    v: "React 19 computes every ranking, trend and map fill client side from the raw feed. One fetch powers a whole page.",
  },
  {
    k: "Color only ever means something",
    v: "A near monochrome surface, one interactive accent, three colors reserved for confidence, and one thermal ramp for intensity. Nothing decorative.",
  },
  {
    k: "No dead ends",
    v: "Every value on screen pivots to the group it names. A country on the map, a port in a list and a tag on a card are all filters waiting to be clicked.",
  },
];

export default function About() {
  return (
    <>
      <TopBar
        title="About Foxden"
        subtitle="What this is, who it serves, and how it is built"
      />
      <div className="reveal flex max-w-3xl flex-col gap-8 p-6">
        <Group title="The idea">
          <p className="text-body leading-relaxed text-ink-mid">
            Security teams track indicators of compromise, or IOCs: the server
            a malware strain phones home to, a fake site spreading a payload,
            the hash of a malicious file. ThreatFox publishes thousands of
            these every day as a raw feed. Foxden turns that feed into a
            dashboard you can actually work in, and answers one question at a
            glance: what is attacking, from where, right now.
          </p>
        </Group>

        <Group
          title="Who it serves"
          description="Nothing goes on a screen here unless it answers one of these questions"
        >
          <div>
            {USERS.map((u) => (
              <div
                key={u.role}
                className="grid gap-x-6 gap-y-1 border-t border-line py-3 md:grid-cols-[190px_minmax(0,1fr)_190px]"
              >
                <span className="text-body font-medium">{u.role}</span>
                <span className="text-secondary text-ink-mid">{u.question}</span>
                <span className="text-secondary text-ink-low md:text-right">
                  {u.gets}
                </span>
              </div>
            ))}
          </div>
        </Group>

        <Group
          title="The data, honestly"
          description="What this is built on and where its limits are"
        >
          <div>
            {FACTS.map((f) => (
              <div
                key={f.k}
                className="grid gap-x-6 gap-y-1 border-t border-line py-3 md:grid-cols-[190px_minmax(0,1fr)]"
              >
                <span className="text-body font-medium">{f.k}</span>
                <span className="text-secondary leading-relaxed text-ink-mid">
                  {f.v}
                </span>
              </div>
            ))}
          </div>
        </Group>

        <Group
          title="How it is built"
          description="The decisions, not just the stack"
        >
          <div>
            {DECISIONS.map((d) => (
              <div
                key={d.k}
                className="grid gap-x-6 gap-y-1 border-t border-line py-3 md:grid-cols-[190px_minmax(0,1fr)]"
              >
                <span className="text-body font-medium">{d.k}</span>
                <span className="text-secondary leading-relaxed text-ink-mid">
                  {d.v}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-secondary text-ink-low">
            React 19, Vite, Tailwind, TanStack Query and d3-geo on the front,
            FastAPI on the back.
          </p>
        </Group>

        <Group title="Why it exists">
          <p className="text-body leading-relaxed text-ink-mid">
            I am Husam, and Foxden is my portfolio project. I wanted to build
            a real product end to end on live public data: the pipeline, the
            API, the design system and the deploy, with the polish of
            something people rely on. The code and its history are open.
          </p>
          <a
            href="https://github.com/hshakra/Foxden"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-lifted px-3 py-1.5 text-secondary font-medium text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink"
          >
            <ExternalLink size={12} />
            Foxden on GitHub
          </a>
        </Group>
      </div>
    </>
  );
}
