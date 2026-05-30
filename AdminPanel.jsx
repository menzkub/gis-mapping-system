/* global React, Icon, StatCard, Modal, downloadCSV, useToast, useConfirm, formatThaiDate,
   _supabase, fromMeter, fromTransformer, fromProfilePatch, toMeter, toTransformer, toProfile, useLang */
const {
  useState:  useStateAd,
  useEffect: useEffectAd,
} = React;

/* ============================================================
   AdminPanel — dashboard, users, meters, transformers, import, audit
   ============================================================ */
function AdminPanel({ data, setData, currentUser, addAudit, tab, setTab, maintenanceMode, setMaintenanceMode, maintenanceMessage, setMaintenanceMessage, maintenanceUntil, setMaintenanceUntil, devInfo, setDevInfo }) {
  const { t } = useLang();
  const NAV_LABELS = {
    dashboard: t("admDashboard"), users: t("admUsers"), meters: t("admMeters"),
    trs: t("admTrs"), import: t("admImport"), audit: t("admAudit"), settings: t("admSettings"),
    guide: t("admGuide"),
    dev: t("admDev"),
  };
  const pendingCount = data.users.filter(u => u.status === "pending").length;
  const MOB_NAV = [
    { id:"dashboard", icon:"dashboard", label:t("admDashboard")  },
    { id:"users",     icon:"users",     label:t("admUsers")      },
    { id:"meters",    icon:"meter",     label:t("admMobMeters")  },
    { id:"trs",       icon:"tr",        label:t("admMobTrs")     },
    { id:"import",    icon:"upload",    label:t("admMobImport")  },
    { id:"audit",     icon:"history",   label:t("admMobAudit")   },
    { id:"settings",  icon:"settings",  label:t("admSettings")   },
    { id:"guide",     icon:"book",      label:t("admMobGuide")   },
    { id:"dev",       icon:"code",      label:t("admMobDev")     },
  ];

  return (
    <div className="f-col" style={{ height: "100%", overflow: "hidden" }}>
      <style>{`
        .adm-body { flex: 1; overflow: auto; padding: 16px 20px 28px; }
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

      <div className="adm-body">
        {tab === "dashboard" && <AdminDashboard data={data} />}
        {tab === "users"     && <AdminUsers  data={data} setData={setData} addAudit={addAudit} currentUser={currentUser} />}
        {tab === "meters"    && <AdminMeters data={data} setData={setData} addAudit={addAudit} currentUser={currentUser} />}
        {tab === "trs"       && <AdminTrs    data={data} setData={setData} addAudit={addAudit} currentUser={currentUser} />}
        {tab === "import"    && <AdminImport data={data} setData={setData} addAudit={addAudit} currentUser={currentUser} />}
        {tab === "audit"     && <AdminAudit />}
        {tab === "settings"  && <AdminSettings
          maintenanceMode={maintenanceMode} setMaintenanceMode={setMaintenanceMode}
          maintenanceMessage={maintenanceMessage} setMaintenanceMessage={setMaintenanceMessage}
          maintenanceUntil={maintenanceUntil} setMaintenanceUntil={setMaintenanceUntil}
          addAudit={addAudit} currentUser={currentUser}
          devInfo={devInfo} setDevInfo={setDevInfo} />}
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
  const custMeters = +(s.cust_meters  || 0);
  const peaTr      = +(s.pea_tr       || 0);
  const custTr     = +(s.cust_tr      || 0);
  const pending    = data.users.filter(u => u.status === "pending").length;

  const feederStats = (s.top_feeders || []).map(f => [f.feeder, +f.n]);
  const recent = data.auditLog.slice(0, 5);

  return (
    <div className="f-col f-gap-4 fade-up">
      <style>{`
        .db-stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        .db-mid-grid  { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
        .db-donut-row { display: flex; align-items: center; gap: 20px; }
        .db-donut-row svg { width: 130px; height: 130px; flex-shrink: 0; }
        .db-act-row   { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-top: 1px solid var(--line); }
        @media (max-width: 680px) {
          .db-stat-grid { grid-template-columns: repeat(2,1fr); gap: 10px; }
          .db-mid-grid  { grid-template-columns: 1fr; }
          .db-donut-row { flex-direction: column; align-items: stretch; gap: 12px; }
          .db-donut-row svg { width: 110px; height: 110px; align-self: center; }
          .db-donut-row .db-legend-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
          .db-act-target { display: none; }
        }
      `}</style>

      {/* Stat cards — 4 cols desktop, 2×2 mobile */}
      <div className="db-stat-grid">
        <StatCard label={t("dbMeters")} value={fmtStat(meterCount)} delta={4} icon="meter"  accent="purple" />
        <StatCard label={t("dbTrs")}    value={fmtStat(trCount)}    delta={2} icon="tr"     accent="orange" />
        <StatCard label={t("dbKva")}    value={fmtStat(totalKva)}   delta={6} icon="bolt"  accent="blue" />
        <StatCard label={t("dbUsers")}  value={fmtStat(data.users.length)} delta={pending > 0 ? pending : 0} icon="users" accent="green" />
      </div>

      {/* Feeder + Donut — side-by-side desktop, stacked mobile */}
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
                const max = feederStats[0][1];
                const pct = (n / max) * 100;
                return (
                  <div key={f} className="fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="f-between" style={{ marginBottom: 4 }}>
                      <div className="fw-6 text-sm">{f}</div>
                      <div className="t-mute text-sm">{n.toLocaleString()} {t("dbItems")}</div>
                    </div>
                    <div style={{ height: 8, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: "linear-gradient(90deg,var(--pea-purple-600),var(--pea-orange-500))", transition: "width 600ms var(--ease-out)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card card-elev">
          <div className="text-lg fw-7" style={{ marginBottom: 14 }}>{t("dbByType")}</div>
          <div className="db-donut-row">
            <Donut peaMeters={peaMeters} custMeters={custMeters} peaTr={peaTr} custTr={custTr} displayTotal={meterCount + trCount} />
            <div className="db-legend-list f-col f-gap-2 text-sm">
              <Legend color="#6b2c91" label="PEA Meter"      value={peaMeters.toLocaleString()} />
              <Legend color="#b67dee" label="Cust. Meter"    value={custMeters.toLocaleString()} />
              <Legend color="#f47b20" label="PEA TR"         value={peaTr.toLocaleString()} />
              <Legend color="#ffba7a" label="Cust. TR"       value={custTr.toLocaleString()} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card card-elev">
        <div className="f-between" style={{ marginBottom: 8 }}>
          <div className="text-lg fw-7">{t("dbRecentAct")}</div>
          <div className="t-mute text-sm">{recent.length} รายการ</div>
        </div>
        {recent.length === 0 ? (
          <div className="t-mute text-sm" style={{ padding: "16px 0" }}>{t("dbNoActivity")}</div>
        ) : recent.map(r => (
          <div key={r.id} className="db-act-row">
            <div className={"badge " + actionBadge(r.action)} style={{ flexShrink: 0 }}>{actionLabel(r.action)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="text-sm fw-6" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.detail || "—"}</div>
              <div className="t-mute text-xs">{r.at} · {r.user}</div>
            </div>
            <div className="mono text-xs t-mute db-act-target" style={{ flexShrink: 0 }}>{r.target}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label, value }) {
  return (
    <div className="f-gap-2 flex" style={{ alignItems: "center" }}>
      <div style={{ width: 12, height: 12, borderRadius: 4, background: color }} />
      <div className="fw-6">{label}</div>
      <div className="t-mute mono">{value}</div>
    </div>
  );
}

function Donut({ peaMeters, custMeters, peaTr, custTr, displayTotal }) {
  const total = peaMeters + custMeters + peaTr + custTr || 1;
  const shown = displayTotal || total;
  const segs = [
    { v: peaMeters,  color: "#6b2c91" },
    { v: custMeters, color: "#b67dee" },
    { v: peaTr,      color: "#f47b20" },
    { v: custTr,     color: "#ffba7a" },
  ];
  const C = 2 * Math.PI * 42;
  let offset = 0;
  return (
    <svg viewBox="0 0 120 120" style={{ width: 140, height: 140 }}>
      <circle cx="60" cy="60" r="42" fill="none" stroke="var(--line)" strokeWidth="14" />
      {segs.map((s, i) => {
        const len = (s.v / total) * C;
        const dash = `${len} ${C - len}`;
        const el = <circle key={i} cx="60" cy="60" r="42" fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={dash} strokeDashoffset={-offset} transform="rotate(-90 60 60)" strokeLinecap="butt" />;
        offset += len;
        return el;
      })}
      <text x="60" y="58" textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: "var(--ink)" }}>{shown.toLocaleString()}</text>
      <text x="60" y="74" textAnchor="middle" style={{ fontSize: 9, fill: "var(--ink-mute)", fontWeight: 600, letterSpacing: "0.1em" }}>TOTAL</text>
    </svg>
  );
}

function ExportDialog({ open, onClose, onConfirm, count, filename, label }) {
  const { t } = useLang();
  if (!open) return null;
  return (
    <div className="fade-in" style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(14,10,22,0.55)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 20 }} onClick={onClose}>
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
function GuideSection({ icon, title, badge, children }) {
  const [open, setOpen] = useStateAd(false);
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
          </div>
        </div>
      </div>

      {/* ─── SECTION: บทบาทผู้ใช้งาน ─── */}
      <GuideSection icon="users" title={s("บทบาทผู้ใช้งาน (Role)", "User Roles")} badge={s("ภาพรวม", "Overview")}>
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
      <GuideSection icon="lock" title={s("การเข้าสู่ระบบ & สมัครสมาชิก", "Login & Registration")} badge="user · admin">
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
      <GuideSection icon="search" title={s("ค้นหาข้อมูล Meter / Transformer", "Search Meter / Transformer")} badge="user · admin">
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
      <GuideSection icon="map" title={s("แผนที่และการนำทาง GPS", "Map & GPS Navigation")} badge="user · admin">
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            [s("ฟีเจอร์", "Feature"), s("วิธีใช้", "How to use")],
            [s("สลับ Map/Satellite", "Street/Satellite Toggle"), s("กดปุ่ม Street/Satellite บน Topbar", "Click Street/Satellite button on Topbar")],
            ["Cluster", s("กดปุ่ม Cluster บนแผนที่ — รวมกลุ่ม marker ให้ดูง่าย", "Click Cluster on map — groups markers for clarity")],
            ["Heatmap", s("กดปุ่ม Heatmap — แสดงความหนาแน่นพื้นที่", "Click Heatmap — shows density overlay")],
            ["Split View", s("กดปุ่ม Split — ตารางและแผนที่อยู่คู่กัน", "Click Split — table and map side by side")],
            [s("คัดลอกพิกัด", "Copy Coordinates"), s("คลิกที่ marker → กดปุ่ม Copy พิกัด lat/lng", "Click marker → Copy lat/lng coordinates")],
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("นำทาง GPS", "GPS Navigation")}</div>
          <GuideStep n={1} text={s("คลิก marker บนแผนที่ หรือกดปุ่มนำทางในตาราง", "Click a marker on the map or the navigate button in the table")} />
          <GuideStep n={2} text={s("ระบบขอสิทธิ์ตำแหน่งปัจจุบันจาก browser — กด 'Allow'", "Browser requests location permission — click 'Allow'")} />
          <GuideStep n={3} text={s("ระบบคำนวณระยะทางและเวลาโดยประมาณ", "System calculates estimated distance and travel time")} />
          <GuideStep n={4} text={s("กด 'นำทาง' เพื่อเปิด Google Maps หรือ Apple Maps", "Click 'Navigate' to open Google Maps or Apple Maps")} />
        </div>
      </GuideSection>

      {/* ─── SECTION: โปรไฟล์ ─── */}
      <GuideSection icon="user" title={s("โปรไฟล์ & ความปลอดภัยส่วนตัว", "Profile & Security")} badge="user · admin">
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            [s("แท็บ", "Tab"), s("รายละเอียด", "Details")],
            [s("ข้อมูล", "Info"), s("ดูชื่อ, ชื่อผู้ใช้, อีเมล, บทบาท, วันที่สมัคร — แก้ไขชื่อได้", "View name, username, email, role, join date — name editable")],
            [s("รหัสผ่าน", "Password"), s("เปลี่ยนรหัสผ่าน (ต้องกรอกรหัสเดิม) + เปิด/ปิด 2FA", "Change password + enable/disable 2FA")],
            [s("การใช้งาน", "Activity"), s("ประวัติ login/logout, เปลี่ยนรหัส, 2FA พร้อม device info", "Login/logout history, password changes, 2FA with device info")],
            [s("การค้นหา", "Search"), s("ประวัติค้นหา Meter/TR พร้อม timestamp", "Meter/TR search history with timestamps")],
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("เปิด 2FA (TOTP)", "Enable 2FA (TOTP)")}</div>
          <GuideStep n={1} text={s("ไปที่โปรไฟล์ → แท็บ 'รหัสผ่าน' → กด 'เปิดใช้ 2FA'", "Go to Profile → Password tab → click 'Enable 2FA'")} />
          <GuideStep n={2} text={s("สแกน QR Code ด้วย Google Authenticator หรือ Authy", "Scan QR Code with Google Authenticator or Authy")} />
          <GuideStep n={3} text={s("กรอกรหัส 6 หลักเพื่อยืนยัน — 2FA เปิดใช้งานทันที", "Enter the 6-digit code to verify — 2FA is enabled immediately")} />
          <GuideTip>{s("แนะนำให้เปิด 2FA เสมอ โดยเฉพาะบัญชี Admin เพื่อความปลอดภัย", "Always enable 2FA, especially for Admin accounts, for security")}</GuideTip>
        </div>
      </GuideSection>

      {/* ─── SECTION: Dashboard ─── */}
      <GuideSection icon="dashboard" title="Dashboard (Admin)" badge="admin only">
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
      <GuideSection icon="users" title={s("จัดการผู้ใช้งาน (Admin)", "User Management (Admin)")} badge="admin only">
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            ["Action", s("ผลลัพธ์", "Result")],
            [s("อนุมัติ", "Approve"), s("เปลี่ยนสถานะจาก pending → active (ผู้ใช้เข้าระบบได้)", "Change status from pending → active (user can log in)")],
            [s("ระงับ", "Suspend"), s("เปลี่ยนสถานะเป็น banned (ผู้ใช้เข้าระบบไม่ได้)", "Change status to banned (user cannot log in)")],
            [s("ปลดระงับ", "Unsuspend"), s("เปลี่ยนสถานะจาก banned → active", "Change status from banned → active")],
            [s("เปลี่ยน Role", "Change Role"), s("สลับระหว่าง user ↔ admin", "Toggle between user ↔ admin")],
            [s("บังคับ 2FA", "Force 2FA"), s("เปิดหรือปิด 2FA ให้ผู้ใช้คนนั้นทันที", "Enable or disable 2FA for that user immediately")],
          ]} />
          <GuideTip>{s("มีผู้ใช้ pending — ระบบจะแสดง badge จำนวนที่ปุ่ม bell บน Topbar", "Pending users — system shows a badge count on the bell button in Topbar")}</GuideTip>
        </div>
      </GuideSection>

      {/* ─── SECTION: จัดการ Meter/TR ─── */}
      <GuideSection icon="meter" title={s("จัดการ PEA มิเตอร์ & หม้อแปลง (Admin)", "Manage PEA Meters & Transformers (Admin)")} badge="admin only">
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
      <GuideSection icon="upload" title={s("นำเข้าข้อมูล CSV (Admin)", "Import CSV Data (Admin)")} badge="admin only">
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
      <GuideSection icon="history" title="Audit Log (Admin)" badge="admin only">
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            [s("Action ที่บันทึก", "Recorded Actions"), s("ตัวอย่าง", "Example")],
            ["login / logout", s("เข้า-ออกระบบ", "Login / logout")],
            ["search_meter / search_tr", s("ค้นหาข้อมูล", "Search data")],
            ["create / update / delete", s("เพิ่ม แก้ไข ลบ Meter/TR", "Add, edit, delete Meter/TR")],
            ["import_csv / export_csv", s("นำเข้า/ส่งออกข้อมูล", "Import/export data")],
            ["change_password", s("เปลี่ยนรหัสผ่าน", "Password change")],
            ["enable_2fa / disable_2fa", s("เปิด/ปิด 2FA", "Enable/disable 2FA")],
            ["approve_user / ban_user", s("อนุมัติ/ระงับผู้ใช้งาน", "Approve/suspend users")],
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{s("การกรองข้อมูล", "Filtering")}</div>
          <GuideStep n={1} text={s("กรองตาม user, ประเภท action, หรือช่วงวันที่", "Filter by user, action type, or date range")} />
          <GuideStep n={2} text={s("กด Export เพื่อดาวน์โหลด log หน้านั้นเป็น CSV", "Click Export to download the current page as CSV")} />
          <GuideNote>{s("Audit Log แบ่งหน้า 50 รายการต่อหน้า — ใช้ปุ่มลูกศรเลื่อนหน้า", "Audit Log paginates at 50 items per page — use arrow buttons to navigate")}</GuideNote>
        </div>
      </GuideSection>

      {/* ─── SECTION: ตั้งค่าระบบ ─── */}
      <GuideSection icon="settings" title={s("ตั้งค่าระบบ (Admin)", "System Settings (Admin)")} badge="admin only">
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Maintenance Mode</div>
          <GuideStep n={1} text={s("เปิด Toggle 'Maintenance Mode' — ผู้ใช้ทั่วไปจะเห็นหน้า 'ระบบปิดปรับปรุง'", "Enable 'Maintenance Mode' toggle — regular users will see the maintenance page")} />
          <GuideStep n={2} text={s("แก้ไขข้อความแจ้งผู้ใช้ตามต้องการ แล้วกด 'บันทึกข้อความ'", "Edit the message shown to users, then click 'Save Message'")} />
          <GuideStep n={3} text={s("ตั้งวันเวลาที่คาดว่าจะกลับมาให้บริการ แล้วกด 'บันทึกวันเวลา'", "Set the expected return time, then click 'Save Time'")} />
          <GuideNote>{s("Admin ยังคงเข้าใช้ระบบได้ปกติในช่วง Maintenance Mode", "Admins can still access the system normally during Maintenance Mode")}</GuideNote>
          <GuideTip>{s("อย่าลืมปิด Maintenance Mode หลังงานเสร็จ", "Remember to disable Maintenance Mode when the work is done")}</GuideTip>
        </div>
      </GuideSection>

      {/* ─── SECTION: UI ─── */}
      <GuideSection icon="sun" title={s("การตั้งค่า UI", "UI Settings")} badge="user · admin">
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            [s("ปุ่ม", "Button"), s("ตำแหน่ง", "Location"), s("ฟังก์ชัน", "Function")],
            ["🌙 / ☀️", s("Topbar ขวา", "Topbar right"), s("สลับโหมดมืด/สว่าง (จำค่าไว้ใน browser)", "Toggle dark/light mode (saved in browser)")],
            ["TH / EN", s("Topbar ขวา", "Topbar right"), s("สลับภาษาไทย/อังกฤษ", "Switch Thai/English language")],
            ["🔄 Refresh", s("Topbar ขวา", "Topbar right"), s("โหลดข้อมูลใหม่โดยไม่ต้อง reload หน้า", "Reload data without refreshing the page")],
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
  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ borderRadius: 20, background: "linear-gradient(135deg,#1b0926 0%,#321148 50%,#4f1e6e 100%)", color: "white", padding: "24px 28px", marginBottom: 20, position: "relative", overflow: "hidden", border: "1px solid rgba(139,63,196,0.3)" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(139,63,196,0.12)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(139,63,196,0.25)", border: "1px solid rgba(139,63,196,0.4)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="code" size={26} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Developer Documentation</div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>GIS Meter & Transformer</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>คู่มือสำหรับนักพัฒนา — โครงสร้างโค้ด, ฐานข้อมูล, API และ Helpers</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          {[["React 18","purple"],["Babel Standalone","orange"],["Supabase","green"],["Leaflet 1.9","blue"],["GitHub Pages","gray"]].map(([label, color]) => (
            <span key={label} style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)"
            }}>{label}</span>
          ))}
        </div>
      </div>

      {/* ─── SECTION: Architecture ─── */}
      <GuideSection icon="cpu" title="สถาปัตยกรรมระบบ (Architecture)">
        <div style={{ marginTop: 12 }}>
          <GuideTip>ระบบนี้ไม่มี build step — แก้ไขไฟล์ .jsx แล้ว git push ได้เลย ไม่ต้อง npm install หรือ webpack</GuideTip>
          <CodeBlock>{`Browser
  ├── index.html          ← entry point, โหลด CDN ทุกตัวตามลำดับ
  ├── CDN (head)
  │    ├── Leaflet CSS/JS
  │    ├── React 18 (production UMD)
  │    ├── ReactDOM 18 (production UMD)
  │    ├── Babel Standalone  ← compile JSX ใน browser runtime
  │    └── Supabase JS v2
  └── Scripts (body)
       ├── config.js       ← global: _supabase, mappers, loadAll
       ├── lang.jsx        ← global: LangProvider, useLang
       ├── components.jsx  ← global: Icon, Modal, Toast, Confirm…
       ├── MapView.jsx     ← component: <MapView>
       ├── AuthScreen.jsx  ← component: <AuthScreen>
       ├── SearchView.jsx  ← component: <SearchView>
       ├── AdminPanel.jsx  ← component: <AdminPanel>
       └── app.jsx         ← ReactDOM.render(<App>)`}</CodeBlock>
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
      <GuideSection icon="package" title="ไฟล์และหน้าที่">
        <div style={{ marginTop: 12 }}>
          <GuideTable rows={[
            ["ไฟล์", "บทบาท", "ขนาด"],
            ["config.js", "Supabase client + row mappers (to/from DB)", "~150 บรรทัด"],
            ["lang.jsx", "ระบบ i18n ไทย/อังกฤษ — LangProvider + useLang()", "~340 บรรทัด"],
            ["components.jsx", "Shared UI: Icon, Modal, Toast, Confirm, StatCard, downloadCSV", "~326 บรรทัด"],
            ["MapView.jsx", "Leaflet map wrapper — cluster, heatmap, GPS, measure", "~364 บรรทัด"],
            ["AuthScreen.jsx", "Login, Signup, Forgot password + canvas animation background", "~775 บรรทัด"],
            ["SearchView.jsx", "ค้นหา Meter/TR (server-side), filters, export, map integration", "~653 บรรทัด"],
            ["AdminPanel.jsx", "Dashboard, Users, Meters, TRs, Import, Audit, Settings, Guide, Dev", "~1730 บรรทัด"],
            ["app.jsx", "App root, routing, auth state, ProfileView, MaintenanceScreen", "~1600 บรรทัด"],
            ["data.js", "Static fallback data (meters/TR/users จาก Fang, Chiang Mai)", "~43 บรรทัด"],
            ["styles.css", "CSS variables (light/dark theme), component styles, utilities", "~529 บรรทัด"],
          ]} />
        </div>
      </GuideSection>

      {/* ─── SECTION: Database ─── */}
      <GuideSection icon="database" title="ฐานข้อมูล Supabase">
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
            ["profiles", "id (uuid = auth.uid)", "ข้อมูลผู้ใช้: username, name, role, status, last_login"],
            ["meters", "objectid (bigint)", "มิเตอร์: tag, code, route, accountnum, peano, feederid, owner, lat, lng"],
            ["transformers", "objectid (bigint)", "หม้อแปลง: tag, phase, voltage, peano_tr, kva, owner_tr, location, feeder1, lat, lng"],
            ["audit_log", "id (bigserial)", "บันทึก: user_id, username, action, target, detail, ip, at"],
            ["settings", "key (text)", "ค่าตั้งค่า key-value: maintenance_mode, maintenance_message, maintenance_until"],
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
          ]} />
          <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Triggers</div>
          <CodeBlock>{`-- Auto-create profile เมื่อสมัครสมาชิก
handle_new_user()  →  INSERT INTO profiles (id, email, role='user', status='pending')

-- Auto-update updated_at
touch_updated_at() →  UPDATE meters/transformers SET updated_at = NOW()`}</CodeBlock>
        </div>
      </GuideSection>

      {/* ─── SECTION: Row Mappers ─── */}
      <GuideSection icon="arrowRight" title="Row Mappers — DB ↔ App (config.js)">
        <div style={{ marginTop: 12 }}>
          <GuideNote>Supabase ใช้ snake_case ส่วน App ใช้ UPPERCASE — mappers แปลงระหว่างสองฝั่ง</GuideNote>
          <CodeBlock>{`// DB → App (อ่านข้อมูล)
toMeter(row)         // row.feederid   → m.FEEDERID
toTransformer(row)   // row.peano_tr   → t.PEANO_TR
toProfile(row)       // row.last_login → u.lastLogin
toAuditEntry(row)    // row.at         → entry.at (Date object)

// App → DB (เขียนข้อมูล)
fromMeter(m)         // m.FEEDERID     → row.feederid
fromTransformer(t)   // t.PEANO_TR     → row.peano_tr
fromProfilePatch(p)  // selective patch, ไม่ส่ง field ที่ไม่ได้เปลี่ยน

// ตัวอย่างการใช้งาน
const { data } = await _supabase.from("meters").select("*").limit(100);
const meters = data.map(toMeter);  // แปลงก่อนใช้ใน component`}</CodeBlock>
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
      <GuideSection icon="grid" title="Shared Components API (components.jsx)">
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
      <GuideSection icon="key" title="Utility Functions">
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
      <GuideSection icon="book" title="ระบบภาษา i18n (lang.jsx)">
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
      <GuideSection icon="sun" title="CSS Design System (styles.css)">
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
      <GuideSection icon="map" title="MapView Props API">
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

      {/* ─── SECTION: Adding Features ─── */}
      <GuideSection icon="plus" title="วิธีเพิ่มฟีเจอร์ใหม่">
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
      <GuideSection icon="link" title="Deploy & การพัฒนา">
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
  const [q, setQ]       = useStateAd("");
  const [edit, setEdit] = useStateAd(null);
  const [saving, setSaving] = useStateAd(false);
  const confirm = useConfirm();
  const toast   = useToast();
  const list = data.users.filter(u => !q || `${u.username} ${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  const toggle2FA = (u) => updateUser(
    u.id,
    { require_2fa: !u.require_2fa },
    u.require_2fa ? "disable_2fa" : "enable_2fa",
    `${u.require_2fa ? "ปิด" : "เปิด"} 2FA สำหรับ ${u.username}`,
    `${u.require_2fa ? "ปิด" : "เปิด"} 2FA สำหรับ ${u.name} แล้ว`
  );

  const updateUser = async (id, patch, action, detail, toastMsg) => {
    setSaving(true);
    const { error } = await _supabase.from("profiles").update(fromProfilePatch(patch)).eq("id", id);
    setSaving(false);
    if (error) { toast?.("เกิดข้อผิดพลาด: " + error.message, "error"); return; }
    setData(d => ({ ...d, users: d.users.map(u => u.id === id ? { ...u, ...patch } : u) }));
    addAudit({ user: currentUser.username, action, target: id, detail });
    if (toastMsg) toast?.(toastMsg, "success");
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

  return (
    <div className="card card-elev fade-up">
      <style>{`
        .au-dt    { display: block; overflow: auto; max-height: 60vh; }
        .au-cards { display: none; }
        .au-card  { padding: 14px 2px; border-bottom: 1px solid var(--line); }
        .au-card:last-child { border-bottom: none; }
        @media (max-width: 680px) {
          .au-dt    { display: none !important; }
          .au-cards { display: block !important; }
          .au-search { width: 100% !important; }
        }
      `}</style>

      {/* Header */}
      <div className="f-between f-gap-3 f-wrap" style={{ marginBottom: 16 }}>
        <div>
          <div className="text-lg fw-7">ผู้ใช้งาน ({list.length})</div>
          <div className="t-mute text-sm">อนุมัติบัญชีใหม่ · ระงับ · แก้ไขข้อมูล</div>
        </div>
        <input className="input au-search" style={{ width: 280, height: 38 }} value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อ / username / email" />
      </div>

      {/* Desktop: table */}
      <div className="au-dt">
        <table className="table">
          <thead><tr>{["ผู้ใช้", "Role", "สถานะ", "2FA", "เข้าใช้ล่าสุด", ""].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id}>
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
                <td>
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
                <td className="text-sm t-mute">{u.lastLogin || "—"}</td>
                <td>
                  <div className="row-action">
                    {u.status === "pending" && (
                      <button className="btn-icon" title="อนุมัติ" onClick={() => updateUser(u.id, { status: "active" }, "approve_user", `อนุมัติบัญชี ${u.username}`, `อนุมัติ ${u.name} แล้ว`)}>
                        <Icon name="check" size={14} />
                      </button>
                    )}
                    {u.status === "active" && u.id !== currentUser.id && (
                      <button className="btn-icon" title="ระงับ" onClick={() => banUser(u)}>
                        <Icon name="lock" size={14} />
                      </button>
                    )}
                    {u.status === "banned" && (
                      <button className="btn-icon" title="ปลดระงับ" onClick={() => updateUser(u.id, { status: "active" }, "approve_user", `ปลดระงับ ${u.username}`, `ปลดระงับ ${u.name}`)}>
                        <Icon name="check" size={14} />
                      </button>
                    )}
                    <button className="btn-icon" title="แก้ไข" onClick={() => setEdit({ ...u })}><Icon name="edit" size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="au-cards">
        {list.map(u => {
          const isPending = u.status === "pending";
          const isBanned  = u.status === "banned";
          const isMe      = u.id === currentUser.id;
          return (
            <div key={u.id} className="au-card" style={{
              background: isPending ? "rgba(234,179,8,0.04)" : "transparent",
              borderRadius: isPending ? 12 : 0,
              padding: isPending ? "14px 12px" : "14px 2px",
              border: isPending ? "1px solid rgba(234,179,8,0.2)" : undefined,
              marginBottom: isPending ? 8 : 0,
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

              {/* Row 2: Status + 2FA + last login */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                <span className={"badge " + (u.status === "active" ? "badge-green" : isBanned ? "badge-red" : "badge-amber")} style={{ fontSize: 11 }}>
                  {u.status === "active" ? "ใช้งานได้" : isBanned ? "ระงับ" : "รออนุมัติ"}
                </span>
                <button onClick={() => toggle2FA(u)} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${u.require_2fa ? "#16a34a" : "var(--line)"}`,
                  background: u.require_2fa ? "rgba(22,163,74,0.1)" : "transparent",
                  color: u.require_2fa ? "#16a34a" : "var(--ink-mute)",
                }}>
                  <Icon name="lock" size={10} />
                  2FA {u.require_2fa ? "เปิด" : "ปิด"}
                </button>
                {u.lastLogin && (
                  <span style={{ fontSize: 11, color: "var(--ink-mute)", marginLeft: "auto" }}>
                    {u.lastLogin}
                  </span>
                )}
              </div>

              {/* Row 3: Action buttons */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {isPending && (
                  <button className="btn btn-primary btn-sm" style={{ height: 34, fontSize: 12 }}
                    onClick={() => updateUser(u.id, { status: "active" }, "approve_user", `อนุมัติบัญชี ${u.username}`, `อนุมัติ ${u.name} แล้ว`)}>
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
                    onClick={() => updateUser(u.id, { status: "active" }, "approve_user", `ปลดระงับ ${u.username}`, `ปลดระงับ ${u.name}`)}>
                    <Icon name="check" size={13} /> ปลดระงับ
                  </button>
                )}
                <button className="btn btn-outline btn-sm" style={{ height: 34, fontSize: 12, marginLeft: "auto" }}
                  onClick={() => setEdit({ ...u })}>
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
function AdminImport({ data, setData, addAudit, currentUser }) {
  const [target, setTarget]   = useStateAd("meter");
  const [preview, setPreview] = useStateAd(null);
  const [fileName, setFileName] = useStateAd("");
  const [importing, setImporting] = useStateAd(false);
  const toast = useToast();

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

      // Upsert in batches of 500
      const BATCH = 500;
      for (let i = 0; i < dbRows.length; i += BATCH) {
        const { error } = await _supabase
          .from(table)
          .upsert(dbRows.slice(i, i + BATCH), { onConflict: "objectid" });
        if (error) throw error;
      }

      // Refresh dashboard stats (no need to load all records)
      const { data: newStats } = await _supabase.rpc("get_dashboard_stats");
      if (newStats) setData(d => ({ ...d, dashStats: newStats }));

      addAudit({ user: currentUser.username, action: "import_csv", target: target === "meter" ? "PEA Meter" : "PEA TR", detail: `นำเข้า ${preview.rows.length} รายการ จาก ${fileName}` });
      toast?.(`นำเข้า ${preview.rows.length} รายการ สำเร็จ`, "success");
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
      <div className="card card-elev">
        <div className="text-lg fw-7" style={{ marginBottom: 6 }}>นำเข้าข้อมูลจาก CSV</div>
        <div className="t-mute text-sm" style={{ marginBottom: 16 }}>อัปโหลด CSV (UTF-8) — ข้อมูลจะ upsert เข้า Supabase ทันที (ตาม OBJECTID)</div>

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

/* ---------- Settings ---------- */
const DEFAULT_MSG = "ผู้ดูแลระบบกำลังดำเนินการปรับปรุงระบบ\nกรุณากลับมาใหม่ภายหลัง หากมีข้อสงสัยกรุณาติดต่อผู้ดูแลระบบ";

function AdminSettings({ maintenanceMode, setMaintenanceMode, maintenanceMessage, setMaintenanceMessage, maintenanceUntil, setMaintenanceUntil, addAudit, currentUser, devInfo, setDevInfo }) {
  const [loading, setLoading] = useStateAd(false);
  const [savingMsg, setSavingMsg] = useStateAd(false);
  const [localMsg, setLocalMsg] = useStateAd(maintenanceMessage || DEFAULT_MSG);
  const [localUntil, setLocalUntil] = useStateAd(maintenanceUntil || "");
  const [localDev, setLocalDev] = useStateAd(devInfo || {});
  const [savingDev, setSavingDev] = useStateAd(false);
  const toast = useToast();

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

      {/* Maintenance Mode Toggle Card */}
      <div className="card card-elev">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              <Icon name="settings" size={16} />
              Maintenance Mode
              {maintenanceMode && (
                <span className="badge badge-orange" style={{ fontSize: 10 }}>เปิดอยู่</span>
              )}
            </div>
            <div className="t-mute text-sm" style={{ lineHeight: 1.6 }}>
              เมื่อเปิด ผู้ใช้ทั่วไปจะเห็นหน้า "ระบบปิดปรับปรุง" และเข้าใช้งานไม่ได้<br />
              Admin ยังคงเข้าใช้งานได้ตามปกติ
            </div>
          </div>
          <button
            onClick={toggle}
            disabled={loading}
            title={maintenanceMode ? "คลิกเพื่อเปิดระบบ" : "คลิกเพื่อปิดปรับปรุง"}
            style={{
              width: 60, height: 32, borderRadius: 999, flexShrink: 0, cursor: "pointer",
              background: maintenanceMode ? "var(--pea-orange-500)" : "var(--line)",
              position: "relative", transition: "background 250ms", border: "none",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: "50%", background: "white",
              position: "absolute", top: 4,
              left: maintenanceMode ? 32 : 4,
              transition: "left 250ms",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>
        {maintenanceMode && (
          <div className="badge badge-orange fade-up" style={{ marginTop: 16, padding: "10px 14px", width: "100%", display: "flex", gap: 8 }}>
            <Icon name="warning" size={15} />
            ระบบปิดปรับปรุงอยู่ — ผู้ใช้ทั่วไปไม่สามารถเข้าใช้งานได้
          </div>
        )}
        {!maintenanceMode && (
          <div className="badge badge-green fade-up" style={{ marginTop: 16, padding: "10px 14px", width: "100%", display: "flex", gap: 8 }}>
            <Icon name="check" size={15} />
            ระบบเปิดให้บริการปกติ
          </div>
        )}
      </div>

      {/* Message & Return Time Card */}
      <div className="card card-elev">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="edit" size={16} />
          ข้อความแจ้งผู้ใช้งาน
        </div>
        <div className="t-mute text-sm" style={{ marginBottom: 16, lineHeight: 1.6 }}>
          ข้อความที่แสดงบนหน้าปิดปรับปรุง หากไม่กรอก จะใช้ข้อความเริ่มต้น
        </div>

        <div className="f-col f-gap-3">
          <div>
            <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>ข้อความ</label>
            <textarea
              value={localMsg}
              onChange={e => setLocalMsg(e.target.value)}
              rows={4}
              placeholder={DEFAULT_MSG}
              style={{
                width: "100%", resize: "vertical", fontFamily: "inherit",
                padding: "10px 12px", borderRadius: 10, fontSize: 14,
                border: "1px solid var(--line)", background: "var(--bg)",
                color: "var(--text)", lineHeight: 1.6, boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn btn-ghost text-sm" style={{ padding: "2px 8px", height: 28 }}
                onClick={() => setLocalMsg(DEFAULT_MSG)}>
                รีเซ็ตข้อความเริ่มต้น
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
              วันที่/เวลาที่คาดว่าจะกลับมาให้บริการ <span className="t-mute">(ไม่บังคับ)</span>
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="datetime-local"
                value={localUntil}
                onChange={e => setLocalUntil(e.target.value)}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 14,
                  border: "1px solid var(--line)", background: "var(--bg)",
                  color: "var(--text)", fontFamily: "inherit",
                }}
              />
              {localUntil && (
                <button className="btn btn-ghost" style={{ height: 42, padding: "0 12px", flexShrink: 0 }}
                  onClick={() => setLocalUntil("")} title="ล้างวันที่">
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ height: 44, marginTop: 4 }}
            disabled={savingMsg}
            onClick={saveMessage}
          >
            {savingMsg ? "กำลังบันทึก…" : <><Icon name="save" size={15} /> บันทึกข้อความ</>}
          </button>
        </div>
      </div>

      {/* Developer Info Card */}
      <div className="card card-elev">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              <Icon name="code" size={16} />
              ข้อมูลนักพัฒนาระบบ
            </div>
            <div className="t-mute text-sm" style={{ lineHeight: 1.6 }}>
              แสดงปุ่ม "พัฒนาโดย" มุมขวาล่างของหน้าจอ ผู้ใช้ทุกคนสามารถดูข้อมูลได้
            </div>
          </div>
          <button
            onClick={() => setDev("showBtn", !localDev.showBtn)}
            title={localDev.showBtn ? "คลิกเพื่อซ่อนปุ่ม" : "คลิกเพื่อแสดงปุ่ม"}
            style={{
              width: 60, height: 32, borderRadius: 999, flexShrink: 0, cursor: "pointer",
              background: localDev.showBtn ? "linear-gradient(135deg,#6b2c91,#8b3fc4)" : "var(--line)",
              position: "relative", transition: "background 250ms", border: "none",
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: "50%", background: "white",
              position: "absolute", top: 4,
              left: localDev.showBtn ? 32 : 4,
              transition: "left 250ms",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>

        <div className="f-col f-gap-3">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["ชื่อ-นามสกุล", "name", "text", "ธนพล ใจดี"],
              ["ตำแหน่ง", "position", "text", "นักพัฒนาระบบ"],
              ["แผนก/ฝ่าย", "department", "text", "ฝ่ายสารสนเทศ"],
              ["สถานที่/สาขา", "location", "text", "กฟจ. เชียงใหม่"],
              ["เวอร์ชัน", "version", "text", "1.0.0"],
            ].map(([label, key, type, ph]) => (
              <div key={key}>
                <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 5 }}>{label}</label>
                <input
                  type={type}
                  value={localDev[key] || ""}
                  onChange={e => setDev(key, e.target.value)}
                  placeholder={ph}
                  style={{
                    width: "100%", padding: "9px 11px", borderRadius: 10, fontSize: 13,
                    border: "1px solid var(--line)", background: "var(--bg)",
                    color: "var(--text)", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
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
              <textarea
                value={localDev[key] || ""}
                onChange={e => setDev(key, e.target.value)}
                rows={2}
                placeholder={ph}
                style={{
                  width: "100%", resize: "vertical", fontFamily: "inherit",
                  padding: "9px 11px", borderRadius: 10, fontSize: 13,
                  border: "1px solid var(--line)", background: "var(--bg)",
                  color: "var(--text)", lineHeight: 1.6, boxSizing: "border-box",
                }}
              />
            </div>
          ))}

          <button
            className="btn btn-primary"
            style={{ height: 44, marginTop: 4, background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", boxShadow: "0 8px 22px rgba(107,44,145,0.35)" }}
            disabled={savingDev}
            onClick={saveDev}
          >
            {savingDev ? "กำลังบันทึก…" : <><Icon name="save" size={15} /> บันทึกข้อมูลนักพัฒนา</>}
          </button>
        </div>
      </div>
    </div>
  );
}

window.AdminPanel = AdminPanel;
