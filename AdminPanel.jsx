/* global React, Icon, StatCard, Modal, downloadCSV, useToast, useConfirm, formatThaiDate,
   _supabase, fromMeter, fromTransformer, fromProfilePatch, toMeter, toTransformer, toProfile, useLang */
const {
  useState:  useStateAd,
  useEffect: useEffectAd,
} = React;

/* ============================================================
   AdminPanel — dashboard, users, meters, transformers, import, audit
   ============================================================ */
function AdminPanel({ data, setData, currentUser, addAudit, tab, setTab, maintenanceMode, setMaintenanceMode, maintenanceMessage, setMaintenanceMessage, maintenanceUntil, setMaintenanceUntil, devInfo, setDevInfo, allowExport, setAllowExport, pushPermission, subscribePush, unsubscribePush }) {
  const { t } = useLang();
  const NAV_LABELS = {
    dashboard: t("admDashboard"), users: t("admUsers"), meters: t("admMeters"),
    trs: t("admTrs"), map: t("admMap"),
    import: t("admImport"), audit: t("admAudit"), settings: t("admSettings"),
    guide: t("admGuide"), security: t("admSecurity"),
    dev: t("admDev"),
  };
  const pendingCount = data.users.filter(u => u.status === "pending").length;
  const MOB_NAV = [
    { id:"dashboard", icon:"dashboard", label:t("admDashboard")  },
    { id:"users",     icon:"users",     label:t("admUsers")      },
    { id:"meters",    icon:"meter",     label:t("admMobMeters")  },
    { id:"trs",       icon:"tr",        label:t("admMobTrs")     },
    { id:"map",       icon:"map",       label:t("admMobMap")     },
    { id:"import",    icon:"upload",    label:t("admMobImport")  },
    { id:"audit",     icon:"history",   label:t("admMobAudit")    },
    { id:"security",  icon:"lock",      label:t("admMobSecurity") },
    { id:"settings",  icon:"settings",  label:t("admSettings")    },
    { id:"guide",     icon:"book",      label:t("admMobGuide")    },
    { id:"dev",       icon:"code",      label:t("admMobDev")      },
  ];

  return (
    <div className="f-col" style={{ height: "100%", overflow: "hidden" }}>
      <style>{`
        .adm-body { flex: 1; overflow: auto; padding: 16px 20px 28px; }
        .adm-body.adm-map-body { padding: 0 !important; overflow: hidden !important; }
        @keyframes adm-spin { to { transform: rotate(360deg); } }
        .adm-spin { animation: adm-spin 1.2s linear infinite; }
        /* Mobile admin tab bar */
        .adm-mob-tabs { display: none; }
        @media (max-width: 640px) {
          .adm-body { padding: 10px 12px 20px; }
          .adm-mob-tabs {
            display: flex; overflow-x: auto; gap: 4px;
            padding: 8px 12px; border-bottom: 1px solid var(--line);
            scrollbar-width: none; flex-shrink: 0;
          }
          .adm-mob-tabs::-webkit-scrollbar { display: none; }
          .adm-mob-tab {
            display: flex; flex-direction: column; align-items: center; gap: 3px;
            padding: 6px 12px; border-radius: 10px; flex-shrink: 0;
            font-size: 11px; font-weight: 700;
            color: var(--ink-mute); border: 1px solid transparent;
            cursor: pointer; white-space: nowrap; position: relative;
            transition: all 140ms;
          }
          .adm-mob-tab.on {
            background: linear-gradient(135deg,rgba(244,123,32,0.14),rgba(139,63,196,0.14));
            border-color: rgba(244,123,32,0.35); color: var(--ink);
          }
          .adm-mob-badge {
            position: absolute; top: 3px; right: 5px;
            background: var(--pea-orange-500); color: white;
            border-radius: 99px; min-width: 14px; height: 14px;
            font-size: 8px; font-weight: 800;
            display: flex; align-items: center; justify-content: center; padding: 0 3px;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: "14px 20px 0", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pea-orange-500)", letterSpacing: "0.14em", textTransform: "uppercase" }}>{t("adminEyebrow")}</div>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{NAV_LABELS[tab] || t("adminDefault")}</div>
      </div>

      {/* Mobile-only horizontal tab bar */}
      <div className="adm-mob-tabs">
        {MOB_NAV.map(n => (
          <button key={n.id} className={"adm-mob-tab" + (tab === n.id ? " on" : "")} onClick={() => setTab(n.id)}>
            <Icon name={n.icon} size={16} />
            {n.label}
            {n.id === "users" && pendingCount > 0 && (
              <span className="adm-mob-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className={"adm-body" + (tab === "map" ? " adm-map-body" : "")}>
        {tab === "dashboard" && <AdminDashboard data={data} />}
        {tab === "users"     && <AdminUsers  data={data} setData={setData} addAudit={addAudit} currentUser={currentUser} />}
        {tab === "meters"    && <AdminMeters data={data} setData={setData} addAudit={addAudit} currentUser={currentUser} />}
        {tab === "trs"       && <AdminTrs    data={data} setData={setData} addAudit={addAudit} currentUser={currentUser} />}
        {tab === "map"       && <AdminMapTab data={data} currentUser={currentUser} addAudit={addAudit} />}
        {tab === "import"    && <AdminImport data={data} setData={setData} addAudit={addAudit} currentUser={currentUser} />}
        {tab === "audit"     && <AdminAudit />}
        {tab === "security"  && <AdminSecurity data={data} />}
        {tab === "settings"  && <AdminSettings
          maintenanceMode={maintenanceMode} setMaintenanceMode={setMaintenanceMode}
          maintenanceMessage={maintenanceMessage} setMaintenanceMessage={setMaintenanceMessage}
          maintenanceUntil={maintenanceUntil} setMaintenanceUntil={setMaintenanceUntil}
          addAudit={addAudit} currentUser={currentUser}
          devInfo={devInfo} setDevInfo={setDevInfo}
          allowExport={allowExport} setAllowExport={setAllowExport}
          pushPermission={pushPermission} subscribePush={subscribePush} unsubscribePush={unsubscribePush} />}
        {tab === "guide"     && <AdminGuide />}
        {tab === "dev"       && currentUser.role === "admin" && <AdminDevGuide />}
      </div>
    </div>
  );
}

/* ---------- Dashboard — all stats from data.dashStats (server aggregates) ---------- */
function fmtStat(n) {
  if (n >= 1e8) return (n / 1e6).toFixed(0) + "ล.";
  if (n >= 1e7) return (n / 1e6).toFixed(1) + "ล.";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "ล.";
  return n.toLocaleString();
}

function AdminDashboard({ data }) {
  const { t } = useLang();
  const s = data.dashStats || {};
  const meterCount = +(s.meter_count  || 0);
  const trCount    = +(s.tr_count     || 0);
  const totalKva   = +(s.total_kva    || 0);
  const peaMeters  = +(s.pea_meters   || 0);
  // Fix: custMeters = anything not counted as PEA (handles NULL/unclassified rows)
  const custMeters = Math.max(+(s.cust_meters || 0), meterCount - peaMeters);
  const peaTr      = +(s.pea_tr       || 0);
  const custTr     = +(s.cust_tr      || 0);

  const feederStats = (s.top_feeders || []).map(f => [f.feeder, +f.n]);

  const grandTotal = meterCount + trCount;
  const donutSegs = [
    { v: peaMeters,  color: "#8b3fc4", label: "PEA Meter",  glow: "rgba(139,63,196,0.6)" },
    { v: custMeters, color: "#c084fc", label: "Cust. Meter", glow: "rgba(192,132,252,0.4)" },
    { v: peaTr,      color: "#f47b20", label: "PEA TR",      glow: "rgba(244,123,32,0.6)" },
    { v: custTr,     color: "#fbbf24", label: "Cust. TR",    glow: "rgba(251,191,36,0.4)" },
  ];

  return (
    <div className="f-col f-gap-4 fade-up">
      <style>{`
        .db-stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
        .db-mid-grid  { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
        .db-donut-wrap { display: flex; align-items: center; gap: 24px; }
        @keyframes dbLegBar { from { width: 0 } }
        @keyframes dbSegIn  { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:none } }
        @keyframes dbNumUp  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        /* iPad */
        @media (min-width: 641px) and (max-width: 1024px) {
          .db-stat-grid { grid-template-columns: repeat(3,1fr); gap: 12px; }
          .db-mid-grid  { grid-template-columns: 1fr 1fr; gap: 14px; }
          .db-donut-wrap { flex-direction: column; gap: 16px; }
        }
        @media (max-width: 640px) {
          .db-stat-grid { grid-template-columns: repeat(3,1fr); gap: 8px; }
          .db-mid-grid  { grid-template-columns: 1fr; }
          .db-donut-wrap { flex-direction: column; align-items: stretch; gap: 16px; }
        }
      `}</style>

      {/* Stat cards — 3 cols (removed Users) */}
      <div className="db-stat-grid">
        <StatCard label={t("dbMeters")} value={fmtStat(meterCount)} delta={4} icon="meter" accent="purple" />
        <StatCard label={t("dbTrs")}    value={fmtStat(trCount)}    delta={2} icon="tr"    accent="orange" />
        <StatCard label={t("dbKva")}    value={fmtStat(totalKva)}   delta={6} icon="bolt"  accent="blue" />
      </div>

      {/* Feeder + Donut */}
      <div className="db-mid-grid">
        <div className="card card-elev">
          <div className="f-between" style={{ marginBottom: 16 }}>
            <div>
              <div className="t-eyebrow">{t("dbDist")}</div>
              <div className="text-lg fw-7">{t("dbByFeeder")}</div>
            </div>
            <div className="badge badge-purple">{t("dbTop")} {feederStats.length}</div>
          </div>
          {feederStats.length === 0 ? (
            <div className="t-mute text-sm">{t("dbNoFeeder")}</div>
          ) : (
            <div className="f-col f-gap-3">
              {feederStats.map(([f, n], i) => {
                const pct = (n / feederStats[0][1]) * 100;
                return (
                  <div key={f} style={{ animation: `fade-up 320ms ${i * 50}ms both` }}>
                    <div className="f-between" style={{ marginBottom: 4 }}>
                      <div className="fw-6 text-sm">{f}</div>
                      <div className="t-mute text-sm">{n.toLocaleString()} {t("dbItems")}</div>
                    </div>
                    <div style={{ height: 8, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: "linear-gradient(90deg,var(--pea-purple-600),var(--pea-orange-500))", animation: `dbLegBar 700ms ${i * 60 + 200}ms var(--ease-out) both`, transition: "width 600ms var(--ease-out)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Premium Donut card */}
        <div className="card card-elev" style={{ background: "linear-gradient(145deg, var(--surface) 0%, var(--soft) 100%)" }}>
          <div style={{ marginBottom: 18 }}>
            <div className="t-eyebrow" style={{ marginBottom: 2 }}>สัดส่วนตามประเภท</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{grandTotal.toLocaleString()} <span className="t-mute" style={{ fontSize: 13, fontWeight: 500 }}>รายการ</span></div>
          </div>
          <div className="db-donut-wrap">
            <PremiumDonut segs={donutSegs} grandTotal={grandTotal} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {donutSegs.map((seg, i) => (
                <DonutLegendRow key={seg.label} seg={seg} total={grandTotal} delay={i * 80} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <DbUsageCard />
    </div>
  );
}

// ── Supabase Database Usage Card ─────────────────────────────────────────
function DbUsageCard() {
  const DB_TABLES = [
    { key: "meters",      table: "meters",                 label: "PEA มิเตอร์",       color: "#6b2c91", kb: 1.5 },
    { key: "trs",         table: "transformers",           label: "PEA หม้อแปลง",      color: "#f47b20", kb: 1.5 },
    { key: "profiles",    table: "profiles",               label: "ผู้ใช้งาน",          color: "#10b981", kb: 0.5 },
    { key: "audit",       table: "audit_log",              label: "Audit Log",          color: "#64748b", kb: 0.4 },
    { key: "push",        table: "push_subscriptions",     label: "Push Subscriptions", color: "#8b5cf6", kb: 2.0 },
    { key: "corrections", table: "coordinate_corrections", label: "คำขอแก้ไขพิกัด",  color: "#0ea5e9", kb: 0.5 },
    { key: "settings",    table: "settings",               label: "Settings",           color: "#94a3b8", kb: 0.1 },
  ];
  const FREE_LIMIT_MB = 500;

  const [counts, setCounts] = useStateAd(null);
  const [loading, setLoading] = useStateAd(true);
  const [refreshedAt, setRefreshedAt] = useStateAd(null);

  async function load() {
    setLoading(true);
    const result = {};
    await Promise.all(DB_TABLES.map(async t => {
      try {
        const { count, error } = await _supabase.from(t.table).select("*", { count: "exact", head: true });
        result[t.key] = error ? null : (count ?? 0);
      } catch (_) { result[t.key] = null; }
    }));
    setCounts(result);
    setRefreshedAt(new Date());
    setLoading(false);
  }

  useEffectAd(() => { load(); }, []);

  const totalEstKb  = counts ? DB_TABLES.reduce((a, t) => a + ((counts[t.key] ?? 0) * t.kb), 0) : 0;
  const totalEstMb  = totalEstKb / 1024;
  const pct         = Math.min((totalEstMb / FREE_LIMIT_MB) * 100, 100);
  const barColor    = pct < 50 ? "#10b981" : pct < 75 ? "#f59e0b" : "#ef4444";
  const barGradient = pct < 50
    ? "linear-gradient(90deg,#059669,#10b981,#34d399)"
    : pct < 75
    ? "linear-gradient(90deg,#d97706,#f59e0b,#fcd34d)"
    : "linear-gradient(90deg,#dc2626,#ef4444,#f87171)";

  const maxEstKb = counts
    ? Math.max(...DB_TABLES.map(t => (counts[t.key] ?? 0) * t.kb), 1)
    : 1;

  return (
    <div className="card card-elev" style={{ overflow: "hidden", position: "relative" }}>
      {/* Subtle glow bg */}
      <div style={{ position:"absolute", top:-60, right:-60, width:260, height:260, borderRadius:"50%",
                    background:`radial-gradient(circle, ${barColor}20 0%, transparent 65%)`, pointerEvents:"none" }} />

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div className="t-eyebrow" style={{ color:"var(--pea-orange-500)", marginBottom:4 }}>SUPABASE</div>
          <div style={{ fontWeight:900, fontSize:24, letterSpacing:"-0.03em", lineHeight:1 }}>Database Usage</div>
        </div>
        {/* Refresh + timestamp inline */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <button onClick={load} disabled={loading} style={{
            display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:20,
            background:"var(--surface-2)", border:"1px solid var(--line)",
            cursor: loading ? "default" : "pointer", fontSize:13, fontWeight:700,
            color:"var(--pea-purple-500)", opacity: loading ? 0.6 : 1, transition:"opacity 200ms, box-shadow 160ms",
            boxShadow: loading ? "none" : "0 2px 8px rgba(107,44,145,0.15)",
          }}>
            <Icon name="refresh" size={14} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
            รีเฟรช
          </button>
          {refreshedAt && (
            <span style={{ fontSize:11, color:"var(--ink-mute)", fontWeight:600 }}>
              อัปเดต {refreshedAt.toLocaleTimeString("th-TH")}
            </span>
          )}
        </div>
      </div>

      {/* ── Big storage gauge ── */}
      <div style={{ background:"var(--soft)", border:"1px solid var(--soft-border)", borderRadius:18, padding:"18px 20px", marginBottom:22 }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--ink-mute)", marginBottom:4 }}>
              ประมาณการพื้นที่ใช้งาน
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
              <span style={{ fontWeight:900, fontSize:36, letterSpacing:"-0.04em", color: barColor, lineHeight:1 }}>
                {loading ? "—" : totalEstMb.toFixed(1)}
              </span>
              <span style={{ fontWeight:700, fontSize:16, color:"var(--ink-mute)" }}>MB</span>
              <span style={{ fontWeight:600, fontSize:14, color:"var(--ink-mute)" }}>/ {FREE_LIMIT_MB} MB</span>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontWeight:900, fontSize:28, letterSpacing:"-0.03em", color: barColor, lineHeight:1 }}>
              {loading ? "—" : `${pct.toFixed(1)}%`}
            </div>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--ink-mute)", marginTop:2 }}>
              {pct < 50 ? "ปกติ" : pct < 75 ? "ระวัง" : "เต็มใกล้"}
            </div>
          </div>
        </div>
        {/* Thick gradient bar */}
        <div style={{ height:16, background:"var(--line-2)", borderRadius:999, overflow:"hidden", position:"relative" }}>
          <div style={{
            height:"100%", width: loading ? "0%" : `${pct}%`, borderRadius:999,
            background: barGradient, transition:"width 900ms cubic-bezier(.22,1,.36,1)",
            boxShadow: `0 0 12px ${barColor}66`,
          }} />
        </div>
        <div className="t-mute" style={{ fontSize:11, marginTop:8 }}>
          * ประมาณจาก row count — ดูจริงที่{" "}
          <span style={{ color:"var(--pea-purple-500)", fontWeight:700 }}>Supabase Dashboard → Database → Storage</span>
        </div>
      </div>

      {/* ── Per-table breakdown ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {DB_TABLES.map(t => {
          const c      = counts?.[t.key];
          const estKb  = (c ?? 0) * t.kb;
          const estMb  = estKb / 1024;
          const rowPct = Math.min((estKb / maxEstKb) * 100, 100);
          return (
            <div key={t.key} style={{
              padding:"12px 14px", borderRadius:14,
              background:"var(--surface-2)", border:`1px solid var(--line)`,
              borderLeft:`3.5px solid ${t.color}`,
              transition:"box-shadow 200ms",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--ink-mute)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{t.label}</span>
                {!loading && c !== null && c > 0 && (
                  <span style={{ fontSize:10, fontWeight:700, color: t.color, marginLeft:4, flexShrink:0 }}>
                    {estMb < 1 ? `~${(estKb).toFixed(0)}KB` : `~${estMb.toFixed(1)}MB`}
                  </span>
                )}
              </div>
              <div style={{ fontWeight:900, fontSize:20, letterSpacing:"-0.03em", color: c === null ? "var(--ink-mute)" : "var(--ink)", lineHeight:1, marginBottom:8 }}>
                {loading ? <span className="t-mute" style={{fontSize:14}}>…</span> : c === null ? "—" : c.toLocaleString()}
              </div>
              {/* Mini proportion bar */}
              <div style={{ height:4, background:"var(--line)", borderRadius:999, overflow:"hidden" }}>
                <div style={{
                  height:"100%", width: loading ? "0%" : `${rowPct}%`,
                  background: t.color, borderRadius:999,
                  transition:"width 900ms cubic-bezier(.22,1,.36,1)",
                  opacity: 0.85,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutLegendRow({ seg, total, delay }) {
  const pct = total > 0 ? (seg.v / total) * 100 : 0;
  return (
    <div style={{ animation: `dbSegIn 320ms ${delay}ms var(--ease-out) both` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: seg.color, boxShadow: `0 0 6px ${seg.glow}`, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{seg.label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", fontFamily: "'IBM Plex Mono',monospace", animation: `dbNumUp 400ms ${delay + 100}ms both` }}>
          {seg.v.toLocaleString()}
        </span>
      </div>
      <div style={{ height: 5, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 999,
          background: `linear-gradient(90deg, ${seg.color}, ${seg.glow.replace("0.", "0.7").replace(")", ")")})`,
          boxShadow: `0 0 6px ${seg.glow}`,
          animation: `dbLegBar 700ms ${delay + 150}ms var(--ease-out) both`,
          width: `${pct}%`,
        }} />
      </div>
      <div style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 2, textAlign: "right" }}>{pct.toFixed(1)}%</div>
    </div>
  );
}

function PremiumDonut({ segs, grandTotal }) {
  const total = segs.reduce((s, x) => s + x.v, 0) || 1;
  const R = 52; const W = 16; const C = 2 * Math.PI * R;
  const GAP = 2.5;
  const activeSegs = segs.filter(s => s.v > 0);
  const usableC = C - GAP * activeSegs.length;
  let offset = 0;
  const rendered = segs.map((s) => {
    if (s.v <= 0) return null;
    const len = (s.v / total) * usableC;
    const el = { ...s, len, offset };
    offset += len + GAP;
    return el;
  }).filter(Boolean);

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <svg viewBox="0 0 140 140" width="140" height="140" style={{ overflow: "visible", display: "block" }}>
        <defs>
          {rendered.map((s, i) => (
            <radialGradient key={i} id={`dg${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={s.color} stopOpacity="1" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.75" />
            </radialGradient>
          ))}
        </defs>
        {/* Track */}
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line)" strokeWidth={W} />
        {/* Segments */}
        {rendered.map((s, i) => (
          <circle key={i} cx="70" cy="70" r={R} fill="none"
            stroke={s.color}
            strokeWidth={W}
            strokeDasharray={`${s.len} ${C - s.len}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 70 70)"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 5px ${s.glow})`,
              animation: `dbSegIn 500ms ${i * 100 + 100}ms var(--ease-out) both`,
            }}
          />
        ))}
        {/* Center */}
        <text x="70" y="65" textAnchor="middle" style={{ fontSize: 20, fontWeight: 900, fill: "var(--ink)", letterSpacing: "-0.02em", animation: "dbNumUp 500ms 400ms both" }}>
          {grandTotal.toLocaleString()}
        </text>
        <text x="70" y="80" textAnchor="middle" style={{ fontSize: 8, fill: "var(--ink-mute)", fontWeight: 700, letterSpacing: "0.14em" }}>TOTAL</text>
      </svg>
    </div>
  );
}

