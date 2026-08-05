import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useRecentIOCs from "../hooks/useRecentIOCs";
import useGeo from "../hooks/useGeo";
import { extractIPs } from "../lib/processor";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { FacetRail } from "../components/FacetRail";
import { FeedTable } from "../components/FeedTable";
import { IOCDrawer } from "../components/IOCDrawer";
import { useRange } from "../lib/range";
import useTitle from "../hooks/useTitle";

// the browse surface, facets on the left, the full feed in the middle,
// details on the right. the overview keeps only a preview of this
// filters live in the url so a filtered view can be shared or refreshed
export default function IOCBrowse() {
  useTitle("IOC browser");
  const { days, setDays } = useRange();
  const recent = useRecentIOCs();
  const [selected, setSelected] = useState(null);
  const [params, setParams] = useSearchParams();

  const typeFilter = useMemo(() => params.getAll("type"), [params]);
  const threatFilter = useMemo(() => params.getAll("threat"), [params]);
  const countryFilter = useMemo(() => params.getAll("country"), [params]);
  const portFilter = useMemo(() => params.getAll("port"), [params]);
  const familyFilter = params.get("family");

  function updateParams(mutate) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        mutate(next);
        return next;
      },
      { replace: true },
    );
  }

  const setListParam = (key) => (list) =>
    updateParams((p) => {
      p.delete(key);
      for (const v of list) p.append(key, v);
    });
  const setTypeFilter = setListParam("type");
  const setThreatFilter = setListParam("threat");
  const setCountryFilter = setListParam("country");
  const setPortFilter = setListParam("port");
  const setFamilyFilter = (name) =>
    updateParams((p) => {
      if (name) p.set("family", name);
      else p.delete("family");
    });

  const current = recent.data?.current;
  const iocs = useMemo(() => current ?? [], [current]);

  // country per ioc comes from the same geo lookup the map uses,
  // the backend cache makes this cheap once the overview has loaded
  const ips = useMemo(() => extractIPs(iocs), [iocs]);
  const geo = useGeo(ips);
  const geoRows = geo.data;
  const geoByIp = useMemo(() => {
    const map = {};
    for (const row of geoRows ?? []) map[row.ip] = row;
    return map;
  }, [geoRows]);
  const geoLoading = ips.length > 0 && geo.isPending;
  // a country filter cannot apply until the lookup answers
  const waitingOnGeo = countryFilter.length > 0 && geoLoading;

  return (
    <>
      <TopBar
        title="IOCs"
        subtitle="Browse all indicators of compromise in range"
      />
      <div
        key={recent.isPending || waitingOnGeo ? "loading" : "ready"}
        className="reveal p-6"
      >
        {recent.isPending || waitingOnGeo ? (
          <SkeletonRows rows={12} />
        ) : recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : iocs.length === 0 ? (
          <EmptyState
            title="No IOCs in this range"
            hint="Try widening the time range."
            actionLabel={days < 7 ? "Show 7 days" : undefined}
            onAction={() => setDays(7)}
          />
        ) : (
          <div
            className={`grid items-start gap-4 ${
              selected
                ? "lg:grid-cols-[210px_minmax(0,1fr)_280px] xl:grid-cols-[210px_minmax(0,1fr)_300px]"
                : "lg:grid-cols-[210px_minmax(0,1fr)]"
            }`}
          >
            <FacetRail
              iocs={iocs}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              threatFilter={threatFilter}
              onThreatFilterChange={setThreatFilter}
              familyFilter={familyFilter}
              onFamilyFilterChange={setFamilyFilter}
              countryFilter={countryFilter}
              onCountryFilterChange={setCountryFilter}
              portFilter={portFilter}
              onPortFilterChange={setPortFilter}
              geoByIp={geoByIp}
              geoLoading={geoLoading}
            />
            <FeedTable
              iocs={iocs}
              selectedId={selected?.id}
              onSelect={setSelected}
              familyFilter={familyFilter}
              onFamilyFilterChange={setFamilyFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              threatFilter={threatFilter}
              onThreatFilterChange={setThreatFilter}
              countryFilter={countryFilter}
              onCountryFilterChange={setCountryFilter}
              portFilter={portFilter}
              onPortFilterChange={setPortFilter}
              geoByIp={geoByIp}
              title="All IOCs"
              maxH="max-h-[72vh]"
            />
            {selected && (
              <IOCDrawer
                ioc={selected}
                onClose={() => setSelected(null)}
                onFamilyFilterChange={(family) => setFamilyFilter(family)}
                pool={iocs}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
