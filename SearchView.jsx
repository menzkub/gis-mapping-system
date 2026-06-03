/* global React, Icon, MapView, downloadCSV, EmptyState, useToast, formatThaiDate,
   _supabase, toMeter, toTransformer, useLang */
const {
  useState:  useStateS,
  useEffect: useEffectS,
  useRef:    useRefS,
  useCallback: useCallbackS,
} = React;

/* ============================================================
   SearchView — PEA Meter + PEA TR tabs (server-side search)
   ============================================================ */
function SearchView({ data, baseMap, onLogSearch, currentUser, allowExport = true, allowCorrectCoords = false, onCorrectCoords }) {
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
  const [svBaseMap, setSvBaseMap]   = useStateS(baseMap || "street");
  const [showBaseMenu, setShowBaseMenu] = useStateS(false);
  const [searchFlash, setSearchFlash] = useStateS(null); // null | "ok" | "empty"
  const baseMapBtnRef = useRefS(null);
  const [copied, setCopied]         = useStateS(null);
  const [navTarget, setNavTarget]   = useStateS(null);
  const [showExportDialog, setShowExportDialog] = useStateS(false);
  const [showHistory, setShowHistory] = useStateS(false);
  const [corrTarget, setCorrTarget] = useStateS(null);
  const [history, setHistory] = useStateS(() => {
    try { return JSON.parse(localStorage.getItem("pea_search_hist") || "[]"); } catch { return []; }
  });
  const toast = useToast();

  const saveHistory = (q) => {
    if (!q.trim()) return;
    setHistory(prev => {
      const next = [q.trim(), ...prev.filter(h => h !== q.trim())].slice(0, 6);
      try { localStorage.setItem("pea_search_hist", JSON.stringify(next)); } catch {}
      return next;
    });
  };

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
        const isNum = /^\d+$/.test(safe);
        let dbq;
        if (tab === "meter") {
          dbq = _supabase.from("meters").select("*").limit(500);
          if (safe) {
            // numeric-only → B-tree exact lookup on peano/accountnum only (very fast)
            // text → GIN trigram partial match on all text columns
            const orFilter = isNum
              ? `peano.eq.${safe},accountnum.eq.${safe}`
              : `tag.ilike.%${safe}%,peano::text.ilike.%${safe}%,accountnum::text.ilike.%${safe}%,feederid.ilike.%${safe}%`;
            dbq = dbq.or(orFilter);
          }
          if (filters.feeder) dbq = dbq.eq("feederid", filters.feeder);
          if (filters.owner)  dbq = dbq.eq("owner",    filters.owner);
          if (filters.code)   dbq = dbq.eq("code",     filters.code);
        } else {
          dbq = _supabase.from("transformers").select("*").limit(500);
          if (safe) {
            const orFilter = isNum
              ? `peano_tr.eq.${safe}`
              : `tag.ilike.%${safe}%,peano_tr::text.ilike.%${safe}%,location.ilike.%${safe}%,feeder1.ilike.%${safe}%`;
            dbq = dbq.or(orFilter);
          }
          if (filters.feeder)  dbq = dbq.eq("feeder1",  filters.feeder);
          if (filters.owner)   dbq = dbq.eq("owner_tr", filters.owner);
          if (filters.phase)   dbq = dbq.eq("phase",    filters.phase);
          if (filters.voltage) dbq = dbq.eq("voltage",  filters.voltage);
          if (filters.minKva)  dbq = dbq.gte("kva", +filters.minKva);
          if (filters.maxKva)  dbq = dbq.lte("kva", +filters.maxKva);
        }
        const { data: rows, error } = await dbq;
        if (!cancelled) {
          if (error) {
            console.error("Search error:", error);
            toast?.(`ค้นหาผิดพลาด: ${error.message}`, "error");
            setResults([]);
          } else {
            const mapped = (rows || []).map(tab === "meter" ? toMeter : toTransformer);
            setResults(mapped);
            setSearchFlash(mapped.length > 0 ? "ok" : "empty");
            setTimeout(() => setSearchFlash(null), 1800);
            if (query.trim()) {
              saveHistory(query.trim());
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
        .sv-controls { display: flex; flex-direction: column; gap: 8px; }
        .sv-search-row { display: flex; align-items: center; gap: 8px; }
        .sv-search-wrap { flex: 1; min-width: 0; position: relative; }
        .sv-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        @media (min-width: 641px) {
          .sv-actions { display: contents; }
        }
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
        .sv-body.sv-map-only { padding: 0 !important; }
        .sv-basemap-icon-btn { flex-shrink: 0; height: 54px; min-width: 108px; padding: 0 14px; border-radius: 16px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
        @keyframes sv-search-bar { 0%{left:-60%} 100%{left:110%} }
        .sv-search-loading-bar { position:absolute; bottom:0; left:0; right:0; height:2px; border-radius:0 0 14px 14px; overflow:hidden; background:rgba(139,63,196,0.12); }
        .sv-search-loading-bar::after { content:""; position:absolute; top:0; width:60%; height:100%; background:linear-gradient(90deg,transparent,var(--pea-purple-500),var(--pea-orange-400),transparent); animation:sv-search-bar 1s linear infinite; }
        @keyframes sv-flash-in { 0%{opacity:0;transform:scale(0.85) translateY(-4px)} 40%{opacity:1;transform:scale(1.06) translateY(0)} 70%{transform:scale(0.97)} 100%{transform:scale(1)} }
        .sv-result-flash { animation: sv-flash-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @media (max-width: 680px) {
          .sv-header { padding: 10px 14px 0; gap: 8px; }
          .sv-body { padding: 10px 12px 14px; }
          .sv-title-row { flex-direction: column; gap: 6px; align-items: stretch; }
          .sv-search-title { font-size: 20px !important; }
          .sv-tabs { width: 100% !important; flex-shrink: 1 !important; }
          .sv-tabs .tab { flex: 1; justify-content: center; font-size: 13px !important; padding: 0 12px !important; height: 44px !important; white-space: nowrap; }
          .sv-search-row { gap: 8px; flex-wrap: wrap; }
          .sv-actions { display: flex !important; order: 10; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; flex-wrap: nowrap; flex-shrink: 0; }
          .sv-actions::-webkit-scrollbar { display: none; }
          .search-filter-btn { height: 40px !important; font-size: 12px !important; border-radius: 12px !important; white-space: nowrap; flex-shrink: 0; }
          .sv-basemap-icon-btn { height: 48px !important; min-width: 96px !important; padding: 0 10px !important; border-radius: 14px !important; font-size: 12px !important; }
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
                <span key={results.length} className={searchFlash === "ok" ? "sv-result-flash" : ""} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: "rgba(139,63,196,0.1)", border: "1px solid rgba(139,63,196,0.2)", color: "var(--pea-purple-600)" }}>
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
                <span style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"4px 12px 4px 8px", borderRadius:999, background:"linear-gradient(90deg,rgba(107,44,145,0.12),rgba(244,123,32,0.1))", border:"1px solid rgba(139,63,196,0.3)", fontSize:12, fontWeight:700, color:"var(--pea-purple-600)", animation:"sv-flash-in 0.2s ease both" }}>
                  <span style={{ width:16, height:16, borderRadius:"50%", border:"2.5px solid rgba(139,63,196,0.25)", borderTopColor:"var(--pea-purple-500)", display:"inline-block", flexShrink:0, animation:"spin 0.7s linear infinite" }} />
                  {t("searching")}
                </span>
              )}
              {!searching && searchFlash === "ok" && (
                <span className="sv-result-flash" style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:"#16a34a", fontWeight:700 }}>
                  ✓ พบ {results.length.toLocaleString()} รายการ
                </span>
              )}
              {!searching && searchFlash === "empty" && (
                <span className="sv-result-flash" style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:"var(--pea-orange-500)", fontWeight:700 }}>
                  ไม่พบข้อมูล
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

        {/* Search + basemap row */}
        <div className="sv-controls">
          <div className="sv-search-row">
            <div className="sv-search-wrap">
              <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 1, display:"flex", alignItems:"center", justifyContent:"center", width:20, height:20 }}>
                {searching ? (
                  <span style={{ width:18, height:18, borderRadius:"50%", border:"2.5px solid rgba(244,123,32,0.25)", borderTopColor:"var(--pea-orange-500)", display:"inline-block", animation:"spin 0.7s linear infinite", flexShrink:0 }} />
                ) : (
                  <Icon name="search" size={19} style={{ color:"var(--pea-purple-500)" }} />
                )}
              </div>
              <input
                className="input input-lg"
                style={{ paddingLeft: 48, paddingRight: query ? 46 : 16, width: "100%", boxSizing: "border-box", transition:"box-shadow 0.25s, border-color 0.25s", ...(searching ? { borderColor:"rgba(244,123,32,0.5)", boxShadow:"0 0 0 3px rgba(244,123,32,0.12)" } : {}) }}
                placeholder={tab === "meter" ? t("phMeter") : t("phTr")}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setShowHistory(true)}
                onBlur={() => setTimeout(() => setShowHistory(false), 180)}
                inputMode="numeric"
                autoFocus
              />
              {query && (
                <button className="btn-icon" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 34, height: 34 }} onClick={() => setQuery("")}>
                  <Icon name="close" size={15} />
                </button>
              )}
              {searching && <div className="sv-search-loading-bar" />}
              {/* Search history dropdown */}
              {showHistory && !query && history.length > 0 && (
                <div style={{
                  position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:500,
                  background:"var(--surface)", border:"1px solid var(--line)", borderRadius:14,
                  boxShadow:"0 8px 28px rgba(0,0,0,0.14)", padding:6, display:"flex", flexDirection:"column", gap:2,
                }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"var(--ink-mute)", padding:"4px 10px 2px", textTransform:"uppercase" }}>ค้นหาล่าสุด</div>
                  {history.map((h, i) => (
                    <button key={i} onMouseDown={() => setQuery(h)} style={{
                      display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:10,
                      background:"transparent", border:"none", cursor:"pointer", color:"var(--text)",
                      fontSize:14, fontWeight:500, textAlign:"left", width:"100%",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background="var(--hover)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      <Icon name="history" size={14} style={{ color:"var(--ink-mute)", flexShrink:0 }} />
                      <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h}</span>
                      <button onMouseDown={e => { e.stopPropagation(); setHistory(p => { const n=p.filter((_,j)=>j!==i); try{localStorage.setItem("pea_search_hist",JSON.stringify(n))}catch{} return n; }); }} style={{ padding:"2px 6px", borderRadius:6, border:"none", background:"transparent", color:"var(--ink-mute)", cursor:"pointer", fontSize:12 }}>✕</button>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter + Export — display:contents on desktop → flow inline in search row */}
            <div className="sv-actions">
              <button className={"search-filter-btn btn btn-outline " + (showFilters ? "active" : "")} onClick={() => setShowFilters(s => !s)} style={{ height: 44, borderRadius: 14, position: "relative", flexShrink: 0 }}>
                <Icon name="filter" size={15} /> {t("filterLabel")}
                {activeFilterCount > 0 && (
                  <span style={{ background: "var(--pea-orange-500)", color: "white", borderRadius: 999, width: 20, height: 20, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>{activeFilterCount}</span>
                )}
              </button>

              {(allowExport || currentUser?.role === "admin") ? (
                <button className="search-export-btn btn btn-outline" style={{ height: 44, borderRadius: 14, flexShrink: 0 }} onClick={handleExport} disabled={results.length === 0}>
                  <Icon name="download" size={15} /> {t("exportLabel")}
                </button>
              ) : (
                <button className="search-export-btn" onClick={() => toast?.(t("exportDisabled"), "error")} style={{
                  height: 44, borderRadius: 14, flexShrink: 0, display: "flex", alignItems: "center",
                  gap: 6, padding: "0 16px", background: "var(--soft)", border: "1px solid var(--soft-border)",
                  color: "var(--ink-mute)", fontSize: 13, fontWeight: 600, cursor: "pointer", userSelect: "none",
                }}>
                  <Icon name="lock" size={15} /> {t("exportLabel")}
                </button>
              )}
            </div>

            {/* Street / Satellite basemap toggle — shows translated label */}
            <div style={{ position: "relative" }}>
              <button
                ref={baseMapBtnRef}
                className="sv-basemap-icon-btn btn btn-outline"
                onClick={() => setShowBaseMenu(m => !m)}
              >
                <Icon name={svBaseMap === "satellite" ? "globe" : "map"} size={16} />
                <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {svBaseMap === "satellite" ? t("baseMapSatellite") : t("baseMapStreet")}
                </span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity:0.45, transition:"transform 0.15s", transform: showBaseMenu ? "rotate(180deg)" : "none" }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showBaseMenu && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 599 }} onClick={() => setShowBaseMenu(false)} />
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 600, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.13)", overflow: "hidden", minWidth: 160 }}>
                    {[
                      { id: "street",    icon: "map",   label: t("baseMapStreet")    },
                      { id: "satellite", icon: "globe", label: t("baseMapSatellite") },
                    ].map(opt => (
                      <div key={opt.id} onClick={() => { setSvBaseMap(opt.id); setShowBaseMenu(false); }}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", cursor:"pointer",
                          background: svBaseMap === opt.id ? "rgba(139,63,196,0.08)" : "transparent",
                          color: svBaseMap === opt.id ? "var(--pea-purple-600)" : "var(--ink)",
                          fontWeight: svBaseMap === opt.id ? 600 : 400, fontSize:14 }}>
                        <Icon name={opt.icon} size={15} />
                        <span style={{ flex:1 }}>{opt.label}</span>
                        {svBaseMap === opt.id && <Icon name="check" size={13} />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
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

      {/* Content — always map */}
      <div className="sv-body sv-map-only" style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>

          {/* Map — always visible */}
          <div style={{ position: "relative", height: "100%", minHeight: 300, overflow: "hidden" }}>
              <MapView
                points={results}
                kind={tab}
                selectedId={selectedId}
                onSelect={(p) => setSelectedId(p.OBJECTID)}
                onNavigate={(p) => setNavTarget(p)}
                baseMap={svBaseMap}
                showHeatmap={showHeatmap}
                showCluster={showCluster}
              />
              {/* Hint overlay before any search */}
              {!hasSearched && (
                <div className="fade-up" style={{
                  position: "absolute", bottom: 28, left: 0, right: 0, zIndex: 500,
                  display: "flex", justifyContent: "center", pointerEvents: "none", padding: "0 16px",
                }}>
                  <div style={{
                    background: "rgba(var(--surface-rgb,255,255,255),0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                    borderRadius: 20, padding: "11px 22px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid rgba(139,63,196,0.18)",
                    fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 9,
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon name="search" size={13} style={{ color: "white" }} />
                    </div>
                    พิมพ์คำค้นหาเพื่อดูตำแหน่งบนแผนที่
                  </div>
                </div>
              )}
              {/* Result count badge */}
              {results.length > 0 && (
                <div key={results.length} className="fade-up" style={{
                  position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 500,
                  background: "var(--surface)", borderRadius: 20, padding: "6px 16px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.18)", border: "1px solid rgba(139,63,196,0.25)",
                  fontSize: 12, fontWeight: 700, color: "var(--pea-purple-600)", whiteSpace: "nowrap",
                  pointerEvents: "none", display: "flex", alignItems: "center", gap: 6,
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  background: "rgba(var(--surface-rgb,255,255,255),0.88)",
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--pea-purple-500)", display: "inline-block", flexShrink: 0 }} />
                  {results.length.toLocaleString()}{results.length >= 500 ? "+" : ""} จุดบนแผนที่
                </div>
              )}
              {allowCorrectCoords && selectedId && (() => {
                const sel = results.find(r => r.OBJECTID === selectedId);
                if (!sel) return null;
                return (
                  <button onClick={() => setCorrTarget({ p: sel, isMeter: tab === "meter" })} style={{
                    position: "absolute", bottom: 24, right: 16, zIndex: 500,
                    display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
                    borderRadius: 14, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg,#f47b20,#d96512)", color: "white",
                    fontWeight: 700, fontSize: 13, boxShadow: "0 4px 18px rgba(244,123,32,0.45)",
                  }}>
                    <Icon name="edit" size={14} /> แจ้งแก้ไขพิกัด
                  </button>
                );
              })()}
            </div>
        </div>
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
      {corrTarget && (
        <CorrSearchModal
          target={corrTarget}
          onClose={() => setCorrTarget(null)}
          onSubmit={async (newLat, newLng, note) => {
            await onCorrectCoords?.(corrTarget.p, corrTarget.isMeter, newLat, newLng, note);
            setCorrTarget(null);
          }}
        />
      )}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange, t }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <PeaSelect style={{ height: 40 }} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{t("fAll")}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </PeaSelect>
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
      style={{
        width: "100%", textAlign: "left",
        padding: "14px 16px",
        background: selected ? "var(--soft)" : "transparent",
        borderLeft: `3px solid ${selected ? (isMeter ? "var(--pea-purple-500)" : "var(--pea-orange-500)") : "transparent"}`,
        borderBottom: "1px solid var(--line)",
        display: "flex", gap: 12,
        animation: `resultStagger 280ms ${Math.min(index * 40, 350)}ms var(--ease-out) both`,
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
  const [displayDist, setDisplayDist] = useStateNav(0);
  const [displayEta, setDisplayEta] = useStateNav(null);

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

  useEffectNav(() => {
    if (distance == null) { setDisplayDist(0); setDisplayEta(null); return; }
    const dur = 900;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayDist(distance * ease);
      setDisplayEta(eta ? Math.round(eta * ease) : null);
      if (p < 1) requestAnimationFrame(tick);
      else { setDisplayDist(distance); setDisplayEta(eta); }
    };
    requestAnimationFrame(tick);
  }, [distance]);

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
              <div className="t-display" style={{ fontSize: 26, fontWeight: 800, animation: displayDist > 0 ? "distCountUp 400ms var(--ease-out) both" : "none" }}>
                {displayDist > 0 ? `${displayDist.toFixed(2)} ${t("kmUnit")}` : distance != null ? `${distance.toFixed(2)} ${t("kmUnit")}` : "—"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.1em" }}>{t("etaLabel")}</div>
              <div className="t-display" style={{ fontSize: 26, fontWeight: 800 }}>
                {displayEta != null ? (displayEta < 60 ? `${displayEta} ${t("minutesUnit")}` : `${Math.floor(displayEta/60)} ${t("hoursUnit")} ${displayEta%60} ${t("minutesUnit")}`) : eta != null ? (eta < 60 ? `${eta} ${t("minutesUnit")}` : `${Math.floor(eta/60)} ${t("hoursUnit")} ${eta%60} ${t("minutesUnit")}`) : "—"}
              </div>
              {eta != null && (
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>
                  คำนวณที่ 40 กม./ชม.
                </div>
              )}
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
                <Icon name="refresh" size={12} /> {t("updatePosBtn")}
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

function CorrSearchModal({ target, onClose, onSubmit }) {
  const { p } = target;
  const [newLat, setNewLat] = useStateS(p.LATITUDE);
  const [newLng, setNewLng] = useStateS(p.LONGITUDE);
  const [note, setNote] = useStateS("");
  const [submitting, setSubmitting] = useStateS(false);
  const [done, setDone] = useStateS(false);
  const [locating, setLocating] = useStateS(false);
  const [gpsError, setGpsError] = useStateS("");

  const useGPS = () => {
    if (!navigator.geolocation) { setGpsError("อุปกรณ์ไม่รองรับ GPS"); return; }
    setLocating(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setNewLat(pos.coords.latitude.toFixed(8));
        setNewLng(pos.coords.longitude.toFixed(8));
        setLocating(false);
      },
      err => {
        setGpsError(err.code === 1 ? "ไม่ได้รับอนุญาตเข้าถึง GPS" : "ไม่สามารถระบุตำแหน่งได้");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const submit = async () => {
    setSubmitting(true);
    await onSubmit(+newLat, +newLng, note);
    setDone(true);
    setSubmitting(false);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fade-in pea-modal-overlay" style={{ zIndex: 9500 }} onClick={onClose}>
      <div className="fade-up" onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 22, width: "100%", maxWidth: 440, boxShadow: "0 28px 72px rgba(0,0,0,0.55)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#1b0926,#d96512)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "white" }}>แจ้งแก้ไขพิกัด</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>{p.PEANO || p.TAG}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.12)", color: "white", display: "grid", placeItems: "center", border: "none", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#10b981", fontWeight: 700, fontSize: 16 }}>✓ ส่งคำขอแล้ว รอ Admin อนุมัติ</div>
          ) : (<>
            {/* GPS button */}
            <button onClick={useGPS} disabled={locating} style={{
              width: "100%", height: 44, marginBottom: 12, borderRadius: 12, border: "1.5px solid rgba(244,123,32,0.4)",
              background: locating ? "rgba(244,123,32,0.06)" : "rgba(244,123,32,0.09)",
              color: "#d96512", fontWeight: 700, fontSize: 13, cursor: locating ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.15s",
            }}>
              {locating ? (
                <>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(244,123,32,0.25)", borderTopColor: "#f47b20", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  กำลังระบุตำแหน่ง…
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
                  </svg>
                  ใช้ตำแหน่ง GPS ปัจจุบัน
                </>
              )}
            </button>
            {gpsError && <div style={{ fontSize: 11, color: "#dc2626", marginBottom: 10, textAlign: "center" }}>{gpsError}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label className="field-label">Latitude ใหม่</label>
                <input className="input" type="number" step="0.00000001" value={newLat} onChange={e => setNewLat(e.target.value)} style={{ height: 38, fontFamily: "monospace" }} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label className="field-label">Longitude ใหม่</label>
                <input className="input" type="number" step="0.00000001" value={newLng} onChange={e => setNewLng(e.target.value)} style={{ height: 38, fontFamily: "monospace" }} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="field-label">หมายเหตุ (ไม่บังคับ)</label>
              <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} style={{ resize: "none", fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1, height: 40 }} onClick={onClose}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ flex: 2, height: 40, background: "linear-gradient(135deg,#f47b20,#d96512)" }} onClick={submit} disabled={submitting}>
                {submitting ? "กำลังส่ง…" : "ส่งคำขอ"}
              </button>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}

window.SearchView = SearchView;
