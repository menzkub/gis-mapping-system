/* global React, Icon, MapView, downloadCSV, EmptyState, useToast, formatThaiDate,
   _supabase, toMeter, toTransformer */
const {
  useState:  useStateS,
  useEffect: useEffectS,
  useRef:    useRefS,
} = React;

/* ============================================================
   SearchView — PEA Meter + PEA TR tabs (server-side search)
   ============================================================ */
function SearchView({ data, baseMap, onLogSearch, currentUser }) {
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
          .sv-title-row { flex-direction: column; gap: 6px; align-items: flex-start; }
          .sv-search-title { font-size: 20px !important; }
          .sv-tabs .tab { font-size: 12px !important; padding: 0 12px !important; height: 34px !important; white-space: nowrap; }
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
            <div className="t-eyebrow">ค้นหาข้อมูล</div>
            <div className="search-title-text sv-search-title t-display" style={{ fontSize: 28, marginTop: 2, display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0 8px" }}>
              <span>{tab === "meter" ? "PEA มิเตอร์" : "PEA หม้อแปลง"}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-mute)" }}>
                {hasSearched
                  ? `${results.length.toLocaleString()}${results.length >= 500 ? "+" : ""} / ${totalCount.toLocaleString()} รายการ`
                  : `${totalCount.toLocaleString()} รายการทั้งหมด`}
              </span>
              {searching && (
                <span style={{ fontSize: 12, color: "var(--pea-purple-500)", fontWeight: 600 }}>
                  กำลังค้นหา…
                </span>
              )}
            </div>
          </div>
          <div className="tabs sv-tabs" style={{ flexShrink: 0 }}>
            <button className={"tab " + (tab === "meter" ? "active" : "")} onClick={() => { setTab("meter"); resetFilters(); setSelectedId(null); setResults([]); setHasSearched(false); }}>
              <Icon name="meter" size={14} /> ค้นหา PEA มิเตอร์
            </button>
            <button className={"tab " + (tab === "tr" ? "active" : "")} onClick={() => { setTab("tr"); resetFilters(); setSelectedId(null); setResults([]); setHasSearched(false); }}>
              <Icon name="tr" size={14} /> ค้นหา PEA หม้อแปลง
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
              placeholder={tab === "meter" ? "พิมพ์ TAG, PEANO, ACCOUNTNUM, Feeder…" : "พิมพ์ TAG, PEANO หม้อแปลง, สถานที่, Feeder…"}
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
              <Icon name="filter" size={15} /> ตัวกรอง
              {activeFilterCount > 0 && (
                <span style={{ background: "var(--pea-orange-500)", color: "white", borderRadius: 999, width: 20, height: 20, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>{activeFilterCount}</span>
              )}
            </button>

            <div className="search-view-switcher tabs" style={{ padding: 4, flexShrink: 0 }}>
              {[
                { id: "split", icon: "layers", label: "Split" },
                { id: "map",   icon: "map",    label: "แผนที่" },
              ].map(v => (
                <button key={v.id} className={"tab " + (view === v.id ? "active" : "")} style={{ height: 46, padding: "0 14px" }} onClick={() => setView(v.id)}>
                  <Icon name={v.icon} size={14} /> {v.label}
                </button>
              ))}
            </div>

            <button className="search-export-btn btn btn-outline" style={{ height: 54, borderRadius: 16, flexShrink: 0 }} onClick={handleExport} disabled={results.length === 0}>
              <Icon name="download" size={15} /> Export
            </button>
          </div>
        </div>

        {/* Filters drawer */}
        {showFilters && (
          <div className="card fade-up" style={{ padding: 16, borderColor: "var(--soft-border)", background: "var(--soft)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
              <FilterSelect label="Feeder" value={filters.feeder} options={data.feeders} onChange={v => setFilters(f => ({ ...f, feeder: v }))} />
              <FilterSelect label="เจ้าของ" value={filters.owner} options={["PEA", "Customer"]} onChange={v => setFilters(f => ({ ...f, owner: v }))} />
              {tab === "meter" && (
                <FilterSelect label="CODE" value={filters.code} options={["AFAG", "ACPK"]} onChange={v => setFilters(f => ({ ...f, code: v }))} />
              )}
              {tab === "tr" && (
                <>
                  <FilterSelect label="ระบบเฟส" value={filters.phase} options={["หม้อแปลง 1 Phase", "หม้อแปลง 3 Phase"]} onChange={v => setFilters(f => ({ ...f, phase: v }))} />
                  <FilterSelect label="แรงดัน" value={filters.voltage} options={["22 kV", "33 kV"]} onChange={v => setFilters(f => ({ ...f, voltage: v }))} />
                  <div className="field">
                    <label className="field-label">kVA ต่ำสุด</label>
                    <input className="input" style={{ height: 40 }} type="number" value={filters.minKva} onChange={e => setFilters(f => ({ ...f, minKva: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="field">
                    <label className="field-label">kVA สูงสุด</label>
                    <input className="input" style={{ height: 40 }} type="number" value={filters.maxKva} onChange={e => setFilters(f => ({ ...f, maxKva: e.target.value }))} placeholder="∞" />
                  </div>
                </>
              )}
              <div className="f-col" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-ghost btn-sm" onClick={resetFilters}><Icon name="close" size={14} /> ล้างตัวกรอง</button>
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
                พิมพ์รหัสเพื่อค้นหา
              </div>
              <div className="t-mute text-sm">
                {tab === "meter"
                  ? `ค้นหาจาก ${totalCount.toLocaleString()} มิเตอร์ · พิมพ์ TAG, PEANO, ACCOUNTNUM หรือ Feeder`
                  : `ค้นหาจาก ${totalCount.toLocaleString()} หม้อแปลง · พิมพ์ TAG, PEANO, สถานที่ หรือ Feeder`}
              </div>
              <div className="t-mute text-xs" style={{ marginTop: 8 }}>หรือเลือกตัวกรองด้านบนเพื่อดูข้อมูลทั้งกลุ่ม</div>
            </div>
          </div>
        ) : searching ? (
          /* Loading state */
          <div className="card" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, margin: "0 auto 16px", background: "linear-gradient(135deg,#6b2c91,#f47b20)", display: "grid", placeItems: "center", animation: "pea-spin 1.2s linear infinite" }}>
                <Icon name="search" size={22} style={{ color: "white" }} />
              </div>
              <div className="fw-6">กำลังค้นหา…</div>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="card" style={{ height: "100%" }}>
            <EmptyState title="ไม่พบข้อมูลที่ค้นหา" hint="ลองพิมพ์รหัสบางส่วน หรือเปลี่ยน/ล้างตัวกรอง" />
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
              <div className="t-eyebrow" style={{ color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>ยืนยันการส่งออก</div>
              <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>Export {tab === "meter" ? "PEA มิเตอร์" : "PEA หม้อแปลง"}</div>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 16px", background: "var(--soft)", borderRadius: 14, marginBottom: 16, border: "1px solid var(--soft-border)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6b2c91,#f47b20)", display: "grid", placeItems: "center", color: "white", flexShrink: 0, boxShadow: "0 8px 22px rgba(107,44,145,0.35)" }}>
                  <Icon name="download" size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{results.length.toLocaleString()}</div>
                  <div className="t-mute" style={{ fontSize: 13, marginTop: 2 }}>รายการที่จะส่งออก</div>
                </div>
              </div>
              <div className="t-mute" style={{ fontSize: 13, marginBottom: 14 }}>
                บันทึกเป็นไฟล์ CSV · <span className="mono" style={{ fontSize: 12 }}>pea-{tab}-export.csv</span>
              </div>
              {results.length >= 500 && (
                <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#ffe7d4", border: "1px solid #f9b27a", marginBottom: 14 }}>
                  <Icon name="warning" size={14} style={{ color: "var(--pea-orange-600)", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: "var(--pea-orange-700)", lineHeight: 1.5 }}>ผลลัพธ์ถูกจำกัดที่ 500 รายการ — พิมพ์คำค้นหาเพิ่มเพื่อลดจำนวน</span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                <button className="btn btn-outline" style={{ height: 48 }} onClick={() => setShowExportDialog(false)}>ยกเลิก</button>
                <button className="btn btn-primary" style={{ height: 48 }} onClick={doExport}>
                  <Icon name="download" size={15} /> ส่งออก
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

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <select className="input" style={{ height: 40 }} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">ทั้งหมด</option>
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
  return (
    <div className="t-mute text-xs" style={{ padding: "10px 16px", textAlign: "center", borderTop: "1px solid var(--line)" }}>
      แสดง {count} รายการแรก — พิมพ์คำค้นหาเพิ่มเติมเพื่อจำกัดผลลัพธ์
    </div>
  );
}

function ResultCard({ item: p, kind, selected, onClick, onNavigate, index, copyCoords, copied }) {
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
              <Icon name="navigation" size={12} /> นำทาง
            </button>
            <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.LATITUDE},${p.LONGITUDE}`, "_blank"); }}>
              <Icon name="map" size={12} /> Google
            </button>
            <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); window.open(`https://maps.apple.com/?daddr=${p.LATITUDE},${p.LONGITUDE}`, "_blank"); }}>
               Apple
            </button>
            <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); copyCoords(p.LATITUDE, p.LONGITUDE, p.OBJECTID); }} style={{ color: copied === p.OBJECTID ? "var(--green)" : undefined }}>
              <Icon name={copied === p.OBJECTID ? "check" : "copy"} size={12} />
              {copied === p.OBJECTID ? "คัดลอกแล้ว!" : `${p.LATITUDE.toFixed(5)}, ${p.LONGITUDE.toFixed(5)}`}
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
  const isMeter = kind === "meter";
  const dest = { lat: target.LATITUDE, lng: target.LONGITUDE };
  const [gpsState, setGpsState] = useStateNav("loading"); // loading | ok | denied
  const [userPos, setUserPos] = useStateNav(null);

  const doGPS = () => {
    setGpsState("loading");
    setUserPos(null);
    if (!navigator.geolocation) { setGpsState("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsState("ok");
      },
      () => setGpsState("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  useEffectNav(() => { doGPS(); }, []);

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
    ? "กำลังค้นหาตำแหน่ง…"
    : gpsState === "ok"
      ? `ตำแหน่งปัจจุบัน (${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)})`
      : "ไม่ทราบตำแหน่ง — กด ลองอีกครั้ง";

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
            <div className="t-eyebrow" style={{ color: "rgba(255,255,255,0.85)" }}>ระบบนำทาง</div>
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
              <div style={{ fontSize: 12, opacity: 0.75 }}>จุดเริ่มต้น</div>
              <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                {gpsState === "loading" && (
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "pea-spin 0.8s linear infinite" }} />
                )}
                {originLabel}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>ปลายทาง</div>
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
              <div style={{ fontSize: 11, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.1em" }}>ระยะทาง</div>
              <div className="t-display" style={{ fontSize: 26, fontWeight: 800 }}>
                {distance != null ? `${distance.toFixed(2)} กม.` : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.1em" }}>เวลาโดยประมาณ (รถยนต์)</div>
              <div className="t-display" style={{ fontSize: 26, fontWeight: 800 }}>
                {eta != null ? (eta < 60 ? `${eta} นาที` : `${Math.floor(eta/60)} ชม. ${eta%60} นาที`) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* GPS status */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)" }}>
          {gpsState === "loading" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-mute)" }}>
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--line)", borderTopColor: "var(--pea-purple-500)", animation: "pea-spin 0.8s linear infinite" }} />
              กำลังค้นหาตำแหน่ง GPS…
            </div>
          )}
          {gpsState === "ok" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
              <span>✓</span> ได้รับตำแหน่ง GPS แล้ว — ระยะทางคำนวณจากตำแหน่งปัจจุบัน
            </div>
          )}
          {gpsState === "denied" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
              <span style={{ color: "#f97316" }}>⚠</span>
              <span style={{ color: "var(--ink-mute)", flex: 1 }}>ไม่สามารถรับ GPS ได้ — กรุณาอนุญาตการเข้าถึงตำแหน่ง</span>
              <button onClick={doGPS} className="btn btn-outline" style={{ fontSize: 12, padding: "4px 12px", height: 30, flexShrink: 0 }}>
                <Icon name="refresh" size={12} /> ลองอีกครั้ง
              </button>
            </div>
          )}
        </div>

        {/* Map buttons */}
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => window.open(googleUrl, "_blank")}>
            <Icon name="map" size={14} /> Google Maps
          </button>
          <button className="btn btn-outline" onClick={() => window.open(appleUrl, "_blank")}>
            <Icon name="map" size={14} /> Apple Maps
          </button>
        </div>
      </div>
    </div>
  );
}

window.SearchView = SearchView;
