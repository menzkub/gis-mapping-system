/* global React, Icon, StatCard, Modal, downloadCSV, useToast, useConfirm, formatThaiDate,
   _supabase, fromMeter, fromTransformer, fromProfilePatch, toMeter, toTransformer, toProfile */
const {
  useState:  useStateAd,
  useEffect: useEffectAd,
} = React;

/* ============================================================
   AdminPanel — dashboard, users, meters, transformers, import, audit
   ============================================================ */
function AdminPanel({ data, setData, currentUser, addAudit, maintenanceMode, setMaintenanceMode, maintenanceMessage, setMaintenanceMessage, maintenanceUntil, setMaintenanceUntil }) {
  const [tab, setTab] = useStateAd("dashboard");
  const pendingCount = data.users.filter(u => u.status === "pending").length;

  const tabs = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "users",     icon: "users",     label: "ผู้ใช้งาน" },
    { id: "meters",    icon: "meter",     label: "PEA Meter" },
    { id: "trs",       icon: "tr",        label: "PEA TR" },
    { id: "import",    icon: "upload",    label: "นำเข้าข้อมูล" },
    { id: "audit",     icon: "history",   label: "Audit Log" },
    { id: "settings",  icon: "settings",  label: "ตั้งค่า" },
  ];

  return (
    <div className="f-col" style={{ height: "100%", overflow: "hidden" }}>
      <style>{`
        .adm-header { padding: 16px 20px 0; }
        .adm-tabs-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
        .adm-title { font-size: 28px; }
        .adm-tabs { flex-wrap: nowrap !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .adm-tabs::-webkit-scrollbar { display: none; }
        .adm-body { flex: 1; overflow: auto; padding: 16px 20px 28px; }
        @media (max-width: 680px) {
          .adm-header { padding: 12px 16px 0; }
          .adm-title { font-size: 22px !important; }
          .adm-tabs-row { flex-direction: column; align-items: flex-start; gap: 6px; }
          .adm-tabs .tab { font-size: 12px !important; padding: 0 10px !important; height: 32px !important; white-space: nowrap; }
          .adm-body { padding: 12px 14px 24px; }
        }
      `}</style>
      <div className="adm-header">
        <div className="t-eyebrow" style={{ color: "var(--pea-orange-500)" }}>Admin</div>
        <div className="adm-tabs-row">
          <div className="t-display adm-title">จัดการระบบ</div>
          <div className="admin-tabs tabs adm-tabs">
            {tabs.map(t => (
              <button key={t.id} className={"tab " + (tab === t.id ? "active" : "")} onClick={() => setTab(t.id)}>
                <Icon name={t.icon} size={14} /> {t.label}
                {t.id === "users" && pendingCount > 0 && (
                  <span style={{
                    background: "var(--pea-orange-500)", color: "white",
                    borderRadius: 999, minWidth: 18, height: 18,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800, padding: "0 5px", marginLeft: 2,
                  }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
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
          addAudit={addAudit} currentUser={currentUser} />}
      </div>
    </div>
  );
}

/* ---------- Dashboard — all stats from data.dashStats (server aggregates) ---------- */
function AdminDashboard({ data }) {
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
        <StatCard label="มิเตอร์ทั้งหมด"  value={meterCount.toLocaleString()} delta={4} icon="meter"  accent="purple" />
        <StatCard label="หม้อแปลงทั้งหมด" value={trCount.toLocaleString()}    delta={2} icon="tr"     accent="orange" />
        <StatCard label="กำลัง (kVA)"      value={totalKva.toLocaleString()}   delta={6} icon="bolt"  accent="blue" />
        <StatCard label="ผู้ใช้งาน"        value={data.users.length} delta={pending > 0 ? pending : 0} icon="users" accent="green" />
      </div>

      {/* Feeder + Donut — side-by-side desktop, stacked mobile */}
      <div className="db-mid-grid">
        <div className="card card-elev">
          <div className="f-between" style={{ marginBottom: 16 }}>
            <div>
              <div className="t-eyebrow">การกระจาย</div>
              <div className="text-lg fw-7">มิเตอร์ตาม Feeder</div>
            </div>
            <div className="badge badge-purple">Top {feederStats.length}</div>
          </div>
          {feederStats.length === 0 ? (
            <div className="t-mute text-sm">ไม่มีข้อมูล Feeder</div>
          ) : (
            <div className="f-col f-gap-3">
              {feederStats.map(([f, n], i) => {
                const max = feederStats[0][1];
                const pct = (n / max) * 100;
                return (
                  <div key={f} className="fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="f-between" style={{ marginBottom: 4 }}>
                      <div className="fw-6 text-sm">{f}</div>
                      <div className="t-mute text-sm">{n.toLocaleString()} รายการ</div>
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
          <div className="text-lg fw-7" style={{ marginBottom: 14 }}>เจ้าของอุปกรณ์</div>
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
          <div className="text-lg fw-7">กิจกรรมล่าสุด</div>
          <div className="t-mute text-sm">{recent.length} รายการ</div>
        </div>
        {recent.length === 0 ? (
          <div className="t-mute text-sm" style={{ padding: "16px 0" }}>ไม่มีกิจกรรม</div>
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
  const [q, setQ]             = useStateAd("");
  const [list, setList]       = useStateAd([]);
  const [searching, setSearching] = useStateAd(false);
  const [edit, setEdit]       = useStateAd(null);
  const [saving, setSaving]   = useStateAd(false);
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
          <div className="t-mute text-sm">เพิ่ม/แก้ไข/ลบข้อมูลมิเตอร์ · ค้นหาเพื่อกรองผลลัพธ์</div>
        </div>
        <div className="adm-tb">
          <input className="input" style={{ width: 220, height: 38 }} value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา TAG, PEANO, ACCOUNTNUM…" />
          <button className="btn btn-outline btn-sm" style={{ flexShrink: 0 }} onClick={() => downloadCSV(`pea-meter-export.csv`, list)}><Icon name="download" size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => setEdit({ OBJECTID: Date.now(), TAG: "", CODE: "AFAG", ROUTE: "", ACCOUNTNUM: "", PEANO: "", FEEDERID: "", OWNER: "PEA", INSTALLATI: "", LATITUDE: 19.86, LONGITUDE: 99.18 })}>
            <Icon name="plus" size={14} /> เพิ่ม
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
            แสดง {list.length} รายการ — พิมพ์คำค้นหาเพื่อจำกัดผลลัพธ์
          </div>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && !isNew(edit) ? "แก้ไขมิเตอร์" : "เพิ่มมิเตอร์"} width={640}
        footer={<><button className="btn btn-outline" onClick={() => setEdit(null)}>ยกเลิก</button><button className="btn btn-primary" onClick={() => save(edit)} disabled={saving}><Icon name="check" size={14} /> {saving ? "กำลังบันทึก…" : "บันทึก"}</button></>}>
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
  const [q, setQ]           = useStateAd("");
  const [list, setList]     = useStateAd([]);
  const [searching, setSearching] = useStateAd(false);
  const [edit, setEdit]     = useStateAd(null);
  const [saving, setSaving] = useStateAd(false);
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
          <div className="t-mute text-sm">เพิ่ม/แก้ไข/ลบข้อมูลหม้อแปลง · ค้นหาเพื่อกรองผลลัพธ์</div>
        </div>
        <div className="adm-tb">
          <input className="input" style={{ width: 220, height: 38 }} value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา TAG, PEANO, สถานที่…" />
          <button className="btn btn-outline btn-sm" style={{ flexShrink: 0 }} onClick={() => downloadCSV(`pea-tr-export.csv`, list)}><Icon name="download" size={14} /> Export</button>
          <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => setEdit({ OBJECTID: Date.now(), TAG: "", PHASE: "หม้อแปลง 3 Phase", VOLTAGE: "22 kV", PEANO_TR: "", INSTALL_PHASE: "ABC", KVA: 100, OWNER_TR: "PEA", LOCATION: "", FEEDER1: "", LATITUDE: 19.86, LONGITUDE: 99.18, PEA_METER: "" })}>
            <Icon name="plus" size={14} /> เพิ่ม
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
            แสดง {list.length} รายการ — พิมพ์คำค้นหาเพื่อจำกัดผลลัพธ์
          </div>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && !isNew(edit) ? "แก้ไขหม้อแปลง" : "เพิ่มหม้อแปลง"} width={680}
        footer={<><button className="btn btn-outline" onClick={() => setEdit(null)}>ยกเลิก</button><button className="btn btn-primary" onClick={() => save(edit)} disabled={saving}><Icon name="check" size={14} /> {saving ? "กำลังบันทึก…" : "บันทึก"}</button></>}>
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
              onClick={() => downloadCSV("audit-log.csv", logs)}>
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
    </div>
  );
}

/* ---------- Settings ---------- */
const DEFAULT_MSG = "ผู้ดูแลระบบกำลังดำเนินการปรับปรุงระบบ\nกรุณากลับมาใหม่ภายหลัง หากมีข้อสงสัยกรุณาติดต่อผู้ดูแลระบบ";

function AdminSettings({ maintenanceMode, setMaintenanceMode, maintenanceMessage, setMaintenanceMessage, maintenanceUntil, setMaintenanceUntil, addAudit, currentUser }) {
  const [loading, setLoading] = useStateAd(false);
  const [savingMsg, setSavingMsg] = useStateAd(false);
  const [localMsg, setLocalMsg] = useStateAd(maintenanceMessage || DEFAULT_MSG);
  const [localUntil, setLocalUntil] = useStateAd(maintenanceUntil || "");
  const toast = useToast();

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
    </div>
  );
}

window.AdminPanel = AdminPanel;