function ExportDialog({ open, onClose, onConfirm, count, filename, label }) {
  const { t } = useLang();
  if (!open) return null;
  return (
    <div className="fade-in pea-modal-overlay" style={{ zIndex: 9000 }} onClick={onClose}>
      <div className="fade-up" onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--surface)", borderRadius: 24, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
        <div style={{ padding: "22px 24px 18px", background: "linear-gradient(135deg,#6b2c91 0%,#8b3fc4 60%,#f47b20 130%)", color: "white", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -30, top: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <div className="t-eyebrow" style={{ color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>{t("confirmExportTitle")}</div>
          <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>Export {label}</div>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 16px", background: "var(--soft)", borderRadius: 14, marginBottom: 16, border: "1px solid var(--soft-border)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6b2c91,#f47b20)", display: "grid", placeItems: "center", color: "white", flexShrink: 0, boxShadow: "0 8px 22px rgba(107,44,145,0.35)" }}>
              <Icon name="download" size={22} />
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{count.toLocaleString()}</div>
              <div className="t-mute" style={{ fontSize: 13, marginTop: 2 }}>{t("itemsToExport")}</div>
            </div>
          </div>
          <div className="t-mute" style={{ fontSize: 13, marginBottom: 14 }}>
            {t("exportAsCSV")} · <span className="mono" style={{ fontSize: 12 }}>{filename}</span>
          </div>
          {count >= 500 && (
            <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#ffe7d4", border: "1px solid #f9b27a", marginBottom: 14 }}>
              <Icon name="warning" size={14} style={{ color: "var(--pea-orange-600)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: "var(--pea-orange-700)", lineHeight: 1.5 }}>{t("exportCap500")}</span>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
            <button className="btn btn-outline" style={{ height: 48 }} onClick={onClose}>{t("cancel")}</button>
            <button className="btn btn-primary" style={{ height: 48 }} onClick={onConfirm}>
              <Icon name="download" size={15} /> {t("exportLabel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Guide ---------- */
const GUIDE_VERSION = { version: "v3.0", date: "1 มิ.ย. 2569" };

function GuideSection({ icon, title, badge, children, expandSignal }) {
  const [open, setOpen] = useStateAd(false);
  useEffectAd(() => {
    if (expandSignal && expandSignal.count > 0) setOpen(expandSignal.open);
  }, [expandSignal]);
  return (
    <div style={{ borderRadius: 16, border: "1px solid var(--line)", overflow: "hidden", marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px", background: open ? "linear-gradient(135deg,rgba(139,63,196,0.07),rgba(244,123,32,0.05))" : "var(--surface)",
        border: "none", cursor: "pointer", textAlign: "left", transition: "background 180ms",
      }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6b2c91,#f47b20)", display: "grid", placeItems: "center", color: "white", flexShrink: 0 }}>
          <Icon name={icon} size={16} />
        </span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>{title}</span>
        {badge && <span className="badge badge-purple" style={{ fontSize: 11 }}>{badge}</span>}
        <Icon name={open ? "chevDown" : "chevRight"} size={16} style={{ color: "var(--ink-mute)", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: "4px 18px 18px 18px", borderTop: "1px solid var(--line)", background: "var(--soft)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function GuideStep({ n, text }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
      <span style={{ minWidth: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#6b2c91,#f47b20)", color: "white", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>{n}</span>
      <span style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>{text}</span>
    </div>
  );
}

function GuideTip({ children }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(244,123,32,0.08)", border: "1px solid rgba(244,123,32,0.2)", marginTop: 10 }}>
      <Icon name="tip" size={15} style={{ color: "var(--pea-orange-500)", flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function GuideNote({ children }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(139,63,196,0.07)", border: "1px solid rgba(139,63,196,0.18)", marginTop: 10 }}>
      <Icon name="info" size={15} style={{ color: "var(--pea-purple-500)", flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function GuideTable({ rows }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "rgba(139,63,196,0.08)" }}>
            {rows[0].map((h, i) => <th key={i} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, r) => (
            <tr key={r} style={{ borderBottom: "1px solid var(--line)" }}>
              {row.map((cell, c) => <td key={c} style={{ padding: "7px 12px", lineHeight: 1.5 }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminGuide() {
  const { lang } = useLang();
  const s = (th, en) => lang === "en" ? en : th;
  const [expandSig, setExpandSig] = useStateAd({ count: 0, open: false });
  const expandAll   = () => setExpandSig(s => ({ count: s.count + 1, open: true }));
  const collapseAll = () => setExpandSig(s => ({ count: s.count + 1, open: false }));
  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ borderRadius: 20, background: "linear-gradient(135deg,#6b2c91 0%,#8b3fc4 55%,#f47b20 130%)", color: "white", padding: "24px 28px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="book" size={26} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>{s("คู่มือการใช้งานระบบ", "System User Manual")}</div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>GIS Meter & Transformer</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>{s("สำหรับผู้ดูแลระบบ — ครอบคลุมทุก Role และทุก Feature", "For administrators — covers all roles and features")}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                <Icon name="history" size={10} /> {s("อัปเดตล่าสุด:", "Last updated:")} {GUIDE_VERSION.date}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                <Icon name="package" size={10} /> {GUIDE_VERSION.version}
              </span>
            </div>
          </div>
        </div>
        {/* Expand/Collapse buttons */}
        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          <button onClick={expandAll} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "white", borderRadius: 8, padding: "6px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
            <Icon name="chevDown" size={13} /> {s("ขยายทั้งหมด","Expand All")}
          </button>
          <button onClick={collapseAll} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "white", borderRadius: 8, padding: "6px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
            <Icon name="chevRight" size={13} /> {s("ยุบทั้งหมด","Collapse All")}
          </button>
        </div>
      </div>

      {/* ─── SECTION: บทบาทผู้ใช้งาน ─── */}
      <GuideSection icon="users" title={s("บทบาทผู้ใช้งาน (Role)", "User Roles")} badge={s("ภาพรวม", "Overview")} expandSignal={expandSig}>
        <div style={{ marginTop: 10 }}>
          <GuideTable rows={[
            ["Role", s("สิทธิ์การใช้งาน", "Permissions"), s("สถานะที่เข้าได้", "Allowed Status")],
            ["user", s("ค้นหา Meter/TR · ดูแผนที่ · GPS นำทาง · โปรไฟล์ตัวเอง · Export CSV", "Search Meter/TR · Map view · GPS navigation · Profile · Export CSV"), s("active เท่านั้น", "active only")],
            ["admin", s("ทุกอย่างของ user + จัดการข้อมูล + ผู้ใช้งาน + นำเข้า + Audit + ตั้งค่า", "All user features + data management + users + import + audit + settings"), s("active เท่านั้น", "active only")],
          ]} />
          <GuideTable rows={[
            [s("สถานะบัญชี", "Account Status"), s("ความหมาย", "Meaning")],
            ["pending", s("รอ Admin อนุมัติ — ยังเข้าระบบไม่ได้", "Awaiting admin approval — cannot log in yet")],
            ["active", s("ใช้งานได้ปกติ", "Normal access")],
            ["banned", s("ถูกระงับ — เข้าระบบไม่ได้", "Suspended — cannot log in")],
          ]} />
        </div>
      </GuideSection>

      {/* ─── SECTION: เข้าสู่ระบบ ─── */}
      <GuideSection icon="lock" title={s("การเข้าสู่ระบบ & สมัครสมาชิก", "Login & Registration")} badge="user · admin" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{s("สมัครสมาชิก", "Register")}</div>
          <GuideStep n={1} text={s("คลิก 'สมัครสมาชิก' บนหน้า Login", "Click 'Register' on the Login page")} />
          <GuideStep n={2} text={s("กรอกชื่อ-นามสกุล, ชื่อผู้ใช้, อีเมล, และรหัสผ่าน (ต้องมีตัวพิมพ์ใหญ่ + ตัวเลข + อักขระพิเศษ)", "Enter name, username, email, and password (must include uppercase + number + special character)")} />
          <GuideStep n={3} text={s("กด 'สมัครสมาชิก' — บัญชีจะมีสถานะ 'pending' รอ Admin อนุมัติ", "Click 'Register' — account will be 'pending' until admin approves")} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("เข้าสู่ระบบ", "Login")}</div>
          <GuideStep n={1} text={s("กรอกอีเมลและรหัสผ่าน แล้วกด 'เข้าสู่ระบบ'", "Enter email and password, then click 'Sign In'")} />
          <GuideStep n={2} text={s("หากเปิด 2FA ไว้ — ระบบจะขอรหัส 6 หลักจาก Authenticator App", "If 2FA is enabled — enter the 6-digit code from your Authenticator App")} />
          <GuideStep n={3} text={s("ติ๊ก 'จดจำฉันไว้ 7 วัน' เพื่อไม่ต้องล็อกอินบ่อย", "Check 'Remember me for 7 days' to stay logged in longer")} />
          <GuideTip>{s("ลืมรหัสผ่าน? กดลิงก์ 'ลืมรหัสผ่าน' ระบบจะส่ง link รีเซ็ตไปยังอีเมล", "Forgot password? Click 'Forgot password' — a reset link will be sent to your email")}</GuideTip>
          <GuideNote>{s("ระบบออกจากระบบอัตโนมัติหลังไม่ใช้งาน 30 นาที", "System auto-logs out after 30 minutes of inactivity")}</GuideNote>
        </div>
      </GuideSection>

      {/* ─── SECTION: ค้นหาข้อมูล ─── */}
      <GuideSection icon="search" title={s("ค้นหาข้อมูล Meter / Transformer", "Search Meter / Transformer")} badge="user · admin" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{s("ค้นหา PEA มิเตอร์", "Search PEA Meter")}</div>
          <GuideStep n={1} text={s("เลือกแท็บ 'PEA Meter' ในหน้าค้นหา", "Select the 'PEA Meter' tab on the Search page")} />
          <GuideStep n={2} text={s("พิมพ์คำค้นหา: TAG, PEANO, ACCOUNTNUM, หรือ Feeder ID — ระบบค้นหาอัตโนมัติ", "Type to search: TAG, PEANO, ACCOUNTNUM, or Feeder ID — auto-search")} />
          <GuideStep n={3} text={s("กรองเพิ่มเติม: เลือก Feeder, เจ้าของ (PEA/Customer), หรือ CODE", "Additional filters: Feeder, Owner (PEA/Customer), or CODE")} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("ค้นหา PEA หม้อแปลง", "Search PEA Transformer")}</div>
          <GuideStep n={1} text={s("เลือกแท็บ 'PEA Transformer'", "Select the 'PEA Transformer' tab")} />
          <GuideStep n={2} text={s("พิมพ์คำค้นหา: TAG, PEANO, สถานที่, หรือ Feeder", "Type to search: TAG, PEANO, Location, or Feeder")} />
          <GuideStep n={3} text={s("กรองเพิ่มเติม: ระบบเฟส, แรงดัน (22/33 kV), kVA ต่ำสุด-สูงสุด", "Additional filters: Phase, Voltage (22/33 kV), min-max kVA")} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("Export ผลการค้นหา", "Export Results")}</div>
          <GuideStep n={1} text={s("กดปุ่ม 'Export' — Dialog จะแสดงจำนวนรายการที่จะส่งออก", "Click 'Export' — a dialog shows the number of items to export")} />
          <GuideStep n={2} text={s("กด 'Export' อีกครั้งเพื่อดาวน์โหลดเป็นไฟล์ CSV", "Click 'Export' again to download as a CSV file")} />
          <GuideTip>{s("ผลลัพธ์ถูกจำกัดสูงสุด 500 รายการ — พิมพ์คำค้นหาเพิ่มเพื่อลดจำนวน", "Results are capped at 500 — refine your search to reduce the count")}</GuideTip>
        </div>
      </GuideSection>

      {/* ─── SECTION: แผนที่ ─── */}
      <GuideSection icon="map" title={s("แผนที่และการนำทาง GPS", "Map & GPS Navigation")} badge="user · admin" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            [s("ฟีเจอร์", "Feature"), s("วิธีใช้", "How to use")],
            [s("สลับ Street/Satellite", "Street/Satellite"), s("กด dropdown มุมมองแผนที่บน Topbar → เลือก Street หรือ Satellite", "Press basemap dropdown on Topbar → choose Street or Satellite")],
            ["Cluster", s("กดปุ่ม Cluster บนแผนที่ — รวมกลุ่ม marker ให้ดูง่าย", "Click Cluster on map — groups markers for clarity")],
            ["Heatmap", s("กดปุ่ม Heatmap — แสดงความหนาแน่นพื้นที่", "Click Heatmap — shows density overlay")],
            ["Split View", s("กดปุ่ม Split — ตารางและแผนที่อยู่คู่กัน", "Click Split — table and map side by side")],
            [s("คัดลอกพิกัด", "Copy Coordinates"), s("คลิกที่ marker → กดปุ่ม Copy พิกัด lat/lng", "Click marker → Copy lat/lng coordinates")],
            [s("แจ้งแก้ไขพิกัด", "Report Coords"), s("คลิก marker → กด 'แจ้งแก้ไขพิกัด' → วางพิกัดใหม่ → ส่ง", "Click marker → 'Report Coords' → place new pin → submit")],
            [s("ตำแหน่งฉัน (Admin แผนที่)", "My Location (Admin Map)"), s("กดปุ่ม 'ตำแหน่งฉัน' ในแถบควบคุม Admin → แผนที่บินไป GPS ปัจจุบัน + หมุดสีน้ำเงิน", "Press 'My Location' in Admin map controls → map flies to GPS position + blue accuracy pin")],
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("นำทาง GPS", "GPS Navigation")}</div>
          <GuideStep n={1} text={s("คลิก marker บนแผนที่ หรือกดปุ่มนำทางในตาราง", "Click a marker on the map or the navigate button in the table")} />
          <GuideStep n={2} text={s("ระบบขอสิทธิ์ตำแหน่งปัจจุบันจาก browser — กด 'Allow'", "Browser requests location permission — click 'Allow'")} />
          <GuideStep n={3} text={s("ระบบคำนวณระยะทางและเวลาโดยประมาณ", "System calculates estimated distance and travel time")} />
          <GuideStep n={4} text={s("กด 'นำทาง' เพื่อเปิด Google Maps หรือ Apple Maps", "Click 'Navigate' to open Google Maps or Apple Maps")} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("แจ้งแก้ไขพิกัดที่ไม่ถูกต้อง", "Reporting Wrong Coordinates")}</div>
          <GuideStep n={1} text={s("คลิก marker ที่พิกัดไม่ถูกต้อง → กด 'แจ้งแก้ไขพิกัด' ใน popup", "Click marker with wrong coords → press 'Report Coords' in popup")} />
          <GuideStep n={2} text={s("กด '📡 ใช้ตำแหน่งปัจจุบัน (GPS)' เพื่อรับพิกัดจาก GPS ของอุปกรณ์", "Press '📡 Use Current Location (GPS)' to get device GPS coords")} />
          <GuideStep n={3} text={s("หรือลากหมุดสีเขียวบนแผนที่ย่อย หรือกดตรงจุดที่ต้องการ", "Or drag the green pin on mini-map, or tap the target location")} />
          <GuideStep n={4} text={s("ใส่หมายเหตุ (ถ้ามี) แล้วกด 'ส่งคำขอแก้ไข' — Admin ต้องอนุมัติก่อนพิกัดจะถูกอัปเดต", "Add a note (optional) → 'Submit Correction' — Admin must approve before coords are updated")} />
          <GuideTip>{s("Admin อนุมัติผ่าน แผนที่ภาพรวม → ปุ่ม '📋 คำขอแก้ไข' — พิกัดอัปเดต DB ทันทีเมื่ออนุมัติ", "Admin approves via Overview Map → '📋 Correction Requests' — coords update DB immediately on approval")}</GuideTip>
        </div>
      </GuideSection>

      {/* ─── SECTION: โปรไฟล์ ─── */}
      <GuideSection icon="user" title={s("โปรไฟล์ & ความปลอดภัยส่วนตัว", "Profile & Security")} badge="user · admin" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            [s("แท็บ", "Tab"), s("รายละเอียด", "Details")],
            [s("ข้อมูล", "Info"), s("ดูชื่อ, ชื่อผู้ใช้, อีเมล, บทบาท, วันที่สมัคร — แก้ไขชื่อได้", "View name, username, email, role, join date — name editable")],
            [s("รหัสผ่าน", "Password"), s("สถานะรหัสผ่าน (progress bar + วันหมดอายุ) · ประวัติการเปลี่ยนรหัส · สถานะ 2FA (read-only)", "Password status (progress bar + expiry) · change history · 2FA status (read-only)")],
            [s("การใช้งาน", "Activity"), s("ประวัติ login/logout, เปลี่ยนรหัส, 2FA พร้อม device info", "Login/logout history, password changes, 2FA with device info")],
            [s("การค้นหา", "Search"), s("ประวัติค้นหา Meter/TR พร้อม timestamp", "Meter/TR search history with timestamps")],
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("แท็บ \"รหัสผ่าน\" — รายละเอียด", "Password Tab — Details")}</div>
          <GuideStep n={1} text={s("การ์ดสถานะแสดง progress bar (วันที่ใช้ไปจาก 45 วัน), วันที่เปลี่ยนล่าสุด, วันหมดอายุ", "Status card shows progress bar (days used of 45), last changed date, expiry date")} />
          <GuideStep n={2} text={s("รายการ 'ประวัติการเปลี่ยนรหัสผ่าน' แสดงทุกครั้งที่มีการเปลี่ยน พร้อมวันที่และหมายเหตุ", "Password history list shows every change with date and notes")} />
          <GuideStep n={3} text={s("สีการ์ดเปลี่ยนตามสถานะ: เขียว (ปกติ) → เหลือง (≤7 วัน) → แดง (≤3 วัน / หมดอายุ)", "Card color changes by status: green (normal) → yellow (≤7 days) → red (≤3 days / expired)")} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("สถานะ 2FA (TOTP)", "2FA Status (TOTP)")}</div>
          <GuideStep n={1} text={s("แท็บ 'รหัสผ่าน' แสดงสถานะ 2FA — เปิดอยู่ / ปิดอยู่ (อ่านอย่างเดียว)", "Password tab shows 2FA status — Enabled / Disabled (read-only)")} />
          <GuideStep n={2} text={s("การเปิด/ปิด 2FA ดำเนินการโดย Admin เท่านั้น ผ่าน Admin → จัดการผู้ใช้งาน", "Enabling/disabling 2FA is done by Admin only via Admin → User Management")} />
          <GuideNote>{s("เมื่อ Admin เปิด 2FA — ระบบจะให้สแกน QR Code ตอน Login ครั้งถัดไปโดยอัตโนมัติ", "When Admin enables 2FA — system will prompt QR Code scan on next login automatically")}</GuideNote>
          <GuideTip>{s("2FA ใช้แอป Google Authenticator หรือ Authy สแกน QR Code จากหน้าตั้งค่าที่ปรากฏตอน Login", "2FA uses Google Authenticator or Authy — scan QR Code from the setup screen shown at login")}</GuideTip>
        </div>
      </GuideSection>

      {/* ─── SECTION: Dashboard ─── */}
      <GuideSection icon="dashboard" title="Dashboard (Admin)" badge="admin only" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            [s("การ์ด", "Card"), s("ข้อมูลที่แสดง", "Displayed Data")],
            [s("มิเตอร์ทั้งหมด", "Total Meters"), s("จำนวน PEA Meter ในระบบ", "Number of PEA Meters in the system")],
            [s("หม้อแปลงทั้งหมด", "Total Transformers"), s("จำนวน PEA Transformer ในระบบ", "Number of PEA Transformers in the system")],
            [s("กำลัง (kVA)", "Capacity (kVA)"), s("ผลรวม kVA ของหม้อแปลงทั้งหมด", "Total kVA of all transformers")],
            [s("ผู้ใช้งาน", "Users"), s("จำนวน user ทั้งหมด (active + pending)", "Total users (active + pending)")],
          ]} />
          <GuideNote>{s("ข้อมูล Dashboard โหลดจาก Supabase RPC ทุกครั้งที่กด Refresh หรือเข้าหน้า Dashboard", "Dashboard data loads from Supabase RPC each time you Refresh or open the Dashboard")}</GuideNote>
        </div>
      </GuideSection>

      {/* ─── SECTION: จัดการผู้ใช้งาน ─── */}
      <GuideSection icon="users" title={s("จัดการผู้ใช้งาน (Admin)", "User Management (Admin)")} badge="admin only" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            ["Action", s("ผลลัพธ์", "Result")],
            [s("คลิกแถวผู้ใช้", "Click user row"), s("เปิด popup ข้อมูลส่วนตัว + สถานะรหัสผ่าน + ประวัติการเปลี่ยนรหัส", "Opens popup: personal info + password status + change history")],
            [s("อนุมัติ", "Approve"), s("เปลี่ยนสถานะจาก pending → active (ผู้ใช้เข้าระบบได้)", "Change status from pending → active (user can log in)")],
            [s("ระงับ", "Suspend"), s("เปลี่ยนสถานะเป็น banned (ผู้ใช้เข้าระบบไม่ได้)", "Change status to banned (user cannot log in)")],
            [s("ปลดระงับ", "Unsuspend"), s("เปลี่ยนสถานะจาก banned → active", "Change status from banned → active")],
            [s("เปลี่ยน Role", "Change Role"), s("สลับระหว่าง user ↔ admin (2FA เปิด/ปิดอัตโนมัติตาม role)", "Toggle between user ↔ admin (2FA auto-enabled for admin)")],
            [s("เปิด/ปิด 2FA", "Enable/Disable 2FA"), s("คลิก toggle 2FA ในแถว (พร้อมกด confirm) — เปิด 2FA = ผู้ใช้ต้องสแกน QR ตอน Login ครั้งถัดไป", "Click 2FA toggle in row (confirm required) — Enable 2FA = user must scan QR on next login")],
            [s("ปลดล็อครหัสผ่าน", "Unlock Password"), s("กดปุ่ม 'ปลดล็อค' เมื่อรหัสหมดอายุ — ผู้ใช้ต้องเปลี่ยนรหัสเมื่อ login", "Click 'Unlock' when password expired — user must change password on next login")],
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("Popup ข้อมูลผู้ใช้ (คลิกแถว)", "User Detail Popup (click row)")}</div>
          <GuideStep n={1} text={s("คลิกที่แถวใดก็ได้ในตาราง — popup แสดงอีเมล, สถานะ, บทบาท, 2FA, เข้าล่าสุด, วันสมัคร", "Click any row — popup shows email, status, role, 2FA, last login, join date")} />
          <GuideStep n={2} text={s("การ์ดสถานะรหัสผ่านแสดง progress bar + วันใช้ไป/45 วัน + วันหมดอายุ", "Password status card shows progress bar + days used/45 + expiry date")} />
          <GuideStep n={3} text={s("รายการประวัติการเปลี่ยนรหัสผ่านแสดงครบทุกครั้งพร้อมวันที่", "Full password change history list with dates")} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("ระบบรหัสผ่านหมดอายุ (45 วัน)", "Password Expiry System (45 days)")}</div>
          <GuideTable rows={[
            [s("สถานะ", "Status"), s("ความหมาย", "Meaning")],
            [s("🟢 XX วัน", "🟢 XX days"), s("รหัสผ่านปกติ ยังใช้ได้", "Password valid, OK")],
            [s("🟡 ≤ 7 วัน", "🟡 ≤ 7 days"), s("ใกล้หมดอายุ — user เห็น warning banner", "Expiring soon — user sees warning banner")],
            [s("🔴 หมดอายุ + ปลดล็อค", "🔴 Expired + Unlock"), s("กดปลดล็อค → pw_force_change=true", "Click Unlock → pw_force_change=true")],
            [s("🟡 ต้องเปลี่ยน", "🟡 Must change"), s("Admin ปลดล็อคแล้ว รอ user เข้ามาเปลี่ยนรหัส", "Admin unlocked — waiting for user to change password")],
          ]} />
          <GuideTip>{s("มีผู้ใช้ pending — ระบบจะแสดง badge จำนวนที่ปุ่ม bell บน Topbar", "Pending users — system shows a badge count on the bell button in Topbar")}</GuideTip>
        </div>
      </GuideSection>

      {/* ─── SECTION: จัดการ Meter/TR ─── */}
      <GuideSection icon="meter" title={s("จัดการ PEA มิเตอร์ & หม้อแปลง (Admin)", "Manage PEA Meters & Transformers (Admin)")} badge="admin only" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            ["Action", s("วิธีใช้", "How to use")],
            [s("ค้นหา", "Search"), s("พิมพ์ในช่อง search — ระบบโหลดสูงสุด 100 รายการแรก", "Type in the search box — loads up to 100 records")],
            [s("เพิ่ม", "Add"), s("กดปุ่ม '+เพิ่ม' — กรอกข้อมูลในฟอร์ม แล้วกด 'บันทึก'", "Click '+Add' — fill in the form, then click 'Save'")],
            [s("แก้ไข", "Edit"), s("กดปุ่มดินสอในแถวนั้น — แก้ไขแล้วกด 'บันทึก'", "Click the pencil button in the row — edit then click 'Save'")],
            [s("ลบ", "Delete"), s("กดปุ่มถังขยะ — ยืนยันใน Confirm Dialog ก่อนลบ", "Click the trash button — confirm in the dialog before deleting")],
            ["Export CSV", s("กดปุ่ม Export — Dialog แสดงจำนวน แล้วกด Export เพื่อดาวน์โหลด", "Click Export — dialog shows count, then click Export to download")],
          ]} />
          <GuideNote>{s("ทุกการเปลี่ยนแปลงถูกบันทึกใน Audit Log อัตโนมัติ", "All changes are automatically recorded in the Audit Log")}</GuideNote>
        </div>
      </GuideSection>

      {/* ─── SECTION: Import CSV ─── */}
      <GuideSection icon="upload" title={s("นำเข้าข้อมูล CSV (Admin)", "Import CSV Data (Admin)")} badge="admin only" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideStep n={1} text={s("เลือกประเภทข้อมูล: PEA Meter หรือ PEA Transformer", "Select data type: PEA Meter or PEA Transformer")} />
          <GuideStep n={2} text={s("ลากหรือคลิกเพื่ออัปโหลดไฟล์ CSV (UTF-8)", "Drag or click to upload a CSV file (UTF-8 encoding)")} />
          <GuideStep n={3} text={s("ตรวจสอบ Preview 10 แถวแรก — ตรวจสอบหัวคอลัมน์ให้ถูกต้อง", "Check the first 10-row preview — verify column headers are correct")} />
          <GuideStep n={4} text={s("กด 'นำเข้าข้อมูล' เพื่อยืนยัน — ระบบ upsert ตาม OBJECTID (500 rows/รอบ)", "Click 'Import' to confirm — system upserts by OBJECTID (500 rows/batch)")} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("หัวคอลัมน์ CSV ที่รองรับ", "Supported CSV Column Headers")}</div>
          <div style={{ background: "var(--surface)", borderRadius: 10, padding: "10px 14px", fontFamily: "monospace", fontSize: 12, lineHeight: 1.8, border: "1px solid var(--line)" }}>
            <div style={{ color: "var(--pea-purple-500)", fontWeight: 700 }}>Meter:</div>
            <div>OBJECTID, TAG, CODE, ROUTE, ACCOUNTNUM, PEANO, FEEDERID, OWNER, INSTALLATI, LATITUDE, LONGITUDE</div>
            <div style={{ color: "var(--pea-purple-500)", fontWeight: 700, marginTop: 6 }}>Transformer:</div>
            <div>OBJECTID, TAG, PHASE, VOLTAGE, PEANO_TR, INSTALL_PHASE, KVA, OWNER_TR, LOCATION, FEEDER1, LATITUDE, LONGITUDE, PEA_METER</div>
          </div>
          <GuideTip>{s("ถ้า OBJECTID ซ้ำ ระบบจะ update ข้อมูลเดิม (upsert) ไม่ได้สร้างรายการใหม่", "If OBJECTID already exists, the system updates the existing record (upsert) instead of creating a new one")}</GuideTip>
        </div>
      </GuideSection>

      {/* ─── SECTION: Audit Log ─── */}
      <GuideSection icon="history" title="Audit Log (Admin)" badge="admin only" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            [s("Action ที่บันทึก", "Recorded Actions"), s("ตัวอย่าง", "Example")],
            ["login / logout", s("เข้า-ออกระบบ", "Login / logout")],
            ["search_meter / search_tr", s("ค้นหาข้อมูล", "Search data")],
            ["create / update / delete", s("เพิ่ม แก้ไข ลบ Meter/TR", "Add, edit, delete Meter/TR")],
            ["import_csv / export_csv", s("นำเข้า/ส่งออกข้อมูล", "Import/export data")],
            ["change_password", s("เปลี่ยนรหัสผ่าน (บันทึกใน password_history ด้วย)", "Password change (also recorded in password_history)")],
            ["reset_password_initiated", s("เปิดหน้ารีเซ็ตรหัสผ่านผ่านลิงก์อีเมล", "Opened reset page via email link")],
            ["reset_password_failed", s("รีเซ็ตรหัสผ่านไม่สำเร็จ", "Password reset failed")],
            ["enable_2fa / disable_2fa", s("เปิด/ปิด 2FA", "Enable/disable 2FA")],
            ["approve_user / ban_user", s("อนุมัติ/ระงับผู้ใช้งาน", "Approve/suspend users")],
            ["unlock_password", s("Admin ปลดล็อครหัสผ่านหมดอายุ", "Admin unlocked expired password")],
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("การกรองข้อมูล", "Filtering")}</div>
          <GuideStep n={1} text={s("กรองตาม user, ประเภท action, หรือช่วงวันที่", "Filter by user, action type, or date range")} />
          <GuideStep n={2} text={s("กด Export เพื่อดาวน์โหลด log หน้านั้นเป็น CSV", "Click Export to download the current page as CSV")} />
          <GuideNote>{s("Audit Log แบ่งหน้า 50 รายการต่อหน้า — ใช้ปุ่มลูกศรเลื่อนหน้า", "Audit Log paginates at 50 items per page — use arrow buttons to navigate")}</GuideNote>
        </div>
      </GuideSection>

      {/* ─── SECTION: ตั้งค่าระบบ ─── */}
      <GuideSection icon="settings" title={s("ตั้งค่าระบบ (Admin)", "System Settings (Admin)")} badge="admin only" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Maintenance Mode</div>
          <GuideStep n={1} text={s("เปิด Toggle 'Maintenance Mode' — ผู้ใช้ทั่วไปจะเห็นหน้า 'ระบบปิดปรับปรุง'", "Enable 'Maintenance Mode' toggle — regular users will see the maintenance page")} />
          <GuideStep n={2} text={s("แก้ไขข้อความแจ้งผู้ใช้ตามต้องการ แล้วกด 'บันทึกข้อความ'", "Edit the message shown to users, then click 'Save Message'")} />
          <GuideStep n={3} text={s("กดปุ่มปฏิทิน → เลือกวันด้วยปฏิทินไทย (พ.ศ.) นำทาง ← → เดือน", "Click calendar button → pick date in Thai calendar (BE), navigate ← → months")} />
          <GuideStep n={4} text={s("ปรับชั่วโมง/นาทีด้วยปุ่ม +/− (นาทีเพิ่มทีละ 5) → กด 'ยืนยัน'", "Adjust hour/minute with +/− buttons (minute steps by 5) → click 'Confirm'")} />
          <GuideNote>{s("Admin ยังคงเข้าใช้ระบบได้ปกติ — เห็น banner แจ้งเตือนสีแดงบน Topbar", "Admins can still access the system — a red warning banner appears on the Topbar")}</GuideNote>
          <GuideTip>{s("อย่าลืมปิด Maintenance Mode หลังงานเสร็จ — กดปุ่ม 'เปิดระบบ' ใน banner ได้เลย", "Remember to disable Maintenance Mode — click 'Enable System' in the banner")}</GuideTip>
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("ข้อมูลนักพัฒนาระบบ", "Developer Info")}</div>
          <GuideStep n={1} text={s("กรอกชื่อ, ตำแหน่ง, หน่วยงาน, สถานที่ ในการ์ด 'ข้อมูลนักพัฒนาระบบ'", "Fill in name, position, department, location in the Developer Info card")} />
          <GuideStep n={2} text={s("เปิด Toggle 'แสดงปุ่มนักพัฒนา' — ปุ่มลอยจะปรากฏมุมหน้าจอ", "Enable 'Show Developer Button' — a floating button appears on screen")} />
          <GuideStep n={3} text={s("ผู้ใช้ทุกคนสามารถลากปุ่มไปวางตำแหน่งที่ต้องการ — ระบบจำตำแหน่งไว้", "Any user can drag the button to a preferred position — position is saved")} />
          <GuideNote>{s("ทั้ง Maintenance Mode และข้อมูลนักพัฒนา สามารถย่อ/ขยายได้โดยกดหัวการ์ด", "Both Maintenance Mode and Developer Info cards can be collapsed/expanded")}</GuideNote>
        </div>
      </GuideSection>

      {/* ─── SECTION: ประวัติ UX/UI ─── */}
      <GuideSection icon="bolt" title={s("ประวัติการปรับปรุง UX/UI", "UX/UI Changelog")} badge="admin only" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            [s("รายการ", "Item"), s("รายละเอียด", "Details")],
            [s("ตำแหน่ง", "Location"), s("Sidebar ไอคอน ⚡ 'อัปเดต' — เฉพาะ Admin", "Sidebar ⚡ 'อัปเดต' icon — Admin only")],
            [s("ข้อมูล", "Data"), s("Timeline ทุก version พร้อมวันที่และ category chip", "Timeline of all versions with dates and category chips")],
            [s("Category", "Category"), s("ใหม่ (เขียว) / UX/UI (ม่วง) / แก้ไข (น้ำเงิน) / ประสิทธิภาพ (ส้ม)", "new · UX/UI · fix · perf")],
            [s("Deploy Status dot", "Deploy Status dot"), s("จุดสีใน Topbar คลิกดู popup: 🟢 ปัจจุบัน / 🟡 รอ Deploy / ⚫ โหลด", "Colored dot in Topbar: 🟢 up-to-date / 🟡 pending / ⚫ loading")],
            [s("Deployment Status card", "Deployment Status card"), s("การ์ดเปรียบเทียบ hash ที่รันบนเว็บ vs GitHub latest", "Card comparing deployed hash vs GitHub latest commit")],
          ]} />
          <GuideStep n={1} text={s("กดแท็บ 'อัปเดต ⚡' ใน sidebar — เห็นได้เฉพาะ Admin", "Click 'อัปเดต ⚡' in sidebar — visible to Admin only")} />
          <GuideStep n={2} text={s("การ์ด Deployment Status ด้านบน timeline แสดงสถานะ deploy ปัจจุบัน", "Deployment Status card above timeline shows current deploy state")} />
          <GuideStep n={3} text={s("กดจุดสีใน Topbar ดู popup สถานะ deploy ได้ทันทีโดยไม่ต้องเปิดหน้า อัปเดต", "Click the status dot in Topbar to see deploy status popup instantly")} />
          <GuideStep n={4} text={s("Timeline dot สี = สีประจำ version — ล่าสุดมี badge 'ล่าสุด' สีเขียว", "Timeline dot color = version color — latest has green 'ล่าสุด' badge")} />
          <GuideTip>{s("เพิ่ม version ใหม่ใน CHANGELOG array (app.jsx) + อัปเดต version.json ทุกครั้งที่ push", "Add new version in CHANGELOG array (app.jsx) + update version.json on every push")}</GuideTip>
        </div>
      </GuideSection>

      {/* ─── SECTION: UI ─── */}
      <GuideSection icon="sun" title={s("การตั้งค่า UI", "UI Settings")} badge="user · admin" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            [s("ปุ่ม", "Button"), s("ตำแหน่ง", "Location"), s("ฟังก์ชัน", "Function")],
            ["🌙 / ☀️", s("Topbar ขวา", "Topbar right"), s("สลับโหมดมืด/สว่าง (จำค่าไว้ใน browser)", "Toggle dark/light mode (saved in browser)")],
            ["TH / EN", s("Topbar ขวา", "Topbar right"), s("สลับภาษาไทย/อังกฤษ", "Switch Thai/English language")],
            ["🔄 Refresh", s("Topbar ขวา", "Topbar right"), s("โหลดข้อมูลใหม่โดยไม่ต้อง reload หน้า", "Reload data without refreshing the page")],
            [s("⚫/🟢/🟡 dot", "⚫/🟢/🟡 dot"), s("Topbar ขวา (admin only)", "Topbar right (admin only)"), s("คลิกดูสถานะ deploy — ปัจจุบัน / รอ Deploy / โหลด", "Click to see deploy status — current / pending / loading")],
            ["🔔 Bell", s("Topbar ขวา", "Topbar right"), s("แจ้งเตือน pending users + กิจกรรมล่าสุด", "Notifications for pending users + recent activity")],
          ]} />
        </div>
      </GuideSection>
    </div>
  );
}

/* ---------- Developer Documentation ---------- */
function CodeBlock({ children }) {
  return (
    <pre style={{
      background: "#150f24", color: "#d4bbf7", borderRadius: 10,
      padding: "12px 16px", fontSize: 12, lineHeight: 1.7,
      overflowX: "auto", margin: "10px 0", fontFamily: "'IBM Plex Mono','Courier New',monospace",
      border: "1px solid rgba(139,63,196,0.35)",
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    }}>{children}</pre>
  );
}

function DevBadge({ color, children }) {
  const colors = {
    purple: { bg: "rgba(139,63,196,0.12)", border: "rgba(139,63,196,0.3)", text: "var(--pea-purple-600)" },
    orange: { bg: "rgba(244,123,32,0.12)", border: "rgba(244,123,32,0.3)", text: "var(--pea-orange-600)" },
    green:  { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.3)", text: "#047857" },
    blue:   { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.3)", text: "#1d4ed8" },
    gray:   { bg: "rgba(107,102,133,0.10)", border: "rgba(107,102,133,0.2)", text: "var(--ink-mute)" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700,
      background:c.bg, border:`1px solid ${c.border}`, color:c.text, marginLeft:4, verticalAlign:"middle" }}>
      {children}
    </span>
  );
}

function AdminDevGuide() {
  const { lang } = useLang();
  const s = (th, en) => lang === "en" ? en : th;
  const guideRef = React.useRef(null);
  const [pdfLoading, setPdfLoading] = useStateAd(false);

  function downloadGuide() {
    const el = guideRef.current;
    if (!el || pdfLoading || typeof html2pdf === "undefined") return;
    expandAll();
    setPdfLoading(true);
    setTimeout(() => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll("button").forEach(b => b.remove());
      clone.querySelectorAll("[style]").forEach(node => {
        const s = node.style;
        if (s.overflow === "hidden" && (s.maxHeight === "0px" || s.height === "0px")) {
          s.overflow = "visible"; s.maxHeight = "none"; s.height = "auto";
        }
      });
      clone.style.cssText += ";width:820px;max-width:820px;margin:0;";
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:fixed;left:0;top:0;width:820px;pointer-events:none;z-index:2147483647;overflow:visible;background:#0d0714;";
      wrap.appendChild(clone);
      document.body.appendChild(wrap);
      document.body.style.overflow = "visible";
      const cleanup = (w) => { document.body.removeChild(w); document.body.style.overflow = ""; setPdfLoading(false); };
      html2pdf().set({
        margin: [10, 8, 10, 8],
        filename: "DevGuide-GIS-Meter.pdf",
        image: { type: "jpeg", quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#0d0714", windowWidth: 820 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: [".card", "li"] },
      }).from(clone).save()
        .then(() => cleanup(wrap))
        .catch(() => cleanup(wrap));
    }, 450);
  }

  const [expandSig, setExpandSig] = useStateAd({ count: 0, open: false });
  const expandAll   = () => setExpandSig(s => ({ count: s.count + 1, open: true }));
  const collapseAll = () => setExpandSig(s => ({ count: s.count + 1, open: false }));

  return (
    <div ref={guideRef} style={{ maxWidth: 860, margin: "0 auto" }}>
      <style>{`
        .dg-hero  { padding: 24px 28px; }
        .dg-title { font-size: 22px; font-weight: 800; line-height: 1.2; }
        .dg-sgrid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-top: 16px; }
        .dg-btns  { display: flex; gap: 8px; margin-top: 14px; align-items: center; }
        @media (max-width: 520px) {
          .dg-hero  { padding: 16px; }
          .dg-title { font-size: 17px; }
          .dg-sgrid { grid-template-columns: repeat(2,1fr) !important; gap: 8px; }
        }
      `}</style>
      {/* Hero */}
      <div className="dg-hero" style={{ borderRadius: 20, background: "linear-gradient(135deg,#1b0926 0%,#321148 50%,#4f1e6e 100%)", color: "white", marginBottom: 20, position: "relative", overflow: "hidden", border: "1px solid rgba(139,63,196,0.3)" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(139,63,196,0.12)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(139,63,196,0.25)", border: "1px solid rgba(139,63,196,0.4)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="code" size={26} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Developer Documentation</div>
            <div className="dg-title">GIS Meter & Transformer</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{s("คู่มือสำหรับนักพัฒนา — โครงสร้างโค้ด, ฐานข้อมูล, API และ Helpers", "Developer guide — code structure, database, API and helpers")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          {["React 18","Babel Standalone","Supabase","Leaflet 1.9","GitHub Pages"].map(label => (
            <span key={label} style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)"
            }}>{label}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}>
            <Icon name="history" size={10} /> {s("อัปเดตล่าสุด:", "Last updated:")} {GUIDE_VERSION.date}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}>
            <Icon name="package" size={10} /> {GUIDE_VERSION.version}
          </span>
        </div>

        {/* Stat cards */}
        <div className="dg-sgrid">
          {[
            { label: s("หัวข้อ","Sections"),       value: 15, icon: "book",     sub: "sections" },
            { label: s("ไฟล์ระบบ","Files"),        value: 13, icon: "package",  sub: "source files" },
            { label: s("ตาราง DB","DB Tables"),    value: 7,  icon: "database", sub: "tables" },
            { label: s("ตัวอย่างโค้ด","Code Blocks"), value: 18, icon: "code",  sub: "code blocks" },
          ].map(({ label, value, icon, sub }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "11px 13px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 5, minHeight: 34 }}>
                <Icon name={icon} size={12} style={{ color: "rgba(255,255,255,0.5)", marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", lineHeight: 1.35 }}>{label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Toggle expand/collapse + Download — single row */}
        <div className="dg-btns">
          <button onClick={expandSig.open ? collapseAll : expandAll} style={{ background: "rgba(139,63,196,0.2)", border: "1px solid rgba(139,63,196,0.4)", color: "white", borderRadius: 8, padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
            <Icon name={expandSig.open ? "chevRight" : "chevDown"} size={13} />
            {expandSig.open ? s("ยุบทั้งหมด","Collapse All") : s("ขยายทั้งหมด","Expand All")}
          </button>
          <button onClick={downloadGuide} disabled={pdfLoading} style={{ background: "rgba(139,63,196,0.25)", border: "1px solid rgba(139,63,196,0.5)", color: "white", borderRadius: 8, padding: "7px 14px", cursor: pdfLoading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, opacity: pdfLoading ? 0.7 : 1 }}>
            <Icon name="download" size={13} style={{ animation: pdfLoading ? "pea-spin 1s linear infinite" : "none" }} />
            {pdfLoading ? s("กำลังสร้าง…","Generating…") : s("โหลด PDF","Download PDF")}
          </button>
        </div>
      </div>

      {/* ─── SECTION: Architecture ─── */}
      <GuideSection icon="cpu" title={s("สถาปัตยกรรมระบบ (Architecture)","System Architecture")} expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTip>ระบบนี้ไม่มี build step — แก้ไขไฟล์ .jsx แล้ว git push ได้เลย ไม่ต้อง npm install หรือ webpack</GuideTip>
          <CodeBlock>{`Browser
  ├── index.html          ← entry point, โหลด CDN ทุกตัวตามลำดับ
  ├── manifest.json       ← PWA manifest (icon, theme, standalone mode)
  ├── service-worker.js   ← offline cache + Web Push notification handler
  ├── CDN (head)
  │    ├── Leaflet CSS/JS
  │    ├── React 18 (production UMD)
  │    ├── ReactDOM 18 (production UMD)
  │    ├── Babel Standalone  ← compile JSX ใน browser runtime
  │    └── Supabase JS v2
  └── Scripts (body)
       ├── config.js       ← global: _supabase, mappers, loadAll, VAPID_PUBLIC_KEY
       ├── lang.jsx        ← global: LangProvider, useLang
       ├── components.jsx  ← global: Icon, Modal, Toast, Confirm…
       ├── MapView.jsx     ← component: <MapView>
       ├── AuthScreen.jsx  ← component: <AuthScreen>
       ├── SearchView.jsx  ← component: <SearchView>
       ├── AdminPanel.jsx  ← component: <AdminPanel>
       └── app.jsx         ← ReactDOM.render(<App>)

Supabase Edge Functions:
  └── supabase/functions/push-notify/index.ts
       ← Deno Edge Function: ส่ง Web Push ถึง subscribers ทุกคน`}</CodeBlock>
          <GuideNote>Babel Standalone compile JSX ทุกครั้งที่โหลดหน้า — เหมาะกับ dev/internal app ขนาดเล็ก ถ้าต้องการเร็วขึ้นอีกควรย้ายไปใช้ Vite หรือ Next.js</GuideNote>
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>การไหลของข้อมูล</div>
          <CodeBlock>{`App (app.jsx)
  ├── โหลด session จาก Supabase Auth
  ├── โหลด data: users, dashStats จาก Supabase
  ├── ส่ง data ลงไปยัง child components
  │
  ├── <SearchView>   ← query Supabase โดยตรง (server-side search)
  ├── <MapView>      ← รับ points[] จาก SearchView, render Leaflet
  ├── <AdminPanel>   ← รับ data + setData, query/mutate Supabase
  └── <ProfileView>  ← อยู่ใน app.jsx, query Supabase Auth`}</CodeBlock>
        </div>
      </GuideSection>

      {/* ─── SECTION: Files ─── */}
      <GuideSection icon="package" title={s("ไฟล์และหน้าที่","Files & Responsibilities")} expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            ["ไฟล์", "บทบาท", "ขนาด"],
            ["config.js", "Supabase client + row mappers + VAPID_PUBLIC_KEY สำหรับ Web Push", "~155 บรรทัด"],
            ["lang.jsx", "ระบบ i18n ไทย/อังกฤษ — LangProvider + useLang()", "~340 บรรทัด"],
            ["components.jsx", "Shared UI: Icon, Modal, Toast, Confirm, StatCard, downloadCSV", "~326 บรรทัด"],
            ["MapView.jsx", "Leaflet map wrapper — cluster, heatmap, GPS, measure", "~364 บรรทัด"],
            ["AuthScreen.jsx", "Login, Signup, Forgot password + canvas animation background", "~775 บรรทัด"],
            ["SearchView.jsx", "ค้นหา Meter/TR (server-side), filters, export, map integration", "~653 บรรทัด"],
            ["AdminPanel.jsx", "Dashboard, Users, Meters, TRs, Import, Audit, Settings, Guide, Dev, Push", "~4200+ บรรทัด"],
            ["app.jsx", "App root, routing, auth state, PWA subscribe/unsubscribe, push permission", "~3700+ บรรทัด"],
            ["data.js", "Static fallback data (meters/TR/users จาก Fang, Chiang Mai)", "~43 บรรทัด"],
            ["styles.css", "CSS variables (light/dark theme), component styles, utilities", "~529 บรรทัด"],
            ["manifest.json", "PWA manifest — icon, theme color, standalone display mode", "~15 บรรทัด"],
            ["service-worker.js", "Offline cache (cache-first) + Web Push event handlers", "~90 บรรทัด"],
            ["supabase/functions/push-notify/index.ts", "Deno Edge Function — ส่ง push ถึง subscribers ทุกคน, cleanup expired", "~72 บรรทัด"],
          ]} />
        </div>
      </GuideSection>

      {/* ─── SECTION: Database ─── */}
      <GuideSection icon="database" title={s("ฐานข้อมูล Supabase","Supabase Database")} expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>การเชื่อมต่อ</div>
          <CodeBlock>{`// config.js
const SUPABASE_URL  = "https://<PROJECT_ID>.supabase.co";
const SUPABASE_ANON = "<ANON_KEY>";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
// _supabase ถูก attach ไว้ที่ window — เรียกใช้ได้ทุกไฟล์`}</CodeBlock>
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>ตาราง (Tables)</div>
          <GuideTable rows={[
            ["Table", "Primary Key", "คำอธิบาย"],
            ["profiles", "id (uuid = auth.uid)", "ผู้ใช้: username, name, role, status, require_2fa, last_login, password_changed_at, pw_force_change"],
            ["meters", "objectid (bigint)", "มิเตอร์: tag, code, route, accountnum, peano, feederid, owner, lat, lng"],
            ["transformers", "objectid (bigint)", "หม้อแปลง: tag, phase, voltage, peano_tr, kva, owner_tr, location, feeder1, lat, lng"],
            ["audit_log", "id (bigserial)", "บันทึก: user_id, username, action, target, detail, ip, at — SELECT จำกัดเฉพาะ admin (RLS)"],
            ["settings", "key (text)", "ค่าตั้งค่า key-value: maintenance_mode, maintenance_message, dev_name, …"],
            ["password_history", "id (bigserial)", "ประวัติเปลี่ยนรหัส: user_id, username, changed_at, action, note"],
            ["mfa_backup_codes", "id (bigserial)", "Backup codes สำหรับ 2FA: user_id, code_hash (SHA-256), used, created_at — 10 รหัสต่อ user"],
            ["push_subscriptions", "id (uuid)", "Web Push subscription jsonb ต่อ user_id (UNIQUE) — ใช้โดย push-notify Edge Function"],
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>RPC Functions</div>
          <CodeBlock>{`-- Dashboard stats (meters, transformers, kva, feeders top 8)
SELECT * FROM get_dashboard_stats();

-- Unique feeders list
SELECT * FROM get_feeders();`}</CodeBlock>
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>RLS Policy สรุป</div>
          <GuideTable rows={[
            ["Table", "SELECT", "INSERT", "UPDATE", "DELETE"],
            ["profiles", "เจ้าของ / admin", "—", "เจ้าของ / admin", "—"],
            ["meters", "active user", "admin", "admin", "admin"],
            ["transformers", "active user", "admin", "admin", "admin"],
            ["audit_log", "admin", "authenticated", "—", "—"],
            ["settings", "active user", "—", "admin", "—"],
            ["password_history", "เจ้าของ / admin", "เจ้าของ", "—", "—"],
            ["push_subscriptions", "เจ้าของ", "เจ้าของ", "เจ้าของ", "เจ้าของ"],
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Triggers</div>
          <CodeBlock>{`-- Auto-create profile เมื่อสมัครสมาชิก
handle_new_user()  →  INSERT INTO profiles (id, email, role='user', status='pending')

-- Auto-update updated_at
touch_updated_at() →  UPDATE meters/transformers SET updated_at = NOW()`}</CodeBlock>
        </div>
      </GuideSection>

      {/* ─── SECTION: Row Mappers ─── */}
      <GuideSection icon="arrowRight" title="Row Mappers — DB ↔ App (config.js)" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideNote>Supabase ใช้ snake_case ส่วน App ใช้ UPPERCASE — mappers แปลงระหว่างสองฝั่ง</GuideNote>
          <CodeBlock>{`// DB → App (อ่านข้อมูล)
toMeter(row)         // row.feederid        → m.FEEDERID
toTransformer(row)   // row.peano_tr        → t.PEANO_TR
toProfile(row)       // row.last_login      → u.lastLogin
                     // row.password_changed_at → u.passwordChangedAt
                     // row.pw_force_change → u.pw_force_change
toAuditEntry(row)    // row.at              → entry.at

// App → DB (เขียนข้อมูล)
fromMeter(m)         // m.FEEDERID          → row.feederid
fromTransformer(t)   // t.PEANO_TR          → row.peano_tr
fromProfilePatch(p)  // selective patch: name, role, status, username,
                     //   require_2fa, pw_force_change

// ตัวอย่างการใช้งาน
const { data } = await _supabase.from("meters").select("*").limit(100);
const meters = data.map(toMeter);  // แปลงก่อนใช้ใน component`}</CodeBlock>
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>การเปลี่ยนรหัสผ่าน — nonce (ยืนยันรหัสเดิม)</div>
          <GuideNote>การเปลี่ยนรหัสผ่านต้องใช้ <code>nonce</code> (รหัสผ่านปัจจุบัน) เพื่อยืนยันตัวตนก่อน — ป้องกัน session hijacking และการเปลี่ยนรหัสโดยไม่ได้รับอนุญาต</GuideNote>
          <CodeBlock>{`// การเปลี่ยนรหัสผ่านผ่าน Supabase Auth — ต้องระบุ nonce (รหัสผ่านเดิม)
const { error } = await _supabase.auth.updateUser({
  password: newPassword,
  nonce: currentPassword,  // ← required: ยืนยันรหัสผ่านเดิมก่อนเสมอ
});
// หากไม่ส่ง nonce หรือ nonce ผิด → error: "nonce mismatch"
// บันทึก audit log action "change_password" ทุกครั้งที่สำเร็จ`}</CodeBlock>
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>loadAll — bypass Supabase 1000-row limit</div>
          <CodeBlock>{`// config.js — paginate จนได้ทุก row
async function loadAll(table) {
  let all = [], from = 0;
  while (true) {
    const { data } = await _supabase.from(table).select("*")
      .order("id").range(from, from + 999);
    if (!data?.length) break;
    all = [...all, ...data];
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}
// ใช้งาน
const allMeters = (await loadAll("meters")).map(toMeter);`}</CodeBlock>
        </div>
      </GuideSection>

      {/* ─── SECTION: Components API ─── */}
      <GuideSection icon="grid" title="Shared Components API (components.jsx)" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>

          <div style={{ fontWeight: 700, marginBottom: 6 }}>Icon <DevBadge color="blue">global</DevBadge></div>
          <CodeBlock>{`<Icon name="search" size={18} style={{ color: "red" }} />
// Icons ที่มี: search, map, meter, tr, user, settings, dashboard, users,
// upload, history, book, code, database, cpu, link, package, key,
// download, refresh, bell, filter, close, plus, edit, trash, warning,
// check, info, tip, sun, moon, layers, navigation, location, lock,
// mail, logout, copy, arrowRight, menu, chevDown, chevRight, chevLeft,
// flame, grid, table, ruler, eyeOff, eye`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 6px" }}>useToast <DevBadge color="green">hook</DevBadge></div>
          <CodeBlock>{`const toast = useToast();
toast("บันทึกสำเร็จ", "success");   // ✓ สีเขียว
toast("เกิดข้อผิดพลาด", "error");  // ✗ สีแดง
toast("กำลังโหลด...", "info");      // ℹ สีฟ้า
// auto-dismiss หลัง 3.2 วินาที`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 6px" }}>useConfirm <DevBadge color="green">hook</DevBadge></div>
          <CodeBlock>{`const confirm = useConfirm();
const ok = await confirm({
  title: "ลบข้อมูล?",
  message: "การดำเนินการนี้ไม่สามารถย้อนกลับได้",
  tone: "danger",   // "danger" | "warning" | "info"
  confirmText: "ลบ",
  cancelText: "ยกเลิก",
});
if (ok) { /* ดำเนินการต่อ */ }`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 6px" }}>Modal <DevBadge color="purple">component</DevBadge></div>
          <CodeBlock>{`<Modal open={showModal} onClose={() => setShowModal(false)}
  title="แก้ไขข้อมูล" width={560}
  footer={<button className="btn btn-primary">บันทึก</button>}>
  {/* content */}
</Modal>`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 6px" }}>StatCard <DevBadge color="purple">component</DevBadge></div>
          <CodeBlock>{`<StatCard label="มิเตอร์ทั้งหมด" value={1234}
  icon="meter" accent="purple"
  delta="+12 เดือนนี้" />`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 6px" }}>ExportDialog <DevBadge color="orange">AdminPanel only</DevBadge></div>
          <CodeBlock>{`<ExportDialog open={showExport} onClose={() => setShowExport(false)}
  onConfirm={() => { downloadCSV("file.csv", rows); setShowExport(false); }}
  count={rows.length} filename="file.csv" label="PEA Meter" />`}</CodeBlock>
        </div>
      </GuideSection>

      {/* ─── SECTION: Helpers ─── */}
      <GuideSection icon="key" title="Utility Functions" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            ["Function", "ที่อยู่", "การใช้งาน"],
            ["downloadCSV(filename, rows)", "components.jsx", "แปลง Array → CSV แล้ว download อัตโนมัติ"],
            ["formatThaiDate(d)", "components.jsx", "Date → 'YYYY-MM-DD HH:MM:SS'"],
            ["loadAll(table)", "config.js", "ดึงข้อมูลทุก row โดย bypass 1000-row limit"],
            ["toMeter / fromMeter", "config.js", "แปลง DB row ↔ App object สำหรับมิเตอร์"],
            ["toTransformer / fromTransformer", "config.js", "แปลง DB row ↔ App object สำหรับหม้อแปลง"],
            ["toProfile / fromProfilePatch", "config.js", "แปลง DB row ↔ App object สำหรับ user"],
            ["toAuditEntry", "config.js", "แปลง DB row → Audit log entry พร้อม Date"],
          ]} />
          <CodeBlock>{`// downloadCSV — รองรับ value ที่มี comma หรือ newline
downloadCSV("export.csv", [
  { TAG: "MT001", PEANO: "123", OWNER: "PEA" },
  { TAG: "MT002", PEANO: "456", OWNER: "Customer" },
]);

// formatThaiDate
formatThaiDate(new Date()); // "2025-05-30 14:32:00"`}</CodeBlock>
        </div>
      </GuideSection>

      {/* ─── SECTION: i18n ─── */}
      <GuideSection icon="book" title={s("ระบบภาษา i18n (lang.jsx)","i18n Language System (lang.jsx)")} expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <CodeBlock>{`// 1. ใน component — ดึง t() จาก useLang
const { t } = useLang();
<div>{t("navSearch")}</div>  // → "ค้นหา" หรือ "Search"

// 2. เพิ่ม translation key ใหม่ใน lang.jsx
// หา TRANSLATIONS object → เพิ่มใน th: { ... } และ en: { ... }
th: {
  myNewKey: "ข้อความภาษาไทย",
},
en: {
  myNewKey: "English text",
}

// 3. เรียกใช้
t("myNewKey")  // แสดงตามภาษาปัจจุบัน`}</CodeBlock>
          <GuideNote>Translation keys ใช้ prefix เพื่อจัดหมวดหมู่: nav* (navigation), adm* (admin), db* (dashboard), auth* (auth screen), act* (activity log)</GuideNote>
        </div>
      </GuideSection>

      {/* ─── SECTION: CSS ─── */}
      <GuideSection icon="sun" title={s("CSS Design System (styles.css)","CSS Design System (styles.css)")} expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Color Tokens</div>
          <CodeBlock>{`/* Brand Colors */
--pea-purple-900: #1b0926   /* พื้นหลัง Sidebar */
--pea-purple-800: #321148   /* Gradient เข้ม */
--pea-purple-600: #6b2c91   /* Gradient หลัก */
--pea-purple-500: #8b3fc4   /* สีหลัก, accent */
--pea-orange-500: #f47b20   /* สีส้ม, CTA */
--pea-orange-300: #ffba7a   /* ข้อความบน Sidebar */

/* Semantic (เปลี่ยนตาม light/dark) */
--ink            /* ข้อความหลัก */
--ink-mute       /* ข้อความรอง */
--surface        /* พื้นหลัง card */
--soft           /* พื้นหลัง input/tag */
--line           /* เส้น border */
--bg             /* พื้นหลังหน้า */

/* Status */
--green: #10b981  --red: #ef4444  --amber: #f59e0b  --blue: #3b82f6`}</CodeBlock>
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Utility Classes</div>
          <CodeBlock>{`/* Layout */
.f-col        → flex-direction: column
.f-between    → flex + justify-content: space-between
.f-gap-2/3/4  → gap: 8px / 12px / 16px
.f-wrap       → flex-wrap: wrap

/* Typography */
.text-sm / .text-lg  → font-size 12px / 18px
.fw-6 / .fw-7        → font-weight 600 / 700
.t-mute              → color: var(--ink-mute)
.t-eyebrow           → uppercase tracking label
.mono                → font-family IBM Plex Mono

/* Components */
.btn .btn-primary .btn-outline .btn-sm
.input          → styled text input
.card .card-elev → card with optional elevation
.badge .badge-purple .badge-orange .badge-green
.table          → styled data table
.fade-in / .fade-up → CSS animations`}</CodeBlock>
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Dark Mode</div>
          <CodeBlock>{`/* styles.css — dark mode ทำงานผ่าน data attribute */
[data-theme="dark"] {
  --ink: #f3eefa;
  --surface: #1a1330;
  --bg: #0e0a16;
  /* ... */
}

// app.jsx — toggle
document.documentElement.dataset.theme = theme; // "light" | "dark"
localStorage.setItem("pea_theme", theme);`}</CodeBlock>
        </div>
      </GuideSection>

      {/* ─── SECTION: MapView API ─── */}
      <GuideSection icon="map" title="MapView Props API" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            ["Prop", "Type", "Default", "คำอธิบาย"],
            ["points", "Array", "[]", "รายการ marker — ต้องมี LATITUDE, LONGITUDE, OBJECTID"],
            ["kind", "string", "'meter'", "'meter' หรือ 'tr' — ส่งผลต่อสี icon และ popup"],
            ["selectedId", "number|null", "null", "OBJECTID ที่ถูก highlight"],
            ["onSelect", "fn(point)", "—", "callback เมื่อกด marker หรือ item ใน cluster popup"],
            ["onNavigate", "fn(point)", "—", "callback เมื่อกดปุ่มนำทางใน popup"],
            ["baseMap", "string", "'satellite'", "'street' หรือ 'satellite'"],
            ["showHeatmap", "boolean", "false", "แสดง heatmap overlay"],
            ["showCluster", "boolean", "true", "รวมกลุ่ม marker เมื่อซูมออก"],
          ]} />
          <CodeBlock>{`<MapView
  points={results}          // Array ของ meter หรือ transformer objects
  kind="meter"              // ชนิดของ marker
  selectedId={selected?.OBJECTID}
  onSelect={(p) => setSelected(p)}
  onNavigate={(p) => startNavigation(p)}
  baseMap={baseMap}         // "street" | "satellite"
  showHeatmap={heatmap}
  showCluster={cluster}
/>`}</CodeBlock>
        </div>
      </GuideSection>

      {/* ─── SECTION: Custom Components ─── */}
      <GuideSection icon="bolt" title="Custom Components (DateTimePicker · ChangelogView)" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>DateTimePicker <DevBadge color="purple">AdminPanel.jsx</DevBadge></div>
          <GuideTable rows={[
            ["Prop", "Type", "คำอธิบาย"],
            ["value", "string", "datetime-local format 'YYYY-MM-DDTHH:MM' หรือ ''"],
            ["onChange", "fn(string)", "callback รับค่า string รูปแบบเดิม หรือ '' เมื่อล้าง"],
          ]} />
          <CodeBlock>{`<DateTimePicker
  value={localUntil}        // "2026-05-30T08:30" หรือ ""
  onChange={setLocalUntil}  // setState รับ string ใหม่
/>`}</CodeBlock>
          <GuideTip>ปฏิทินแสดงชื่อเดือนภาษาไทยพร้อม พ.ศ. — นาทีเพิ่มทีละ 5 — กด X ในช่องเพื่อล้างค่า</GuideTip>

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>ChangelogView + CHANGELOG <DevBadge color="purple">app.jsx</DevBadge></div>
          <GuideTable rows={[
            ["ส่วน", "คำอธิบาย"],
            ["CHANGELOG", "Array ของ version object — แก้ไขเพื่ออัปเดต changelog"],
            ["CAT_META", "config สี/label ของ category chip (new · ux · fix · perf)"],
            ["ChangelogView", "Component ไม่รับ props — render จาก CHANGELOG โดยตรง · หัวการ์ดกดยุบ/ขยายได้"],
          ]} />
          <CodeBlock>{`// เพิ่ม version ใหม่ใน CHANGELOG array (app.jsx)
CHANGELOG.unshift({
  version: "v3.0", date: "1 มิ.ย. 2569", tag: "UX",
  tagColor: "#10b981",
  items: [
    { cat: "new", text: "ฟีเจอร์ใหม่" },
    { cat: "ux",  text: "ปรับ UI"      },
    { cat: "fix", text: "แก้ bug"      },
  ],
});

// Collapse/Expand state — ใน ChangelogView
// เวอร์ชันล่าสุด (index 0) เปิดโดยอัตโนมัติ เวอร์ชันเก่าพับไว้
const [collapsed, setCollapsed] = useState(
  () => new Set(CHANGELOG.slice(1).map(v => v.version))
);
// กดหัวการ์ด → toggleVer(ver.version)`}</CodeBlock>
          <GuideNote>แท็บ 'อัปเดต ⚡' ใน sidebar — เห็นเฉพาะ Admin · route = "changelog" · หัวการ์ดกด chevron ยุบ/ขยาย</GuideNote>

          <div style={{ fontWeight: 700, margin: "18px 0 8px" }}>flyToLocation — ปุ่ม GPS ตำแหน่งฉัน (Admin Map) <DevBadge color="blue">AdminPanel.jsx</DevBadge></div>
          <GuideTable rows={[
            ["ตัวแปร / Ref", "คำอธิบาย"],
            ["locMarkerRef", "เก็บ L.marker ของตำแหน่งปัจจุบัน — ลบก่อนสร้างใหม่ทุกครั้ง"],
            ["locating (state)", "true ขณะรอ GPS — ปุ่มเปลี่ยนข้อความเป็น 'กำลังค้นหา…' + icon หมุน"],
          ]} />
          <CodeBlock>{`// AdminMapTab — AdminPanel.jsx
flyToLocation() {
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      mapRef.current.flyTo([coords.latitude, coords.longitude], 16);
      const icon = L.divIcon({ html: '<div style="...blue circle..."/>' });
      locMarkerRef.current = L.marker([lat, lng], { icon })
        .bindPopup(\`<b>ตำแหน่งปัจจุบัน</b><br>±\${accuracy} ม.\`)
        .addTo(mapRef.current).openPopup();
    },
    (err) => toast(errMsg, "error"),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}
// ปุ่มอยู่ในแถบควบคุม — ก่อนปุ่ม '📋 คำขอแก้ไข'`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "18px 0 8px" }}>SafeQR — Canvas QR Renderer <DevBadge color="purple">app.jsx</DevBadge></div>
          <GuideTable rows={[
            ["Prop", "Type", "คำอธิบาย"],
            ["svg", "string", "SVG string จาก Supabase (data.totp.qr_code) — รองรับทั้ง raw SVG และ data URL"],
            ["size", "number", "ขนาด px (default 260) — render ที่ devicePixelRatio เต็ม (retina-ready)"],
          ]} />
          <CodeBlock>{`// SafeQR วาด SVG ลง <canvas> เพื่อให้ scanner อ่านได้ทุก device (iOS Safari รวมด้วย)
// ใช้ encodeURIComponent() แทน btoa() — รองรับ Unicode ใน SVG
<SafeQR svg={data.totp.qr_code} size={260} />

// ทำงานอย่างไร:
// 1. สร้าง canvas ที่ size × devicePixelRatio (retina-safe)
// 2. fill white background
// 3. โหลด SVG เป็น Image() ผ่าน data:image/svg+xml;charset=utf-8,...
// 4. drawImage → canvas แสดงผลเป็น raster ที่ scanner อ่านได้`}</CodeBlock>
          <GuideNote>อย่าใช้ dangerouslySetInnerHTML กับ SVG จาก Supabase — ใช้ SafeQR เสมอ</GuideNote>

          <div style={{ fontWeight: 700, margin: "18px 0 8px" }}>2FA Admin-Only Policy <DevBadge color="red">app.jsx</DevBadge></div>
          <GuideTable rows={[
            ["ที่ไหน", "สิทธิ์", "หมายเหตุ"],
            ["Profile → แท็บรหัสผ่าน", "อ่านอย่างเดียว", "แสดงสถานะ เปิด/ปิด — ไม่มีปุ่ม action"],
            ["Admin → ผู้ใช้งาน → toggle 2FA", "Admin เท่านั้น", "ต้องกด confirm ก่อนทุกครั้ง + stopPropagation"],
            ["Login → MFASetupScreen", "อัตโนมัติ", "แสดงเมื่อ require_2fa=true แต่ยังไม่ verify"],
          ]} />
          <CodeBlock>{`// ตรวจสอบสถานะ 2FA ของ user ปัจจุบัน
const { data } = await _supabase.auth.mfa.listFactors();
const isVerified = data?.totp?.some(f => f.status === "verified");

// Admin toggle 2FA สำหรับ user อื่น (profiles table)
await _supabase.from("profiles")
  .update({ require_2fa: true })
  .eq("id", targetUserId);`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "18px 0 8px" }}>useDeployStatus() hook + DeployStatusDot <DevBadge color="blue">app.jsx</DevBadge></div>
          <GuideTable rows={[
            ["Symbol", "คำอธิบาย"],
            ["useDeployStatus()", "Custom hook — fetch version.json + GitHub API คืน { deployed, ghCommit, deployedHash, ghHash, inSync, isLoading }"],
            ["DeployStatusDot", "Component ใน Topbar (admin only) — dot สีคลิกแล้วเปิด popup สถานะ"],
            ["DeploymentStatus", "Component การ์ดเต็มใน ChangelogView — ใช้ useDeployStatus เช่นกัน"],
          ]} />
          <CodeBlock>{`// useDeployStatus คืนค่า:
const {
  deployed,      // object จาก version.json ({ commit, shortCommit, message, date })
  ghCommit,      // object จาก GitHub API (/commits/main)
  deployedHash,  // short commit hash ที่รันอยู่
  ghHash,        // short commit hash ล่าสุดบน GitHub
  isLoading,     // true ขณะรอ fetch ทั้งสอง
  inSync,        // true = hash ตรงกัน (ระบบเป็นปัจจุบัน)
} = useDeployStatus();

// version.json (root repo) — อัปเดตทุกครั้งที่ push
{
  "commit":      "8acf87eb...",
  "shortCommit": "8acf87e",
  "message":     "feat: deploy status dot...",
  "date":        "2026-05-31T07:20:48+00:00",
  "branch":      "main"
}`}</CodeBlock>
          <GuideNote>version.json ต้องอัปเดตด้วย commit hash ล่าสุดทุกครั้งที่ push — Claude ทำให้อัตโนมัติใน session นี้</GuideNote>
        </div>
      </GuideSection>

      {/* ─── SECTION: Adding Features ─── */}
      <GuideSection icon="plus" title={s("วิธีเพิ่มฟีเจอร์ใหม่","How to Add New Features")} expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>เพิ่ม Admin Tab ใหม่</div>
          <GuideStep n={1} text="เพิ่ม key ใน lang.jsx (ทั้ง th และ en): admMyTab: 'ชื่อแท็บ'" />
          <GuideStep n={2} text="เพิ่มใน NAV_LABELS และ MOB_NAV ใน AdminPanel.jsx" />
          <GuideStep n={3} text="เพิ่มใน ADMIN_NAV ใน app.jsx (ซ้าย sidebar)" />
          <GuideStep n={4} text="เพิ่ม {tab === 'myTab' && <MyComponent />} ใน return ของ AdminPanel" />
          <GuideStep n={5} text="สร้าง function MyComponent() { } ใน AdminPanel.jsx" />

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Query Supabase</div>
          <CodeBlock>{`// SELECT
const { data, error } = await _supabase
  .from("meters")
  .select("*")
  .ilike("tag", \`%\${q}%\`)
  .limit(100);

// INSERT
const { error } = await _supabase
  .from("meters")
  .insert(fromMeter(newMeter));

// UPDATE
const { error } = await _supabase
  .from("meters")
  .update(fromMeter(edited))
  .eq("objectid", edited.OBJECTID);

// DELETE
const { error } = await _supabase
  .from("meters")
  .delete()
  .eq("objectid", id);`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>เพิ่ม Icon ใหม่</div>
          <CodeBlock>{`// components.jsx — เพิ่มใน paths object
myIcon: <path d="..." />,  // SVG path ขนาด 24x24 viewBox
// แล้วใช้งาน
<Icon name="myIcon" size={18} />`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Audit Log ทุก Action สำคัญ</div>
          <CodeBlock>{`// addAudit ส่งมาจาก App ผ่าน props
addAudit({
  user: currentUser.username,
  action: "create_meter",        // snake_case action name
  target: \`TAG \${meter.TAG}\`,   // สิ่งที่ถูก action
  detail: \`เพิ่มมิเตอร์ใหม่\`,   // รายละเอียดเพิ่มเติม
});`}</CodeBlock>

          <GuideTip>Commit message ควรอธิบาย "ทำอะไร" ให้ชัดเจน เช่น "Add feeder filter to transformer search" เพื่อให้ git log อ่านง่าย</GuideTip>
        </div>
      </GuideSection>

      {/* ─── SECTION: Deploy ─── */}
      <GuideSection icon="link" title={s("Deploy & การพัฒนา","Deploy & Development")} expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            ["Task", "Command / วิธี"],
            ["Push code", "git add . → git commit -m '...' → git push origin main"],
            ["ทดสอบ local", "python3 -m http.server 8080 แล้วเปิด localhost:8080"],
            ["ดู error", "เปิด DevTools (F12) → Console → ดู JS errors"],
            ["Reset Schema", "Supabase SQL Editor → รัน schema.sql ใหม่"],
            ["เพิ่ม Admin", "Supabase Table Editor → profiles → แก้ role='admin', status='active'"],
            ["Environment", "GitHub Pages (static) — ไม่มี server-side code"],
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Dependencies ที่โหลดจาก CDN</div>
          <GuideTable rows={[
            ["Library", "Version", "CDN", "ใช้ทำอะไร"],
            ["React", "18.3.1", "unpkg.com", "UI framework"],
            ["ReactDOM", "18.3.1", "unpkg.com", "Render React ลง DOM"],
            ["Babel Standalone", "7.29.0", "unpkg.com", "Compile JSX → JS ใน browser"],
            ["Leaflet", "1.9.4", "unpkg.com", "Interactive map"],
            ["Supabase JS", "2.x", "cdn.jsdelivr.net", "Database client + Auth"],
            ["IBM Plex Sans Thai", "—", "Google Fonts", "Font หลัก (ไทย/EN)"],
            ["IBM Plex Mono", "—", "Google Fonts", "Font mono สำหรับ code/ID"],
          ]} />
          <GuideNote>ไม่มี package.json, node_modules, หรือ build pipeline — เพิ่ม dependency ใหม่ได้โดยเพิ่ม script tag ใน index.html</GuideNote>
        </div>
      </GuideSection>

      {/* ─── SECTION: GitHub ─── */}
      <GuideSection icon="link" title="GitHub — Source Code & Deployment" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>

          <div style={{ fontWeight: 700, marginBottom: 8 }}>โครงสร้าง Repository</div>
          <CodeBlock>{`Repository: github.com/menzkub/gis-mapping-system
Branch:     main  ← เดียวเท่านั้น (GitHub Pages serve จาก root ของ main)
Hosting:    GitHub Pages (static) — ไม่มี server, ไม่มี CI/CD

ไฟล์ทั้งหมดอยู่ที่ root:
  index.html   config.js   styles.css   logo.svg
  *.jsx        data.js`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>ขั้นตอน Deploy (push = deploy)</div>
          <GuideStep n={1} text="แก้ไขไฟล์ .jsx หรือ .css บนเครื่อง" />
          <GuideStep n={2} text='git add <ชื่อไฟล์>   (หรือ git add . ถ้าแน่ใจ)' />
          <GuideStep n={3} text='git commit -m "อธิบายสิ่งที่เปลี่ยน"' />
          <GuideStep n={4} text="git push origin main" />
          <GuideStep n={5} text="รอ ~30 วินาที → GitHub Pages อัปเดตอัตโนมัติ" />
          <GuideTip>หลัง push ให้ Hard Refresh (Ctrl+Shift+R หรือ Cmd+Shift+R) เพื่อเคลียร์ browser cache</GuideTip>

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Personal Access Token (PAT)</div>
          <CodeBlock>{`# ต้องใช้ PAT เมื่อ push จาก remote environment (เช่น Claude Code)
git remote set-url origin https://<TOKEN>@github.com/menzkub/gis-mapping-system.git
git push origin main

# สร้าง Token: GitHub → Settings → Developer Settings
# → Personal Access Tokens → Tokens (classic) → scope: repo
# หมดอายุ: ตรวจสอบที่ github.com/settings/tokens

⚠ ลบ Token ออกจาก remote URL หลัง push ทุกครั้ง:
git remote set-url origin https://github.com/menzkub/gis-mapping-system.git`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>GitHub Pages — ข้อจำกัด</div>
          <GuideTable rows={[
            ["รายการ", "ขีดจำกัด / หมายเหตุ"],
            ["ที่เก็บไฟล์", "1 GB ต่อ repo"],
            ["Bandwidth", "100 GB / เดือน (ส่วนใหญ่เกินไม่ได้)"],
            ["ไฟล์ใหญ่สุด", "100 MB ต่อไฟล์"],
            ["Build time", "ไม่มี — static files โดยตรง"],
            ["Custom domain", "รองรับ — ตั้งใน Settings → Pages → Custom domain"],
            ["HTTPS", "บังคับอัตโนมัติ"],
            ["index.html", "ต้องอยู่ที่ root ของ branch เท่านั้น"],
          ]} />

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Error ที่พบบ่อยและวิธีแก้</div>
          <GuideTable rows={[
            ["อาการ", "สาเหตุ", "วิธีแก้"],
            ["หน้าไม่อัปเดตหลัง push", "Browser cache", "Hard Refresh: Ctrl+Shift+R"],
            ["404 Not Found", "index.html ไม่ได้อยู่ที่ root", "ตรวจว่าไฟล์อยู่ที่ root ไม่ใช่ใน subfolder"],
            ["push rejected (authentication)", "Token หมดอายุหรือไม่มีสิทธิ์", "สร้าง Token ใหม่ที่ github.com/settings/tokens"],
            ["push rejected (non-fast-forward)", "มี commit ที่ remote ที่ local ไม่มี", "git pull origin main แล้ว push ใหม่"],
            ["Pages ไม่ build", "GitHub Actions disabled", "Settings → Pages → ตรวจ Source = Deploy from branch: main"],
            ["JS error หลัง deploy", "แก้ไขไฟล์ผิด หรือ syntax error", "เปิด DevTools Console ดู error แล้วแก้"],
          ]} />

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>ตรวจสอบสถานะ & Rollback</div>
          <CodeBlock>{`# ดู commit ล่าสุด
git log --oneline -10

# เปรียบเทียบ code ที่เปลี่ยนไป
git diff HEAD~1 HEAD

# Rollback — กู้ไฟล์คืนจาก commit ก่อนหน้า
git checkout <commit-hash> -- <ชื่อไฟล์>
git add <ชื่อไฟล์>
git commit -m "revert: คืนค่า <ชื่อไฟล์> เนื่องจาก..."
git push origin main

# ดู commit hash
git log --oneline   # copy 7 ตัวแรก เช่น a1b2c3d`}</CodeBlock>
          <GuideNote>อย่าใช้ git push --force บน main เพราะจะลบ history ทั้งหมด — ถ้าจำเป็นให้ใช้ git revert แทน</GuideNote>

        </div>
      </GuideSection>

      {/* ─── SECTION: Supabase Ops & Troubleshooting ─── */}
      <GuideSection icon="database" title={s("การจัดการ & แก้ปัญหา Supabase","Supabase Management & Troubleshooting")} expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>

          {/* ── ลำดับการโหลดข้อมูล ── */}
          <div style={{ fontWeight: 700, marginBottom: 8 }}>ลำดับการโหลดข้อมูลเมื่อ Login</div>
          <CodeBlock>{`1. Supabase Auth → ยืนยัน session / JWT
2. profiles → ดึงข้อมูล user ปัจจุบัน (role, status, require_2fa)
3. settings  → maintenance_mode, dev_info และค่าต่างๆ
4. profiles  → ดึง user ทั้งหมด (admin เท่านั้น)
5. audit_log → 500 รายการล่าสุด (admin เท่านั้น)
6. get_feeders() RPC → รายการ feeder ไม่ซ้ำ
7. get_dashboard_stats() RPC → สถิติรวม

⚠ meters และ transformers ไม่โหลดตอน login
   → โหลดเฉพาะเมื่อผู้ใช้กดค้นหา (server-side search)`}</CodeBlock>

          {/* ── Operations per table ── */}
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>การทำงานแต่ละตาราง</div>
          <GuideTable rows={[
            ["Table", "SELECT", "INSERT", "UPDATE", "DELETE", "ใครทำได้"],
            ["profiles", "เจ้าของ / admin", "Trigger อัตโนมัติ", "เจ้าของ / admin", "—", "RLS ควบคุม"],
            ["meters", "active user", "admin", "admin", "admin", "ค้นหา / แก้ไข"],
            ["transformers", "active user", "admin", "admin", "admin", "ค้นหา / แก้ไข"],
            ["audit_log", "admin เท่านั้น", "ทุก auth user", "—", "—", "อ่านได้เฉพาะ admin"],
            ["settings", "active user", "— (SQL เท่านั้น)", "admin", "—", "INSERT ผ่าน SQL Editor"],
          ]} />

          {/* ── ขีดจำกัด ── */}
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>ขีดจำกัด Supabase Free Tier</div>
          <GuideTable rows={[
            ["รายการ", "ขีดจำกัด", "หมายเหตุ"],
            ["ฐานข้อมูล (PostgreSQL)", "500 MB", "ดูได้ที่ Dashboard → Settings → Usage"],
            ["Bandwidth", "5 GB / เดือน", "นับรวม query ทุกครั้ง"],
            ["Auth users", "50,000 คน", "เกินต้อง upgrade"],
            ["Row limit per query", "1,000 rows", "ใช้ loadAll() เพื่อ bypass"],
            ["Edge Functions", "500,000 req/เดือน", "ไม่ได้ใช้ในระบบนี้"],
            ["File Storage", "1 GB", "ไม่ได้ใช้ในระบบนี้"],
          ]} />
          <GuideTip>ดูการใช้งานจริงได้ที่ Supabase Dashboard → Settings → Usage & Billing</GuideTip>

          {/* ── ข้อมูลเยอะเกิน ── */}
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>⚠ ข้อมูลเยอะเกินไป — อาการและวิธีแก้</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              ["ค้นหาช้า / timeout", "เพิ่ม index ใน Supabase SQL Editor\nเช่น: CREATE INDEX ON meters(tag); CREATE INDEX ON meters(peano);"],
              ["โหลดแรกช้า (Dashboard)", "get_dashboard_stats() ทำงาน COUNT ทั้งตาราง\n→ เพิ่ม index บน updated_at หรือเพิ่ม cache ใน settings table"],
              ["ข้อมูล > 1000 rows ต่อ query", "ใช้ loadAll() ใน config.js ซึ่ง paginate อัตโนมัติ\nหรือค้นหาให้แคบลงด้วย .ilike() .eq() ก่อน"],
              ["DB ใกล้เต็ม 500 MB", "ลบ audit_log เก่า: DELETE FROM audit_log WHERE at < NOW() - INTERVAL '90 days'\nหรือ upgrade เป็น Pro plan ($25/เดือน)"],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(244,123,32,0.06)", border: "1px solid rgba(244,123,32,0.2)" }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--pea-orange-500)" }}>{title}</div>
                <pre style={{ margin: 0, fontSize: 12, fontFamily: "inherit", whiteSpace: "pre-wrap", lineHeight: 1.7, color: "var(--text)" }}>{detail}</pre>
              </div>
            ))}
          </div>

          {/* ── Error ที่พบบ่อย ── */}
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Error ที่พบบ่อยและวิธีแก้</div>
          <GuideTable rows={[
            ["Error Message", "สาเหตุ", "วิธีแก้"],
            ["row-level security policy violation", "RLS บล็อก INSERT เพราะ row ยังไม่มีในตาราง", "รัน INSERT ... ON CONFLICT DO NOTHING ใน SQL Editor ก่อน"],
            ["JWT expired", "Token หมดอายุ (1 ชม.)", "ระบบ refresh อัตโนมัติ — ถ้าไม่หาย ให้ logout แล้ว login ใหม่"],
            ["relation does not exist", "รัน SQL ผิด Project ใน Supabase", "ตรวจสอบว่าเลือก Project ถูกต้องที่ด้านบน"],
            ["Failed to fetch", "ไม่มีอินเทอร์เน็ต หรือ Supabase down", "ตรวจสอบ network / เช็ค status.supabase.com"],
            ["infinite recursion in RLS", "Policy อ้างอิงตัวเองวนซ้ำ", "แก้ Policy ใน Supabase → Auth → Policies"],
            ["permission denied for table", "User ไม่มีสิทธิ์ตาม RLS", "ตรวจสอบ role และ status ใน profiles table"],
          ]} />

          {/* ── SQL ที่ Admin ควรรู้ ── */}
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>SQL ที่ Admin ควรรู้ (รันใน Supabase SQL Editor)</div>
          <CodeBlock>{`-- ดูขนาดแต่ละตาราง
SELECT relname AS table,
       pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- นับ rows แต่ละตาราง
SELECT 'meters' AS tbl, COUNT(*) FROM meters
UNION ALL SELECT 'transformers', COUNT(*) FROM transformers
UNION ALL SELECT 'audit_log',    COUNT(*) FROM audit_log
UNION ALL SELECT 'profiles',     COUNT(*) FROM profiles;

-- ล้าง audit_log เก่ากว่า 90 วัน (ประหยัด storage)
DELETE FROM audit_log WHERE at < NOW() - INTERVAL '90 days';

-- เพิ่ม Index เพื่อเร่งความเร็วค้นหา
CREATE INDEX IF NOT EXISTS idx_meters_tag    ON meters(tag);
CREATE INDEX IF NOT EXISTS idx_meters_peano  ON meters(peano);
CREATE INDEX IF NOT EXISTS idx_tr_tag        ON transformers(tag);
CREATE INDEX IF NOT EXISTS idx_tr_peano      ON transformers(peano_tr);

-- ดู query ที่ช้าที่สุด (ต้องเปิด pg_stat_statements ก่อน)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;`}</CodeBlock>

          {/* ── ขั้นตอนแก้ปัญหา ── */}
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>ขั้นตอนแก้ปัญหาเมื่อระบบโหลดช้า</div>
          <GuideStep n={1} text="เปิด DevTools (F12) → Network tab → ดูว่า request ไหนใช้เวลานาน" />
          <GuideStep n={2} text="เปิด Supabase Dashboard → Database → Query Performance → ดู slow queries" />
          <GuideStep n={3} text="เพิ่ม Index ด้วย SQL ข้างต้น แล้วทดสอบความเร็วใหม่" />
          <GuideStep n={4} text="ถ้า audit_log > 100,000 rows ให้ล้างข้อมูลเก่าออก" />
          <GuideStep n={5} text="ถ้า storage > 400 MB ควรเตรียม upgrade หรือ archive ข้อมูลเก่า" />
          <GuideStep n={6} text="เปิด Maintenance Mode ระหว่างแก้ไข เพื่อไม่ให้ user ใช้งานพร้อมกัน" />
          <GuideTip>เปิด Maintenance Mode ได้ที่ Admin → ตั้งค่า → Maintenance Mode — user ทั่วไปจะเห็นหน้า "ระบบปิดปรับปรุง" ขณะที่ admin ยังเข้าได้ปกติ</GuideTip>

        </div>
      </GuideSection>

      {/* ─── SECTION: PWA & Web Push ─── */}
      <GuideSection icon="bell" title="PWA & Web Push Notification" expandSignal={expandSig}>
        <div style={{ marginTop: 12 }}>
          <GuideNote>ระบบรองรับ PWA (Progressive Web App) — ผู้ใช้สามารถติดตั้งเป็นแอปบน iOS และ Android และรับ Web Push Notification จาก Admin</GuideNote>

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>ไฟล์ที่เกี่ยวข้อง</div>
          <GuideTable rows={[
            ["ไฟล์", "บทบาท"],
            ["manifest.json", "PWA metadata — name, icon, theme_color, standalone display"],
            ["service-worker.js", "Cache-first strategy + push/notificationclick event handlers"],
            ["config.js", "VAPID_PUBLIC_KEY — ใช้ตอน subscribe pushManager"],
            ["supabase/functions/push-notify/index.ts", "Deno Edge Function — รับ JWT admin, ส่งถึง subscribers ทั้งหมด"],
            ["supabase/push_subscriptions.sql", "DDL + RLS policy สำหรับตาราง push_subscriptions"],
          ]} />

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Push Notification Flow</div>
          <CodeBlock>{`1. Admin เปิดแอปจาก home screen (PWA) → ไปที่ Settings → กด 'เปิดการแจ้งเตือน'
   [Admin เท่านั้นที่มีสิทธิ์ subscribe และส่งการแจ้งเตือน]

2. subscribePush() ใน app.jsx (Admin เท่านั้น):
   - Notification.requestPermission() → 'granted'
   - reg.pushManager.subscribe({ VAPID_PUBLIC_KEY })
   - upsert subscription jsonb → push_subscriptions table

3. Admin กด 'ส่งการแจ้งเตือน' (Admin Settings → Push card):
   - POST /functions/v1/push-notify
   - Header: Authorization: Bearer <admin JWT>
   - Body: { title, body, url }

4. Edge Function (push-notify/index.ts):
   - ตรวจสอบ JWT → role === 'admin' (non-admin ถูก reject 403)
   - SELECT * FROM push_subscriptions
   - webpush.sendNotification(subscription, payload)
   - DELETE subscriptions ที่ 410 Gone (expired)
   - Return { sent, failed, total }

5. Service Worker รับ push event:
   - showNotification(title, { body, icon, vibrate })
   - notificationclick → focus หรือ openWindow`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>VAPID Keys</div>
          <GuideNote>VAPID keys ถูก generate ด้วย web-push package — Public key อยู่ใน config.js (VAPID_PUBLIC_KEY), Private key อยู่ใน Supabase Secrets (VAPID_PRIVATE_KEY) เท่านั้น</GuideNote>
          <CodeBlock>{`// สร้าง VAPID keys ใหม่ (ถ้าต้องการ reset):
// npm install -g web-push
// web-push generate-vapid-keys

// Supabase Secrets ที่ต้องตั้ง:
VAPID_PUBLIC_KEY   = "BFs4q5..."
VAPID_PRIVATE_KEY  = "<private>"
SUPABASE_SERVICE_ROLE_KEY = "<service role key>"`}</CodeBlock>

          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>iOS Notification ข้อจำกัด</div>
          <GuideTable rows={[
            ["ข้อกำหนด", "รายละเอียด"],
            ["iOS เวอร์ชัน", "iOS 16.4+ เท่านั้น"],
            ["วิธีติดตั้ง", "เพิ่มลงหน้าจอหลักผ่าน Safari Share sheet"],
            ["เปิดแอป", "ต้องเปิดจาก Home Screen icon เท่านั้น — ไม่รองรับใน Safari tab"],
            ["Permission", "ระบบขอสิทธิ์ผ่าน Notification.requestPermission() หลังผู้ใช้ enable ใน iOS Settings"],
            ["Permission denied", "ระบบ re-check อัตโนมัติผ่าน visibilitychange + focus event เมื่อกลับจาก Settings"],
          ]} />
          <GuideTip>ถ้าต้องการทดสอบ push notification ให้ใช้ Supabase Dashboard → Edge Functions → Invoke Function แบบ manual</GuideTip>
        </div>
      </GuideSection>
    </div>
  );
}

function actionLabel(a) {
  const m = {
    login: "Login", logout: "Logout",
    change_password: "เปลี่ยนรหัส", enable_2fa: "เปิด 2FA", disable_2fa: "ปิด 2FA",
    search_meter: "ค้นหา Meter", search_tr: "ค้นหา TR", view_map: "ดูแผนที่",
    update_meter: "แก้ Meter", update_tr: "แก้ TR",
    delete_meter: "ลบ Meter", delete_tr: "ลบ TR",
    approve_user: "Approve", ban_user: "Ban", update_user: "แก้ User",
    import_csv: "Import", export_csv: "Export",
    create_user: "สร้างบัญชี", create_meter: "เพิ่ม Meter", create_tr: "เพิ่ม TR",
  };
  return m[a] || a;
}
function actionBadge(a) {
  if (a.startsWith("delete") || a === "ban_user")                       return "badge-red";
  if (a.startsWith("update") || a === "import_csv")                     return "badge-amber";
  if (a === "login" || a.startsWith("approve") || a.startsWith("create")) return "badge-green";
  if (a === "logout")                                                    return "badge-purple";
  if (a.startsWith("search") || a === "view_map")                       return "badge-blue";
  if (a === "change_password" || a === "enable_2fa" || a === "disable_2fa") return "badge-orange";
  return "";
}
function parseDeviceAd(ua = "") {
  const b = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser";
  const o = /Windows NT/.test(ua) ? "Windows" : /Macintosh/.test(ua) ? "Mac" : /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : "Other";
  return `${b} · ${o}`;
}

/* ---------- Users ---------- */
function AdminUsers({ data, setData, addAudit, currentUser }) {
  const [q, setQ]                     = useStateAd("");
  const [statusFilter, setStatusFilter] = useStateAd("");
  const [edit, setEdit]               = useStateAd(null);
  const [saving, setSaving]           = useStateAd(false);
  const [pwModal, setPwModal]         = useStateAd(null);
  const tableRef = React.useRef(null);
  const confirm = useConfirm();
  const toast   = useToast();

  const filterFn = (u) => {
    if (statusFilter === "active")    return u.status === "active";
    if (statusFilter === "pending")   return u.status === "pending";
    if (statusFilter === "banned")    return u.status === "banned";
    if (statusFilter === "admin")     return u.role === "admin";
    if (statusFilter === "user")      return u.role === "user";
    if (statusFilter === "with2fa")   return !!u.require_2fa;
    if (statusFilter === "no2fa")     return !u.require_2fa;
    if (statusFilter === "pwExpired") { const d = pwDaysLeft(u); return !u.pw_force_change && d !== null && d <= 0; }
    return true;
  };
  const list = data.users.filter(u =>
    filterFn(u) && (!q || `${u.username} ${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
  );

  const goFilter = (key) => {
    setStatusFilter(key);
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const toggle2FA = async (u) => {
    const enabling = !u.require_2fa;
    const ok = await confirm({
      title: enabling ? "เปิดใช้งาน 2FA" : "ปิดใช้งาน 2FA",
      message: enabling
        ? <><b>{u.name}</b> (@{u.username}) จะต้องยืนยัน 2FA ทุกครั้งที่เข้าสู่ระบบ</>
        : <>ปิด 2FA สำหรับ <b>{u.name}</b> (@{u.username})? บัญชีจะมีความปลอดภัยน้อยลง</>,
      confirmText: enabling ? "เปิด 2FA" : "ปิด 2FA",
      cancelText: "ยกเลิก",
      tone: enabling ? "primary" : "danger",
    });
    if (!ok) return;
    await updateUser(
      u.id,
      { require_2fa: enabling },
      enabling ? "enable_2fa" : "disable_2fa",
      `${enabling ? "เปิด" : "ปิด"} 2FA สำหรับ ${u.username}`,
      `${enabling ? "เปิด" : "ปิด"} 2FA สำหรับ ${u.name} แล้ว`
    );
  };

  const updateUser = async (id, patch, action, detail, toastMsg) => {
    setSaving(true);
    const { error } = await _supabase.from("profiles").update(fromProfilePatch(patch)).eq("id", id);
    setSaving(false);
    if (error) { toast?.("เกิดข้อผิดพลาด: " + error.message, "error"); return; }
    setData(d => ({ ...d, users: d.users.map(u => u.id === id ? { ...u, ...patch } : u) }));
    addAudit({ user: currentUser.username, action, target: id, detail });
    if (toastMsg) toast?.(toastMsg, "success");
  };

  const approveUser = async (u) => {
    const ok = await confirm({
      title: "อนุมัติบัญชีผู้ใช้",
      message: <>อนุมัติให้ <b>{u.name}</b> (@{u.username}) เข้าใช้งานระบบได้?</>,
      target: `@${u.username}`,
      confirmText: "อนุมัติบัญชี",
      tone: "primary",
    });
    if (ok) await updateUser(u.id, { status: "active" }, "approve_user", `อนุมัติบัญชี ${u.username}`, `อนุมัติ ${u.name} แล้ว`);
  };

  const banUser = async (u) => {
    const ok = await confirm({
      title: "ระงับผู้ใช้งาน",
      message: <>ต้องการระงับบัญชี <b>{u.name}</b>? ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้</>,
      target: `@${u.username}`,
      confirmText: "ระงับบัญชี",
      tone: "danger",
    });
    if (ok) await updateUser(u.id, { status: "banned" }, "ban_user", `ระงับบัญชี ${u.username}`, `ระงับบัญชี ${u.name}`);
  };

  const unbanUser = async (u) => {
    const ok = await confirm({
      title: "ปลดระงับผู้ใช้งาน",
      message: <>ปลดระงับบัญชี <b>{u.name}</b> (@{u.username}) ให้เข้าสู่ระบบได้อีกครั้ง?</>,
      target: `@${u.username}`,
      confirmText: "ปลดระงับ",
      tone: "primary",
    });
    if (ok) await updateUser(u.id, { status: "active" }, "approve_user", `ปลดระงับ ${u.username}`, `ปลดระงับ ${u.name}`);
  };

  const confirmEdit = async (u) => {
    const ok = await confirm({
      title: "แก้ไขข้อมูลผู้ใช้",
      message: <>ต้องการแก้ไขข้อมูลของ <b>{u.name}</b> (@{u.username})?</>,
      target: `@${u.username}`,
      confirmText: "เปิดแก้ไข",
      tone: "primary",
    });
    if (ok) setEdit({ ...u });
  };

  const unlockPw = async (u) => {
    const ok = await confirm({
      title: "ปลดล็อครหัสผ่านหมดอายุ",
      message: <>ปลดล็อคให้ <b>{u.name}</b> เข้าสู่ระบบได้ชั่วคราว — ระบบจะบังคับให้เปลี่ยนรหัสผ่านทันที</>,
      target: `@${u.username}`,
      confirmText: "ปลดล็อค",
      tone: "primary",
    });
    if (ok) await updateUser(
      u.id, { pw_force_change: true },
      "unlock_password", `ปลดล็อครหัสผ่านหมดอายุ ${u.username}`,
      `ปลดล็อค ${u.name} แล้ว — ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบ`
    );
  };

  const pwDaysLeft = (u) => {
    if (!u.passwordChangedAt) return null;
    const daysOld = (Date.now() - new Date(u.passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24);
    return Math.ceil(45 - daysOld);
  };

  const openPwHistory = async (u) => {
    setPwModal({ user: u, history: [], loading: true });
    const { data: rows } = await _supabase
      .from("password_history")
      .select("*")
      .eq("user_id", u.id)
      .order("changed_at", { ascending: false })
      .limit(50);
    setPwModal({ user: u, history: rows || [], loading: false });
  };

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);

    // 2FA อัตโนมัติตาม role
    const auto2fa = edit.role === "admin" ? true : false;
    const patch = { name: edit.name, username: edit.username, role: edit.role, status: edit.status, require_2fa: auto2fa };

    const { error } = await _supabase.from("profiles")
      .update(fromProfilePatch(patch))
      .eq("id", edit.id);
    setSaving(false);
    if (error) { toast?.("เกิดข้อผิดพลาด: " + error.message, "error"); return; }
    setData(d => ({ ...d, users: d.users.map(u => u.id === edit.id ? { ...u, ...patch } : u) }));

    const roleChanged = edit.role !== data.users.find(u => u.id === edit.id)?.role;
    const detail = roleChanged
      ? `แก้ไขข้อมูล ${edit.username} · role → ${edit.role} · 2FA ${auto2fa ? "เปิด" : "ปิด"}อัตโนมัติ`
      : `แก้ไขข้อมูล ${edit.username}`;
    addAudit({ user: currentUser.username, action: "update_user", target: edit.username, detail });
    toast?.(`บันทึก ${edit.name} แล้ว${roleChanged ? ` · 2FA ${auto2fa ? "เปิด" : "ปิด"}อัตโนมัติ` : ""}`, "success");
    setEdit(null);
  };

  const users = data.users;
  const total   = users.length;
  const active  = users.filter(u => u.status === "active").length;
  const pending = users.filter(u => u.status === "pending").length;
  const banned  = users.filter(u => u.status === "banned").length;
  const admins  = users.filter(u => u.role === "admin").length;
  const with2fa = users.filter(u => u.require_2fa).length;
  const pwExpired = users.filter(u => {
    if (u.pw_force_change) return false;
    const d = pwDaysLeft(u);
    return d !== null && d <= 0;
  }).length;
  const pct = (n) => total ? Math.round(n / total * 100) : 0;

  return (
    <div className="f-col f-gap-4 fade-up">
      <style>{`
        .au-dt    { display: block; overflow: auto; max-height: 60vh; }
        .au-cards { display: none; }
        .au-card  { padding: 14px 2px; border-bottom: 1px solid var(--line); }
        .au-card:last-child { border-bottom: none; }
        .au-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .au-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 900px) {
          .au-stat-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 680px) {
          .au-dt    { display: none !important; }
          .au-cards { display: block !important; }
          .au-search { width: 100% !important; }
          .au-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .au-breakdown { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── User Stats Dashboard ── */}
      <div>
        <div className="t-eyebrow" style={{ color: "var(--pea-orange-500)", marginBottom: 4 }}>Overview</div>
        <div className="text-lg fw-7" style={{ marginBottom: 14 }}>สถิติผู้ใช้งาน</div>

        {/* Stat cards row */}
        <div className="au-stat-grid" style={{ marginBottom: 14 }}>
          {[
            { label: "ทั้งหมด",          value: total,     icon: "users",   color: "#6b2c91", bg: "rgba(107,44,145,0.1)",  filter: "" },
            { label: "ใช้งานได้",        value: active,    icon: "check",   color: "#10b981", bg: "rgba(16,185,129,0.1)",  filter: "active" },
            { label: "รออนุมัติ",        value: pending,   icon: "bell",    color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  filter: "pending" },
            { label: "ระงับ",            value: banned,    icon: "close",   color: "#ef4444", bg: "rgba(239,68,68,0.1)",   filter: "banned" },
            { label: "Admin",            value: admins,    icon: "settings",color: "#f47b20", bg: "rgba(244,123,32,0.1)",  filter: "admin" },
            { label: "เปิด 2FA",         value: with2fa,   icon: "lock",    color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  filter: "with2fa" },
            { label: "รหัสผ่านหมดอายุ", value: pwExpired, icon: "warning", color: "#dc2626", bg: "rgba(220,38,38,0.1)",   filter: "pwExpired" },
          ].map(({ label, value, icon, color, bg, filter }) => {
            const isActive = statusFilter === filter;
            return (
            <div key={label} onClick={() => goFilter(isActive ? "" : filter)} style={{
              background: isActive ? `${bg.replace("0.1","0.18")}` : "var(--surface)",
              border: `1px solid ${isActive ? color + "55" : "var(--line)"}`,
              borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
              cursor: "pointer", transition: "border 0.2s, box-shadow 0.2s",
              boxShadow: isActive ? `0 0 0 2px ${color}33` : "none",
            }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = color + "55"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = "var(--line)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="text-sm t-mute" style={{ fontWeight: 600, color: isActive ? color : undefined }}>{label}</span>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: "grid", placeItems: "center" }}>
                  <Icon name={icon} size={15} style={{ color }} />
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color }}>{value}</div>
              <div style={{ height: 4, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 999, background: color, width: `${pct(value)}%`, transition: "width 600ms ease" }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-mute)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{pct(value)}% ของทั้งหมด</span>
                {isActive && <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, padding: "1px 6px", borderRadius: 6 }}>กรองอยู่</span>}
              </div>
            </div>
          );})}
        </div>

        {/* Role & 2FA breakdown */}
        <div className="au-breakdown">
          {/* Role donut-style */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="users" size={14} /> สัดส่วน Role
            </div>
            {[
              { label: "User", value: total - admins, color: "#8b3fc4", filter: "user" },
              { label: "Admin", value: admins,         color: "#f47b20", filter: "admin" },
            ].map(({ label, value, color, filter }) => (
              <div key={label} onClick={() => goFilter(statusFilter === filter ? "" : filter)} style={{ marginBottom: 10, cursor: "pointer", borderRadius: 8, padding: "4px 6px", margin: "0 -6px 6px", background: statusFilter === filter ? `${color}15` : "transparent", transition: "background 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span className="text-sm" style={{ fontWeight: 600, color: statusFilter === filter ? color : undefined }}>{label}</span>
                  <span className="text-sm t-mute">{value} คน · {pct(value)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, background: color, width: `${pct(value)}%`, transition: "width 600ms ease" }} />
                </div>
              </div>
            ))}
          </div>

          {/* 2FA & Status */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="lock" size={14} /> สถานะ 2FA & การเข้าถึง
            </div>
            {[
              { label: "เปิด 2FA",   value: with2fa,        color: "#3b82f6", filter: "with2fa" },
              { label: "ไม่มี 2FA",  value: total - with2fa, color: "#94a3b8", filter: "no2fa" },
              { label: "ใช้งานได้",  value: active,          color: "#10b981", filter: "active" },
              { label: "รออนุมัติ", value: pending,         color: "#f59e0b", filter: "pending" },
            ].map(({ label, value, color, filter }) => (
              <div key={label} onClick={() => goFilter(statusFilter === filter ? "" : filter)} style={{ marginBottom: 8, cursor: "pointer", borderRadius: 8, padding: "3px 6px", margin: "0 -6px 4px", background: statusFilter === filter ? `${color}15` : "transparent", transition: "background 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span className="text-sm" style={{ fontWeight: 600, color: statusFilter === filter ? color : undefined }}>{label}</span>
                  <span className="text-sm t-mute">{value} คน</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, background: color, width: `${pct(value)}%`, transition: "width 600ms ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── User Table Card ── */}
      <div className="card card-elev" ref={tableRef}>
      {/* Header */}
      <div className="f-between f-gap-3 f-wrap" style={{ marginBottom: statusFilter ? 8 : 16 }}>
        <div>
          <div className="text-lg fw-7">ผู้ใช้งาน ({list.length})</div>
          <div className="t-mute text-sm">อนุมัติบัญชีใหม่ · ระงับ · แก้ไขข้อมูล</div>
        </div>
        <input className="input au-search" style={{ width: 280, height: 38 }} value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อ / username / email" />
      </div>
      {statusFilter && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 600 }}>กรองตาม:</span>
          <button onClick={() => setStatusFilter("")} style={{
            display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99,
            background: "rgba(107,44,145,0.1)", border: "1px solid rgba(107,44,145,0.3)",
            color: "var(--pea-purple-600)", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
            {{active:"ใช้งานได้", pending:"รออนุมัติ", banned:"ระงับ", admin:"Admin", user:"User", with2fa:"เปิด 2FA", no2fa:"ไม่มี 2FA", pwExpired:"รหัสผ่านหมดอายุ"}[statusFilter] || statusFilter}
            <Icon name="close" size={11} />
          </button>
        </div>
      )}

      {/* Desktop: table */}
      <div className="au-dt">
        <table className="table">
          <thead><tr>{["ผู้ใช้", "Role", "สถานะ", "2FA", "รหัสผ่าน", "เข้าใช้ล่าสุด", "การจัดการ"].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map(u => {
              const dl = pwDaysLeft(u);
              const isPwExpired = !u.pw_force_change && dl !== null && dl <= 0;
              return (
              <tr key={u.id} onClick={() => openPwHistory(u)} style={{ cursor: "pointer" }}>
                <td>
                  <div className="f-gap-3 flex" style={{ alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarBg(u.username), color: "white", display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 }}>{u.name?.[0] || u.username[0]}</div>
                    <div>
                      <div className="fw-6">{u.name}</div>
                      <div className="t-mute text-xs mono">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td><span className={"badge " + (u.role === "admin" ? "badge-orange" : "badge-blue")}>{u.role}</span></td>
                <td>
                  <span className={"badge " + (u.status === "active" ? "badge-green" : u.status === "banned" ? "badge-red" : "badge-amber")}>
                    {u.status === "active" ? "ใช้งานได้" : u.status === "banned" ? "ระงับ" : "รออนุมัติ"}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggle2FA(u)} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                    border: `1px solid ${u.require_2fa ? "#16a34a" : "var(--line)"}`,
                    background: u.require_2fa ? "rgba(22,163,74,0.1)" : "var(--surface-2)",
                    color: u.require_2fa ? "#16a34a" : "var(--ink-mute)", cursor: "pointer",
                  }}>
                    <Icon name="lock" size={11} />
                    {u.require_2fa ? "เปิดอยู่" : "ปิดอยู่"}
                  </button>
                </td>
                <td>
                  {u.pw_force_change ? (
                    <span className="badge badge-amber" style={{ fontSize: 10 }}>ต้องเปลี่ยน</span>
                  ) : isPwExpired ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span className="badge badge-red" style={{ fontSize: 10 }}>หมดอายุ</span>
                      <button onClick={() => unlockPw(u)} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: "pointer",
                        border: "1px solid rgba(107,44,145,0.4)", background: "rgba(107,44,145,0.1)",
                        color: "var(--pea-purple-600)", whiteSpace: "nowrap",
                      }}>
                        <Icon name="check" size={10} /> ปลดล็อค
                      </button>
                    </div>
                  ) : dl !== null ? (
                    <span style={{ fontSize: 11, fontWeight: 700,
                      color: dl <= 3 ? "#dc2626" : dl <= 7 ? "#d97706" : "#10b981" }}>
                      {dl} วัน
                    </span>
                  ) : (
                    <span className="t-mute" style={{ fontSize: 11 }}>—</span>
                  )}
                </td>
                <td className="text-sm t-mute">{u.lastLogin || "—"}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="row-action">
                    {u.status === "pending" && (
                      <button className="btn-icon" title="อนุมัติ" onClick={() => approveUser(u)}>
                        <Icon name="check" size={14} />
                      </button>
                    )}
                    {u.status === "active" && u.id !== currentUser.id && (
                      <button className="btn-icon" title="ระงับ" onClick={() => banUser(u)}>
                        <Icon name="lock" size={14} />
                      </button>
                    )}
                    {u.status === "banned" && (
                      <button className="btn-icon" title="ปลดระงับ" onClick={() => unbanUser(u)}>
                        <Icon name="check" size={14} />
                      </button>
                    )}
                    <button className="btn-icon" title="แก้ไข" onClick={() => confirmEdit(u)}><Icon name="edit" size={14} /></button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="au-cards">
        {list.map(u => {
          const isPending  = u.status === "pending";
          const isBanned   = u.status === "banned";
          const isMe       = u.id === currentUser.id;
          const dl         = pwDaysLeft(u);
          const isPwExpired = !u.pw_force_change && dl !== null && dl <= 0;
          return (
            <div key={u.id} className="au-card" onClick={() => openPwHistory(u)} style={{
              background: isPending ? "rgba(234,179,8,0.04)" : isPwExpired ? "rgba(220,38,38,0.03)" : "transparent",
              borderRadius: (isPending || isPwExpired) ? 12 : 0,
              padding: (isPending || isPwExpired) ? "14px 12px" : "14px 2px",
              border: isPending ? "1px solid rgba(234,179,8,0.2)" : isPwExpired ? "1px solid rgba(220,38,38,0.2)" : undefined,
              marginBottom: (isPending || isPwExpired) ? 8 : 0,
              cursor: "pointer",
            }}>
              {/* Row 1: Avatar + name/username + role */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  background: isBanned ? "var(--line)" : avatarBg(u.username),
                  color: "white", display: "grid", placeItems: "center",
                  fontWeight: 800, fontSize: 16,
                  opacity: isBanned ? 0.5 : 1,
                }}>
                  {(u.name || u.username || "?")[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
                    {isMe && <span style={{ fontSize: 10, background: "var(--pea-purple-500)", color: "white", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>คุณ</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>@{u.username}</div>
                </div>
                <span className={"badge " + (u.role === "admin" ? "badge-orange" : "badge-blue")} style={{ flexShrink: 0, fontSize: 11 }}>
                  {u.role}
                </span>
              </div>

              {/* Row 2: Status + 2FA + pw status + last login */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                <span className={"badge " + (u.status === "active" ? "badge-green" : isBanned ? "badge-red" : "badge-amber")} style={{ fontSize: 11 }}>
                  {u.status === "active" ? "ใช้งานได้" : isBanned ? "ระงับ" : "รออนุมัติ"}
                </span>
                <button onClick={e => { e.stopPropagation(); toggle2FA(u); }} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${u.require_2fa ? "#16a34a" : "var(--line)"}`,
                  background: u.require_2fa ? "rgba(22,163,74,0.1)" : "transparent",
                  color: u.require_2fa ? "#16a34a" : "var(--ink-mute)",
                }}>
                  <Icon name="lock" size={10} />
                  2FA {u.require_2fa ? "เปิด" : "ปิด"}
                </button>
                {u.pw_force_change && (
                  <span className="badge badge-amber" style={{ fontSize: 10 }}>ต้องเปลี่ยนรหัส</span>
                )}
                {!u.pw_force_change && dl !== null && (
                  <span style={{ fontSize: 11, fontWeight: 700,
                    color: dl <= 0 ? "#dc2626" : dl <= 3 ? "#dc2626" : dl <= 7 ? "#d97706" : "#10b981" }}>
                    {dl <= 0 ? "รหัสผ่านหมดอายุ" : `รหัสผ่าน ${dl} วัน`}
                  </span>
                )}
                {u.lastLogin && (
                  <span style={{ fontSize: 11, color: "var(--ink-mute)", marginLeft: "auto" }}>
                    {u.lastLogin}
                  </span>
                )}
              </div>

              {/* Row 3: Action buttons */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                {isPending && (
                  <button className="btn btn-primary btn-sm" style={{ height: 34, fontSize: 12 }}
                    onClick={() => approveUser(u)}>
                    <Icon name="check" size={13} /> อนุมัติบัญชี
                  </button>
                )}
                {u.status === "active" && !isMe && (
                  <button className="btn btn-outline btn-sm" style={{ height: 34, fontSize: 12, color: "var(--red)", borderColor: "rgba(239,68,68,0.4)" }}
                    onClick={() => banUser(u)}>
                    <Icon name="lock" size={13} /> ระงับบัญชี
                  </button>
                )}
                {isBanned && (
                  <button className="btn btn-outline btn-sm" style={{ height: 34, fontSize: 12 }}
                    onClick={() => unbanUser(u)}>
                    <Icon name="check" size={13} /> ปลดระงับ
                  </button>
                )}
                {isPwExpired && (
                  <button className="btn btn-sm" style={{ height: 34, fontSize: 12, background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", color: "white" }}
                    onClick={() => unlockPw(u)}>
                    <Icon name="check" size={13} /> ปลดล็อครหัสผ่าน
                  </button>
                )}
                <button className="btn btn-outline btn-sm" style={{ height: 34, fontSize: 12 }}
                  onClick={() => openPwHistory(u)}>
                  <Icon name="history" size={13} /> ประวัติรหัสผ่าน
                </button>
                <button className="btn btn-outline btn-sm" style={{ height: 34, fontSize: 12, marginLeft: "auto" }}
                  onClick={() => confirmEdit(u)}>
                  <Icon name="edit" size={13} /> แก้ไข
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ink-mute)", fontSize: 14 }}>
            ไม่พบผู้ใช้งาน
          </div>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="แก้ไขข้อมูลผู้ใช้" width={520}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setEdit(null)}>ยกเลิก</button>
            <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
              <Icon name="check" size={14} /> {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </>
        }>
        {edit && (
          <div className="f-col f-gap-4">
            <div className="field"><label className="field-label">ชื่อ-นามสกุล</label><input className="input" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="field"><label className="field-label">Username</label><input className="input" value={edit.username} onChange={e => setEdit({ ...edit, username: e.target.value })} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field"><label className="field-label">Role</label>
                <select className="input" value={edit.role} onChange={e => setEdit({ ...edit, role: e.target.value })}>
                  <option value="user">user</option><option value="admin">admin</option>
                </select>
              </div>
              <div className="field"><label className="field-label">สถานะ</label>
                <select className="input" value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value })}>
                  <option value="active">active</option><option value="pending">pending</option><option value="banned">banned</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Modal>
      </div>

      {/* ── Password History Modal ── */}
      {pwModal && (() => {
        const u    = pwModal.user;
        const dl   = pwDaysLeft(u);
        const isPwExpired = !u.pw_force_change && dl !== null && dl <= 0;
        const pct  = dl !== null ? Math.max(0, Math.min(100, Math.round((dl / 45) * 100))) : null;
        const barColor = isPwExpired ? "#dc2626" : dl <= 3 ? "#dc2626" : dl <= 7 ? "#d97706" : "#10b981";
        const actionLabel = (a) => ({
          change_password: "เปลี่ยนรหัสผ่าน",
          force_change: "บังคับเปลี่ยน (Admin)",
          reset: "รีเซ็ตรหัสผ่าน",
        }[a] || a);

        return (
          <div className="fade-in pea-modal-overlay"
            onClick={() => setPwModal(null)}>
            <div className="fade-up" onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 22, width: "100%", maxWidth: 580, boxShadow: "0 28px 72px rgba(0,0,0,0.55)", overflow: "hidden", maxHeight: "86vh", display: "flex", flexDirection: "column" }}>

              {/* Header */}
              <div style={{ background: "linear-gradient(135deg,#1b0926,#321148,#4f1e6e)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarBg(u.username), display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18, color: "white", flexShrink: 0 }}>
                    {(u.name || u.username || "?")[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "white" }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>@{u.username} · {u.role}</div>
                  </div>
                </div>
                <button onClick={() => setPwModal(null)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", color: "white", display: "grid", placeItems: "center", border: "none", cursor: "pointer", flexShrink: 0 }}>
                  <Icon name="close" size={14} />
                </button>
              </div>

              <div style={{ padding: "20px 24px", overflow: "auto", flex: 1 }}>

                {/* Personal info grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {[
                    { label: "อีเมล",       value: u.email || "—",     icon: "mail" },
                    { label: "สถานะบัญชี",  value: u.status,           icon: "check",
                      chip: { active: { bg: "rgba(16,185,129,0.12)", color: "#059669", text: "ใช้งานได้" },
                               pending: { bg: "rgba(217,119,6,0.12)", color: "#d97706", text: "รออนุมัติ" },
                               banned:  { bg: "rgba(220,38,38,0.12)", color: "#dc2626", text: "ระงับ" } }[u.status] },
                    { label: "บทบาท",       value: u.role,             icon: "settings" },
                    { label: "2FA",          value: u.require_2fa ? "เปิดใช้งาน" : "ปิด", icon: "lock" },
                    { label: "เข้าใช้ล่าสุด", value: u.lastLogin || "—", icon: "history" },
                    { label: "สมัครเมื่อ",   value: u.created || "—",  icon: "user" },
                  ].map(r => (
                    <div key={r.label} style={{ background: "var(--soft)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-mute)", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon name={r.icon} size={11} />{r.label}
                      </div>
                      {r.chip ? (
                        <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: r.chip.bg, color: r.chip.color }}>{r.chip.text}</span>
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.value}</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Expiry status card */}
                <div style={{ borderRadius: 16, border: `2px solid ${isPwExpired ? "rgba(220,38,38,0.35)" : u.pw_force_change ? "rgba(217,119,6,0.35)" : "rgba(16,185,129,0.25)"}`, background: isPwExpired ? "rgba(220,38,38,0.06)" : u.pw_force_change ? "rgba(217,119,6,0.06)" : "rgba(16,185,129,0.05)", padding: "18px 20px", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-mute)", marginBottom: 4 }}>สถานะรหัสผ่าน</div>
                      {u.pw_force_change ? (
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#d97706" }}>ต้องเปลี่ยนรหัสผ่าน</div>
                      ) : isPwExpired ? (
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#dc2626" }}>หมดอายุแล้ว</div>
                      ) : dl !== null ? (
                        <div style={{ fontSize: 22, fontWeight: 900, color: barColor }}>เหลือ {dl} วัน</div>
                      ) : (
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink-mute)" }}>ไม่มีข้อมูล</div>
                      )}
                    </div>
                    {dl !== null && !isPwExpired && !u.pw_force_change && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--ink-mute)", marginBottom: 2 }}>ใช้ไปแล้ว</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink-mute)" }}>{45 - dl}<span style={{ fontSize: 12, marginLeft: 2 }}>/{45} วัน</span></div>
                      </div>
                    )}
                  </div>
                  {pct !== null && (
                    <div>
                      <div style={{ height: 10, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 999, background: barColor, width: `${pct}%`, transition: "width 600ms ease" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "var(--ink-mute)" }}>
                        <span>เปลี่ยนล่าสุด: {u.passwordChangedAt ? new Date(u.passwordChangedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                        <span>ครบ 45 วัน: {u.passwordChangedAt ? new Date(new Date(u.passwordChangedAt).getTime() + 45*24*60*60*1000).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                      </div>
                    </div>
                  )}
                  {isPwExpired && (
                    <button className="btn btn-primary" style={{ marginTop: 14, width: "100%", height: 40, fontSize: 13 }} onClick={() => { setPwModal(null); unlockPw(u); }}>
                      <Icon name="check" size={14} /> ปลดล็อค — บังคับให้เปลี่ยนรหัสผ่านเมื่อ Login
                    </button>
                  )}
                </div>

                {/* Password history */}
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="history" size={15} style={{ color: "var(--pea-orange-500)" }} />
                  ประวัติการเปลี่ยนรหัสผ่าน
                </div>

                {pwModal.loading ? (
                  <div style={{ padding: "28px 0", textAlign: "center", color: "var(--ink-mute)" }}>
                    <div style={{ width: 28, height: 28, margin: "0 auto 10px", borderRadius: "50%", border: "3px solid var(--line)", borderTopColor: "var(--pea-purple-500)", animation: "pea-spin 0.8s linear infinite" }} />
                    กำลังโหลด…
                  </div>
                ) : pwModal.history.length === 0 ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ink-mute)", fontSize: 13, background: "var(--soft)", borderRadius: 12 }}>
                    ยังไม่มีประวัติการเปลี่ยนรหัสผ่าน
                  </div>
                ) : (
                  <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                    {pwModal.history.map((h, i) => (
                      <div key={h.id} style={{ padding: "12px 16px", borderBottom: i < pwModal.history.length - 1 ? "1px solid var(--line)" : "none", display: "flex", alignItems: "center", gap: 12, background: i === 0 ? "rgba(16,185,129,0.04)" : "transparent" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: h.action === "force_change" ? "rgba(217,119,6,0.15)" : "rgba(16,185,129,0.12)", display: "grid", placeItems: "center" }}>
                          <Icon name="lock" size={14} style={{ color: h.action === "force_change" ? "#d97706" : "#10b981" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                            {actionLabel(h.action)}
                            {i === 0 && <span style={{ fontSize: 10, background: "rgba(16,185,129,0.15)", color: "#059669", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>ล่าสุด</span>}
                          </div>
                          {h.note && <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 2 }}>{h.note}</div>}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                            {new Date(h.changed_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                            {new Date(h.changed_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--line)", flexShrink: 0 }}>
                <button className="btn btn-outline" style={{ width: "100%", height: 40 }} onClick={() => setPwModal(null)}>ปิด</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function avatarBg(seed) {
  const colors = ["#6b2c91", "#f47b20", "#3b82f6", "#10b981", "#8b3fc4", "#d96512"];
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return colors[Math.abs(h) % colors.length];
}

/* ---------- Meters CRUD — server-side search ---------- */
function AdminMeters({ addAudit, currentUser }) {
  const { lang } = useLang();
  const s = (th, en) => lang === "en" ? en : th;
  const [q, setQ]             = useStateAd("");
  const [list, setList]       = useStateAd([]);
  const [searching, setSearching] = useStateAd(false);
  const [edit, setEdit]       = useStateAd(null);
  const [saving, setSaving]   = useStateAd(false);
  const [showExport, setShowExport] = useStateAd(false);
  const confirm = useConfirm();
  const toast   = useToast();

  // Load first page on mount, then re-search on query change
  useEffectAd(() => {
    let cancelled = false;
    const run = async () => {
      setSearching(true);
      let dbq = _supabase.from("meters").select("*").limit(100);
      if (q.trim()) {
        const safe = q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
        dbq = dbq.or(`tag.ilike.%${safe}%,peano.ilike.%${safe}%,accountnum.ilike.%${safe}%,feederid.ilike.%${safe}%`);
      } else {
        dbq = dbq.order("objectid");
      }
      const { data: rows } = await dbq;
      if (!cancelled) setList((rows || []).map(toMeter));
      setSearching(false);
    };
    const t = q.trim() ? setTimeout(run, 400) : (run(), undefined);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const isNew = (m) => !list.find(x => x.OBJECTID === m.OBJECTID);

  const save = async (m) => {
    setSaving(true);
    const existing = !isNew(m);
    const { error } = existing
      ? await _supabase.from("meters").update(fromMeter(m)).eq("objectid", m.OBJECTID)
      : await _supabase.from("meters").insert(fromMeter(m));
    setSaving(false);
    if (error) { toast?.("เกิดข้อผิดพลาด: " + error.message, "error"); return; }
    if (existing) {
      setList(l => l.map(x => x.OBJECTID === m.OBJECTID ? m : x));
      addAudit({ user: currentUser.username, action: "update_meter", target: `OBJECTID ${m.OBJECTID}`, detail: `แก้ไขมิเตอร์ ${m.TAG}` });
      toast?.(`บันทึกมิเตอร์ ${m.TAG} แล้ว`, "success");
    } else {
      setList(l => [m, ...l]);
      addAudit({ user: currentUser.username, action: "create_meter", target: `OBJECTID ${m.OBJECTID}`, detail: `เพิ่มมิเตอร์ ${m.TAG}` });
      toast?.(`เพิ่มมิเตอร์ ${m.TAG} แล้ว`, "success");
    }
    setEdit(null);
  };

  const remove = async (m) => {
    const ok = await confirm({
      title: "ลบมิเตอร์",
      message: <>ยืนยันลบมิเตอร์นี้? ข้อมูลจะหายถาวรจากฐานข้อมูล</>,
      target: `PEA Meter ${m.PEANO || "—"}`,
      confirmText: "ลบมิเตอร์",
      tone: "danger",
    });
    if (!ok) return;
    const { error } = await _supabase.from("meters").delete().eq("objectid", m.OBJECTID);
    if (error) { toast?.("เกิดข้อผิดพลาด: " + error.message, "error"); return; }
    setList(l => l.filter(x => x.OBJECTID !== m.OBJECTID));
    addAudit({ user: currentUser.username, action: "delete_meter", target: `OBJECTID ${m.OBJECTID}`, detail: `ลบมิเตอร์ ${m.TAG}` });
    toast?.(`ลบมิเตอร์ ${m.TAG} แล้ว`, "success");
  };

  return (
    <div className="card card-elev fade-up">
      <style>{`
        .adm-tb { display: flex; gap: 8px; align-items: center; }
        @media (max-width: 680px) {
          .adm-tb { flex-wrap: wrap; width: 100%; }
          .adm-tb .input { flex: 1 1 0; min-width: 0; width: auto !important; }
        }
      `}</style>
      <div className="f-between f-gap-3 f-wrap" style={{ marginBottom: 16 }}>
        <div>
          <div className="text-lg fw-7">PEA Meter {searching ? "…" : `(${list.length}${list.length >= 100 ? "+" : ""})`}</div>
          <div className="t-mute text-sm">{s("เพิ่ม/แก้ไข/ลบข้อมูลมิเตอร์ · ค้นหาเพื่อกรองผลลัพธ์", "Add / edit / delete meter records · search to filter")}</div>
        </div>
        <div className="adm-tb">
          <input className="input" style={{ width: 220, height: 38 }} value={q} onChange={e => setQ(e.target.value)} placeholder={s("ค้นหา TAG, PEANO, ACCOUNTNUM…", "Search TAG, PEANO, ACCOUNTNUM…")} />
          <button className="btn btn-outline btn-sm" style={{ flexShrink: 0 }} onClick={() => setShowExport(true)}><Icon name="download" size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => setEdit({ OBJECTID: Date.now(), TAG: "", CODE: "AFAG", ROUTE: "", ACCOUNTNUM: "", PEANO: "", FEEDERID: "", OWNER: "PEA", INSTALLATI: "", LATITUDE: 19.86, LONGITUDE: 99.18 })}>
            <Icon name="plus" size={14} /> {s("เพิ่ม", "Add")}
          </button>
        </div>
      </div>
      <div style={{ overflow: "auto", maxHeight: "60vh" }}>
        <table className="table">
          <thead><tr>{["OBJECTID", "TAG", "CODE", "ROUTE", "PEANO", "Feeder", "OWNER", "พิกัด", ""].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map(m => (
              <tr key={m.OBJECTID}>
                <td className="mono text-xs t-mute">{m.OBJECTID}</td>
                <td className="mono fw-6">{m.TAG}</td>
                <td>{m.CODE}</td>
                <td>{m.ROUTE}</td>
                <td className="mono">{m.PEANO}</td>
                <td><span className="badge badge-purple">{m.FEEDERID || "—"}</span></td>
                <td><span className={"badge " + (m.OWNER === "Customer" ? "badge-orange" : "badge-purple")}>{m.OWNER || "—"}</span></td>
                <td className="mono text-xs">{m.LATITUDE.toFixed(4)}, {m.LONGITUDE.toFixed(4)}</td>
                <td>
                  <div className="row-action">
                    <button className="btn-icon" onClick={() => setEdit(m)}><Icon name="edit" size={14} /></button>
                    <button className="btn-icon" onClick={() => remove(m)}><Icon name="trash" size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length >= 100 && (
          <div className="t-mute text-sm" style={{ padding: 12, textAlign: "center" }}>
            {s(`แสดง ${list.length} รายการ — พิมพ์คำค้นหาเพื่อจำกัดผลลัพธ์`, `Showing ${list.length} records — type to narrow results`)}
          </div>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && !isNew(edit) ? s("แก้ไขมิเตอร์","Edit Meter") : s("เพิ่มมิเตอร์","Add Meter")} width={640}
        footer={<><button className="btn btn-outline" onClick={() => setEdit(null)}>{s("ยกเลิก","Cancel")}</button><button className="btn btn-primary" onClick={() => save(edit)} disabled={saving}><Icon name="check" size={14} /> {saving ? s("กำลังบันทึก…","Saving…") : s("บันทึก","Save")}</button></>}>
        {edit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="TAG"        v={edit.TAG}        onC={v => setEdit({ ...edit, TAG: v })} />
            <div className="field"><label className="field-label">CODE</label>
              <select className="input" value={edit.CODE} onChange={e => setEdit({ ...edit, CODE: e.target.value })}>
                <option value="AFAG">AFAG</option>
                <option value="ACPK">ACPK</option>
              </select>
            </div>
            <Field label="ROUTE"      v={edit.ROUTE}      onC={v => setEdit({ ...edit, ROUTE: v })} />
            <Field label="ACCOUNTNUM" v={edit.ACCOUNTNUM} onC={v => setEdit({ ...edit, ACCOUNTNUM: v })} />
            <Field label="PEANO"      v={edit.PEANO}      onC={v => setEdit({ ...edit, PEANO: v })} />
            <Field label="FEEDERID"   v={edit.FEEDERID}   onC={v => setEdit({ ...edit, FEEDERID: v })} />
            <div className="field"><label className="field-label">OWNER</label>
              <select className="input" value={edit.OWNER} onChange={e => setEdit({ ...edit, OWNER: e.target.value })}>
                <option value="PEA">PEA</option><option value="Customer">Customer</option>
              </select>
            </div>
            <Field label="INSTALLATI" v={edit.INSTALLATI} onC={v => setEdit({ ...edit, INSTALLATI: v })} />
            <Field label="LATITUDE"   v={edit.LATITUDE}   onC={v => setEdit({ ...edit, LATITUDE: +v })}  type="number" />
            <Field label="LONGITUDE"  v={edit.LONGITUDE}  onC={v => setEdit({ ...edit, LONGITUDE: +v })} type="number" />
          </div>
        )}
      </Modal>
      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        onConfirm={() => { downloadCSV("pea-meter-export.csv", list); addAudit({ user: currentUser.username, action: "export_csv", target: "PEA Meter", detail: `ส่งออก ${list.length} รายการ` }); setShowExport(false); }}
        count={list.length}
        filename="pea-meter-export.csv"
        label="PEA Meter"
      />
    </div>
  );
}

function Field({ label, v, onC, type = "text" }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input className="input" type={type} value={v ?? ""} onChange={e => onC(e.target.value)} />
    </div>
  );
}

/* ---------- TRs CRUD — server-side search ---------- */
function AdminTrs({ addAudit, currentUser }) {
  const { lang } = useLang();
  const s = (th, en) => lang === "en" ? en : th;
  const [q, setQ]           = useStateAd("");
  const [list, setList]     = useStateAd([]);
  const [searching, setSearching] = useStateAd(false);
  const [edit, setEdit]     = useStateAd(null);
  const [saving, setSaving] = useStateAd(false);
  const [showExport, setShowExport] = useStateAd(false);
  const confirm = useConfirm();
  const toast   = useToast();

  useEffectAd(() => {
    let cancelled = false;
    const run = async () => {
      setSearching(true);
      let dbq = _supabase.from("transformers").select("*").limit(100);
      if (q.trim()) {
        const safe = q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
        dbq = dbq.or(`tag.ilike.%${safe}%,peano_tr.ilike.%${safe}%,location.ilike.%${safe}%,feeder1.ilike.%${safe}%`);
      } else {
        dbq = dbq.order("objectid");
      }
      const { data: rows } = await dbq;
      if (!cancelled) setList((rows || []).map(toTransformer));
      setSearching(false);
    };
    const t = q.trim() ? setTimeout(run, 400) : (run(), undefined);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const isNew = (t) => !list.find(x => x.OBJECTID === t.OBJECTID);

  const save = async (t) => {
    setSaving(true);
    const existing = !isNew(t);
    const { error } = existing
      ? await _supabase.from("transformers").update(fromTransformer(t)).eq("objectid", t.OBJECTID)
      : await _supabase.from("transformers").insert(fromTransformer(t));
    setSaving(false);
    if (error) { toast?.("เกิดข้อผิดพลาด: " + error.message, "error"); return; }
    if (existing) {
      setList(l => l.map(x => x.OBJECTID === t.OBJECTID ? t : x));
      addAudit({ user: currentUser.username, action: "update_tr", target: `OBJECTID ${t.OBJECTID}`, detail: `แก้ไขหม้อแปลง ${t.TAG}` });
      toast?.(`บันทึกหม้อแปลง ${t.TAG} แล้ว`, "success");
    } else {
      setList(l => [t, ...l]);
      addAudit({ user: currentUser.username, action: "create_tr", target: `OBJECTID ${t.OBJECTID}`, detail: `เพิ่มหม้อแปลง ${t.TAG}` });
      toast?.(`เพิ่มหม้อแปลง ${t.TAG} แล้ว`, "success");
    }
    setEdit(null);
  };

  const remove = async (t) => {
    const ok = await confirm({
      title: "ลบหม้อแปลง",
      message: <>ยืนยันลบหม้อแปลงนี้? ข้อมูลจะหายถาวร</>,
      target: `PEA TR ${t.PEANO_TR || "—"} · ${t.KVA} kVA`,
      confirmText: "ลบหม้อแปลง",
      tone: "danger",
    });
    if (!ok) return;
    const { error } = await _supabase.from("transformers").delete().eq("objectid", t.OBJECTID);
    if (error) { toast?.("เกิดข้อผิดพลาด: " + error.message, "error"); return; }
    setList(l => l.filter(x => x.OBJECTID !== t.OBJECTID));
    addAudit({ user: currentUser.username, action: "delete_tr", target: `OBJECTID ${t.OBJECTID}`, detail: `ลบหม้อแปลง ${t.TAG}` });
    toast?.(`ลบหม้อแปลง ${t.TAG} แล้ว`, "success");
  };

  return (
    <div className="card card-elev fade-up">
      <div className="f-between f-gap-3 f-wrap" style={{ marginBottom: 16 }}>
        <div>
          <div className="text-lg fw-7">PEA Transformer {searching ? "…" : `(${list.length}${list.length >= 100 ? "+" : ""})`}</div>
          <div className="t-mute text-sm">{s("เพิ่ม/แก้ไข/ลบข้อมูลหม้อแปลง · ค้นหาเพื่อกรองผลลัพธ์", "Add / edit / delete transformer records · search to filter")}</div>
        </div>
        <div className="adm-tb">
          <input className="input" style={{ width: 220, height: 38 }} value={q} onChange={e => setQ(e.target.value)} placeholder={s("ค้นหา TAG, PEANO, สถานที่…", "Search TAG, PEANO, location…")} />
          <button className="btn btn-outline btn-sm" style={{ flexShrink: 0 }} onClick={() => setShowExport(true)}><Icon name="download" size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => setEdit({ OBJECTID: Date.now(), TAG: "", PHASE: "หม้อแปลง 3 Phase", VOLTAGE: "22 kV", PEANO_TR: "", INSTALL_PHASE: "ABC", KVA: 100, OWNER_TR: "PEA", LOCATION: "", FEEDER1: "", LATITUDE: 19.86, LONGITUDE: 99.18, PEA_METER: "" })}>
            <Icon name="plus" size={14} /> {s("เพิ่ม", "Add")}
          </button>
        </div>
      </div>
      <div style={{ overflow: "auto", maxHeight: "60vh" }}>
        <table className="table">
          <thead><tr>{["TAG", "PEANO", "ระบบเฟส", "kV", "kVA", "เจ้าของ", "สถานที่", "Feeder", ""].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map(t => (
              <tr key={t.OBJECTID}>
                <td className="mono fw-6">{t.TAG}</td>
                <td className="mono">{t.PEANO_TR}</td>
                <td>{t.PHASE.replace("หม้อแปลง ", "")}</td>
                <td>{t.VOLTAGE}</td>
                <td className="fw-7" style={{ color: "var(--pea-orange-600)" }}>{t.KVA}</td>
                <td><span className={"badge " + (t.OWNER_TR === "Customer" ? "badge-orange" : "badge-purple")}>{t.OWNER_TR}</span></td>
                <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.LOCATION}</td>
                <td><span className="badge">{t.FEEDER1}</span></td>
                <td>
                  <div className="row-action">
                    <button className="btn-icon" onClick={() => setEdit(t)}><Icon name="edit" size={14} /></button>
                    <button className="btn-icon" onClick={() => remove(t)}><Icon name="trash" size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length >= 100 && (
          <div className="t-mute text-sm" style={{ padding: 12, textAlign: "center" }}>
            {s(`แสดง ${list.length} รายการ — พิมพ์คำค้นหาเพื่อจำกัดผลลัพธ์`, `Showing ${list.length} records — type to narrow results`)}
          </div>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && !isNew(edit) ? s("แก้ไขหม้อแปลง","Edit Transformer") : s("เพิ่มหม้อแปลง","Add Transformer")} width={680}
        footer={<><button className="btn btn-outline" onClick={() => setEdit(null)}>{s("ยกเลิก","Cancel")}</button><button className="btn btn-primary" onClick={() => save(edit)} disabled={saving}><Icon name="check" size={14} /> {saving ? s("กำลังบันทึก…","Saving…") : s("บันทึก","Save")}</button></>}>
        {edit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="TAG"              v={edit.TAG}          onC={v => setEdit({ ...edit, TAG: v })} />
            <Field label="PEANO หม้อแปลง"  v={edit.PEANO_TR}     onC={v => setEdit({ ...edit, PEANO_TR: v })} />
            <div className="field"><label className="field-label">ระบบเฟส</label>
              <select className="input" value={edit.PHASE} onChange={e => setEdit({ ...edit, PHASE: e.target.value })}>
                <option>หม้อแปลง 1 Phase</option><option>หม้อแปลง 3 Phase</option>
              </select>
            </div>
            <div className="field"><label className="field-label">ระดับแรงดัน</label>
              <select className="input" value={edit.VOLTAGE} onChange={e => setEdit({ ...edit, VOLTAGE: e.target.value })}>
                <option>22 kV</option><option>33 kV</option>
              </select>
            </div>
            <Field label="เฟสที่ติดตั้ง"   v={edit.INSTALL_PHASE} onC={v => setEdit({ ...edit, INSTALL_PHASE: v })} />
            <Field label="ค่าพิกัด kVA"    v={edit.KVA}           onC={v => setEdit({ ...edit, KVA: +v })} type="number" />
            <div className="field"><label className="field-label">เจ้าของ</label>
              <select className="input" value={edit.OWNER_TR} onChange={e => setEdit({ ...edit, OWNER_TR: e.target.value })}>
                <option>PEA</option><option>Customer</option>
              </select>
            </div>
            <Field label="รหัสสายป้อนที่ 1" v={edit.FEEDER1}      onC={v => setEdit({ ...edit, FEEDER1: v })} />
            <div className="field" style={{ gridColumn: "1 / -1" }}><label className="field-label">สถานที่</label><input className="input" value={edit.LOCATION} onChange={e => setEdit({ ...edit, LOCATION: e.target.value })} /></div>
            <Field label="LATITUDE"         v={edit.LATITUDE}     onC={v => setEdit({ ...edit, LATITUDE: +v })}  type="number" />
            <Field label="LONGITUDE"        v={edit.LONGITUDE}    onC={v => setEdit({ ...edit, LONGITUDE: +v })} type="number" />
            <Field label="PEA Meter (เชื่อมโยง)" v={edit.PEA_METER} onC={v => setEdit({ ...edit, PEA_METER: v })} />
          </div>
        )}
      </Modal>
      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        onConfirm={() => { downloadCSV("pea-tr-export.csv", list); addAudit({ user: currentUser.username, action: "export_csv", target: "PEA Transformer", detail: `ส่งออก ${list.length} รายการ` }); setShowExport(false); }}
        count={list.length}
        filename="pea-tr-export.csv"
        label="PEA Transformer"
      />
    </div>
  );
}

/* ---------- Import ---------- */
/* ---------- Admin Overview Map ---------- */
function AdminMapTab({ data, currentUser, addAudit }) {
  const { t } = useLang();
  const corrBtnLabel = t("corrReportBtn");
  const containerRef = React.useRef(null);
  const mapRef       = React.useRef(null);
  const tileRef      = React.useRef(null);
  const mLayerRef    = React.useRef(null);
  const tLayerRef    = React.useRef(null);
  const locMarkerRef = React.useRef(null);

  const [loadState, setLoadState] = useStateAd("idle"); // idle | loading | done | error
  const [progress,  setProgress]  = useStateAd(0);
  const [meters,    setMeters]    = useStateAd([]);
  const [trs,       setTrs]       = useStateAd([]);
  const [showM,     setShowM]     = useStateAd(false);
  const [showT,     setShowT]     = useStateAd(true);
  const [baseMap,   setBaseMap]   = useStateAd("street");
  const [showBaseMenu, setShowBaseMenu] = useStateAd(false);
  const [zoomTick,  setZoomTick]  = useStateAd(0);
  const [loadKey,   setLoadKey]   = useStateAd(0); // increment to retry
  const [corrTarget, setCorrTarget] = useStateAd(null);  // { p, isMeter }
  const [corrections, setCorrections] = useStateAd([]);
  const [showReview, setShowReview] = useStateAd(false);
  const [locating, setLocating] = useStateAd(false);
  const [viewportLoading, setViewportLoading] = useStateAd(false);
  const viewportLoadIdRef = React.useRef(0);
  const [mapSearchQ, setMapSearchQ] = useStateAd("");
  const [mapSearchResults, setMapSearchResults] = useStateAd([]);
  const [mapSearching, setMapSearching] = useStateAd(false);
  const mapSearchRef = React.useRef(null);
  const mapSearchTimerRef = React.useRef(null);
  const toast = useToast();

  const loadCorrections = React.useCallback(async () => {
    const { data: rows, error } = await _supabase
      .from("coordinate_corrections")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (!error && rows) setCorrections(rows);
  }, []);

  useEffectAd(() => {
    if (loadState === "done") loadCorrections();
  }, [loadState]);

  const submitCorrection = async ({ newLat, newLng, note }) => {
    const { error } = await _supabase.from("coordinate_corrections").insert({
      record_type: corrTarget.isMeter ? "meter" : "transformer",
      record_id: corrTarget.p.OBJECTID,
      record_tag: corrTarget.p.PEANO || corrTarget.p.TAG,
      old_lat: corrTarget.p.LATITUDE,
      old_lng: corrTarget.p.LONGITUDE,
      new_lat: newLat,
      new_lng: newLng,
      note: note || null,
      submitted_by_username: currentUser?.username || "user",
      status: "pending",
    });
    if (!error) {
      setCorrTarget(null);
      loadCorrections();
      toast?.(t("corrSubmitOk"), "success");
    }
  };

  const approveCorrection = async (corr) => {
    const table = corr.record_type === "meter" ? "meters" : "transformers";
    const { error } = await _supabase.from(table)
      .update({ latitude: +corr.new_lat, longitude: +corr.new_lng })
      .eq("objectid", corr.record_id);
    if (!error) {
      await _supabase.from("coordinate_corrections").update({
        status: "approved",
        reviewed_by_username: currentUser?.username || "admin",
        reviewed_at: new Date().toISOString(),
      }).eq("id", corr.id);
      setCorrections(prev => prev.map(c => c.id === corr.id ? { ...c, status: "approved" } : c));
      if (corr.record_type === "meter") {
        setMeters(prev => prev.map(m => m.OBJECTID === corr.record_id ? { ...m, LATITUDE: +corr.new_lat, LONGITUDE: +corr.new_lng } : m));
      } else {
        setTrs(prev => prev.map(tr => tr.OBJECTID === corr.record_id ? { ...tr, LATITUDE: +corr.new_lat, LONGITUDE: +corr.new_lng } : tr));
      }
      toast?.(t("corrApprovedMsg"), "success");
    }
  };

  const rejectCorrection = async (corr) => {
    await _supabase.from("coordinate_corrections").update({
      status: "rejected",
      reviewed_by_username: currentUser?.username || "admin",
      reviewed_at: new Date().toISOString(),
    }).eq("id", corr.id);
    setCorrections(prev => prev.map(c => c.id === corr.id ? { ...c, status: "rejected" } : c));
  };

  const handleCorrection = React.useCallback(target => setCorrTarget(target), []);

  const totalM = data?.dashStats?.meter_count || 0;
  const totalT = data?.dashStats?.tr_count    || 0;
  const MAX_METERS = 20000;
  const BATCH      = 2000;

  // Lazy-load data once when tab is opened
  useEffectAd(() => {
    let cancelled = false;

    const load = async () => {
      setLoadState("loading");
      try {
        // ── TRs (small dataset, load all) ──
        let trRows = [], from = 0;
        while (!cancelled) {
          const { data: rows, error } = await _supabase
            .from("transformers")
            .select("objectid,tag,peano_tr,latitude,longitude,feeder1,kva,phase,voltage")
            .range(from, from + BATCH - 1);
          if (error || !rows || rows.length === 0) break;
          trRows = [...trRows, ...rows];
          from += BATCH;
          setProgress(Math.round((trRows.length / Math.max(totalT || BATCH, 1)) * 30));
          if (rows.length < BATCH) break;
        }

        // ── Meters (cap at MAX_METERS to keep UI responsive) ──
        let mRows = [];
        from = 0;
        while (!cancelled && mRows.length < MAX_METERS) {
          const { data: rows, error } = await _supabase
            .from("meters")
            .select("objectid,tag,peano,latitude,longitude,feederid,route")
            .range(from, from + BATCH - 1);
          if (error || !rows || rows.length === 0) break;
          mRows = [...mRows, ...rows];
          from += BATCH;
          setProgress(30 + Math.round((mRows.length / MAX_METERS) * 70));
          if (rows.length < BATCH) break;
        }

        if (!cancelled) {
          setTrs(trRows
            .filter(r => +r.latitude && +r.longitude)
            .map(r => ({
              OBJECTID: r.objectid, TAG: r.tag || String(r.objectid),
              PEANO: r.peano_tr || "",
              LATITUDE: +r.latitude, LONGITUDE: +r.longitude,
              KVA: r.kva || 0, PHASE: r.phase || "", VOLTAGE: r.voltage || "",
              FEEDER1: r.feeder1 || "",
            })));
          setMeters(mRows
            .filter(r => +r.latitude && +r.longitude)
            .map(r => ({
              OBJECTID: r.objectid, TAG: r.tag || String(r.objectid),
              PEANO: r.peano || "",
              LATITUDE: +r.latitude, LONGITUDE: +r.longitude,
              FEEDERID: r.feederid || "", ROUTE: r.route || "",
            })));
          setLoadState("done");
          setProgress(100);
        }
      } catch (_) {
        if (!cancelled) setLoadState("error");
      }
    };

    load();
    return () => { cancelled = true; };
  }, [loadKey]);

  // Initialize Leaflet map once
  useEffectAd(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [19.86, 99.18], zoom: 11,
      zoomControl: false, preferCanvas: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    tileRef.current = L.tileLayer(TILE_LAYERS.street.url, {
      attribution: TILE_LAYERS.street.attribution, maxZoom: 19,
    }).addTo(map);
    mLayerRef.current = L.layerGroup().addTo(map);
    tLayerRef.current = L.layerGroup().addTo(map);
    map.on("zoomend", () => setTimeout(() => setZoomTick(t => t + 1), 80));
    mapRef.current = map;
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Switch base tile layer
  useEffectAd(() => {
    if (!mapRef.current) return;
    const cfg = TILE_LAYERS[baseMap] || TILE_LAYERS.street;
    if (tileRef.current) mapRef.current.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 19 }).addTo(mapRef.current);
  }, [baseMap]);

  // Render / re-cluster markers
  useEffectAd(() => {
    if (!mapRef.current || loadState !== "done") return;
    const map = mapRef.current;
    const z = map.getZoom();
    const gs = z >= 15 ? 0.0006 : z >= 13 ? 0.002 : z >= 11 ? 0.008 : 0.035;

    const drawLayer = (points, kind, layerRef) => {
      layerRef.current.clearLayers();
      if (!points.length) return;
      const isMeter = kind === "meter";
      const accent  = isMeter ? "#6b2c91" : "#ea580c";
      const accent2 = isMeter ? "#8b3fc4" : "#f47b20";
      const symbol  = isMeter ? "M" : "▲";

      if (points.length > 20) {
        // Grid cluster
        const cells = new Map();
        points.forEach(p => {
          const key = `${Math.floor(p.LATITUDE / gs)}_${Math.floor(p.LONGITUDE / gs)}`;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(p);
        });
        cells.forEach(group => {
          if (group.length === 1) {
            makeAdmMarker(group[0], symbol, isMeter, accent, accent2, handleCorrection, corrBtnLabel).addTo(layerRef.current);
          } else {
            const lat = group.reduce((s, p) => s + p.LATITUDE, 0) / group.length;
            const lng = group.reduce((s, p) => s + p.LONGITUDE, 0) / group.length;
            const n   = group.length;
            const label = n >= 10000 ? Math.round(n / 1000) + "k" : n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
            const icon = L.divIcon({
              className: "",
              html: `<div style="width:44px;height:44px;border-radius:50%;background:radial-gradient(circle,${accent2},${accent});color:white;font-weight:800;font-size:${n>=1000?10:13}px;display:grid;place-items:center;border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.3)">${label}</div>`,
              iconSize: [44, 44], iconAnchor: [22, 22],
            });
            L.marker([lat, lng], { icon }).addTo(layerRef.current);
          }
        });
      } else {
        points.forEach(p => makeAdmMarker(p, symbol, isMeter, accent, accent2, handleCorrection, corrBtnLabel).addTo(layerRef.current));
      }
    };

    if (showT) drawLayer(trs, "tr", tLayerRef);
    else tLayerRef.current.clearLayers();

    if (showM) {
      if (z >= 14) {
        // Viewport-based query: load only meters in the current map bounds
        const bounds = map.getBounds();
        const loadId = ++viewportLoadIdRef.current;
        setViewportLoading(true);
        mLayerRef.current.clearLayers();
        _supabase.from("meters")
          .select("objectid,tag,peano,latitude,longitude,feederid,route")
          .gte("latitude", bounds.getSouth()).lte("latitude", bounds.getNorth())
          .gte("longitude", bounds.getWest()).lte("longitude", bounds.getEast())
          .limit(3000)
          .then(({ data: rows, error }) => {
            if (viewportLoadIdRef.current !== loadId) return;
            setViewportLoading(false);
            if (!error && rows) {
              const pts = rows.filter(r => +r.latitude && +r.longitude).map(r => ({
                OBJECTID: r.objectid, TAG: r.tag || String(r.objectid),
                PEANO: r.peano || "", LATITUDE: +r.latitude, LONGITUDE: +r.longitude,
                FEEDERID: r.feederid || "", ROUTE: r.route || "",
              }));
              drawLayer(pts, "meter", mLayerRef);
            }
          });
      } else {
        setViewportLoading(false);
        drawLayer(meters, "meter", mLayerRef);
      }
    } else {
      mLayerRef.current.clearLayers();
      setViewportLoading(false);
    }
  }, [meters, trs, showM, showT, loadState, zoomTick, corrBtnLabel]);

  // Fit bounds on first data load
  useEffectAd(() => {
    if (!mapRef.current || loadState !== "done") return;
    const pts = [...trs, ...meters.slice(0, 500)];
    if (!pts.length) return;
    const bounds = L.latLngBounds(pts.map(p => [p.LATITUDE, p.LONGITUDE]));
    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
  }, [loadState]);

  const flyToLocation = () => {
    if (!navigator.geolocation) { toast?.("เบราว์เซอร์ไม่รองรับ GPS", "error"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = coords;
        if (!mapRef.current) return;
        mapRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
        if (locMarkerRef.current) { locMarkerRef.current.remove(); locMarkerRef.current = null; }
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.35)"></div>`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        });
        locMarkerRef.current = L.marker([lat, lng], { icon })
          .bindPopup(`<b>ตำแหน่งปัจจุบัน</b><br>±${Math.round(coords.accuracy)} ม.`)
          .addTo(mapRef.current)
          .openPopup();
      },
      (err) => {
        setLocating(false);
        const msg = err.code === 1 ? "ไม่ได้รับอนุญาต GPS — กรุณาอนุญาตในเบราว์เซอร์"
                  : err.code === 2 ? "ไม่พบสัญญาณ GPS"
                  : "หมดเวลารอ GPS";
        toast?.(msg, "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const btnStyle = (active, accent) => ({
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
    border: "1px solid " + (active ? accent : "var(--line)"),
    background: active ? `${accent}22` : "var(--surface-2)",
    color: active ? accent : "var(--ink-mute)",
    cursor: "pointer", transition: "all 140ms",
  });

  useEffectAd(() => {
    const q = mapSearchQ.trim();
    if (q.length < 2) { setMapSearchResults([]); setMapSearching(false); return; }
    setMapSearching(true);
    clearTimeout(mapSearchTimerRef.current);
    mapSearchTimerRef.current = setTimeout(async () => {
      try {
        const [{ data: mRows }, { data: tRows }] = await Promise.all([
          _supabase.from("meters")
            .select("objectid,tag,peano,latitude,longitude,route,feederid")
            .or(`peano.ilike.%${q}%,tag.ilike.%${q}%`)
            .limit(6),
          _supabase.from("transformers")
            .select("objectid,tag,peano_tr,latitude,longitude,location")
            .or(`peano_tr.ilike.%${q}%,tag.ilike.%${q}%,location.ilike.%${q}%`)
            .limit(4),
        ]);
        const results = [];
        (mRows || []).forEach(r => results.push({
          type: "M",
          p: { OBJECTID: r.objectid, TAG: r.tag, PEANO: r.peano, LATITUDE: +r.latitude, LONGITUDE: +r.longitude, ROUTE: r.route, FEEDERID: r.feederid },
          label: r.peano || r.tag, sub: r.tag !== r.peano ? r.tag : (r.route || ""),
        }));
        (tRows || []).forEach(r => results.push({
          type: "T",
          p: { OBJECTID: r.objectid, TAG: r.tag, PEANO_TR: r.peano_tr, LATITUDE: +r.latitude, LONGITUDE: +r.longitude, LOCATION: r.location },
          label: r.peano_tr || r.tag, sub: r.location || r.tag,
        }));
        setMapSearchResults(results);
      } catch (_) { setMapSearchResults([]); }
      setMapSearching(false);
    }, 380);
    return () => clearTimeout(mapSearchTimerRef.current);
  }, [mapSearchQ]);

  const flyToResult = (r) => {
    const lat = r.p.LATITUDE;
    const lng = r.p.LONGITUDE;
    if (!lat || !lng || !mapRef.current) return;
    mapRef.current.flyTo([lat, lng], 19, { duration: 1.0 });
    setMapSearchQ("");
    setMapSearchResults([]);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <style>{`
        .amc-bar  { display:flex; align-items:center; gap:6px; padding:6px 12px; background:var(--surface); border-bottom:1px solid var(--line); flex-shrink:0; }
        .amc-pill { display:flex; border-radius:22px; overflow:hidden; border:1px solid var(--line); background:var(--surface-2); flex-shrink:0; }
        .amc-pill-btn { display:flex; align-items:center; gap:5px; padding:5px 12px; border:none; cursor:pointer; font-size:12px; font-weight:800; transition:all 140ms; }
        .amc-pill-btn-m { border-right:1px solid var(--line); }
        .amc-badge { border-radius:5px; padding:1px 4px; font-weight:900; font-size:10px; color:white; }
        .amc-corr-btn { display:flex; align-items:center; gap:4px; padding:5px 10px; border-radius:20px; font-size:12px; font-weight:700; flex-shrink:0; cursor:pointer; }
        .amc-search-label { display:none; }
        @media (min-width: 641px) {
          .amc-bar       { padding:11px 20px; gap:12px; }
          .amc-pill-btn  { padding:8px 18px; font-size:14px; }
          .amc-badge     { font-size:12px; padding:2px 8px; }
          .amc-corr-btn  { padding:8px 16px; font-size:13px; }
          .amc-search-label { display:inline; }
        }
      `}</style>

      {/* ── Controls bar (responsive single row) ── */}
      <div className="amc-bar">

        {/* Segmented M + TR layer toggles */}
        <div className="amc-pill">
          <button onClick={() => setShowM(s => !s)} className="amc-pill-btn amc-pill-btn-m" style={{
            background: showM ? "linear-gradient(135deg,#6b2c91,#8b3fc4)" : "transparent",
            color: showM ? "white" : "var(--ink-mute)",
          }}>
            <span className="amc-badge" style={{ background: showM ? "rgba(255,255,255,0.25)" : "linear-gradient(135deg,#6b2c91,#8b3fc4)" }}>M</span>
            <span>{fmtStat(totalM || meters.length)}</span>
          </button>
          <button onClick={() => setShowT(s => !s)} className="amc-pill-btn" style={{
            background: showT ? "linear-gradient(135deg,#ea580c,#f47b20)" : "transparent",
            color: showT ? "white" : "var(--ink-mute)",
          }}>
            <span className="amc-badge" style={{ background: showT ? "rgba(255,255,255,0.25)" : "linear-gradient(135deg,#ea580c,#f47b20)" }}>▲</span>
            <span>{fmtStat(totalT || trs.length)}</span>
          </button>
        </div>

        {/* Correction review button (same row) */}
        {loadState === "done" && (
          <button onClick={() => setShowReview(s => !s)} className="amc-corr-btn" style={{
            border: "1px solid " + (showReview ? "#ea580c" : "var(--line)"),
            background: showReview ? "rgba(234,88,12,0.1)" : "var(--surface-2)",
            color: showReview ? "#ea580c" : "var(--ink-mute)",
          }}>
            📋
            {corrections.filter(c => c.status === "pending").length > 0 ? (
              <span style={{ background: "#ea580c", color: "white", borderRadius: 999, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>
                {corrections.filter(c => c.status === "pending").length}
              </span>
            ) : (
              <span>{t("corrReviewBtn")}</span>
            )}
          </button>
        )}


        <div style={{ flex: 1 }} />

        {/* Basemap dropdown (icon-only, compact) */}
        <div style={{ position: "relative" }}>
          <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 20, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink-mute)", cursor: "pointer", fontWeight: 700 }} onClick={() => setShowBaseMenu(s => !s)}>
            <Icon name={baseMap === "satellite" ? "layers" : "map"} size={14} />
            <span style={{ fontSize: 9, opacity: 0.6, lineHeight: 1 }}>▾</span>
          </button>
          {showBaseMenu && (
            <>
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 599 }} onClick={() => setShowBaseMenu(false)} />
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 600, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", overflow: "hidden", minWidth: 130 }}>
              {[["street", "map", t("mapStreet")], ["satellite", "layers", t("mapSatellite")]].map(([k, icon, label]) => (
                <button key={k} onClick={() => { setBaseMap(k); setShowBaseMenu(false); }} style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "9px 14px", background: baseMap === k ? "var(--pea-purple-50)" : "transparent",
                  color: baseMap === k ? "var(--pea-purple-600)" : "var(--ink)",
                  border: "none", cursor: "pointer", fontSize: 13, fontWeight: baseMap === k ? 700 : 500, textAlign: "left",
                }}>
                  <Icon name={icon} size={14} />
                  {label}
                  {baseMap === k && <span style={{ marginLeft: "auto", color: "var(--pea-purple-600)" }}>✓</span>}
                </button>
              ))}
            </div>
            </>
          )}
        </div>
      </div>

      {/* ── Search bar (always visible once loaded) ── */}
      {loadState === "done" && (
        <div style={{ flexShrink: 0, borderBottom: "1px solid var(--line)", background: "var(--surface)", padding: "10px 14px", position: "relative", zIndex: 20 }}>
          <div style={{
            position: "relative", borderRadius: 14, overflow: "visible",
            border: "1.5px solid " + (mapSearchQ ? "var(--pea-purple-400)" : "var(--line)"),
            background: "var(--surface-2)", transition: "border-color 180ms",
          }}>
            <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--pea-purple-500)", display: "flex" }}>
              {mapSearching
                ? <span style={{ display: "inline-block", width: 15, height: 15, borderRadius: "50%", border: "2px solid var(--pea-purple-300)", borderTopColor: "var(--pea-purple-600)", animation: "pea-spin 0.7s linear infinite" }} />
                : <Icon name="search" size={15} />
              }
            </div>
            <input
              ref={mapSearchRef}
              value={mapSearchQ}
              onChange={e => setMapSearchQ(e.target.value)}
              placeholder="ค้นหา PEANO, TAG, สถานที่… (ค้นหาจากทั้งหมด)"
              style={{ width: "100%", padding: "10px 38px 10px 40px", background: "transparent", border: "none", outline: "none", color: "var(--ink)", fontSize: 13, fontWeight: 500, boxSizing: "border-box" }}
            />
            {mapSearchQ && (
              <button onClick={() => { setMapSearchQ(""); setMapSearchResults([]); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-mute)", cursor: "pointer", padding: 4, display: "flex", borderRadius: 6 }}>
                <Icon name="close" size={14} />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {mapSearchQ.trim().length >= 2 && !mapSearching && (
            <div style={{ marginTop: 6, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden" }}>
              {mapSearchResults.length === 0 ? (
                <div style={{ padding: "14px 16px", textAlign: "center", color: "var(--ink-mute)", fontSize: 13 }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>🔍</div>
                  ไม่พบข้อมูลสำหรับ "{mapSearchQ}"
                </div>
              ) : mapSearchResults.map((r, i) => (
                <button key={i} onClick={() => flyToResult(r)} style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "11px 14px", background: "transparent", border: "none",
                  borderBottom: i < mapSearchResults.length - 1 ? "1px solid var(--line)" : "none",
                  cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: "white", background: r.type === "M" ? "linear-gradient(135deg,#6b2c91,#8b3fc4)" : "linear-gradient(135deg,#ea580c,#f47b20)" }}>
                    {r.type === "M" ? "M" : "▲"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                    {r.sub && r.sub !== r.label && <div style={{ fontSize: 11, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sub}</div>}
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, color: "var(--pea-purple-400)", fontSize: 11, fontWeight: 700 }}>
                    <Icon name="location" size={12} /> นำทาง
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Loading overlay ── */}
      {loadState === "loading" && (
        <div style={{ position: "absolute", inset: 0, top: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", zIndex: 10, gap: 14 }}>
          <div className="adm-spin" style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#6b2c91,#f47b20)", display: "grid", placeItems: "center" }}>
            <Icon name="map" size={22} style={{ color: "white" }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t("mapLoadingData")}</div>
          <div style={{ width: 200, height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: progress + "%", height: "100%", background: "linear-gradient(90deg,#6b2c91,#f47b20)", transition: "width 0.4s ease", borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{progress}%</div>
        </div>
      )}

      {loadState === "error" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Icon name="warning" size={32} style={{ color: "var(--pea-orange-500)" }} />
          <div style={{ fontWeight: 700 }}>{t("mapLoadFail")}</div>
          <button className="btn btn-outline" onClick={() => { setMeters([]); setTrs([]); setProgress(0); setLoadKey(k => k + 1); }}>{t("retryBtn")}</button>
        </div>
      )}

      {/* ── Map + side panel wrapper ── */}
      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>

        {/* Floating: viewport loading indicator (top-center) */}
        {viewportLoading && (
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 500,
            background: "rgba(107,44,145,0.88)", backdropFilter: "blur(6px)",
            color: "white", fontSize: 11, fontWeight: 700,
            padding: "6px 16px", borderRadius: 20, pointerEvents: "none",
            display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
          }}>
            <div style={{ width: 11, height: 11, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", animation: "pea-spin 0.8s linear infinite" }} />
            กำลังโหลดมิเตอร์ในพื้นที่…
          </div>
        )}

        {/* Floating: sample note (top-center, only when M sampled and not viewport loading) */}
        {loadState === "done" && showM && !viewportLoading && totalM > 0 && meters.length < totalM && (
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 500,
            background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)",
            color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 600,
            padding: "5px 14px", borderRadius: 20, pointerEvents: "none",
            whiteSpace: "nowrap", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {t("mapSampleNote").replace("{n}", meters.length.toLocaleString()).replace("{total}", totalM.toLocaleString())}
          </div>
        )}

        <div ref={containerRef} style={{ flex: 1 }} />
        {showReview && (
          <CorrectionReviewPanel
            corrections={corrections}
            onApprove={approveCorrection}
            onReject={rejectCorrection}
            onClose={() => setShowReview(false)}
            t={t}
          />
        )}
      </div>

      {/* Floating: location pin button (Google Maps style) — outside overflow:hidden */}
      {loadState !== "loading" && (
        <button
          onClick={flyToLocation}
          disabled={locating}
          title="ตำแหน่งของฉัน"
          style={{
            position: "absolute", bottom: 90, right: 14, zIndex: 900,
            width: 44, height: 44, borderRadius: "50%", padding: 0,
            background: "white", border: "2px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.30)",
            display: "grid", placeItems: "center",
            cursor: locating ? "default" : "pointer",
            transition: "box-shadow 150ms, transform 150ms",
          }}
        >
          {locating ? (
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: "2.5px solid rgba(66,133,244,0.25)",
              borderTopColor: "#4285f4",
              animation: "pea-spin 0.8s linear infinite",
            }} />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="#4285f4"/>
              <circle cx="12" cy="12" r="4" fill="#4285f4" opacity="0.25" style={{ transformOrigin:"center", transform:"scale(2.4)" }}/>
              <line x1="12" y1="2" x2="12" y2="6" stroke="#4285f4" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="18" x2="12" y2="22" stroke="#4285f4" strokeWidth="2" strokeLinecap="round"/>
              <line x1="2" y1="12" x2="6" y2="12" stroke="#4285f4" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18" y1="12" x2="22" y2="12" stroke="#4285f4" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      )}

      {/* Correction modal */}
      {corrTarget && (
        <CorrectionModal
          target={corrTarget}
          currentUser={currentUser}
          onClose={() => setCorrTarget(null)}
          onSubmit={submitCorrection}
          t={t}
        />
      )}
    </div>
  );
}

function CorrectionModal({ target, currentUser, onClose, onSubmit, t }) {
  const miniMapRef = React.useRef(null);
  const miniMapInst = React.useRef(null);
  const newMarkerRef = React.useRef(null);
  const [newLat, setNewLat] = useStateAd(target.p.LATITUDE);
  const [newLng, setNewLng] = useStateAd(target.p.LONGITUDE);
  const [note, setNote] = useStateAd("");
  const [submitting, setSubmitting] = useStateAd(false);
  const [locating, setLocating] = useStateAd(false);
  const [gpsError, setGpsError] = useStateAd("");

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGpsError("อุปกรณ์นี้ไม่รองรับ GPS"); return; }
    setLocating(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(6);
        const lng = +pos.coords.longitude.toFixed(6);
        setNewLat(lat);
        setNewLng(lng);
        if (newMarkerRef.current) newMarkerRef.current.setLatLng([lat, lng]);
        if (miniMapInst.current) miniMapInst.current.setView([lat, lng], 18);
        setLocating(false);
      },
      (err) => {
        setGpsError(err.code === 1 ? "กรุณาอนุญาตการเข้าถึงตำแหน่ง" : "ไม่สามารถรับพิกัดได้");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffectAd(() => {
    if (!miniMapRef.current || miniMapInst.current) return;
    const map = L.map(miniMapRef.current, { center: [target.p.LATITUDE, target.p.LONGITUDE], zoom: 17, zoomControl: true });
    L.tileLayer(TILE_LAYERS.street.url, { attribution: TILE_LAYERS.street.attribution, maxZoom: 19 }).addTo(map);
    // Old position — red fixed dot
    const oldIcon = L.divIcon({ className: "", html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`, iconSize: [14,14], iconAnchor: [7,7] });
    L.marker([target.p.LATITUDE, target.p.LONGITUDE], { icon: oldIcon }).addTo(map).bindTooltip(t("corrOldCoord"), { permanent: false });
    // New position — green draggable dot
    const newIcon = L.divIcon({ className: "", html: `<div style="width:18px;height:18px;border-radius:50%;background:#16a34a;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:move"></div>`, iconSize: [18,18], iconAnchor: [9,9] });
    const nm = L.marker([target.p.LATITUDE, target.p.LONGITUDE], { icon: newIcon, draggable: true }).addTo(map).bindTooltip(t("corrNewCoord"), { permanent: false });
    nm.on('drag dragend', () => {
      const ll = nm.getLatLng();
      setNewLat(+ll.lat.toFixed(6));
      setNewLng(+ll.lng.toFixed(6));
    });
    // Tap anywhere on map to move the green marker instantly
    map.on('click', (e) => {
      nm.setLatLng(e.latlng);
      setNewLat(+e.latlng.lat.toFixed(6));
      setNewLng(+e.latlng.lng.toFixed(6));
    });
    newMarkerRef.current = nm;
    miniMapInst.current = map;
    return () => { if (miniMapInst.current) { miniMapInst.current.remove(); miniMapInst.current = null; } };
  }, []);

  useEffectAd(() => {
    if (newMarkerRef.current && isFinite(newLat) && isFinite(newLng))
      newMarkerRef.current.setLatLng([newLat, newLng]);
  }, [newLat, newLng]);

  const samePos = Math.abs(newLat - target.p.LATITUDE) < 0.00001 && Math.abs(newLng - target.p.LONGITUDE) < 0.00001;

  const handleSubmit = async () => {
    if (samePos || submitting) return;
    setSubmitting(true);
    await onSubmit({ newLat, newLng, note });
    setSubmitting(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9950, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card card-elev fade-up" style={{ maxWidth: 580, width: "100%", padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#ea580c,#f47b20)", color: "white", display: "grid", placeItems: "center", flexShrink: 0 }}>
            📍
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{t("corrReportBtn")}</div>
            <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{target.isMeter ? "Meter" : "Transformer"} · <span style={{ fontFamily: "monospace" }}>{target.p.PEANO || target.p.TAG}</span></div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-mute)", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {/* Body: mini-map left, form right */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div ref={miniMapRef} style={{ height: 320, borderRight: "1px solid var(--line)" }} />
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", height: 320 }}>
            {/* Old coords */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-mute)", marginBottom: 3 }}>🔴 {t("corrOldCoord")}</div>
              <div style={{ fontSize: 11, fontFamily: "monospace", background: "var(--surface-2)", padding: "4px 8px", borderRadius: 7, color: "var(--ink-mute)" }}>
                {target.p.LATITUDE.toFixed(6)}, {target.p.LONGITUDE.toFixed(6)}
              </div>
            </div>
            {/* New coords */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 5 }}>🟢 {t("corrNewCoord")}</div>
              {/* GPS button — primary action for field use */}
              <button onClick={useMyLocation} disabled={locating} style={{
                width: "100%", padding: "8px 0", borderRadius: 10, marginBottom: 7,
                border: "1px solid #2563eb55", background: locating ? "rgba(37,99,235,0.06)" : "rgba(37,99,235,0.1)",
                color: "#2563eb", fontSize: 12, fontWeight: 700, cursor: locating ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <span style={{ fontSize: 15, animation: locating ? "pea-spin 1s linear infinite" : "none", display: "inline-block" }}>
                  {locating ? "⏳" : "📡"}
                </span>
                {locating ? "กำลังรับพิกัด GPS…" : "ใช้ตำแหน่งปัจจุบัน (GPS)"}
              </button>
              {gpsError && <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 4 }}>{gpsError}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--ink-mute)", marginBottom: 2 }}>LAT</div>
                  <input className="input" type="number" step="0.000001" value={newLat} onChange={e => setNewLat(+e.target.value)} style={{ fontSize: 11, fontFamily: "monospace", padding: "4px 6px" }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--ink-mute)", marginBottom: 2 }}>LNG</div>
                  <input className="input" type="number" step="0.000001" value={newLng} onChange={e => setNewLng(+e.target.value)} style={{ fontSize: 11, fontFamily: "monospace", padding: "4px 6px" }} />
                </div>
              </div>
              <div style={{ fontSize: 9, color: "var(--ink-mute)", marginTop: 3 }}>* {t("corrDragHint")}</div>
            </div>
            {/* Note */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 3 }}>{t("corrNote")}</div>
              <textarea className="input" placeholder={t("corrNote") + "…"} value={note} onChange={e => setNote(e.target.value)}
                style={{ width: "100%", minHeight: 54, resize: "none", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-outline" onClick={onClose}>{t ? t("cancel") : "ยกเลิก"}</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || samePos}
            style={{ background: submitting || samePos ? undefined : "linear-gradient(135deg,#ea580c,#f47b20)" }}>
            {submitting ? "…" : `📍 ${t("corrSubmit")}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CorrectionReviewPanel({ corrections, onApprove, onReject, onClose, t }) {
  const pending = corrections.filter(c => c.status === "pending");
  return (
    <div style={{
      width: 320, flexShrink: 0, background: "var(--surface)", borderLeft: "1px solid var(--line)",
      display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.12)",
    }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 13, flex: 1 }}>
          {t("corrReviewBtn")}
          {pending.length > 0 && (
            <span style={{ marginLeft: 7, background: "#ea580c", color: "white", borderRadius: 999, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>
              {pending.length}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-mute)", fontSize: 16 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {pending.length === 0 && (
          <div style={{ textAlign: "center", padding: "28px 12px", color: "var(--ink-mute)", fontSize: 13 }}>
            ✓ {t("corrNoPending")}
          </div>
        )}
        {pending.map(c => (
          <div key={c.id} style={{ background: "var(--surface-2)", borderRadius: 12, padding: 12, border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, color: "white", fontWeight: 900, fontSize: 10,
                background: c.record_type === "meter" ? "linear-gradient(135deg,#6b2c91,#8b3fc4)" : "linear-gradient(135deg,#ea580c,#f47b20)",
                display: "grid", placeItems: "center", flexShrink: 0
              }}>{c.record_type === "meter" ? "M" : "▲"}</div>
              <div style={{ fontWeight: 700, fontSize: 11, fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.record_tag}</div>
              <span style={{ fontSize: 9, background: "#f59e0b22", color: "#b45309", border: "1px solid #f59e0b44", borderRadius: 6, padding: "2px 5px", fontWeight: 700, flexShrink: 0 }}>{t("corrPending")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 7 }}>
              <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 7, padding: "5px 7px" }}>
                <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, marginBottom: 2 }}>🔴 {t("corrOldCoord")}</div>
                <div style={{ fontSize: 10, fontFamily: "monospace", lineHeight: 1.6 }}>{(+c.old_lat).toFixed(5)}<br/>{(+c.old_lng).toFixed(5)}</div>
              </div>
              <div style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.18)", borderRadius: 7, padding: "5px 7px" }}>
                <div style={{ fontSize: 9, color: "#16a34a", fontWeight: 700, marginBottom: 2 }}>🟢 {t("corrNewCoord")}</div>
                <div style={{ fontSize: 10, fontFamily: "monospace", lineHeight: 1.6 }}>{(+c.new_lat).toFixed(5)}<br/>{(+c.new_lng).toFixed(5)}</div>
              </div>
            </div>
            {c.note && (
              <div style={{ fontSize: 11, color: "var(--ink-mute)", background: "var(--surface)", borderRadius: 6, padding: "4px 7px", marginBottom: 7 }}>
                {c.note}
              </div>
            )}
            <div style={{ fontSize: 10, color: "var(--ink-mute)", marginBottom: 7 }}>
              {t("corrSubmittedBy")}: {c.submitted_by_username || "—"} · {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString("th-TH") : ""}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button className="btn" onClick={() => onReject(c)} style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", fontSize: 12, padding: "6px 0" }}>
                ✕ {t("corrReject")}
              </button>
              <button className="btn btn-primary" onClick={() => onApprove(c)} style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", fontSize: 12, padding: "6px 0" }}>
                ✓ {t("corrApprove")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function makeAdmMarker(p, symbol, isMeter, accent, accent2, onCorrection, corrLabel) {
  const icon = L.divIcon({
    className: "",
    html: `<div class="pea-marker${isMeter ? "" : " tr"}"><span>${symbol}</span></div>`,
    iconSize: [36, 36], iconAnchor: [18, 32], popupAnchor: [0, -30],
  });
  const marker = L.marker([p.LATITUDE, p.LONGITUDE], { icon, riseOnHover: true });
  const corrBtn = `<button data-adm-corr style="margin-top:8px;width:100%;padding:5px 0;border-radius:8px;border:1px solid #ea580c44;background:rgba(234,88,12,0.08);color:#ea580c;font-size:11px;font-weight:700;cursor:pointer">
  📍 ${corrLabel || "แจ้งแก้ไขพิกัด"}
</button>`;
  const popup = isMeter
    ? `<div style="padding:10px 14px;min-width:180px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,${accent},${accent2});color:white;font-weight:900;display:grid;place-items:center;font-size:12px">M</div>
          <div>
            <div style="font-weight:800;font-size:13px;font-family:'IBM Plex Mono',monospace">${p.PEANO || p.TAG}</div>
            ${p.PEANO ? `<div style="font-size:10px;color:#888;font-family:monospace">${p.TAG}</div>` : ""}
          </div>
        </div>
        <div style="font-size:11px;color:var(--ink-mute)">Feeder: <b>${p.FEEDERID||"—"}</b> · Route: <b>${p.ROUTE||"—"}</b></div>
        <div style="font-size:11px;margin-top:4px;font-family:monospace;color:var(--ink-mute)">${p.LATITUDE.toFixed(5)}, ${p.LONGITUDE.toFixed(5)}</div>
        ${corrBtn}
      </div>`
    : `<div style="padding:10px 14px;min-width:180px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,${accent},${accent2});color:white;font-weight:900;display:grid;place-items:center;font-size:12px">▲</div>
          <div>
            <div style="font-weight:800;font-size:13px;font-family:'IBM Plex Mono',monospace">${p.PEANO_TR || p.TAG}</div>
            ${p.PEANO_TR ? `<div style="font-size:10px;color:#888;font-family:monospace">${p.TAG}</div>` : ""}
          </div>
        </div>
        <div style="font-size:11px;color:var(--ink-mute)">${p.KVA} kVA · ${p.PHASE}Φ · ${p.VOLTAGE} kV · Feeder: <b>${p.FEEDER1||"—"}</b></div>
        <div style="font-size:11px;margin-top:4px;font-family:monospace;color:var(--ink-mute)">${p.LATITUDE.toFixed(5)}, ${p.LONGITUDE.toFixed(5)}</div>
        ${corrBtn}
      </div>`;
  marker.bindPopup(popup, { maxWidth: 280 });
  if (onCorrection) {
    marker.on('popupopen', () => {
      const btn = marker.getPopup().getElement()?.querySelector('[data-adm-corr]');
      if (btn) btn.onclick = () => { marker.closePopup(); onCorrection({ p, isMeter }); };
    });
  }
  return marker;
}

const METER_SAMPLE_CSV = `OBJECTID,TAG,CODE,ROUTE,ACCOUNTNUM,PEANO,FEEDERID,OWNER,INSTALLATI,LATITUDE,LONGITUDE
8000001,MTR-001,MTR-CGA02-001,CGA02,AC-2569-001,PEAN-001,FAU11,PEA,2569-01-01,16.7841,100.2234
8000002,MTR-002,MTR-CGA02-002,CGA02,AC-2569-002,PEAN-002,FAU11,PEA,2569-01-15,16.7843,100.2236
8000003,MTR-003,MTR-CGA10-001,CGA10,AC-2569-003,PEAN-003,CGA10,PEA,2569-02-01,16.7900,100.2350
8000004,MTR-004,MTR-FAA06-001,FAA06,AC-2569-004,PEAN-004,FAA06,CUST,2569-02-10,16.8012,100.2401
8000005,MTR-005,MTR-CGA05-001,CGA05,AC-2569-005,PEAN-005,CGA05,PEA,2569-03-01,16.7755,100.2180`;

const TR_SAMPLE_CSV = `OBJECTID,TAG,PHASE,VOLTAGE,PEANO_TR,INSTALL_PHASE,KVA,OWNER_TR,LOCATION,FEEDER1,LATITUDE,LONGITUDE,PEA_METER
9000001,TR-001,3,22,PEATR-001,3,100,PEA,ชุมชนบ้านท่า,CGA02,16.7840,100.2230,MTR-CGA02-001
9000002,TR-002,1,22,PEATR-002,1,50,PEA,ตลาดเช้าศรีมงคล,FAU11,16.7860,100.2255,MTR-CGA02-002
9000003,TR-003,3,22,PEATR-003,3,160,PEA,โรงงานอุตสาหกรรม,CGA10,16.7905,100.2355,MTR-CGA10-001
9000004,TR-004,1,22,PEATR-004,1,30,CUST,บ้านพักอาศัย,FAA06,16.8015,100.2405,MTR-FAA06-001
9000005,TR-005,3,22,PEATR-005,3,250,PEA,สถานีย่อย,CGA05,16.7750,100.2175,MTR-CGA05-001`;

function AdminImport({ data, setData, addAudit, currentUser }) {
  const [target, setTarget]       = useStateAd("meter");
  const [preview, setPreview]     = useStateAd(null);
  const [fileName, setFileName]   = useStateAd("");
  const [importing, setImporting] = useStateAd(false);
  const [importResult, setImportResult] = useStateAd(null);
  const toast = useToast();

  const downloadSample = () => {
    const csv = target === "meter" ? METER_SAMPLE_CSV : TR_SAMPLE_CSV;
    const name = target === "meter" ? "sample_pea_meter.csv" : "sample_pea_tr.csv";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const cols  = lines[0].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const rows  = lines.slice(1).map(l => {
      const vals = l.match(/("([^"]|"")*"|[^,]+)/g) || [];
      const obj  = {};
      cols.forEach((c, i) => obj[c] = (vals[i] || "").trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
      return obj;
    });
    return { cols, rows };
  };

  const onFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(parseCsv(reader.result));
    reader.readAsText(f, "utf-8");
  };

  const commit = async () => {
    if (!preview) return;
    setImporting(true);
    const table = target === "meter" ? "meters" : "transformers";
    const targetLabel = target === "meter" ? "PEA Meter" : "PEA TR";
    let succeeded = 0, failed = 0;
    try {
      const dbRows = preview.rows.map((r, i) => target === "meter" ? {
        objectid:   +r.OBJECTID || (8000000 + i),
        tag:        r.TAG || "", code:       r.CODE || "",
        route:      r.ROUTE || "", accountnum: r.ACCOUNTNUM || "",
        peano:      r.PEANO || "", feederid:   r.FEEDERID || "",
        owner:      r.OWNER || "PEA", installati: r.INSTALLATI || "",
        latitude:   +r.LATITUDE || 0, longitude:  +r.LONGITUDE || 0,
      } : {
        objectid:      +r.OBJECTID || (9000000 + i),
        tag:           r.TAG || "", phase:         r.PHASE || "",
        voltage:       r.VOLTAGE || "", peano_tr:      r.PEANO_TR || r.PEANO || "",
        install_phase: r.INSTALL_PHASE || "", kva:           +r.KVA || 0,
        owner_tr:      r.OWNER_TR || "PEA", location:      r.LOCATION || "",
        feeder1:       r.FEEDER1 || "", latitude:      +r.LATITUDE || 0,
        longitude:     +r.LONGITUDE || 0, pea_meter:     r.PEA_METER || "",
      });

      // Upsert in batches of 500 — track per-batch success/fail
      const BATCH = 500;
      for (let i = 0; i < dbRows.length; i += BATCH) {
        const batch = dbRows.slice(i, i + BATCH);
        const { error } = await _supabase
          .from(table)
          .upsert(batch, { onConflict: "objectid" });
        if (error) failed += batch.length;
        else succeeded += batch.length;
      }

      // Refresh dashboard stats
      const { data: newStats } = await _supabase.rpc("get_dashboard_stats");
      if (newStats) setData(d => ({ ...d, dashStats: newStats }));

      addAudit({ user: currentUser.username, action: "import_csv", target: targetLabel, detail: `นำเข้า ${succeeded} สำเร็จ${failed > 0 ? `, ${failed} ล้มเหลว` : ""} จาก ${fileName}` });
      setImportResult({ total: preview.rows.length, success: succeeded, fail: failed, fileName, targetLabel });
      setPreview(null);
      setFileName("");
    } catch (err) {
      toast?.("นำเข้าล้มเหลว: " + err.message, "error");
    } finally {
      setImporting(false);
    }
  };

  const sampleHeaders = target === "meter"
    ? "OBJECTID,TAG,CODE,ROUTE,ACCOUNTNUM,PEANO,FEEDERID,OWNER,INSTALLATI,LATITUDE,LONGITUDE"
    : "OBJECTID,TAG,PHASE,VOLTAGE,PEANO_TR,INSTALL_PHASE,KVA,OWNER_TR,LOCATION,FEEDER1,LATITUDE,LONGITUDE,PEA_METER";

  return (
    <div className="f-col f-gap-4 fade-up">

      {/* ── Import Result Modal ── */}
      {importResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9900, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card card-elev fade-up" style={{ maxWidth: 420, width: "100%", padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: importResult.fail === 0 ? "linear-gradient(135deg,#16a34a,#22c55e)" : "linear-gradient(135deg,#f59e0b,#ea580c)", color: "white", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
                <Icon name={importResult.fail === 0 ? "check" : "warning"} size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>สรุปการนำเข้าข้อมูล</div>
                <div className="t-mute text-sm">{importResult.targetLabel} · {importResult.fileName}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div style={{ textAlign: "center", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 8px" }}>
                <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{importResult.total}</div>
                <div className="t-mute text-xs" style={{ marginTop: 4 }}>ทั้งหมด</div>
              </div>
              <div style={{ textAlign: "center", background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.30)", borderRadius: 14, padding: "16px 8px" }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>{importResult.success}</div>
                <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4, fontWeight: 600 }}>✓ สำเร็จ</div>
              </div>
              <div style={{ textAlign: "center", background: importResult.fail > 0 ? "rgba(239,68,68,0.08)" : "var(--surface-2)", border: importResult.fail > 0 ? "1px solid rgba(239,68,68,0.30)" : "1px solid var(--line)", borderRadius: 14, padding: "16px 8px" }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: importResult.fail > 0 ? "#ef4444" : "var(--ink-mute)", lineHeight: 1 }}>{importResult.fail}</div>
                <div style={{ fontSize: 11, color: importResult.fail > 0 ? "#ef4444" : "var(--ink-mute)", marginTop: 4, fontWeight: 600 }}>{importResult.fail > 0 ? "✕ ล้มเหลว" : "ล้มเหลว"}</div>
              </div>
            </div>

            {importResult.fail > 0 && (
              <div className="badge badge-amber" style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 12 }}>
                <Icon name="warning" size={13} /> บางรายการนำเข้าไม่สำเร็จ — ตรวจสอบข้อมูล OBJECTID และรูปแบบ CSV
              </div>
            )}

            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setImportResult(null)}>
              <Icon name="check" size={14} /> ตกลง
            </button>
          </div>
        </div>
      )}

      <div className="card card-elev">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
          <div>
            <div className="text-lg fw-7">นำเข้าข้อมูลจาก CSV</div>
            <div className="t-mute text-sm">อัปโหลด CSV (UTF-8) — ข้อมูลจะ upsert เข้า Supabase ทันที (ตาม OBJECTID)</div>
          </div>
          <button className="btn btn-outline" style={{ fontSize: 12, gap: 5, padding: "6px 12px", flexShrink: 0 }} onClick={downloadSample}>
            <Icon name="download" size={13} /> ดาวน์โหลดตัวอย่าง CSV
          </button>
        </div>

        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={"tab " + (target === "meter" ? "active" : "")} onClick={() => setTarget("meter")}><Icon name="meter" size={14} /> PEA Meter</button>
          <button className={"tab " + (target === "tr" ? "active" : "")} onClick={() => setTarget("tr")}><Icon name="tr" size={14} /> PEA TR</button>
        </div>

        <label className="card" style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer", borderStyle: "dashed", borderColor: "var(--pea-purple-300)", background: "var(--pea-purple-50)", overflow: "hidden" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, var(--pea-purple-600), var(--pea-orange-500))", color: "white", display: "grid", placeItems: "center", boxShadow: "var(--shadow-glow)", flexShrink: 0 }}>
            <Icon name="upload" size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fw-7" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName || "เลือกไฟล์ CSV"}</div>
            <div className="t-mute text-sm">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก · UTF-8</div>
            <div className="t-mute text-xs mono" style={{ marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sampleHeaders}</div>
          </div>
          <input type="file" accept=".csv" onChange={onFile} style={{ display: "none" }} />
        </label>
      </div>

      {preview && (
        <div className="card card-elev fade-up">
          <div className="f-between" style={{ marginBottom: 12 }}>
            <div>
              <div className="text-lg fw-7">ตรวจสอบข้อมูล ({preview.rows.length} รายการ)</div>
              <div className="t-mute text-sm">ไฟล์: {fileName}</div>
            </div>
            <div className="f-gap-2 flex">
              <button className="btn btn-outline" onClick={() => { setPreview(null); setFileName(""); }}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={commit} disabled={importing}>
                {importing ? "กำลังนำเข้า…" : <><Icon name="check" size={14} /> ยืนยันนำเข้า {preview.rows.length} รายการ</>}
              </button>
            </div>
          </div>
          <div style={{ overflow: "auto", maxHeight: 360, borderRadius: 12, border: "1px solid var(--line)" }}>
            <table className="table">
              <thead><tr>{preview.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{preview.rows.slice(0, 10).map((r, i) => (
                <tr key={i}>{preview.cols.map(c => <td key={c} className="mono text-xs">{r[c]}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          {preview.rows.length > 10 && <div className="t-mute text-sm" style={{ padding: 12, textAlign: "center" }}>แสดง 10 จาก {preview.rows.length} รายการ</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- Audit Log (server-side pagination + filters) ---------- */
const ALL_ACTIONS = [
  "login","logout","change_password","enable_2fa","disable_2fa",
  "search_meter","search_tr","view_map",
  "create_meter","update_meter","delete_meter",
  "create_tr","update_tr","delete_tr",
  "approve_user","ban_user","update_user","import_csv","export_csv","create_user",
];
/* ─────────── Security Panel ─────────── */
function AdminSecurity({ data }) {
  const { t, lang } = useLang();
  const s = (th, en) => lang === "en" ? en : th;
  const [auditEvents, setAuditEvents] = useStateAd([]);
  const [loading, setLoading]         = useStateAd(true);
  const [lastChecked, setLastChecked] = useStateAd(null);
  const toast = useToast();

  const fetchAudit = React.useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: rows, error } = await _supabase
      .from("audit_log")
      .select("id,action,user_id,detail,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && rows) setAuditEvents(rows);
    setLoading(false);
    setLastChecked(new Date());
  }, []);

  useEffectAd(() => { fetchAudit(); }, []);

  // ── Score Calculation ─────────────────────────────────────────
  const users     = data.users || [];
  const total     = users.length || 1;
  const admins    = users.filter(u => u.role === "admin");
  const with2fa   = users.filter(u => u.require_2fa).length;
  const admins2fa = admins.filter(u => u.require_2fa).length;
  const pwExpired = users.filter(u => {
    if (u.pw_force_change) return false;
    if (!u.password_changed_at) return false;
    return (Date.now() - new Date(u.password_changed_at)) > 45 * 24 * 3600 * 1000;
  }).length;
  const now24h  = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const now7d   = new Date(Date.now() - 7  * 24 * 3600 * 1000).toISOString();

  const pwFails24h   = auditEvents.filter(e => e.action === "reset_password_failed" && e.created_at >= now24h).length;
  const unlocks7d    = auditEvents.filter(e => e.action === "unlock_password" && e.created_at >= now7d).length;
  const dis2fa7d     = auditEvents.filter(e => e.action === "disable_2fa" && e.created_at >= now7d).length;
  const bans7d       = auditEvents.filter(e => e.action === "ban_user" && e.created_at >= now7d).length;

  // Threat: rapid logins — same user >5 logins in 24h
  const loginMap = {};
  auditEvents.filter(e => e.action === "login" && e.created_at >= now24h).forEach(e => {
    loginMap[e.user_id] = (loginMap[e.user_id] || 0) + 1;
  });
  const rapidLogins = Object.values(loginMap).filter(c => c > 5).length;

  const isHttps     = window.location.protocol === "https:";
  const allAdminsOk = admins.length === 0 || admins2fa === admins.length;
  const twoFaRate   = total > 0 ? with2fa / total : 0;
  const pwOk        = pwExpired === 0;
  const noThreats   = pwFails24h === 0 && rapidLogins === 0;

  // Score components (max 100)
  const scoreHttps    = isHttps   ? 20 : 0;
  const scoreAdmin2fa = admins.length === 0 ? 20 : Math.round(admins2fa / admins.length * 20);
  const score2faRate  = Math.round(twoFaRate * 10);
  const scorePwComp   = Math.max(0, 15 - pwExpired * 3);
  const scoreActivity = Math.max(0, 20 - pwFails24h * 4 - rapidLogins * 5 - bans7d * 2);
  const scoreDb       = loading ? 10 : 15;
  const totalScore    = Math.min(100, scoreHttps + scoreAdmin2fa + score2faRate + scorePwComp + scoreActivity + scoreDb);

  const statusColor = totalScore >= 80 ? "#10b981" : totalScore >= 60 ? "#f59e0b" : "#ef4444";
  const statusBg    = totalScore >= 80 ? "rgba(16,185,129,0.1)" : totalScore >= 60 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
  const statusLabel = totalScore >= 80 ? s("ปลอดภัย","Secure") : totalScore >= 60 ? s("มีความเสี่ยง","Warning") : s("ต้องดำเนินการ","Critical");

  // ── Gauge SVG ──────────────────────────────────────────────────
  const GAUGE_R = 54, GAUGE_CX = 64, GAUGE_CY = 64;
  const circum   = 2 * Math.PI * GAUGE_R;
  const dashLen  = circum * (totalScore / 100);

  // ── Checks ────────────────────────────────────────────────────
  const checks = [
    {
      label: s("การเชื่อมต่อ HTTPS","HTTPS Connection"),
      ok: isHttps, score: scoreHttps, max: 20,
      desc: isHttps ? s("ข้อมูลถูกเข้ารหัส TLS","Data encrypted with TLS") : s("⚠️ ควรใช้ HTTPS เท่านั้น","⚠️ HTTPS required for security"),
      fix: isHttps ? null : s("ตรวจสอบการตั้งค่า GitHub Pages หรือ CDN","Check GitHub Pages or CDN settings"),
    },
    {
      label: s("2FA สำหรับ Admin","Admin 2FA"),
      ok: allAdminsOk, score: scoreAdmin2fa, max: 20,
      desc: `${admins2fa}/${admins.length} ${s("บัญชี Admin มี 2FA","admin accounts have 2FA")}`,
      fix: allAdminsOk ? null : s("เปิด 2FA ให้บัญชี Admin ทุกบัญชีใน จัดการผู้ใช้","Enable 2FA for all Admin accounts in User Management"),
    },
    {
      label: s("อัตราการใช้ 2FA","2FA Adoption Rate"),
      ok: twoFaRate >= 0.5, score: score2faRate, max: 10,
      desc: `${Math.round(twoFaRate * 100)}% ${s("ของผู้ใช้มี 2FA","of users have 2FA")} (${with2fa}/${total})`,
      fix: twoFaRate < 0.5 ? s("แนะนำให้เปิด 2FA สำหรับผู้ใช้ทุกคน","Enable 2FA for all users") : null,
    },
    {
      label: s("รหัสผ่านตามนโยบาย","Password Compliance"),
      ok: pwOk, score: scorePwComp, max: 15,
      desc: pwOk ? s("ไม่มีรหัสผ่านหมดอายุ","No expired passwords") : `${pwExpired} ${s("บัญชีรหัสผ่านหมดอายุ","accounts with expired passwords")}`,
      fix: pwOk ? null : s("ไปที่ จัดการผู้ใช้ → ปลดล็อครหัสผ่านที่หมดอายุ","Go to User Management → unlock expired passwords"),
    },
    {
      label: s("กิจกรรมต้องสงสัย (24 ชม.)","Suspicious Activity (24h)"),
      ok: noThreats, score: scoreActivity, max: 20,
      desc: noThreats
        ? s("ไม่พบกิจกรรมต้องสงสัย","No suspicious activity detected")
        : `${pwFails24h > 0 ? `reset password fail ×${pwFails24h}` : ""} ${rapidLogins > 0 ? `rapid login ×${rapidLogins}` : ""}`.trim(),
      fix: noThreats ? null : s("ตรวจสอบ Audit Log — อาจมีความพยายามเข้าถึงโดยไม่ได้รับอนุญาต","Review Audit Log — possible unauthorized access attempts"),
    },
    {
      label: s("การเชื่อมต่อฐานข้อมูล","Database Connection"),
      ok: !loading, score: scoreDb, max: 15,
      desc: loading ? s("กำลังตรวจสอบ…","Checking…") : s("Supabase เชื่อมต่อและทำงานปกติ","Supabase connected and operational"),
      fix: null,
    },
  ];

  // ── Recent threats ─────────────────────────────────────────────
  const threats = [
    ...auditEvents.filter(e => e.action === "reset_password_failed").slice(0, 5).map(e => ({ ...e, threat: "pw_fail", icon: "🔑", color: "#ef4444" })),
    ...auditEvents.filter(e => e.action === "ban_user").slice(0, 5).map(e => ({ ...e, threat: "ban", icon: "🚫", color: "#f59e0b" })),
    ...auditEvents.filter(e => e.action === "disable_2fa").slice(0, 3).map(e => ({ ...e, threat: "2fa_off", icon: "🔓", color: "#f59e0b" })),
    ...auditEvents.filter(e => e.action === "unlock_password").slice(0, 5).map(e => ({ ...e, threat: "unlock", icon: "🗝️", color: "#6b7280" })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12);

  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "en" ? "en-GB" : "th-TH", { day:"numeric", month:"short" }) + " " +
           d.toLocaleTimeString(lang === "en" ? "en-GB" : "th-TH", { hour:"2-digit", minute:"2-digit" });
  };

  const threatLabels = {
    pw_fail: s("รีเซ็ตรหัสผ่านล้มเหลว","Password reset failed"),
    ban:     s("ระงับบัญชีผู้ใช้","User account suspended"),
    "2fa_off": s("ปิด 2FA","2FA disabled"),
    unlock:  s("ปลดล็อครหัสผ่านหมดอายุ","Unlocked expired password"),
  };

  return (
    <div className="f-col f-gap-4 fade-up" style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* ── Score + Status header ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "center",
        background: "var(--surface)", border: `1px solid ${statusColor}44`, borderRadius: 18,
        padding: "20px 24px", boxShadow: `0 0 0 3px ${statusColor}18` }}>

        {/* Gauge */}
        <svg width={128} height={128} viewBox="0 0 128 128">
          <circle cx={GAUGE_CX} cy={GAUGE_CY} r={GAUGE_R} fill="none" stroke="var(--line)" strokeWidth={10} />
          <circle cx={GAUGE_CX} cy={GAUGE_CY} r={GAUGE_R} fill="none"
            stroke={statusColor} strokeWidth={10}
            strokeDasharray={`${dashLen} ${circum - dashLen}`}
            strokeDashoffset={circum * 0.25}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease, stroke 0.5s ease" }}
          />
          <text x={GAUGE_CX} y={GAUGE_CY - 4} textAnchor="middle" fill={statusColor}
            fontSize={26} fontWeight={900} fontFamily="IBM Plex Mono,monospace">{totalScore}</text>
          <text x={GAUGE_CX} y={GAUGE_CY + 14} textAnchor="middle" fill="var(--ink-mute)"
            fontSize={11} fontWeight={700}>/100</text>
        </svg>

        {/* Labels */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: statusColor }}>{s("คะแนนความปลอดภัย","Security Score")}</span>
            <span style={{ padding: "4px 12px", borderRadius: 99, background: statusBg, color: statusColor, fontSize: 13, fontWeight: 800, border: `1px solid ${statusColor}44` }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 12 }}>
            {s("วิเคราะห์จาก: HTTPS, 2FA, นโยบายรหัสผ่าน, กิจกรรมต้องสงสัยใน 24 ชม.","Analyzed from: HTTPS, 2FA, password policy, suspicious activity in last 24h")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button onClick={fetchAudit} disabled={loading} style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10,
              background: "rgba(107,44,145,0.1)", border: "1px solid rgba(107,44,145,0.3)",
              color: "var(--pea-purple-600)", fontSize: 12, fontWeight: 700, cursor: loading ? "wait" : "pointer",
            }}>
              <Icon name="refresh" size={13} style={{ animation: loading ? "pea-spin 0.8s linear infinite" : "none" }} />
              {loading ? s("กำลังตรวจสอบ…","Checking…") : s("ตรวจสอบอีกครั้ง","Re-check")}
            </button>
            {lastChecked && <span style={{ fontSize: 11, color: "var(--ink-mute)" }}>
              {s("ตรวจสอบล่าสุด","Last checked")}: {fmtDate(lastChecked.toISOString())}
            </span>}
          </div>
        </div>
      </div>

      {/* ── Security Checks Grid ──────────────────────────── */}
      <div>
        <div className="text-sm fw-7 t-mute" style={{ marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {s("รายการตรวจสอบความปลอดภัย","Security Checks")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {checks.map(c => (
            <div key={c.label} style={{
              display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 12, alignItems: "start",
              background: "var(--surface)", border: `1px solid ${c.ok ? "var(--line)" : "#f59e0b55"}`,
              borderRadius: 12, padding: "12px 16px",
              boxShadow: c.ok ? "none" : "0 0 0 2px rgba(245,158,11,0.1)",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0,
                background: c.ok ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)" }}>
                <Icon name={c.ok ? "check" : "warning"} size={14} style={{ color: c.ok ? "#10b981" : "#f59e0b" }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{c.desc}</div>
                {c.fix && <div style={{ fontSize: 11, color: "#d97706", marginTop: 4, fontWeight: 600 }}>→ {c.fix}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: c.ok ? "#10b981" : "#f59e0b", fontFamily: "IBM Plex Mono,monospace" }}>{c.score}</div>
                <div style={{ fontSize: 10, color: "var(--ink-mute)" }}>/{c.max} {s("คะแนน","pts")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Threat Activity ───────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div className="text-sm fw-7 t-mute" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {s("กิจกรรมที่น่าสังเกต (7 วันย้อนหลัง)","Notable Activity (Last 7 Days)")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: s("รีเซ็ตรหัสล้มเหลว","PW Reset Fail"), count: pwFails24h, color: "#ef4444", sub: "24h" },
              { label: s("ระงับบัญชี","Banned"), count: bans7d, color: "#f59e0b", sub: "7d" },
              { label: s("ปิด 2FA","2FA Off"), count: dis2fa7d, color: "#6b7280", sub: "7d" },
            ].map(({ label, count, color, sub }) => (
              <div key={label} style={{ textAlign: "center", padding: "6px 12px", borderRadius: 10,
                background: count > 0 ? `${color}18` : "var(--surface-2)",
                border: `1px solid ${count > 0 ? color + "44" : "var(--line)"}` }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: count > 0 ? color : "var(--ink-mute)", fontFamily: "monospace" }}>{count}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-mute)", whiteSpace: "nowrap" }}>{label}</div>
                <div style={{ fontSize: 9, color: "var(--ink-mute)" }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--ink-mute)", fontSize: 13 }}>
              <Icon name="refresh" size={16} style={{ animation: "pea-spin 0.8s linear infinite", marginRight: 6 }} />
              {s("กำลังโหลด Audit Log…","Loading Audit Log…")}
            </div>
          ) : threats.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
              <div style={{ fontWeight: 700, color: "#10b981" }}>{s("ไม่พบกิจกรรมต้องสงสัย","No suspicious activity found")}</div>
              <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 4 }}>{s("ระบบทำงานปกติใน 7 วันที่ผ่านมา","System operated normally in the last 7 days")}</div>
            </div>
          ) : (
            <div>
              {threats.map((ev, i) => (
                <div key={ev.id} style={{
                  display: "grid", gridTemplateColumns: "32px 1fr auto",
                  gap: 10, alignItems: "center", padding: "10px 16px",
                  borderBottom: i < threats.length - 1 ? "1px solid var(--line)" : "none",
                }}>
                  <span style={{ fontSize: 18, textAlign: "center" }}>{ev.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: ev.color }}>{threatLabels[ev.threat]}</div>
                    {ev.detail && <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 1 }}>{ev.detail}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-mute)", whiteSpace: "nowrap" }}>{fmtDate(ev.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recommendations ───────────────────────────────── */}
      {checks.some(c => !c.ok) && (
        <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="warning" size={15} style={{ color: "#f59e0b" }} />
            {s("คำแนะนำเพื่อเพิ่มความปลอดภัย","Security Recommendations")}
          </div>
          {checks.filter(c => !c.ok && c.fix).map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: "#f59e0b", fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
              <span><b>{c.label}:</b> {c.fix}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Audit Log ─────────── */
const PAGE_SIZE = 50;

function AdminAudit() {
  const [logs, setLogs]       = useStateAd([]);
  const [total, setTotal]     = useStateAd(0);
  const [page, setPage]       = useStateAd(0);
  const [loading, setLoading] = useStateAd(true);
  const [userList, setUserList] = useStateAd([]);
  const [showExport, setShowExport] = useStateAd(false);

  const [q, setQ]             = useStateAd("");
  const [userF, setUserF]     = useStateAd("");
  const [actionF, setActionF] = useStateAd("");
  const [dateFrom, setDateFrom] = useStateAd("");
  const [dateTo, setDateTo]   = useStateAd("");

  useEffectAd(() => {
    _supabase.from("profiles").select("username").order("username")
      .then(({ data }) => setUserList((data || []).map(r => r.username)));
  }, []);

  const fetchPage = async (p, f) => {
    setLoading(true);
    try {
      let qb = _supabase.from("audit_log")
        .select("*", { count: "exact" })
        .order("at", { ascending: false })
        .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1);

      if (f.userF)    qb = qb.eq("username", f.userF);
      if (f.actionF)  qb = qb.eq("action",   f.actionF);
      if (f.dateFrom) qb = qb.gte("at", f.dateFrom + "T00:00:00");
      if (f.dateTo)   qb = qb.lte("at", f.dateTo   + "T23:59:59");
      if (f.q.trim()) {
        const s = f.q.trim().replace(/[%_]/g, "\\$&");
        qb = qb.or(`username.ilike.%${s}%,target.ilike.%${s}%,detail.ilike.%${s}%`);
      }

      const { data, count } = await qb;
      setLogs((data || []).map(toAuditEntry));
      setTotal(count || 0);
      setPage(p);
    } finally { setLoading(false); }
  };

  const curFilters = () => ({ q, userF, actionF, dateFrom, dateTo });

  useEffectAd(() => {
    const t = setTimeout(() => fetchPage(0, { q, userF, actionF, dateFrom, dateTo }), 350);
    return () => clearTimeout(t);
  }, [q, userF, actionF, dateFrom, dateTo]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilter  = q || userF || actionF || dateFrom || dateTo;

  return (
    <div className="card card-elev fade-up">
      {/* Toolbar */}
      <div style={{ marginBottom: 14 }}>
        <div className="f-between f-gap-2" style={{ marginBottom: 10 }}>
          <div>
            <div className="text-lg fw-7">Audit Log</div>
            <div className="t-mute text-sm">
              {loading ? "กำลังโหลด…" : `พบ ${total.toLocaleString()} รายการ${hasFilter ? " (กรอง)" : ""}`}
            </div>
          </div>
          <div className="f-gap-2 flex">
            {hasFilter && (
              <button className="btn btn-outline" style={{ height: 36, fontSize: 12 }}
                onClick={() => { setQ(""); setUserF(""); setActionF(""); setDateFrom(""); setDateTo(""); }}>
                <Icon name="close" size={13} /> ล้างตัวกรอง
              </button>
            )}
            <button className="btn btn-outline" style={{ height: 36, fontSize: 12 }}
              onClick={() => setShowExport(true)}>
              <Icon name="download" size={14} /> Export หน้านี้
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <input className="input" style={{ flex: "1 1 200px", height: 36 }}
            placeholder="🔍 ค้นหา user / target / detail…"
            value={q} onChange={e => setQ(e.target.value)} />

          <select className="input" style={{ flex: "1 1 160px", height: 36 }}
            value={userF} onChange={e => setUserF(e.target.value)}>
            <option value="">👤 ผู้ใช้ทั้งหมด</option>
            {userList.map(u => <option key={u} value={u}>@{u}</option>)}
          </select>

          <select className="input" style={{ flex: "1 1 160px", height: 36 }}
            value={actionF} onChange={e => setActionF(e.target.value)}>
            <option value="">⚡ การกระทำทั้งหมด</option>
            {ALL_ACTIONS.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="t-mute text-xs">วันที่</span>
            <input className="input" type="date" style={{ height: 36, width: 148 }}
              title="วันที่เริ่มต้น" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span className="t-mute text-xs">ถึง</span>
            <input className="input" type="date" style={{ height: 36, width: 148 }}
              title="วันที่สิ้นสุด" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflow: "auto", maxHeight: "52vh" }}>
        <table className="table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ผู้ใช้</th>
              <th>การกระทำ</th>
              <th>เป้าหมาย</th>
              <th>รายละเอียด</th>
              <th>อุปกรณ์</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--ink-mute)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--line)", borderTopColor: "var(--pea-purple-500)", animation: "pea-spin 0.8s linear infinite" }} />
                  กำลังโหลด…
                </div>
              </td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--ink-mute)" }}>ไม่พบข้อมูล</td></tr>
            ) : logs.map(r => (
              <tr key={r.id}>
                <td className="mono text-xs" style={{ whiteSpace: "nowrap" }}>{r.at}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: avatarBg(r.user || "x"), color: "white", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                      {(r.user[0] || "?").toUpperCase()}
                    </div>
                    <span className="mono text-sm">{r.user}</span>
                  </div>
                </td>
                <td><span className={"badge " + actionBadge(r.action)}>{actionLabel(r.action)}</span></td>
                <td className="mono text-xs">{r.target}</td>
                <td className="text-sm">{r.detail}</td>
                <td className="text-xs t-mute" title={r.ip}>{r.ip ? parseDeviceAd(r.ip) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <button className="btn btn-outline" style={{ height: 32, width: 32, padding: 0 }}
            disabled={page === 0 || loading} onClick={() => fetchPage(0, curFilters())}>«</button>
          <button className="btn btn-outline" style={{ height: 32, width: 32, padding: 0 }}
            disabled={page === 0 || loading} onClick={() => fetchPage(page - 1, curFilters())}>‹</button>
          <span className="text-sm t-mute" style={{ minWidth: 140, textAlign: "center" }}>
            หน้า {page + 1} / {totalPages} &nbsp;·&nbsp; {total.toLocaleString()} รายการ
          </span>
          <button className="btn btn-outline" style={{ height: 32, width: 32, padding: 0 }}
            disabled={page >= totalPages - 1 || loading} onClick={() => fetchPage(page + 1, curFilters())}>›</button>
          <button className="btn btn-outline" style={{ height: 32, width: 32, padding: 0 }}
            disabled={page >= totalPages - 1 || loading} onClick={() => fetchPage(totalPages - 1, curFilters())}>»</button>
        </div>
      )}
      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        onConfirm={() => { downloadCSV("audit-log.csv", logs); setShowExport(false); }}
        count={logs.length}
        filename="audit-log.csv"
        label="Audit Log"
      />
    </div>
  );
}

/* ---------- Modern DateTime Picker ---------- */
const TH_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const TH_DAYS   = ["อา","จ","อ","พ","พฤ","ศ","ส"];

function DateTimePicker({ value, onChange }) {
  const [open, setOpen] = useStateAd(false);
  const [dropPos, setDropPos] = useStateAd({ top: 0, left: 0, width: 300, openUp: false });
  const isMobile = () => window.innerWidth <= 600;
  const ref     = React.useRef(null);
  const dropRef = React.useRef(null);

  const parsed = React.useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }, [value]);

  const now = new Date();
  const [viewYear,  setViewYear]  = useStateAd(parsed ? parsed.getFullYear()  : now.getFullYear());
  const [viewMonth, setViewMonth] = useStateAd(parsed ? parsed.getMonth()     : now.getMonth());
  const [selDate,   setSelDate]   = useStateAd(parsed ? parsed.toISOString().slice(0,10) : "");
  const [selHour,   setSelHour]   = useStateAd(parsed ? parsed.getHours()   : 8);
  const [selMin,    setSelMin]    = useStateAd(parsed ? parsed.getMinutes() : 0);

  useEffectAd(() => {
    if (!open) return;
    const handler = (e) => {
      if (isMobile()) return; // bottom sheet uses its own backdrop
      const inTrigger = ref.current?.contains(e.target);
      const inDrop    = dropRef.current?.contains(e.target);
      if (!inTrigger && !inDrop) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  useEffectAd(() => {
    if (!value) { setSelDate(""); return; }
    const d = new Date(value);
    if (isNaN(d)) return;
    setSelDate(d.toISOString().slice(0,10));
    setSelHour(d.getHours());
    setSelMin(d.getMinutes());
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  function confirm(date, h, m) {
    if (!date) return;
    onChange(`${date}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    setOpen(false);
  }
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMon = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMon; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = now.toISOString().slice(0,10);
  const selYM    = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;

  const displayVal = parsed
    ? parsed.toLocaleDateString("th-TH", { day:"numeric", month:"short", year:"numeric" }) +
      " " + String(parsed.getHours()).padStart(2,"0") + ":" + String(parsed.getMinutes()).padStart(2,"0")
    : "";

  function renderCalPanel() {
    return (
      <React.Fragment>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", padding: "14px 16px 8px", gap: 6 }}>
          <button type="button" onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="chevLeft" size={14} />
          </button>
          <div style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 15 }}>
            {TH_MONTHS[viewMonth]} {viewYear + 543}
          </div>
          <button type="button" onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <Icon name="chevRight" size={14} />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "0 12px", gap: 2 }}>
          {TH_DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--ink-mute)", padding: "4px 0" }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "0 12px 10px", gap: 3 }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />;
            const ds = `${selYM}-${String(day).padStart(2,"0")}`;
            const isToday = ds === todayStr;
            const isSel   = ds === selDate;
            return (
              <button key={idx} type="button" onClick={() => setSelDate(ds)} style={{
                height: 38, borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: isSel || isToday ? 700 : 400,
                background: isSel ? "var(--pea-purple-500)" : isToday ? "rgba(139,63,196,0.12)" : "transparent",
                color: isSel ? "white" : isToday ? "var(--pea-purple-500)" : "var(--text)",
                outline: isToday && !isSel ? "1px solid rgba(139,63,196,0.35)" : "none",
                transition: "background 100ms",
              }}>{day}</button>
            );
          })}
        </div>

        {/* Time selector */}
        <div style={{ borderTop: "1px solid var(--line)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="history" size={15} style={{ color: "var(--pea-purple-500)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-mute)", flexShrink: 0 }}>เวลา</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
            <button type="button" onClick={() => setSelHour(h => (h - 1 + 24) % 24)} style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid var(--line)", background: "var(--bg)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <Icon name="chevLeft" size={12} />
            </button>
            <div style={{ width: 38, textAlign: "center", fontWeight: 700, fontSize: 17, fontFamily: "monospace" }}>
              {String(selHour).padStart(2,"0")}
            </div>
            <button type="button" onClick={() => setSelHour(h => (h + 1) % 24)} style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid var(--line)", background: "var(--bg)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <Icon name="chevRight" size={12} />
            </button>
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: "var(--ink-mute)" }}>:</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button type="button" onClick={() => setSelMin(m => (m - 5 + 60) % 60)} style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid var(--line)", background: "var(--bg)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <Icon name="chevLeft" size={12} />
            </button>
            <div style={{ width: 38, textAlign: "center", fontWeight: 700, fontSize: 17, fontFamily: "monospace" }}>
              {String(selMin).padStart(2,"0")}
            </div>
            <button type="button" onClick={() => setSelMin(m => (m + 5) % 60)} style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid var(--line)", background: "var(--bg)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <Icon name="chevRight" size={12} />
            </button>
          </div>
        </div>

        {/* Confirm / Cancel buttons */}
        <div style={{ padding: "0 14px 16px", display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg)", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--ink-mute)" }}>
            ยกเลิก
          </button>
          <button type="button" disabled={!selDate} onClick={() => confirm(selDate, selHour, selMin)} style={{
            flex: 2, height: 42, borderRadius: 10, border: "none",
            cursor: selDate ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700,
            background: selDate ? "linear-gradient(135deg,#8b3fc4,#6b2c91)" : "var(--line)",
            color: selDate ? "white" : "var(--ink-mute)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Icon name="check" size={15} /> ยืนยัน
          </button>
        </div>
      </React.Fragment>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button type="button" onClick={() => {
        if (!open && ref.current && !isMobile()) {
          const r = ref.current.getBoundingClientRect();
          const dropH = 440;
          const openUp = r.bottom + dropH > window.innerHeight - 16;
          setDropPos({
            top:   openUp ? r.top - dropH - 4 : r.bottom + 4,
            left:  Math.max(8, Math.min(r.left, window.innerWidth - 320 - 8)),
            width: Math.max(r.width, 320),
          });
        }
        setOpen(o => !o);
      }} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "11px 14px", borderRadius: 12,
        border: open ? "1px solid var(--pea-purple-500)" : "1px solid var(--line)",
        background: "var(--bg)", cursor: "pointer", textAlign: "left",
        boxShadow: open ? "0 0 0 3px rgba(139,63,196,0.15)" : "none",
        transition: "all 150ms",
      }}>
        <Icon name="history" size={16} style={{ color: "var(--pea-purple-500)", flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 14, color: displayVal ? "var(--text)" : "var(--ink-mute)", fontFamily: "inherit" }}>
          {displayVal || "เลือกวันที่และเวลา…"}
        </span>
        {value && (
          <span onMouseDown={e => { e.stopPropagation(); onChange(""); setSelDate(""); }}
            style={{ padding: "2px 4px", borderRadius: 6, cursor: "pointer", color: "var(--ink-mute)", display: "flex", alignItems: "center" }}>
            <Icon name="close" size={13} />
          </span>
        )}
        <Icon name={open ? "chevUp" : "chevDown"} size={14} style={{ color: "var(--ink-mute)", flexShrink: 0 }} />
      </button>

      {open && ReactDOM.createPortal(
        window.innerWidth <= 600 ? (
          /* ── Mobile: bottom sheet ── */
          <React.Fragment>
            {/* Backdrop */}
            <div onClick={() => setOpen(false)} style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.55)", zIndex: 9998,
            }} />
            {/* Sheet */}
            <div ref={dropRef} style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
              background: "var(--surface)",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
              border: "1px solid var(--line)",
              borderBottom: "none",
              display: "flex", flexDirection: "column",
              maxHeight: "90vh",
            }}>
              {/* Handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
                <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--line)" }} />
              </div>
              {/* Scrollable content */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {renderCalPanel()}
              </div>
            </div>
          </React.Fragment>
        ) : (
          /* ── Desktop: positioned dropdown ── */
          <div ref={dropRef} className="fade-up" style={{
            position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width,
            background: "var(--surface)", borderRadius: 16, zIndex: 9999,
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)", border: "1px solid var(--line)",
            overflow: "hidden", minWidth: 320,
            maxHeight: "calc(100vh - 40px)", overflowY: "auto",
          }}>
            {renderCalPanel()}
          </div>
        ),
        document.body
      )}
    </div>
  );
}

/* ---------- Settings ---------- */
const DEFAULT_MSG = "ผู้ดูแลระบบกำลังดำเนินการปรับปรุงระบบ\nกรุณากลับมาใหม่ภายหลัง หากมีข้อสงสัยกรุณาติดต่อผู้ดูแลระบบ";

function AdminSettings({ maintenanceMode, setMaintenanceMode, maintenanceMessage, setMaintenanceMessage, maintenanceUntil, setMaintenanceUntil, addAudit, currentUser, devInfo, setDevInfo, allowExport, setAllowExport, pushPermission, subscribePush, unsubscribePush }) {
  const [loading, setLoading] = useStateAd(false);
  const [savingMsg, setSavingMsg] = useStateAd(false);
  const [localMsg, setLocalMsg] = useStateAd(maintenanceMessage || DEFAULT_MSG);
  const [localUntil, setLocalUntil] = useStateAd(maintenanceUntil || "");
  const [localDev, setLocalDev] = useStateAd(devInfo || {});
  const [savingDev, setSavingDev] = useStateAd(false);
  const [openMaint, setOpenMaint] = useStateAd(true);
  const [openDev, setOpenDev] = useStateAd(false);
  const [openExport, setOpenExport] = useStateAd(false);
  const [exportLoading, setExportLoading] = useStateAd(false);
  const toast = useToast();

  const toggleExport = async () => {
    setExportLoading(true);
    const newVal = !allowExport;
    const { data: updated, error } = await _supabase.from("settings")
      .update({ value: String(newVal), updated_at: new Date().toISOString(), updated_by: currentUser.username })
      .eq("key", "allow_export")
      .select("key");
    setExportLoading(false);
    if (error) { toast?.("เกิดข้อผิดพลาด: " + error.message, "error"); return; }
    if (!updated || updated.length === 0) {
      toast?.(
        "ยังไม่มีแถว allow_export ในตาราง settings\nรัน SQL ใน Supabase:\nINSERT INTO settings (key,value) VALUES ('allow_export','true');",
        "error"
      );
      return;
    }
    setAllowExport(newVal);
    addAudit({
      user:   currentUser.username,
      action: newVal ? "enable_export" : "disable_export",
      target: "system",
      detail: `${newVal ? "เปิด" : "ปิด"} การ Export ข้อมูลสำหรับผู้ใช้งานทั่วไป`,
    });
    toast?.(newVal ? "✅ เปิดการ Export ข้อมูลแล้ว" : "🔒 ปิดการ Export ข้อมูลแล้ว — ผู้ใช้ทั่วไปโหลดข้อมูลไม่ได้",
      newVal ? "success" : "warning");
  };

  const setDev = (key, val) => setLocalDev(d => ({ ...d, [key]: val }));

  const toggle = async () => {
    setLoading(true);
    const newVal = !maintenanceMode;
    const { error } = await _supabase.from("settings")
      .update({
        value:      String(newVal),
        updated_at: new Date().toISOString(),
        updated_by: currentUser.username,
      })
      .eq("key", "maintenance_mode");
    setLoading(false);
    if (error) {
      toast?.("เกิดข้อผิดพลาด: " + error.message, "error");
    } else {
      setMaintenanceMode(newVal);
      addAudit({
        user:   currentUser.username,
        action: "toggle_maintenance",
        target: "system",
        detail: `${newVal ? "เปิด" : "ปิด"} Maintenance Mode`,
      });
      toast?.(newVal ? "⚠️ เปิด Maintenance Mode แล้ว — user ทั่วไปเข้าระบบไม่ได้" : "✅ ปิด Maintenance Mode แล้ว — ระบบกลับมาปกติ",
        newVal ? "warning" : "success");
    }
  };

  const saveMessage = async () => {
    setSavingMsg(true);
    const now = new Date().toISOString();
    const [r1, r2] = await Promise.all([
      _supabase.from("settings").update({ value: localMsg, updated_at: now, updated_by: currentUser.username }).eq("key", "maintenance_message"),
      _supabase.from("settings").update({ value: localUntil, updated_at: now, updated_by: currentUser.username }).eq("key", "maintenance_until"),
    ]);
    setSavingMsg(false);
    if (r1.error || r2.error) {
      toast?.("เกิดข้อผิดพลาด: " + (r1.error?.message || r2.error?.message), "error");
    } else {
      setMaintenanceMessage(localMsg);
      setMaintenanceUntil(localUntil);
      addAudit({
        user:   currentUser.username,
        action: "update_maintenance_message",
        target: "system",
        detail: "อัปเดตข้อความ Maintenance Mode",
      });
      toast?.("บันทึกข้อความสำเร็จ", "success");
    }
  };

  const saveDev = async () => {
    setSavingDev(true);
    const now = new Date().toISOString();
    const pairs = [
      ["dev_name",       localDev.name       || ""],
      ["dev_position",   localDev.position   || ""],
      ["dev_department", localDev.department || ""],
      ["dev_location",   localDev.location   || ""],
      ["dev_database",   localDev.database   || ""],
      ["dev_stack",      localDev.stack      || ""],
      ["dev_systems",    localDev.systems    || ""],
      ["dev_version",    localDev.version    || "1.0.0"],
      ["dev_footer",     localDev.footer     || ""],
      ["dev_show_btn",   String(!!localDev.showBtn)],
    ];
    const results = await Promise.all(pairs.map(([key, value]) =>
      _supabase.from("settings")
        .update({ value, updated_at: now, updated_by: currentUser.username })
        .eq("key", key)
    ));
    setSavingDev(false);
    const err = results.find(r => r.error)?.error;
    if (err) {
      toast?.("เกิดข้อผิดพลาด: " + err.message, "error");
    } else {
      setDevInfo({ ...localDev });
      addAudit({ user: currentUser.username, action: "update_dev_info", target: "system", detail: "อัปเดตข้อมูลนักพัฒนาระบบ" });
      toast?.("บันทึกข้อมูลนักพัฒนาสำเร็จ", "success");
    }
  };

  return (
    <div className="f-col f-gap-4 fade-up" style={{ maxWidth: 580 }}>
      <div>
        <div className="t-eyebrow" style={{ color: "var(--pea-orange-500)" }}>System</div>
        <div className="t-display" style={{ fontSize: 24 }}>ตั้งค่าระบบ</div>
      </div>

      {/* ── Export Control Card ── */}
      <div className="card card-elev" style={{ padding: 0, overflow: "hidden" }}>
        <button onClick={() => setOpenExport(o => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: allowExport ? "rgba(59,130,246,0.1)" : "rgba(239,68,68,0.1)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="download" size={18} style={{ color: allowExport ? "#3b82f6" : "#ef4444" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
              ควบคุมการ Export ข้อมูล
              {allowExport
                ? <span className="badge" style={{ fontSize: 10, background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}>เปิดอยู่</span>
                : <span className="badge" style={{ fontSize: 10, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>🔒 ปิดอยู่</span>}
            </div>
            <div className="t-mute text-sm">อนุญาต/ห้ามผู้ใช้ทั่วไป Export ข้อมูลเป็น CSV</div>
          </div>
          <Icon name={openExport ? "chevUp" : "chevDown"} size={16} style={{ color: "var(--ink-mute)", flexShrink: 0 }} />
        </button>
        {openExport && (
          <div className="fade-up" style={{ padding: "0 20px 20px", borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, paddingTop: 16 }}>
              <div className="t-mute text-sm" style={{ lineHeight: 1.7 }}>
                เมื่อ <b>ปิด</b> — ผู้ใช้งานทั่วไปจะเห็นปุ่ม Export ถูกล็อก ไม่สามารถดาวน์โหลดข้อมูลได้<br />
                <b>Admin ยังคง Export ได้เสมอ</b> ไม่ว่าจะตั้งค่าอย่างไร
              </div>
              <button onClick={toggleExport} disabled={exportLoading}
                title={allowExport ? "คลิกเพื่อปิดการ Export" : "คลิกเพื่อเปิดการ Export"}
                style={{ width: 60, height: 32, borderRadius: 999, flexShrink: 0, cursor: "pointer",
                  background: allowExport ? "#3b82f6" : "var(--line)",
                  position: "relative", transition: "background 250ms", border: "none", opacity: exportLoading ? 0.6 : 1 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "white",
                  position: "absolute", top: 4, left: allowExport ? 32 : 4,
                  transition: "left 250ms", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
            {!allowExport && (
              <div className="badge fade-up" style={{ marginTop: 14, padding: "10px 14px", width: "100%", display: "flex", gap: 8, boxSizing: "border-box", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
                <Icon name="lock" size={15} /> ปิดการ Export แล้ว — ผู้ใช้ทั่วไปไม่สามารถดาวน์โหลดข้อมูลได้
              </div>
            )}
            {allowExport && (
              <div className="badge badge-green fade-up" style={{ marginTop: 14, padding: "10px 14px", width: "100%", display: "flex", gap: 8, boxSizing: "border-box" }}>
                <Icon name="download" size={15} /> ผู้ใช้งานทั่วไปสามารถ Export ข้อมูลได้
              </div>
            )}
          </div>
        )}
      </div>

      {/* Maintenance Mode — Collapsible Card */}
      <div className="card card-elev" style={{ padding: 0, overflow: "hidden" }}>
        {/* Header (always visible) */}
        <button
          onClick={() => setOpenMaint(o => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: maintenanceMode ? "rgba(244,123,32,0.12)" : "rgba(139,63,196,0.10)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="settings" size={18} style={{ color: maintenanceMode ? "var(--pea-orange-500)" : "var(--pea-purple-500)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
              Maintenance Mode
              {maintenanceMode
                ? <span className="badge badge-orange" style={{ fontSize: 10 }}>⚠ เปิดอยู่</span>
                : <span className="badge badge-green" style={{ fontSize: 10 }}>ปกติ</span>}
            </div>
            <div className="t-mute text-sm">ปิด/เปิดการเข้าใช้งานของผู้ใช้ทั่วไป</div>
          </div>
          <Icon name={openMaint ? "chevUp" : "chevDown"} size={16} style={{ color: "var(--ink-mute)", flexShrink: 0 }} />
        </button>

        {/* Collapsible body */}
        {openMaint && (
          <div className="fade-up" style={{ padding: "0 20px 20px", borderTop: "1px solid var(--line)" }}>
            {/* Toggle row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, paddingTop: 16 }}>
              <div className="t-mute text-sm" style={{ lineHeight: 1.6 }}>
                เมื่อเปิด ผู้ใช้ทั่วไปจะเห็นหน้า "ระบบปิดปรับปรุง" และเข้าใช้งานไม่ได้<br />
                Admin ยังคงเข้าใช้งานได้ตามปกติ
              </div>
              <button onClick={toggle} disabled={loading}
                title={maintenanceMode ? "คลิกเพื่อเปิดระบบ" : "คลิกเพื่อปิดปรับปรุง"}
                style={{ width: 60, height: 32, borderRadius: 999, flexShrink: 0, cursor: "pointer",
                  background: maintenanceMode ? "var(--pea-orange-500)" : "var(--line)",
                  position: "relative", transition: "background 250ms", border: "none", opacity: loading ? 0.6 : 1 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "white",
                  position: "absolute", top: 4, left: maintenanceMode ? 32 : 4,
                  transition: "left 250ms", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />
              </button>
            </div>

            {/* Status badge */}
            {maintenanceMode ? (
              <div className="badge badge-orange fade-up" style={{ marginTop: 14, padding: "10px 14px", width: "100%", display: "flex", gap: 8, boxSizing: "border-box" }}>
                <Icon name="warning" size={15} /> ระบบปิดปรับปรุงอยู่ — ผู้ใช้ทั่วไปไม่สามารถเข้าใช้งานได้
              </div>
            ) : (
              <div className="badge badge-green fade-up" style={{ marginTop: 14, padding: "10px 14px", width: "100%", display: "flex", gap: 8, boxSizing: "border-box" }}>
                <Icon name="check" size={15} /> ระบบเปิดให้บริการปกติ
              </div>
            )}

            {/* Message & time */}
            <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="edit" size={14} /> ข้อความแจ้งผู้ใช้งาน
              </div>
              <div className="f-col f-gap-3">
                <div>
                  <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>ข้อความ</label>
                  <textarea value={localMsg} onChange={e => setLocalMsg(e.target.value)} rows={3} placeholder={DEFAULT_MSG}
                    style={{ width: "100%", resize: "vertical", fontFamily: "inherit", padding: "10px 12px", borderRadius: 10,
                      fontSize: 14, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)",
                      lineHeight: 1.6, boxSizing: "border-box" }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button className="btn btn-ghost text-sm" style={{ padding: "2px 8px", height: 28 }}
                      onClick={() => setLocalMsg(DEFAULT_MSG)}>รีเซ็ตข้อความเริ่มต้น</button>
                  </div>
                </div>
                <div>
                  <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                    วันที่/เวลาที่คาดว่าจะกลับมาให้บริการ <span className="t-mute">(ไม่บังคับ)</span>
                  </label>
                  <DateTimePicker value={localUntil} onChange={setLocalUntil} />
                </div>
                <button className="btn btn-primary" style={{ height: 44 }} disabled={savingMsg} onClick={saveMessage}>
                  {savingMsg ? "กำลังบันทึก…" : <><Icon name="save" size={15} /> บันทึกข้อความ</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Developer Info — Collapsible Card */}
      <div className="card card-elev" style={{ padding: 0, overflow: "hidden" }}>
        <button
          onClick={() => setOpenDev(o => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(107,44,145,0.1)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="code" size={18} style={{ color: "var(--pea-purple-500)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
              ข้อมูลนักพัฒนาระบบ
              {localDev.showBtn
                ? <span className="badge badge-purple" style={{ fontSize: 10 }}>แสดงปุ่ม</span>
                : <span className="badge" style={{ fontSize: 10 }}>ซ่อนปุ่ม</span>}
            </div>
            <div className="t-mute text-sm">แสดงปุ่ม "พัฒนาโดย" มุมขวาล่างของหน้าจอ</div>
          </div>
          <Icon name={openDev ? "chevUp" : "chevDown"} size={16} style={{ color: "var(--ink-mute)", flexShrink: 0 }} />
        </button>

        {openDev && (
          <div className="fade-up" style={{ padding: "0 20px 20px", borderTop: "1px solid var(--line)" }}>
            {/* Show button toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingTop: 16, marginBottom: 16 }}>
              <span className="text-sm t-mute">แสดงปุ่ม "พัฒนาโดย" บนหน้าจอ</span>
              <button onClick={() => setDev("showBtn", !localDev.showBtn)}
                title={localDev.showBtn ? "คลิกเพื่อซ่อนปุ่ม" : "คลิกเพื่อแสดงปุ่ม"}
                style={{ width: 60, height: 32, borderRadius: 999, flexShrink: 0, cursor: "pointer",
                  background: localDev.showBtn ? "linear-gradient(135deg,#6b2c91,#8b3fc4)" : "var(--line)",
                  position: "relative", transition: "background 250ms", border: "none" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "white",
                  position: "absolute", top: 4, left: localDev.showBtn ? 32 : 4,
                  transition: "left 250ms", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />
              </button>
            </div>

            <div className="f-col f-gap-3">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  ["ชื่อ-นามสกุล", "name", "ธนพล ใจดี"],
                  ["ตำแหน่ง", "position", "นักพัฒนาระบบ"],
                  ["แผนก/ฝ่าย", "department", "ฝ่ายสารสนเทศ"],
                  ["สถานที่/สาขา", "location", "กฟจ. เชียงใหม่"],
                  ["เวอร์ชัน", "version", "1.0.0"],
                ].map(([label, key, ph]) => (
                  <div key={key}>
                    <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
                    <input type="text" value={localDev[key] || ""} onChange={e => setDev(key, e.target.value)} placeholder={ph}
                      style={{ width: "100%", padding: "9px 11px", borderRadius: 10, fontSize: 13,
                        border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)",
                        fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
              {[
                ["ฐานข้อมูล", "database", "Supabase (PostgreSQL), PostGIS"],
                ["Tech Stack", "stack", "React 18, Leaflet.js, Babel Standalone"],
                ["ระบบ/การเชื่อมต่อ", "systems", "GIS, RLS, Row-Level Security"],
                ["ข้อความท้าย (Footer)", "footer", "พัฒนาเพื่อใช้งานภายใน การไฟฟ้าส่วนภูมิภาค (PEA)"],
              ].map(([label, key, ph]) => (
                <div key={key}>
                  <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
                  <textarea value={localDev[key] || ""} onChange={e => setDev(key, e.target.value)} rows={2} placeholder={ph}
                    style={{ width: "100%", resize: "vertical", fontFamily: "inherit", padding: "9px 11px", borderRadius: 10,
                      fontSize: 13, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)",
                      lineHeight: 1.6, boxSizing: "border-box" }} />
                </div>
              ))}
              <button className="btn btn-primary"
                style={{ height: 44, background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", boxShadow: "0 8px 22px rgba(107,44,145,0.35)" }}
                disabled={savingDev} onClick={saveDev}>
                {savingDev ? "กำลังบันทึก…" : <><Icon name="save" size={15} /> บันทึกข้อมูลนักพัฒนา</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Document Downloads ── */}
        <DocDownloadSection />

        {/* ── Push Notification ── */}
        <PushNotifySection
          pushPermission={pushPermission}
          subscribePush={subscribePush}
          unsubscribePush={unsubscribePush}
          currentUser={currentUser}
          addAudit={addAudit}
        />
      </div>
    </div>
  );
}

// ── QR Code SVG generator (uses qrcode-generator lib from CDN) ──────────────
function makeQRSvg(text, size = 120, fg = "#000000", bg = "#ffffff") {
  try {
    if (typeof qrcode === "undefined") return null;
    const qr = qrcode(0, "L");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const cell = size / n;
    let rects = `<rect width="${size}" height="${size}" fill="${bg}"/>`;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${(cell + 0.5).toFixed(2)}" height="${(cell + 0.5).toFixed(2)}" fill="${fg}"/>`;
        }
      }
    }
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${rects}</svg>`;
  } catch (_) { return null; }
}

const GIS_URL = "https://menzkub.github.io/gis-mapping-system";

// ── Infographic: User Quick Guide ─────────────────────────────────────────
const LOGO_SVG_USER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56"><defs><linearGradient id="ugBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9b4dca"/><stop offset="100%" stop-color="#1b0926"/></linearGradient><linearGradient id="ugBolt" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#ffcf8a"/><stop offset="100%" stop-color="#f47b20"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#ugBg)"/><rect width="64" height="32" rx="15" fill="rgba(255,255,255,0.05)"/><path d="M 36 7 L 16 36 H 28 L 20 57 L 48 28 H 36 L 44 7 Z" fill="url(#ugBolt)"/></svg>`;

function UserQuickGuideCard() {
  const W = 560;
  const steps = [
    { emoji: "🔐", title: "สมัครสมาชิก & เข้าสู่ระบบ", lines: ["กรอกอีเมล + รหัสผ่าน (ต้องมีตัวพิมพ์ใหญ่ + ตัวเลข + อักขระพิเศษ)", "รอ Admin อนุมัติบัญชีก่อนใช้งาน — ระบบแจ้งอัตโนมัติ"] },
    { emoji: "🔍", title: "ค้นหาข้อมูล Meter / Transformer", lines: ["พิมพ์ TAG, PEANO, สถานที่, หรือ Feeder ID", "กรองตามประเภท / เจ้าของ (PEA/Customer) / Feeder"] },
    { emoji: "🗺️", title: "ดูบนแผนที่", lines: ["กด marker เพื่อดูรายละเอียด — คัดลอกพิกัดได้ทันที", "สลับ Street / Satellite บน Topbar"] },
    { emoji: "📍", title: "นำทาง GPS ไปยังอุปกรณ์", lines: ["กด marker → กดปุ่มนำทาง → ระบบเปิด Google Maps / Apple Maps", "ระบบคำนวณระยะทางและเวลาโดยประมาณให้อัตโนมัติ"] },
    { emoji: "📝", title: "แจ้งแก้ไขพิกัดที่ไม่ถูกต้อง", lines: ["กด marker → 'แจ้งแก้ไขพิกัด' → วางพิกัดใหม่ด้วย GPS หรือลากหมุด", "ส่งคำขอ → รอ Admin อนุมัติ (พิกัดอัปเดตทันทีที่ Admin กดอนุมัติ)"] },
    { emoji: "📲", title: "ติดตั้งเป็นแอป (PWA)", lines: ["iOS: Safari → กดปุ่ม Share → 'เพิ่มลงหน้าจอหลัก'", "Android: Chrome → เมนู → 'Add to Home Screen'"] },
  ];
  return (
    <div style={{ width: W, fontFamily: "'IBM Plex Sans Thai',sans-serif", background: "#0d0714", color: "#f3eefa", padding: 0, boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#6b2c91 0%,#8b3fc4 55%,#f47b20 130%)", padding: "28px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div dangerouslySetInnerHTML={{ __html: LOGO_SVG_USER }} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>คู่มือเริ่มต้นใช้งาน · User Guide</div>
            <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>GIS Meter &amp; Transformer</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>ระบบสารสนเทศภูมิศาสตร์ PEA — สำหรับผู้ใช้งานทั่วไป</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
          {["🔍 ค้นหามิเตอร์/หม้อแปลง","📍 นำทาง GPS","📝 แจ้งแก้ไขพิกัด","📱 ติดตั้งเป็นแอป"].map(lbl => (
            <span key={lbl} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.9)" }}>{lbl}</span>
          ))}
        </div>
      </div>

      {/* App Screen Preview */}
      <div style={{ background: "#1b0926", padding: "20px 28px", borderBottom: "1px solid #2d1052" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 14 }}>📱 ตัวอย่างหน้าตาระบบ</div>
        <div style={{ display: "flex", gap: 14 }}>
          {/* Search Screen Mockup */}
          <div style={{ flex: 1, background: "#0d0714", borderRadius: 14, overflow: "hidden", border: "1px solid #2d1052", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
            {/* Mock Topbar */}
            <div style={{ background: "#1b0926", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #2d1052" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#9b4dca,#1b0926)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="14" height="14"><path d="M 36 7 L 16 36 H 28 L 20 57 L 48 28 H 36 L 44 7 Z" fill="#ffcf8a"/></svg>
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#f3eefa" }}>GIS Meter & TR</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#2d1052", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>🌙</div>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#2d1052", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>🔔</div>
              </div>
            </div>
            {/* Mock Search */}
            <div style={{ padding: "10px 10px 6px" }}>
              <div style={{ background: "#2d1052", borderRadius: 8, padding: "7px 10px", fontSize: 10, color: "#a78bfa", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span>🔍</span><span style={{ opacity: 0.7 }}>ค้นหา TAG, PEANO, สถานที่...</span>
              </div>
              {[
                { tag: "10001234", type: "M", loc: "ถ.พระราม 9, กรุงเทพ", color: "#8b3fc4" },
                { tag: "TR-00456", type: "T", loc: "สุขุมวิท 24, กทม.", color: "#d97706" },
                { tag: "10005678", type: "M", loc: "ลาดพร้าว 71, กทม.", color: "#8b3fc4" },
              ].map((r, i) => (
                <div key={i} style={{ marginBottom: 6, background: "#1b0926", borderRadius: 8, padding: "8px 10px", display: "flex", gap: 8, alignItems: "center", border: "1px solid #2d1052" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: r.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "white", flexShrink: 0 }}>{r.type}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#f3eefa" }}>{r.tag}</div>
                    <div style={{ fontSize: 9, color: "#7c6094" }}>📍 {r.loc}</div>
                  </div>
                  <div style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: "rgba(139,63,196,0.2)", color: "#a78bfa", fontWeight: 700, flexShrink: 0 }}>นำทาง</div>
                </div>
              ))}
            </div>
          </div>
          {/* Map Screen Mockup */}
          <div style={{ flex: 1, borderRadius: 14, overflow: "hidden", border: "1px solid #2d3f6e", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", minHeight: 170 }}>
            {/* Satellite background */}
            <div style={{ position: "relative", height: 170, background: "linear-gradient(155deg,#1a3a50 0%,#1e4a35 40%,#152040 100%)" }}>
              {/* Grid lines */}
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
              {/* Roads */}
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.12)" }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, left: "40%", width: 3, background: "rgba(255,255,255,0.08)" }} />
              {/* Purple meter dots */}
              {[[22,28],[55,42],[40,18],[80,60],[30,80],[70,30]].map(([x,y],i) => (
                <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 9, height: 9, borderRadius: "50%", background: "#8b3fc4", boxShadow: "0 0 5px rgba(139,63,196,0.7)", border: "1.5px solid rgba(255,255,255,0.4)" }} />
              ))}
              {/* Orange transformer dots */}
              {[[60,50],[15,65]].map(([x,y],i) => (
                <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 11, height: 11, borderRadius: "50%", background: "#d97706", boxShadow: "0 0 6px rgba(217,119,6,0.7)", border: "1.5px solid rgba(255,255,255,0.4)" }} />
              ))}
              {/* GPS pin */}
              <div style={{ position: "absolute", left: "50%", top: "55%", width: 14, height: 14, borderRadius: "50%", background: "#4285f4", boxShadow: "0 0 0 4px rgba(66,133,244,0.25)", border: "2px solid white" }} />
              {/* Zoom controls */}
              <div style={{ position: "absolute", right: 8, top: 8, display: "flex", flexDirection: "column", gap: 2, boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
                {["+","−"].map(c => (
                  <div key={c} style={{ width: 20, height: 20, background: "rgba(255,255,255,0.9)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#333" }}>{c}</div>
                ))}
              </div>
              {/* Legend */}
              <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(13,7,20,0.85)", borderRadius: 8, padding: "5px 8px", display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b3fc4" }} /><span style={{ fontSize: 9, color: "#f3eefa", fontWeight: 700 }}>มิเตอร์</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d97706" }} /><span style={{ fontSize: 9, color: "#f3eefa", fontWeight: 700 }}>หม้อแปลง</span></div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#7c6094", fontWeight: 600 }}>หน้าค้นหา</div>
          <div style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#7c6094", fontWeight: 600 }}>แผนที่ภาพรวม</div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding: "20px 28px 0" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 14 }}>📋 ขั้นตอนการใช้งาน</div>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, border: "2px solid rgba(167,139,250,0.5)" }}>{step.emoji}</div>
              {i < steps.length - 1 && <div style={{ width: 2, flex: 1, background: "rgba(167,139,250,0.2)", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#f3eefa", marginBottom: 4 }}>{i + 1}. {step.title}</div>
              {step.lines.map((ln, j) => (
                <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 3 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f47b20", marginTop: 6, flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: "rgba(243,238,250,0.75)", lineHeight: 1.6 }}>{ln}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer with QR */}
      <div style={{ margin: "12px 28px 28px", padding: "14px 18px", borderRadius: 14, background: "rgba(139,63,196,0.12)", border: "1px solid rgba(139,63,196,0.3)", display: "flex", alignItems: "center", gap: 14 }}>
        {/* QR Code */}
        <div style={{ flexShrink: 0, background: "white", borderRadius: 10, padding: 6, lineHeight: 0 }}
          dangerouslySetInnerHTML={{ __html: makeQRSvg(GIS_URL, 88, "#1b0926", "#ffffff") || `<div style="width:88px;height:88px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#7c6094">QR</div>` }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "rgba(243,238,250,0.45)", marginBottom: 3 }}>สแกน QR หรือเข้าที่</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#a78bfa", fontFamily: "monospace", wordBreak: "break-all" }}>menzkub.github.io/gis-mapping-system</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", fontWeight: 700 }}>v3.0 · Active</span>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(243,238,250,0.6)", fontWeight: 600 }}>PEA GIS · 1 มิ.ย. 2569</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Infographic: Admin Quick Guide ────────────────────────────────────────
const LOGO_SVG_ADMIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56"><defs><linearGradient id="agBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9b4dca"/><stop offset="100%" stop-color="#1b0926"/></linearGradient><linearGradient id="agBolt" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#ffcf8a"/><stop offset="100%" stop-color="#f47b20"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#agBg)"/><rect width="64" height="32" rx="15" fill="rgba(255,255,255,0.05)"/><path d="M 36 7 L 16 36 H 28 L 20 57 L 48 28 H 36 L 44 7 Z" fill="url(#agBolt)"/></svg>`;

function AdminQuickGuideCard() {
  const W = 560;
  const steps = [
    { emoji: "👥", title: "จัดการผู้ใช้งาน", badge: "Admin → จัดการผู้ใช้", lines: ["คลิกแถวผู้ใช้ = ดูรายละเอียด + สถานะรหัสผ่าน", "อนุมัติ / ระงับ / เปลี่ยน Role / เปิด-ปิด 2FA"] },
    { emoji: "📦", title: "จัดการมิเตอร์ & หม้อแปลง", badge: "Admin → PEA Meter / TR", lines: ["เพิ่ม / แก้ไข / ลบ ข้อมูลรายเครื่อง", "Import CSV (upsert ตาม OBJECTID) · Export CSV"] },
    { emoji: "🗺️", title: "แผนที่ภาพรวม + อนุมัติพิกัด", badge: "Admin → แผนที่", lines: ["ปุ่ม 'ตำแหน่งฉัน' = GPS ระบุจุดปัจจุบันบนแผนที่", "ปุ่ม '📋 คำขอแก้ไข (N)' = อนุมัติ / ปฏิเสธพิกัดใหม่"] },
    { emoji: "🔔", title: "ส่ง Push Notification", badge: "Admin → ตั้งค่า → Push", lines: ["เปิดการแจ้งเตือนบนอุปกรณ์นี้ก่อน (กด Allow)", "เลือกเทมเพลต / พิมพ์เอง → ส่งถึงทุกเครื่องทันที"] },
    { emoji: "🔧", title: "Maintenance Mode", badge: "Admin → ตั้งค่า", lines: ["เปิด = ผู้ใช้ทั่วไปเห็นหน้าปิดปรับปรุง — Admin ยังเข้าได้", "ตั้งข้อความและเวลากลับมาผ่านปฏิทินภาษาไทย"] },
    { emoji: "📋", title: "Audit Log & ความปลอดภัย", badge: "Admin → บันทึก / ความปลอดภัย", lines: ["บันทึกทุก action: login, แก้ไขข้อมูล, เปลี่ยนรหัส, 2FA", "คะแนนความปลอดภัย (0-100) + ตรวจจับกิจกรรมต้องสงสัย"] },
  ];
  return (
    <div style={{ width: W, fontFamily: "'IBM Plex Sans Thai',sans-serif", background: "#0d0714", color: "#f3eefa", padding: 0, boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1b0926 0%,#4f1e6e 50%,#f47b20 130%)", padding: "28px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(244,123,32,0.1)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div dangerouslySetInnerHTML={{ __html: LOGO_SVG_ADMIN }} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 2 }}>Admin Quick Reference · คู่มือ Admin</div>
            <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>GIS Meter &amp; Transformer</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>คู่มืออ้างอิงสำหรับผู้ดูแลระบบ PEA</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
          {["👥 จัดการผู้ใช้","📦 Import/Export","🔔 Push Notification","🔧 Maintenance","📊 Audit Log"].map(lbl => (
            <span key={lbl} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(244,123,32,0.15)", border: "1px solid rgba(244,123,32,0.35)", color: "rgba(255,255,255,0.9)" }}>{lbl}</span>
          ))}
        </div>
      </div>

      {/* Admin Dashboard Preview */}
      <div style={{ background: "#1b0926", padding: "20px 28px", borderBottom: "1px solid #2d1052" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#f97316", marginBottom: 14 }}>🖥️ ตัวอย่าง Admin Dashboard</div>
        {/* Mock sidebar + content layout */}
        <div style={{ background: "#0d0714", borderRadius: 14, overflow: "hidden", border: "1px solid #2d1052", display: "flex", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          {/* Mock Sidebar */}
          <div style={{ width: 130, background: "#100520", borderRight: "1px solid #2d1052", padding: "12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 10px 10px", borderBottom: "1px solid #2d1052", marginBottom: 8 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="20" height="20"><defs><linearGradient id="sbBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9b4dca"/><stop offset="100%" stop-color="#1b0926"/></linearGradient></defs><rect width="64" height="64" rx="12" fill="url(#sbBg)"/><path d="M 36 7 L 16 36 H 28 L 20 57 L 48 28 H 36 L 44 7 Z" fill="#ffcf8a"/></svg>
              <span style={{ fontSize: 9, fontWeight: 800, color: "#f3eefa" }}>GIS Meter</span>
            </div>
            {[
              { icon: "🔍", label: "ค้นหา" },
              { icon: "👤", label: "บัญชีฉัน" },
              { icon: "⚡", label: "อัปเดต" },
              { icon: "⚙️", label: "Admin", active: true },
            ].map(it => (
              <div key={it.label} style={{ padding: "7px 10px", display: "flex", alignItems: "center", gap: 7, background: it.active ? "rgba(139,63,196,0.2)" : "transparent", borderLeft: it.active ? "3px solid #8b3fc4" : "3px solid transparent", marginBottom: 2 }}>
                <span style={{ fontSize: 11 }}>{it.icon}</span>
                <span style={{ fontSize: 10, fontWeight: it.active ? 800 : 600, color: it.active ? "#f3eefa" : "#7c6094" }}>{it.label}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #2d1052", marginTop: 8, padding: "8px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#8b3fc4,#f47b20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "white" }}>A</div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#f3eefa" }}>Admin</div>
                  <div style={{ fontSize: 8, color: "#7c6094" }}>@admin</div>
                </div>
              </div>
            </div>
          </div>
          {/* Mock Main Content */}
          <div style={{ flex: 1, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#f97316", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Dashboard</div>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
              {[
                { num: "247", label: "ผู้ใช้", icon: "👥", c: "#8b3fc4" },
                { num: "1,890", label: "มิเตอร์", icon: "📦", c: "#059669" },
                { num: "342", label: "หม้อแปลง", icon: "⚡", c: "#3b82f6" },
                { num: "3", label: "รออนุมัติ", icon: "⏳", c: "#d97706" },
              ].map((c, i) => (
                <div key={i} style={{ background: "#1b0926", borderRadius: 8, padding: "6px 7px", border: `1px solid ${c.c}30`, textAlign: "center" }}>
                  <div style={{ fontSize: 12 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: c.c }}>{c.num}</div>
                  <div style={{ fontSize: 8, color: "#7c6094" }}>{c.label}</div>
                </div>
              ))}
            </div>
            {/* Mock DB usage bar */}
            <div style={{ background: "#1b0926", borderRadius: 8, padding: "7px 10px", border: "1px solid #2d1052" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#f3eefa" }}>Database Usage</span>
                <span style={{ fontSize: 9, color: "#059669", fontWeight: 700 }}>2.4 MB / 500 MB</span>
              </div>
              <div style={{ height: 6, background: "#2d1052", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: "5%", height: "100%", background: "linear-gradient(90deg,#059669,#34d399)", borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding: "20px 28px 0" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#f97316", marginBottom: 14 }}>📋 ฟีเจอร์หลักของ Admin</div>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#321148,#f47b20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, border: "2px solid rgba(244,123,32,0.5)" }}>{step.emoji}</div>
              {i < steps.length - 1 && <div style={{ width: 2, flex: 1, background: "rgba(244,123,32,0.2)", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#f3eefa" }}>{i + 1}. {step.title}</div>
                <span style={{ padding: "1px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700, background: "rgba(244,123,32,0.15)", border: "1px solid rgba(244,123,32,0.3)", color: "#ffba7a", whiteSpace: "nowrap" }}>{step.badge}</span>
              </div>
              {step.lines.map((ln, j) => (
                <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 3 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", marginTop: 6, flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: "rgba(243,238,250,0.75)", lineHeight: 1.6 }}>{ln}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer with QR */}
      <div style={{ margin: "12px 28px 28px", padding: "14px 18px", borderRadius: 14, background: "rgba(244,123,32,0.08)", border: "1px solid rgba(244,123,32,0.25)", display: "flex", alignItems: "center", gap: 14 }}>
        {/* QR Code */}
        <div style={{ flexShrink: 0, background: "white", borderRadius: 10, padding: 6, lineHeight: 0 }}
          dangerouslySetInnerHTML={{ __html: makeQRSvg(GIS_URL, 88, "#1b0926", "#ffffff") || `<div style="width:88px;height:88px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#7c6094">QR</div>` }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "rgba(243,238,250,0.45)", marginBottom: 3 }}>สแกน QR หรือเข้าที่</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#ffba7a", fontFamily: "monospace", wordBreak: "break-all" }}>menzkub.github.io/gis-mapping-system</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: "rgba(244,123,32,0.15)", border: "1px solid rgba(244,123,32,0.35)", color: "#ffba7a", fontWeight: 700 }}>Admin Reference</span>
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(243,238,250,0.6)", fontWeight: 600 }}>PEA GIS · 1 มิ.ย. 2569</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DocDownloadSection ────────────────────────────────────────────────────
function DocDownloadSection() {
  const userRef  = React.useRef(null);
  const adminRef = React.useRef(null);
  const [busy, setBusy] = useStateAd(null);
  const toast = useToast();

  function makeWrap(el, bg) {
    const clone = el.cloneNode(true);
    clone.style.cssText += ";width:560px;max-width:560px;margin:0;";
    const w = document.createElement("div");
    // Render on top of viewport (z-index max) so html2canvas can capture fonts/text fully
    w.style.cssText = `position:fixed;left:0;top:0;width:560px;pointer-events:none;z-index:2147483647;overflow:visible;background:${bg};`;
    w.appendChild(clone);
    return w;
  }

  async function waitFonts() {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  }

  async function dlPdf(ref, filename, key, bg) {
    const el = ref.current;
    if (!el || typeof html2pdf === "undefined") { toast?.("html2pdf ยังไม่พร้อม", "error"); return; }
    setBusy(key);
    await waitFonts();
    const wrap = makeWrap(el, bg);
    document.body.appendChild(wrap);
    const cleanup = () => { try { document.body.removeChild(wrap); } catch(_) {} setBusy(null); };
    html2pdf().set({
      margin: [12, 10, 12, 10],
      filename,
      image: { type: "jpeg", quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: bg, windowWidth: 560 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(wrap.firstChild).save().then(cleanup).catch(cleanup);
  }

  async function dlPng(ref, filename, key, bg) {
    const el = ref.current;
    if (!el) return;
    const canvasFn = window.html2canvas || null;
    if (!canvasFn) { toast?.("html2canvas ยังไม่โหลด กรุณารอสักครู่แล้วลองใหม่", "error"); return; }
    setBusy(key);
    await waitFonts();
    const wrap = makeWrap(el, bg);
    document.body.appendChild(wrap);
    const cleanup = () => { try { document.body.removeChild(wrap); } catch(_) {} setBusy(null); };
    canvasFn(wrap.firstChild, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: bg, width: 560 })
      .then(canvas => {
        const a = document.createElement("a");
        a.download = filename;
        a.href = canvas.toDataURL("image/png");
        a.click();
        cleanup();
      })
      .catch(cleanup);
  }

  const BTN = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", transition: "all 140ms" };

  const guides = [
    {
      key: "user",
      icon: "👤",
      title: "คู่มือผู้ใช้งานทั่วไป",
      desc: "เริ่มต้นใช้งาน, ค้นหา, แผนที่, GPS นำทาง, แจ้งแก้ไขพิกัด",
      ref: userRef,
      bg: "#1b0926",
      pdfFile: "คู่มือผู้ใช้งาน-GIS-Meter.pdf",
      pngFile: "คู่มือผู้ใช้งาน-GIS-Meter.png",
      accent: "#8b3fc4",
    },
    {
      key: "admin",
      icon: "⚙️",
      title: "คู่มืออ้างอิง Admin",
      desc: "จัดการผู้ใช้, มิเตอร์/TR, แผนที่, Push Notification, Maintenance",
      ref: adminRef,
      bg: "#1b0926",
      pdfFile: "คู่มือ-Admin-GIS-Meter.pdf",
      pngFile: "คู่มือ-Admin-GIS-Meter.png",
      accent: "#f47b20",
    },
  ];

  const [open, setOpen] = useStateAd(true);

  return (
    <div className="card card-elev" style={{ padding: 0, overflow: "hidden" }}>
      {/* Hidden infographic refs */}
      <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none" }}>
        <div ref={userRef}><UserQuickGuideCard /></div>
        <div ref={adminRef}><AdminQuickGuideCard /></div>
      </div>

      {/* Header — clickable to collapse */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        background: "transparent", border: "none", borderBottom: open ? "1px solid var(--line)" : "none",
        cursor: "pointer", textAlign: "left",
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,63,196,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="download" size={18} style={{ color: "var(--pea-purple-500)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>เอกสารสำหรับแจกผู้ใช้ใหม่</div>
          <div className="t-mute text-sm">ดาวน์โหลด PDF หรือ PNG เพื่อส่งต่อผ่าน Line / Email</div>
        </div>
        <Icon name={open ? "chevDown" : "chevRight"} size={16} style={{ color: "var(--ink-mute)", flexShrink: 0 }} />
      </button>

      {/* Cards */}
      {open && <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {guides.map(g => (
          <div key={g.key} style={{ padding: "14px 16px", borderRadius: 14, background: "var(--soft)", border: "1px solid var(--soft-border)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${g.accent}18`, border: `1px solid ${g.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{g.icon}</div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{g.title}</div>
              <div className="t-mute text-sm" style={{ marginTop: 2 }}>{g.desc}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                style={{ ...BTN, background: `${g.accent}18`, color: g.accent, border: `1px solid ${g.accent}30`, opacity: busy === `${g.key}-pdf` ? 0.6 : 1 }}
                onClick={() => dlPdf(g.ref, g.pdfFile, `${g.key}-pdf`, g.bg)}
                disabled={!!busy}
              >
                <Icon name="download" size={13} style={{ animation: busy === `${g.key}-pdf` ? "pea-spin 1s linear infinite" : "none" }} />
                PDF
              </button>
              <button
                style={{ ...BTN, background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)", opacity: busy === `${g.key}-png` ? 0.6 : 1 }}
                onClick={() => dlPng(g.ref, g.pngFile, `${g.key}-png`, g.bg)}
                disabled={!!busy}
              >
                <Icon name="sun" size={13} style={{ animation: busy === `${g.key}-png` ? "pea-spin 1s linear infinite" : "none" }} />
                PNG
              </button>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="info" size={12} style={{ flexShrink: 0 }} />
          PDF เหมาะพิมพ์แจก · PNG เหมาะส่งใน Line / Facebook
        </div>
      </div>}
    </div>
  );
}

function PushNotifySection({ pushPermission, subscribePush, unsubscribePush, currentUser, addAudit }) {
  const toast   = useToast();
  const { lang } = useLang();
  const th = (t, e) => lang === "en" ? e : t;

  const [open, setOpen]       = useStateAd(false);
  const [title, setTitle]     = useStateAd("");
  const [body, setBody]       = useStateAd("");
  const [sending, setSending] = useStateAd(false);
  const [subbing, setSubbing] = useStateAd(false);
  const [result, setResult]   = useStateAd(null);

  const isSupported = pushPermission !== "unsupported" && "PushManager" in window;
  const isGranted   = pushPermission === "granted";
  const isDenied    = pushPermission === "denied";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const PRESETS = [
    { icon: "🔧", label: th("ปิดระบบชั่วคราว","Maintenance"), title: th("ปิดระบบชั่วคราว","System Maintenance"), body: th("ระบบจะปิดให้บริการชั่วคราวเพื่อปรับปรุง กรุณาลองใหม่ในภายหลัง","The system will be temporarily unavailable for maintenance. Please try again later.") },
    { icon: "⚡", label: th("อัปเดตระบบ","Update"), title: th("อัปเดตระบบใหม่","System Updated"), body: th("ระบบได้รับการอัปเดตเวอร์ชันใหม่แล้ว กรุณารีเฟรชหน้าเว็บ","A new version is available. Please refresh the app.") },
    { icon: "✅", label: th("ระบบกลับมาแล้ว","Back Online"), title: th("ระบบกลับมาใช้งานได้แล้ว","System Back Online"), body: th("ระบบกลับมาให้บริการตามปกติแล้ว","The system is back online and working normally.") },
    { icon: "⚠️", label: th("แจ้งเตือนด่วน","Alert"), title: th("แจ้งเตือนด่วน","Urgent Alert"), body: th("มีประกาศสำคัญจากทีมผู้ดูแลระบบ กรุณาตรวจสอบ","There is an important announcement from the admin team.") },
  ];

  const handleSubscribe = async () => {
    setSubbing(true);
    const res = await subscribePush();
    setSubbing(false);
    if (res === "granted") toast?.(th("เปิดการแจ้งเตือนสำเร็จ","Notifications enabled"), "success");
    else if (res === "denied") toast?.(th("ถูกบล็อกการแจ้งเตือน กรุณาอนุญาตใน Browser Settings","Blocked — allow in browser settings"), "error");
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { toast?.(th("กรุณากรอกหัวข้อและข้อความ","Enter title and message"), "error"); return; }
    setSending(true); setResult(null);
    const { data: { session } } = await _supabase.auth.getSession();
    const res = await fetch(
      `${window.SUPABASE_URL || "https://yohlqjoogvuslemuwjij.supabase.co"}/functions/v1/push-notify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ title, body, url: "/gis-mapping-system/" }),
      }
    );
    setSending(false);
    if (res.ok) {
      const j = await res.json();
      setResult(j);
      addAudit({ user: currentUser.username, action: "push_notify", target: "all_users", detail: `ส่งแจ้งเตือน: ${title}` });
      toast?.(th(`ส่งสำเร็จ ${j.sent} เครื่อง`, `Sent to ${j.sent} device(s)`), "success");
      setTitle(""); setBody("");
    } else {
      toast?.(th("เกิดข้อผิดพลาดในการส่ง","Failed to send"), "error");
    }
  };

  return (
    <div className="card card-elev" style={{ marginTop: 24, padding: 0, overflow: "hidden" }}>
      {/* Collapsible header */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="bell" size={18} style={{ color: "white" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="fw-7 text-md">{th("ส่งการแจ้งเตือน Push","Push Notifications")}</div>
          <div className="t-mute text-sm">{th("แจ้งเตือนผู้ใช้ทุกคนบนมือถือทันที","Send instant alerts to all mobile users")}</div>
        </div>
        <Icon name={open ? "chevUp" : "chevDown"} size={16} style={{ color: "var(--ink-mute)", flexShrink: 0 }} />
      </button>

      {open && <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--line)" }}>
        <div style={{ height: 16 }} />

      {!isSupported ? (
        <div className="badge badge-amber" style={{ fontSize: 12, padding: "6px 12px" }}>
          {th("Browser นี้ไม่รองรับ Push Notification","Push notifications not supported in this browser")}
        </div>
      ) : isDenied ? (
        <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.22)", borderRadius: 12, padding: "14px 16px", fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: "var(--red)", marginBottom: 6 }}>
            {th("การแจ้งเตือนถูกปิดกั้น","Notifications are blocked")}
          </div>
          <div style={{ color: "var(--text)", lineHeight: 1.6, marginBottom: isIOS ? 12 : 0 }}>
            {isIOS ? (
              th(
                "ไปที่ Settings → เลื่อนหา GIS Meter → เปิด Allow Notifications แล้วกด \"ลองอีกครั้ง\" ด้านล่าง",
                "Go to Settings → find GIS Meter → enable Allow Notifications, then tap \"Try Again\" below"
              )
            ) : (
              th(
                "ไปที่การตั้งค่าเบราว์เซอร์ → ค้นหาเว็บนี้ → อนุญาต Notification แล้วรีโหลดหน้า",
                "Go to browser settings → find this site → allow Notifications, then reload the page"
              )
            )}
          </div>
          {isIOS && (
            <button className="btn btn-primary" style={{ height: 38, fontSize: 13, marginTop: 12 }} disabled={subbing} onClick={handleSubscribe}>
              <Icon name="bell" size={14} /> {subbing ? th("กำลังตรวจสอบ…","Checking…") : th("ลองอีกครั้ง","Try Again")}
            </button>
          )}
        </div>
      ) : !isGranted ? (
        <div>
          <div className="t-mute text-sm" style={{ marginBottom: 12 }}>
            {th("กดเพื่อขอสิทธิ์รับการแจ้งเตือนบนอุปกรณ์นี้ก่อน จากนั้นสามารถส่งถึงผู้ใช้ทุกคนได้","Enable notifications on this device first, then send to all users")}
          </div>
          <button className="btn btn-primary" style={{ height: 42 }} disabled={subbing} onClick={handleSubscribe}>
            <Icon name="bell" size={15} /> {subbing ? th("กำลังเปิด…","Enabling…") : th("เปิดการแจ้งเตือน","Enable Notifications")}
          </button>
        </div>
      ) : (
        <div className="f-col f-gap-3">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
            <span className="text-sm" style={{ color: "#10b981", fontWeight: 700 }}>{th("เปิดการแจ้งเตือนแล้ว","Notifications enabled")}</span>
            <button onClick={unsubscribePush} className="text-sm t-mute" style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "auto", textDecoration: "underline", fontSize: 11 }}>
              {th("ปิด","Disable")}
            </button>
          </div>

          {/* Preset buttons */}
          <div>
            <div className="text-sm fw-6" style={{ marginBottom: 8 }}>{th("เทมเพลตด่วน","Quick Templates")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => { setTitle(p.title); setBody(p.body); }}
                  style={{ padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">{th("หัวข้อ","Title")}</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={th("เช่น ปิดระบบชั่วคราว","e.g. System Maintenance")} />
          </div>
          <div className="field">
            <label className="field-label">{th("ข้อความ","Message")}</label>
            <textarea className="input" value={body} onChange={e => setBody(e.target.value)} rows={3}
              placeholder={th("รายละเอียดของการแจ้งเตือน…","Notification details…")}
              style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          </div>

          {result && (
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
              ✅ {th(`ส่งสำเร็จ ${result.sent}/${result.total} เครื่อง`, `Sent ${result.sent}/${result.total} device(s)`)}
              {result.failed > 0 && <span className="t-mute"> · {th(`หมดอายุ ${result.failed} เครื่อง`,"expired")}</span>}
            </div>
          )}

          <button className="btn btn-primary" style={{ height: 44, background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", boxShadow: "0 8px 22px rgba(107,44,145,0.35)" }}
            disabled={sending || !title.trim() || !body.trim()} onClick={handleSend}>
            <Icon name="bell" size={15} /> {sending ? th("กำลังส่ง…","Sending…") : th("ส่งแจ้งเตือนทันที","Send Now")}
          </button>
        </div>
      )}
      </div>}
    </div>
  );
}

window.AdminPanel = AdminPanel;
