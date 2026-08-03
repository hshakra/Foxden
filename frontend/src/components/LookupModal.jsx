import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { api } from "../lib/api";
import { IOCCard } from "../views/IOCCard";
import { SkeletonRows, EmptyState, ErrorState } from "./states";

/*
  Global IOC lookup in a focused modal (design note: modals for actions).
  Paste any IP, domain, URL, or hash → instant ThreatFox result.
*/
export function LookupModal({ open, onClose }) {
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");

  const result = useQuery({
    queryKey: ["lookup", submitted],
    queryFn: () => api.search(submitted),
    select: (data) => data.data ?? [],
    enabled: submitted.length > 2,
    retry: false,
    refetchInterval: false,
  });

  // reset on the way out so each open starts fresh
  function close() {
    setTerm("");
    setSubmitted("");
    onClose();
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-surface-0/70 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="IOC lookup"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl border border-line-2 bg-surface-3 p-4 shadow-2xl"
      >
        <form
          className="flex items-center gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(term.trim());
          }}
        >
          <Search size={15} className="shrink-0 text-ink-3" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Paste an IP, domain, URL, or hash…"
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-accent/85"
          >
            Look up
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Close lookup"
            className="text-ink-3 hover:text-ink"
          >
            <X size={15} />
          </button>
        </form>

        {submitted && (
          <div className="mt-3 border-t border-line pt-3">
            {result.isPending ? (
              <SkeletonRows rows={3} />
            ) : result.isError ? (
              result.error.message.includes("no_result") ? (
                <EmptyState
                  title="No ThreatFox record for that indicator"
                  hint="That can be good news — it isn't in the abuse.ch corpus."
                />
              ) : (
                <ErrorState error={result.error} onRetry={() => result.refetch()} />
              )
            ) : result.data.length === 0 ? (
              <EmptyState
                title="No ThreatFox record for that indicator"
                hint="That can be good news — it isn't in the abuse.ch corpus."
              />
            ) : (
              <div>
                {result.data.map((ioc) => (
                  <IOCCard key={ioc.id} ioc={ioc} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
