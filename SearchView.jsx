/* global React, Icon, MapView, downloadCSV, EmptyState, useToast, formatThaiDate,
   _supabase, toMeter, toTransformer, useLang */
const {
  useState:  useStateS,
  useEffect: useEffectS,
  useRef:    useRefS,
} = React;

/* ============================================================
   SearchView — PEA Meter + PEA TR tabs (server-side search)
   ============================================================ */
function SearchView({ data, baseMap, onLogSearch, currentUser, allowExport = true }) {
  const { t } = useLang();
  const [tab, setTab]               = useStateS("meter");
  const [query, setQuery]           = useStateS("");
  const [showFilters, setShowFilters] = useStateS(false);
  const [filters, setFilters]       = useStateS({
    feeder: "", owner: "", code: "", phase: "", voltage: "", minKva: "", maxKva: "",
  });
  const [results, setResults]       = useStateS([]);
  const [searching, setSearching]   = useStateS(false);
  const [hasSearched, setHasSearched] = useStateS(false);
  const [selectedId, setSelectedId] = useStateS(null);
  const [showHeatmap, setShowHeatmap] = useStateS(false);
  const [showCluster, setShowCluster] = useStateS(true);
  const [view, setView]             = useStateS(() => window.innerWidth <= 640 ? "map" : "split");
  const [copied, setCopied]         = useStateS(null);
  const [navTarget, setNavTarget]   = useStateS(null);
  const [showExportDialog, setShowExportDialog] = useStateS(false);
  const toast = useToast();

  // Use refs so the effect can always read the latest callbacks
  // without adding them to the dependency array (which would cause re-runs)
  const onLogSearchRef = useRefS(onLogSearch);
  onLogSearchRef.current = onLogSearch;
  const currentUserRef = useRefS(currentUser);
  currentUserRef.current = currentUser;

  // ── server-side search: only [query, filters, tab] as deps — no functions ──
  useEffectS(() => {
    const hasFilter = Object.values(filters).some(v => v !== "");
    if (!query.trim() && !hasFilter) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      setHasSearched(true);
      try {
        const safe = query.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
        let dbq;
        if (tab === "meter") {
          dbq = _supabase.from("meters").select("*").limit(500);
          if (safe) dbq = dbq.or(`tag.ilike.%${safe}%,peano.ilike.%${safe}%,accountnum.ilike.%${safe}%,feederid.ilike.%${safe}%`);
          if (filters.feeder) dbq = dbq.eq("feederid", filters.feeder);
          if (filters.owner)  dbq = dbq.eq("owner",    filters.owner);
          if (filters.code)   dbq = dbq.eq("code",     filters.code);
        } else {
          dbq = _supabase.from("transformers").select("*").limit(500);
          if (safe) dbq = dbq.or(`tag.ilike.%${safe}%,peano_tr.ilike.%${safe}%,location.ilike.%${safe}%,feeder1.ilike.%${safe}%`);
          if (filters.feeder)  dbq = dbq.eq("feeder1",  filters.feeder);
          if (filters.owner)   dbq = dbq.eq("owner_tr", filters.owner);
          if (filters.phase)   dbq = dbq.eq("phase",    filters.phase);
          if (filters.voltage) dbq = dbq.eq("voltage",  filters.voltage);
          if (filters.minKva)  dbq = dbq.gte("kva", +filters.minKva);
          if (filters.maxKva)  dbq = dbq.lte("kva", +filters.maxKva);
        }
        const { data: rows, error } = await dbq;
        if (!cancelled && !error) {
          const mapped = (rows || []).map(tab === "meter" ? toMeter : toTransformer);
          setResults(mapped);
          if (query.trim()) {
            onLogSearchRef.current?.({
              at: formatThaiDate(),
              user: currentUserRef.current?.username || "guest",
              action: tab === "meter" ? "search_meter" : "search_tr",
              target: query.trim(),
              detail: `ค้นหา ${tab === "meter" ? "มิเตอร์" : "หม้อแปลง"} • พบ ${mapped.length} รายการ`,
              ip: (navigator.userAgent || "").substring(0, 200),
            });
          }
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, filters, tab]); // stable state values only — no function deps

  const resetFilters = () => setFilters({ feeder: "", owner: "", code: "", phase: "", voltage: "", minKva: "", maxKva: "" });

  const copyCoords = (lat, lng, id) => {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const doExport = () => {
    downloadCSV(`pea-${tab}-${Date.now()}.csv`, results);
    toast?.(`ส่งออก ${results.length} รายการ`, "success");
    onLogSearch?.({
      at: formatThaiDate(),
      user: currentUser?.username || "guest",
      action: "export_csv",
      target: tab === "meter" ? "PEA Meter" : "PEA TR",
      detail: `ส่งออก ${results.length} รายการ • query="${query || "—"}"`,
      ip: (navigator.userAgent || "").substring(0, 200),
    });
    setShowExportDialog(false);
  };
  const handleExport = () => setShowExportDialog(true);

  const totalCount = tab === "meter"
    ? +(data.dashStats?.meter_count || 0)
    : +(data.dashStats?.tr_count    || 0);
  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  return (
    <div className="f-col" style={{ height: "100%", overflow: "hidden" }}>
      <style>{`
        .sv-header { display: flex; flex-direction: column; gap: 10px; padding: 16px 28px 0; }
        .sv-body { padding: 16px 28px 20px; }
        .sv-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .sv-tabs { flex-wrap: nowrap !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .sv-tabs::-webkit-scrollbar { display: none; }
        .sv-controls { display: flex; align-items: center; gap: 8px; }
        .sv-search-wrap { flex: 1; min-width: 0; position: relative; }
        .sv-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        @media (min-width: 1440px) {
          .sv-header { padding: 20px 36px 0; }
          .sv-body { padding: 20px 36px 24px; }
          .sv-search-title { font-size: 32px !important; }
          .input-lg { height: 60px !important; font-size: 17px !important; }
          .search-filter-btn { height: 58px !important; border-radius: 18px !important; }
          .search-export-btn { height: 58px !important; border-radius: 18px !important; }
          .search-view-switcher .tab { height: 50px !important; padding: 0 18px !important; }
        }
        @media (max-width: 1023px) and (min-width: 641px) {
          .sv-header { padding: 14px 18px 0; }
          .sv-body { padding: 12px 18px 16px; }
        }
        @media (max-width: 680px) {
          .sv-header { padding: 10px 14px 0; gap: 8px; }
          .sv-body { padding: 10px 12px 14px; }
          .sv-title-row { flex-direction: column; gap: 6px; align-items: stretch; }
          .sv-search-title { font-size: 20px !important; }
          .sv-tabs { width: 100% !important; flex-shrink: 1 !important; }
          .sv-tabs .tab { flex: 1; justify-content: center; font-size: 13px !important; padding: 0 12px !important; height: 44px !important; white-space: nowrap; }
          .sv-controls { flex-wrap: wrap; gap: 8px; }
          .sv-search-wrap { flex-basis: 100%; }
          .sv-actions { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; flex-wrap: nowrap; width: 100%; }
          .sv-actions::-webkit-scrollbar { display: none; }
          .search-filter-btn { height: 40px !important; font-size: 12px !important; border-radius: 12px !important; white-space: nowrap; flex-shrink: 0; }
          .search-view-switcher .tab { height: 36px !important; padding: 0 10px !important; font-size: 12px !important; white-space: nowrap; }
          .search-export-btn { height: 40px !important; font-size: 12px !important; border-radius: 12px !important; white-space: nowrap; flex-shrink: 0; }
          .input-lg { height: 48px !important; }
        }
      `}</style>

      {/* Header bar */}
      <div className="sv-header">
        <div className="sv-title-row">
          <div>
            <div className="t-eyebrow">{t("searchDataLabel")}</div>
            <div className="search-title-text sv-search-title t-display" style={{ fontSize: 28, marginTop: 2, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0 8px" }}>
              <span>{tab === "meter" ? t("peaMeter") : t("peaTr")}</span>
              {hasSearched ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: "rgba(139,63,196,0.1)", border: "1px solid rgba(139,63,196,0.2)", color: "var(--pea-purple-600)" }}>
                  <span style={{ fontWeight: 800 }}>{results.length.toLocaleString()}{results.length >= 500 ? "+" : ""}</span>
                  <span style={{ fontWeight: 500, opacity: 0.7 }}>/ {totalCount.toLocaleString()} {t("foundItems")}</span>
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: "rgba(139,63,196,0.1)", border: "1px solid rgba(139,63,196,0.2)", color: "var(--pea-purple-600)" }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{totalCount.toLocaleString()}</span>
                  <span style={{ fontWeight: 500, opacity: 0.7 }}>{t("totalItems")}</span>
                </span>
              )}
              {searching && (
                <span style={{ fontSize: 12, color: "var(--pea-purple-500)", fontWeight: 600 }}>
                  {t("searching")}
                </span>
              )}
            </div>
          </div>
          <div className="tabs sv-tabs" style={{ flexShrink: 0 }}>
            <button className={"tab " + (tab === "meter" ? "active" : "")} onClick={() => { setTab("meter"); resetFilters(); setSelectedId(null); setResults([]); setHasSearched(false); }}>
              <Icon name="meter" size={14} /> {t("searchPeaMeter")}
            </button>
            <button className={"tab " + (tab === "tr" ? "active" : "")} onClick={() => { setTab("tr"); resetFilters(); setSelectedId(null); setResults([]); setHasSearched(false); }}>
              <Icon name="tr" size={14} /> {t("searchPeaTr")}
            </button>
          </div>
        </div>

        {/* Search + actions */}
        <div className="sv-controls">
          <div className="sv-search-wrap">
            <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: searching ? "var(--pea-orange-500)" : "var(--pea-purple-500)", zIndex: 1 }}>
              <Icon name="search" size={19} />
            </div>
            <input
              className="input input-lg"
              style={{ paddingLeft: 48, paddingRight: query ? 46 : 16, width: "100%", boxSizing: "border-box" }}
              placeholder={tab === "meter" ? t("phMeter") : t("phTr")}
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button className="btn-icon" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 34, height: 34 }} onClick={() => setQuery("")}>
                <Icon name="close" size={15} />
              </button>
            )}
          </div>

          <div className="sv-actions">
            <button className={"search-filter-btn btn btn-outline " + (showFilters ? "active" : "")} onClick={() => setShowFilters(s => !s)} style={{ height: 54, borderRadius: 16, position: "relative", flexShrink: 0 }}>
              <Icon name="filter" size={15} /> {t("filterLabel")}
              {activeFilterCount > 0 && (
                <span style={{ background: "var(--pea-orange-500)", color: "white", borderRadius: 999, width: 20, height: 20, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>{activeFilterCount}</span>
              )}
            </button>

            <div className="search-view-switcher tabs" style={{ padding: 4, flexShrink: 0 }}>
              {[
                { id: "split", icon: "layers", label: t("splitView") },
                { id: "map",   icon: "map",    label: t("mapView")   },
              ].map(v => (
                <button key={v.id} className={"tab " + (view === v.id ? "active" : "")} style={{ height: 46, padding: "0 14px" }} onClick={() => setView(v.id)}>
                  <Icon name={v.icon} size={14} /> {v.label}
                </button>
              ))}
            </div>

            {(allowExport || currentUser?.role === "admin") ? (
              <button className="search-export-btn btn btn-outline" style={{ height: 54, borderRadius: 16, flexShrink: 0 }} onClick={handleExport} disabled={results.length === 0}>
                <Icon name="download" size={15} /> {t("exportLabel")}
              </button>
            ) : (
              <button className="search-export-btn" onClick={() => toast?.(t("exportDisabled"), "error")} style={{
                height: 54, borderRadius: 16, flexShrink: 0, display: "flex", alignItems: "center",
                gap: 6, padding: "0 16px", background: "var(--soft)", border: "1px solid var(--soft-border)",
                color: "var(--ink-mute)", fontSize: 13, fontWeight: 600, cursor: "pointer", userSelect: "none",
              }}>
                <Icon name="lock" size={15} /> {t("exportLabel")}
              </button>
            )}
          </div>
        </div>

        {/* Filters drawer */}
        {showFilters && (
          <div className="card fade-up" style={{ padding: 16, borderColor: "var(--soft-border)", background: "var(--soft)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
              <FilterSelect label={t("fFeeder")} value={filters.feeder} options={data.feeders} onChange={v => setFilters(f => ({ ...f, feeder: v }))} t={t} />
              <FilterSelect label={t("fOwner")} value={filters.owner} options={["PEA", "Customer"]} onChange={v => setFilters(f => ({ ...f, owner: v }))} t={t} />
              {tab === "meter" && (
                <FilterSelect label={t("fCode")} value={filters.code} options={["AFAG", "ACPK"]} onChange={v => setFilters(f => ({ ...f, code: v }))} t={t} />
              )}
              {tab === "tr" && (
                <>
                  <FilterSelect label={t("fPhase")} value={filters.phase} options={["หม้อแปลง 1 Phase", "หม้อแปลง 3 Phase"]} onChange={v => setFilters(f => ({ ...f, phase: v }))} t={t} />
                  <FilterSelect label={t("fVoltage")} value={filters.voltage} options={["22 kV", "33 kV"]} onChange={v => setFilters(f => ({ ...f, voltage: v }))} t={t} />
                  <div className="field">
                    <label className="field-label">{t("fMinKva")}</label>
                    <input className="input" style={{ height: 40 }} type="number" value={filters.minKva} onChange={e => setFilters(f => ({ ...f, minKva: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="field">
                    <label className="field-label">{t("fMaxKva")}</label>
                    <input className="input" style={{ height: 40 }} type="number" value={filters.maxKva} onChange={e => setFilters(f => ({ ...f, maxKva: e.target.value }))} placeholder="∞" />
                  </div>
                </>
              )}
              <div className="f-col" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-ghost btn-sm" onClick={resetFilters}><Icon name="close" size={14} /> {t("clearFilter")}</button>
              </div>
            </div>
            <div className="f-gap-2 flex" style={{ marginTop: 10, flexWrap: "wrap" }}>
              <button className={"btn btn-sm " + (showHeatmap ? "btn-primary" : "btn-outline")} onClick={() => setShowHeatmap(h => !h)}>
                <Icon name="flame" size={13} /> Heatmap
              </button>
              <button className={"btn btn-sm " + (showCluster ? "btn-primary" : "btn-outline")} onClick={() => setShowCluster(c => !c)}>
                <Icon name="grid" size={13} /> Cluster
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="sv-body" style={{ flex: 1, overflow: "hidden" }}>
        {!hasSearched ? (
          /* Empty start state */
          <div className="card" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px", background: "var(--soft)", display: "grid", placeItems: "center" }}>
                <Icon name="search" size={32} style={{ color: "var(--ink-mute)" }} />
              </div>
              <div className="fw-7" style={{ fontSize: 18, marginBottom: 8 }}>
                {t("typeToSearch")}
              </div>
              <div className="t-mute text-sm">
                {tab === "meter"
                  ? t("searchFromMeter").replace("{n}", totalCount.toLocaleString())
                  : t("searchFromTr").replace("{n}", totalCount.toLocaleString())}
              </div>
              <div className="t-mute text-xs" style={{ marginTop: 8 }}>{t("useFilter")}</div>
            </div>
          </div>
        ) : searching ? (
          /* Loading state */
          <div className="card" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, margin: "0 auto 16px", background: "linear-gradient(135deg,#6b2c91,#f47b20)", display: "grid", placeItems: "center", animation: "pea-spin 1.2s linear infinite" }}>
                <Icon name="search" size={22} style={{ color: "white" }} />
              </div>
              <div className="fw-6">{t("searching")}</div>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="card" style={{ height: "100%" }}>
            <EmptyState title={t("notFound")} hint={t("notFoundHint")} />
          </div>
        ) : (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: view === "split" ? "clamp(300px, 38%, 520px) 1fr" : "1fr", gap: 16 }}>
            {view === "split" && (
              <ResultList
                kind={tab}
                items={results}
                selectedId={selectedId}
                onSelect={(p) => setSelectedId(p.OBJECTID)}
                onNavigate={(p) => setNavTarget(p)}
                capped={results.length >= 500}
                copyCoords={copyCoords}
                copied={copied}
              />
            )}
            {(view === "split" || view === "map") && (
              <div style={{ height: "100%", minHeight: 480, position: "relative" }}>
                <MapView
                  points={results}
                  kind={tab}
                  selectedId={selectedId}
                  onSelect={(p) => setSelectedId(p.OBJECTID)}
                  onNavigate={(p) => setNavTarget(p)}
                  baseMap={baseMap}
                  showHeatmap={showHeatmap}
                  showCluster={showCluster}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {showExportDialog && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(14,10,22,0.55)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 20 }} onClick={() => setShowExportDialog(false)}>
          <div className="fade-up" onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--surface)", borderRadius: 24, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "22px 24px 18px", background: "linear-gradient(135deg,#6b2c91 0%,#8b3fc4 60%,#f47b20 130%)", color: "white", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: -30, top: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
              <div className="t-eyebrow" style={{ color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>{t("confirmExportTitle")}</div>
              <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>Export {tab === "meter" ? t("peaMeter") : t("peaTr")}</div>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 16px", background: "var(--soft)", borderRadius: 14, marginBottom: 16, border: "1px solid var(--soft-border)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6b2c91,#f47b20)", display: "grid", placeItems: "center", color: "white", flexShrink: 0, boxShadow: "0 8px 22px rgba(107,44,145,0.35)" }}>
                  <Icon name="download" size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{results.length.toLocaleString()}</div>
                  <div className="t-mute" style={{ fontSize: 13, marginTop: 2 }}>{t("itemsToExport")}</div>
                </div>
              </div>
              <div className="t-mute" style={{ fontSize: 13, marginBottom: 14 }}>
                {t("exportAsCSV")} · <span className="mono" style={{ fontSize: 12 }}>pea-{tab}-export.csv</span>
              </div>
              {results.length >= 500 && (
                <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#ffe7d4", border: "1px solid #f9b27a", marginBottom: 14 }}>
                  <Icon name="warning" size={14} style={{ color: "var(--pea-orange-600)", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: "var(--pea-orange-700)", lineHeight: 1.5 }}>{t("exportCap500")}</span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                <button className="btn btn-outline" style={{ height: 48 }} onClick={() => setShowExportDialog(false)}>{t("cancel")}</button>
                <button className="btn btn-primary" style={{ height: 48 }} onClick={doExport}>
                  <Icon name="download" size={15} /> {t("exportLabel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {navTarget && <NavigationPanel target={navTarget} kind={tab} onClose={() => setNavTarget(null)} />}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange, t }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <select className="input" style={{ height: 40 }} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{t("fAll")}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ============================================================
   ResultList — left rail / fullscreen table
   ============================================================ */
function ResultList({ kind, items, selectedId, onSelect, onNavigate, capped, copyCoords, copied }) {
  return (
    <div className="surface" style={{ overflow: "auto", height: "100%" }}>
      {items.map((p, i) => (
        <ResultCard key={p.OBJECTID} item={p} kind={kind} selected={p.OBJECTID === selectedId} onClick={() => onSelect(p)} onNavigate={() => onNavigate(p)} index={i} copyCoords={copyCoords} copied={copied} />
      ))}
      {capped && <CappedNote count={items.length} />}
    </div>
  );
}

function CappedNote({ count }) {
  const { t } = useLang();
  return (
    <div className="t-mute text-xs" style={{ padding: "10px 16px", textAlign: "center", borderTop: "1px solid var(--line)" }}>
      {t("cappedNote").replace("{n}", count)}
    </div>
  );
}

function ResultCard({ item: p, kind, selected, onClick, onNavigate, index, copyCoords, copied }) {
  const { t } = useLang();
  const isMeter = kind === "meter";
  return (
    <button
      onClick={onClick}
      className="fade-up"
      style={{
        width: "100%", textAlign: "left",
        padding: "14px 16px",
        background: selected ? "var(--soft)" : "transparent",
        borderLeft: `3px solid ${selected ? (isMeter ? "var(--pea-purple-500)" : "var(--pea-orange-500)") : "transparent"}`,
        borderBottom: "1px solid var(--line)",
        display: "flex", gap: 12,
        animationDelay: `${Math.min(index * 18, 200)}ms`,
        cursor: "pointer",
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: isMeter ? "linear-gradient(135deg,#6b2c91,#8b3fc4)" : "linear-gradient(135deg,#f47b20,#d96512)",
        color: "white", display: "grid", placeItems: "center", fontWeight: 800,
        boxShadow: isMeter ? "0 4px 12px #6b2c9155" : "0 4px 12px #f47b2055",
      }}>{isMeter ? "M" : "T"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="f-between" style={{ gap: 8 }}>
          <div className="mono fw-7" style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.TAG}</div>
          <div className={"badge " + (isMeter ? (p.OWNER === "Customer" ? "badge-orange" : "badge-purple") : (p.OWNER_TR === "Customer" ? "badge-orange" : "badge-purple"))} style={{ fontSize: 10 }}>
            {isMeter ? (p.OWNER || "—") : p.OWNER_TR}
          </div>
        </div>
        {isMeter ? (
          <>
            <div className="text-xs t-mute" style={{ marginTop: 4 }}>
              <span className="fw-6" style={{ color: "var(--ink-2)" }}>CODE {p.CODE}</span> · ROUTE {p.ROUTE} · ACCT {p.ACCOUNTNUM}
            </div>
            <div className="text-xs t-mute" style={{ marginTop: 2 }}>
              Feeder <b style={{ color: "var(--pea-purple-600)" }}>{p.FEEDERID || "—"}</b> · PEANO {p.PEANO}
            </div>
          </>
        ) : (
          <>
            <div className="text-xs t-mute" style={{ marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              📍 {p.LOCATION}
            </div>
            <div className="text-xs t-mute" style={{ marginTop: 2 }}>
              {p.PHASE.replace("หม้อแปลง ", "")} · <b style={{ color: "var(--pea-orange-600)" }}>{p.KVA} kVA</b> · {p.VOLTAGE} · Feeder {p.FEEDER1}
            </div>
          </>
        )}
        {selected && (
          <div className="fade-in" style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onNavigate(); }}>
              <Icon name="navigation" size={12} /> {t("navigateBtn")}
            </button>
            <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.LATITUDE},${p.LONGITUDE}`, "_blank"); }}>
              <Icon name="map" size={12} /> {t("googleMapsBtn")}
            </button>
            <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); window.open(`https://maps.apple.com/?daddr=${p.LATITUDE},${p.LONGITUDE}`, "_blank"); }}>
               {t("appleMapsBtn")}
            </button>
            <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); copyCoords(p.LATITUDE, p.LONGITUDE, p.OBJECTID); }} style={{ color: copied === p.OBJECTID ? "var(--green)" : undefined }}>
              <Icon name={copied === p.OBJECTID ? "check" : "copy"} size={12} />
              {copied === p.OBJECTID ? t("copiedCoords") : `${p.LATITUDE.toFixed(5)}, ${p.LONGITUDE.toFixed(5)}`}
            </button>
          </div>
        )}
      </div>
    </button>
  );
}


/* ============================================================
   NavigationPanel — uses device GPS as starting point
   ============================================================ */
function NavigationPanel({ target, kind, onClose }) {
  const { useState: useStateNav, useEffect: useEffectNav } = React;
  const { t } = useLang();
  const isMeter = kind === "meter";
  const dest = { lat: target.LATITUDE, lng: target.LONGITUDE };
  const [gpsState, setGpsState] = useStateNav("loading"); // loading | ok | denied
  const [userPos, setUserPos] = useStateNav(null);

  const watchRef = React.useRef(null);

  const stopWatch = () => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  };

  const doGPS = () => {
    setGpsState("loading");
    setUserPos(null);
    if (!navigator.geolocation) { setGpsState("denied"); return; }
    stopWatch();
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
        setGpsState("ok");
      },
      () => setGpsState("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffectNav(() => {
    doGPS();
    return stopWatch;
  }, []);

  // Only calculate distance when we have actual GPS — never use hardcoded fallback
  const from = userPos;
  const distance = from
    ? (() => {
        const R = 6371;
        const dLat = (dest.lat - from.lat) * Math.PI / 180;
        const dLng = (dest.lng - from.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(from.lat*Math.PI/180)*Math.cos(dest.lat*Math.PI/180)*Math.sin(dLng/2)**2;
        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      })()
    : null;
  const eta = distance ? Math.max(1, Math.round((distance * 1.3 / 40) * 60)) : null;

  const originLabel = gpsState === "loading"
    ? t("findingGPS")
    : gpsState === "ok"
      ? `${t("currentPos")} (${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)})`
      : t("unknownPos");
  const accLabel = gpsState === "ok" && userPos.acc != null
    ? (userPos.acc <= 20 ? `±${userPos.acc.toFixed(0)} m ✓` : userPos.acc <= 100 ? `±${userPos.acc.toFixed(0)} m` : `±${userPos.acc.toFixed(0)} m — ต่ำ`)
    : null;

  const googleUrl = userPos
    ? `https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${dest.lat},${dest.lng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
  const appleUrl = userPos
    ? `https://maps.apple.com/?saddr=${userPos.lat},${userPos.lng}&daddr=${dest.lat},${dest.lng}&dirflg=d`
    : `https://maps.apple.com/?daddr=${dest.lat},${dest.lng}&dirflg=d`;

  return (
    <div className="fade-in" style={{
      position: "fixed", inset: 0, zIndex: 8000, background: "rgba(14,10,22,0.5)", backdropFilter: "blur(8px)",
      display: "grid", placeItems: "center", padding: 20,
    }} onClick={onClose}>
      <div className="fade-up" onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, background: "var(--surface)",
        borderRadius: 24, boxShadow: "var(--shadow-lg)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "22px 24px 18px",
          background: isMeter
            ? "linear-gradient(135deg, #6b2c91 0%, #8b3fc4 60%, #f47b20 130%)"
            : "linear-gradient(135deg, #f47b20 0%, #d96512 60%, #6b2c91 130%)",
          color: "white", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", right: -30, top: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
          <div className="f-between" style={{ marginBottom: 18, position: "relative" }}>
            <div className="t-eyebrow" style={{ color: "rgba(255,255,255,0.85)" }}>{t("navSystem")}</div>
            <button className="btn-icon" style={{ background: "rgba(255,255,255,0.15)", color: "white", border: 0 }} onClick={onClose}>
              <Icon name="close" size={16} />
            </button>
          </div>

          {/* Origin → Dest */}
          <div className="f-gap-3 flex" style={{ alignItems: "center", position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.4)", transition: "background 400ms",
                background: gpsState === "ok" ? "#4ade80" : gpsState === "denied" ? "#f87171" : "rgba(255,255,255,0.5)" }} />
              <div style={{ width: 2, height: 18, background: "rgba(255,255,255,0.5)" }} />
              <Icon name="location" size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{t("originLabel")}</div>
              <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                {gpsState === "loading" && (
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "pea-spin 0.8s linear infinite" }} />
                )}
                {originLabel}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>{t("destLabel")}</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {isMeter ? `PEA Meter ${target.PEANO || "—"}` : `PEA TR ${target.PEANO_TR || "—"}`}
              </div>
              {!isMeter && target.LOCATION && (
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{target.LOCATION}</div>
              )}
            </div>
          </div>

          {/* Distance / ETA */}
          <div className="f-between" style={{ marginTop: 18, position: "relative" }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.1em" }}>{t("distanceLabel")}</div>
              <div className="t-display" style={{ fontSize: 26, fontWeight: 800 }}>
                {distance != null ? `${distance.toFixed(2)} ${t("kmUnit")}` : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.1em" }}>{t("etaLabel")}</div>
              <div className="t-display" style={{ fontSize: 26, fontWeight: 800 }}>
                {eta != null ? (eta < 60 ? `${eta} ${t("minutesUnit")}` : `${Math.floor(eta/60)} ${t("hoursUnit")} ${eta%60} ${t("minutesUnit")}`) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* GPS status */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)" }}>
          {gpsState === "loading" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-mute)" }}>
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--line)", borderTopColor: "var(--pea-purple-500)", animation: "pea-spin 0.8s linear infinite" }} />
              {t("findingGPS")}
            </div>
          )}
          {gpsState === "ok" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
              <span style={{ color: "#16a34a" }}>✓</span>
              <span style={{ color: "#16a34a", fontWeight: 600, flex: 1 }}>
                {t("gpsOkMsg")}
                {accLabel && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, opacity: 0.75 }}>{accLabel}</span>}
              </span>
              <button onClick={doGPS} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: "rgba(139,63,196,0.1)", border: "1px solid rgba(139,63,196,0.3)",
                color: "var(--pea-purple-600)", flexShrink: 0,
              }}>
                <Icon name="refresh" size={12} /> อัปเดตตำแหน่ง
              </button>
            </div>
          )}
          {gpsState === "denied" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
              <span style={{ color: "#f97316" }}>⚠</span>
              <span style={{ color: "var(--ink-mute)", flex: 1 }}>{t("gpsDeniedMsg")}</span>
              <button onClick={doGPS} className="btn btn-outline" style={{ fontSize: 12, padding: "4px 12px", height: 30, flexShrink: 0 }}>
                <Icon name="refresh" size={12} /> {t("retryBtn")}
              </button>
            </div>
          )}
        </div>

        {/* Map buttons */}
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => window.open(googleUrl, "_blank")}>
            <Icon name="map" size={14} /> {t("googleMapsBtn")}
          </button>
          <button className="btn btn-outline" onClick={() => window.open(appleUrl, "_blank")}>
            <Icon name="map" size={14} /> {t("appleMapsBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

window.SearchView = SearchView;
