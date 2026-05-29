/* global React, ReactDOM, Icon, ToastProvider, ConfirmProvider, useToast,
   AuthScreen, SearchView, AdminPanel, TILE_LAYERS, formatThaiDate,
   _supabase, toProfile, toAuditEntry */
const {
  useState: useStateApp,
  useEffect: useEffectApp,
  useCallback: useCallbackApp,
} = React;

// ── Loading screen ────────────────────────────────────────────────────────
function LoadingScreen({ message = "กำลังโหลดข้อมูล…" }) {
  return (
    <div style={{
      height: "100vh", display: "grid", placeItems: "center",
      background: "radial-gradient(120% 100% at 0% 0%, #8b3fc4 0%, #321148 60%, #1b0926 100%)",
    }}>
      <div style={{ textAlign: "center", color: "white" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: "0 auto 20px",
          background: "linear-gradient(135deg,#f47b20,#ffba7a)",
          display: "grid", placeItems: "center",
          boxShadow: "0 12px 36px rgba(244,123,32,0.4)",
          animation: "pea-spin 1.4s linear infinite",
        }}>
          <Icon name="bolt" size={30} stroke={2.4} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>PEA Meter &amp; TR</div>
        <div style={{ fontSize: 13, opacity: 0.65 }}>{message}</div>
      </div>
      <style>{`@keyframes pea-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Profile helpers ───────────────────────────────────────────────────────
function activityLabel(a) {
  const m = {
    login: "เข้าสู่ระบบ", logout: "ออกจากระบบ",
    change_password: "เปลี่ยนรหัสผ่าน",
    search_meter: "ค้นหา Meter", search_tr: "ค้นหา TR",
    view_map: "ดูแผนที่", create_user: "สร้างบัญชี",
    update_meter: "แก้ไข Meter", update_tr: "แก้ไข TR",
  };
  return m[a] || a;
}
function activityBadge(a) {
  if (a === "login")           return "badge-green";
  if (a === "logout")          return "badge-purple";
  if (a === "change_password") return "badge-orange";
  if (a.startsWith("search"))  return "badge-blue";
  return "badge-amber";
}
function parseDevice(ua = "") {
  const b = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser";
  const o = /Windows NT/.test(ua) ? "Windows" : /Macintosh/.test(ua) ? "Mac" : /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : "Other";
  return `${b} · ${o}`;
}

// ── ProfileView ───────────────────────────────────────────────────────────
function ProfileView({ currentUser, data, addAudit }) {
  const [tab, setTabPV]           = useStateApp("info");
  const [newPw, setNewPw]         = useStateApp("");
  const [confirmPw, setConfirmPw] = useStateApp("");
  const [showNewPw, setShowNewPw]         = useStateApp(false);
  const [showConfirmPw, setShowConfirmPw] = useStateApp(false);
  const [saving, setSaving]       = useStateApp(false);
  const [err, setErr]             = useStateApp(null);
  const [pwSuccess, setPwSuccess] = useStateApp(false);
  const toast = useToast();

  const checks = {
    length:  newPw.length >= 8,
    upper:   /[A-Z]/.test(newPw),
    lower:   /[a-z]/.test(newPw),
    number:  /[0-9]/.test(newPw),
    special: /[^A-Za-z0-9]/.test(newPw),
  };
  const strength = Object.values(checks).filter(Boolean).length;
  const sColors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
  const sLabels = ["", "อ่อนมาก", "อ่อน", "ปานกลาง", "แข็งแกร่ง", "แข็งแกร่งมาก"];
  const confirmOk  = confirmPw.length > 0 && confirmPw === newPw;
  const confirmBad = confirmPw.length > 0 && confirmPw !== newPw;

  const changePassword = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!Object.values(checks).every(Boolean)) {
      setErr("รหัสผ่านไม่ตรงตามเกณฑ์ความปลอดภัย"); return;
    }
    if (newPw !== confirmPw) {
      setErr("รหัสผ่านและการยืนยันไม่ตรงกัน"); return;
    }
    setSaving(true);
    const { error } = await _supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) {
      setErr(error.message);
    } else {
      await addAudit({
        user: currentUser.username, action: "change_password",
        target: currentUser.username, detail: "เปลี่ยนรหัสผ่านสำเร็จ",
      });
      toast?.("เปลี่ยนรหัสผ่านสำเร็จแล้ว", "success");
      setPwSuccess(true);
      setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSuccess(false), 4000);
    }
  };

  const myActivity = data.auditLog.filter(r => r.user === currentUser.username);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px", height: "100%", overflow: "auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div className="t-eyebrow" style={{ color: "var(--pea-orange-500)" }}>บัญชีของฉัน</div>
        <div className="t-display" style={{ fontSize: 26 }}>ข้อมูลส่วนตัว</div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { id: "info",     label: "ข้อมูลบัญชี",     icon: "user" },
          { id: "password", label: "เปลี่ยนรหัสผ่าน", icon: "lock" },
          { id: "activity", label: "ประวัติการใช้งาน", icon: "history" },
        ].map(t => (
          <button key={t.id} className={"tab " + (tab === t.id ? "active" : "")} onClick={() => setTabPV(t.id)}>
            <Icon name={t.icon} size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Info ── */}
      {tab === "info" && (
        <div className="card card-elev fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#f47b20,#6b2c91)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 28, color: "white", flexShrink: 0 }}>
              {currentUser.name?.[0] || currentUser.username[0]}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{currentUser.name}</div>
              <div style={{ color: "var(--ink-mute)", fontSize: 14 }}>@{currentUser.username}</div>
              <span className={"badge " + (currentUser.role === "admin" ? "badge-orange" : "badge-blue")} style={{ marginTop: 6, display: "inline-block" }}>
                {currentUser.role}
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {[
              { label: "ชื่อ-นามสกุล",      value: currentUser.name },
              { label: "Username",           value: "@" + currentUser.username },
              { label: "สิทธิ์การใช้งาน",   value: currentUser.role },
              { label: "สถานะบัญชี",         value: currentUser.status === "active" ? "✅ ใช้งานได้" : currentUser.status },
              { label: "เข้าสู่ระบบล่าสุด", value: currentUser.lastLogin || "—" },
            ].map(r => (
              <div key={r.label} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
                <div className="t-mute text-xs fw-6" style={{ textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{r.label}</div>
                <div className="fw-6">{r.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Change Password ── */}
      {tab === "password" && (
        <div className="card card-elev fade-up" style={{ maxWidth: 480 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>เปลี่ยนรหัสผ่าน</div>
            <div className="t-mute text-sm">รหัสผ่านใหม่ต้องผ่านเกณฑ์ความปลอดภัยทั้งหมด</div>
          </div>
          {pwSuccess && (
            <div className="badge badge-green fade-up" style={{ padding: "10px 14px", marginBottom: 16, width: "100%", display: "flex", gap: 8 }}>
              <Icon name="check" size={14} /> เปลี่ยนรหัสผ่านสำเร็จแล้ว
            </div>
          )}
          <form className="f-col f-gap-4" onSubmit={changePassword}>
            <div className="field">
              <label className="field-label">รหัสผ่านใหม่</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showNewPw ? "text" : "password"}
                  style={{ paddingLeft: 42, paddingRight: 44 }}
                  value={newPw} onChange={e => { setNewPw(e.target.value); setErr(null); }}
                  placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete="new-password" />
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", pointerEvents: "none" }}>
                  <Icon name="lock" size={18} />
                </div>
                <button type="button" onClick={() => setShowNewPw(s => !s)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", width: 32, height: 32 }}>
                  <Icon name={showNewPw ? "eyeOff" : "eye"} size={18} />
                </button>
              </div>
              {newPw.length > 0 && (
                <>
                  <div style={{ display: "flex", gap: 4, marginTop: 8, marginBottom: 4 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= strength ? sColors[strength] : "var(--line)", transition: "background 300ms" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: sColors[strength], marginBottom: 8 }}>{sLabels[strength]}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                    {[
                      { ok: checks.length,  label: "ขั้นต่ำ 8 ตัวอักษร" },
                      { ok: checks.upper,   label: "ตัวพิมพ์ใหญ่ (A-Z)" },
                      { ok: checks.lower,   label: "ตัวพิมพ์เล็ก (a-z)" },
                      { ok: checks.number,  label: "ตัวเลข (0-9)" },
                      { ok: checks.special, label: "อักขระพิเศษ (!@#$...)" },
                    ].map(r => (
                      <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: r.ok ? "#16a34a" : "var(--ink-mute)", fontWeight: r.ok ? 700 : 400 }}>
                        <span>{r.ok ? "✓" : "○"}</span>{r.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="field">
              <label className="field-label">ยืนยันรหัสผ่านใหม่</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showConfirmPw ? "text" : "password"}
                  style={{ paddingLeft: 42, paddingRight: 44, borderColor: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : undefined }}
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="กรอกรหัสผ่านอีกครั้ง" autoComplete="new-password" />
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
                  color: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : "var(--ink-mute)" }}>
                  <Icon name={confirmOk ? "check" : "lock"} size={18} />
                </div>
                <button type="button" onClick={() => setShowConfirmPw(s => !s)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", width: 32, height: 32 }}>
                  <Icon name={showConfirmPw ? "eyeOff" : "eye"} size={18} />
                </button>
              </div>
              {confirmBad && <div style={{ marginTop: 5, fontSize: 11, color: "var(--red)", fontWeight: 600 }}>✕ รหัสผ่านไม่ตรงกัน</div>}
              {confirmOk  && <div style={{ marginTop: 5, fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ รหัสผ่านตรงกัน</div>}
            </div>
            {err && <div className="badge badge-red" style={{ alignSelf: "flex-start", padding: "8px 12px" }}><Icon name="close" size={14} />{err}</div>}
            <button type="submit" className="btn btn-primary" style={{ height: 48 }} disabled={saving}>
              {saving ? "กำลังบันทึก…" : <><Icon name="check" size={14} /> บันทึกรหัสผ่านใหม่</>}
            </button>
          </form>
        </div>
      )}

      {/* ── Activity ── */}
      {tab === "activity" && (
        <div className="card card-elev fade-up">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>ประวัติการใช้งาน ({myActivity.length})</div>
            <div className="t-mute text-sm">กิจกรรมทั้งหมดของบัญชีคุณ</div>
          </div>
          {myActivity.length === 0 ? (
            <div className="t-mute text-sm" style={{ padding: "20px 0" }}>ยังไม่มีประวัติการใช้งาน</div>
          ) : (
            <div style={{ overflow: "auto", maxHeight: "60vh" }}>
              <table className="table">
                <thead>
                  <tr><th>เวลา</th><th>การกระทำ</th><th>รายละเอียด</th><th>อุปกรณ์</th></tr>
                </thead>
                <tbody>
                  {myActivity.map(r => (
                    <tr key={r.id}>
                      <td className="mono text-xs">{r.at}</td>
                      <td><span className={"badge " + activityBadge(r.action)}>{activityLabel(r.action)}</span></td>
                      <td className="text-sm">{r.detail}</td>
                      <td className="text-xs t-mute" title={r.ip}>{r.ip ? parseDevice(r.ip) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────
function App() {
  const [appState, setAppState] = useStateApp("checking");
  const [currentUser, setCurrentUser] = useStateApp(null);
  const [data, setData] = useStateApp({
    meters: [], transformers: [],
    users: [], auditLog: [], feeders: [],
    dashStats: {},
  });
  const [route, setRoute] = useStateApp("search");
  const [theme, setTheme] = useStateApp(() => localStorage.getItem("pea_theme") || "light");
  const [baseMap, setBaseMap] = useStateApp(() => localStorage.getItem("pea_base") || "satellite");

  useEffectApp(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("pea_theme", theme);
  }, [theme]);
  useEffectApp(() => { localStorage.setItem("pea_base", baseMap); }, [baseMap]);

  // ── Load app data after auth ─────────────────────────────────────────────
  const loadAppData = useCallbackApp(async (supabaseUser) => {
    setAppState("loading");
    try {
      const myProfileRes = await _supabase
        .from("profiles").select("*").eq("id", supabaseUser.id).single();

      if (myProfileRes.error || !myProfileRes.data) {
        await _supabase.auth.signOut();
        setAppState("unauthed");
        return;
      }
      const myProfile = myProfileRes.data;
      if (myProfile.status === "pending" || myProfile.status === "banned") {
        await _supabase.auth.signOut();
        window.__peaAuthErr = myProfile.status === "pending"
          ? "บัญชีของคุณรอการอนุมัติจากผู้ดูแลระบบ"
          : "บัญชีของคุณถูกระงับการใช้งาน";
        setAppState("unauthed");
        return;
      }

      const [profilesRes, auditRes, feedersRes, statsRes] = await Promise.all([
        _supabase.from("profiles").select("*").order("created_at"),
        _supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(500),
        _supabase.rpc("get_feeders"),
        _supabase.rpc("get_dashboard_stats"),
      ]);

      const users     = (profilesRes.data || []).map(r => toProfile({ ...r, email: "" }));
      const feeders   = (feedersRes.data  || []).map(r => r.feeder).filter(Boolean);
      const dashStats = statsRes.data || {};

      // บันทึก login พร้อม device info
      const deviceInfo = (navigator.userAgent || "").substring(0, 200);
      const { data: loginRow } = await _supabase.from("audit_log").insert({
        user_id:  supabaseUser.id,
        username: myProfile.username || "",
        action:   "login",
        target:   "—",
        detail:   "เข้าสู่ระบบ",
        ip:       deviceInfo,
      }).select().single();

      const auditLog = loginRow
        ? [toAuditEntry(loginRow), ...(auditRes.data || []).map(toAuditEntry)].slice(0, 500)
        : (auditRes.data || []).map(toAuditEntry);

      setCurrentUser(toProfile({ ...myProfile, email: supabaseUser.email }));
      setData({ meters: [], transformers: [], users, auditLog, feeders, dashStats });
      setAppState("ready");

      await _supabase.from("profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("id", supabaseUser.id);
    } catch (err) {
      console.error("loadAppData failed:", err);
      setAppState("unauthed");
    }
  }, []);

  // ── Auth state listener ──────────────────────────────────────────────────
  useEffectApp(() => {
    _supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadAppData(session.user);
      } else {
        setAppState("unauthed");
      }
    });

    const { data: { subscription } } = _supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        loadAppData(session.user);
      }
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setData({ meters: [], transformers: [], users: [], auditLog: [], feeders: [], dashStats: {} });
        window.__peaAuthErr = null;
        setAppState("unauthed");
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAppData]);

  // ── Auto-logout หลังไม่ใช้งาน 30 นาที ───────────────────────────────────
  useEffectApp(() => {
    if (!currentUser) return;
    const TIMEOUT = 30 * 60 * 1000;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await _supabase.from("audit_log").insert({
          user_id:  currentUser.id,
          username: currentUser.username,
          action:   "logout",
          target:   "—",
          detail:   "ออกจากระบบอัตโนมัติ (ไม่มีการใช้งาน 30 นาที)",
          ip:       "",
        });
        await _supabase.auth.signOut();
      }, TIMEOUT);
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click", "mousemove"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [currentUser]);

  // ── addAudit ─────────────────────────────────────────────────────────────
  const addAudit = useCallbackApp(async (entry) => {
    const row = {
      user_id:  currentUser?.id || null,
      username: entry.user      || currentUser?.username || "",
      action:   entry.action    || "",
      target:   entry.target    || "",
      detail:   entry.detail    || "",
      ip:       entry.ip        || "",
    };
    const { data: inserted } = await _supabase.from("audit_log").insert(row).select().single();
    if (inserted) {
      setData(d => ({
        ...d,
        auditLog: [toAuditEntry(inserted), ...d.auditLog].slice(0, 500),
      }));
    }
  }, [currentUser]);

  // ── Render states ────────────────────────────────────────────────────────
  if (appState === "checking") return <LoadingScreen message="กำลังตรวจสอบการเข้าสู่ระบบ…" />;
  if (appState === "loading")  return <LoadingScreen message="กำลังโหลดข้อมูล…" />;

  if (appState === "unauthed" || !currentUser) {
    return (
      <ToastProvider><ConfirmProvider>
        <AuthScreen initialError={window.__peaAuthErr || null} />
      </ConfirmProvider></ToastProvider>
    );
  }

  const navItems = [
    { id: "search",  icon: "search",   label: "ค้นหา" },
    { id: "profile", icon: "user",     label: "บัญชีฉัน" },
    ...(currentUser.role === "admin" ? [{ id: "admin", icon: "settings", label: "Admin" }] : []),
  ];

  return (
    <ToastProvider><ConfirmProvider>
      <div className="app-root">
        {/* Sidebar */}
        <aside className="app-sidebar" style={{
          background: "linear-gradient(180deg, #1b0926 0%, #321148 50%, #1b0926 100%)",
          color: "white", padding: "22px 16px", display: "flex", flexDirection: "column", gap: 16,
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div className="sidebar-brand f-gap-3 flex" style={{ alignItems: "center", padding: "0 6px 8px" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#f47b20,#ffba7a)", display: "grid", placeItems: "center", boxShadow: "0 8px 24px rgba(244,123,32,0.4)", flexShrink: 0 }}>
              <Icon name="bolt" size={20} stroke={2.4} />
            </div>
            <div className="sidebar-brand-text">
              <div style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, color: "#ffba7a", textTransform: "uppercase" }}>PEA</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Meter &amp; TR</div>
            </div>
          </div>
          <nav className="sidebar-nav f-col f-gap-2">
            {navItems.map(it => (
              <button
                key={it.id}
                className={"sidebar-nav-btn" + (route === it.id ? " sidebar-nav-btn--active" : "")}
                onClick={() => setRoute(it.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  borderRadius: 12, color: "rgba(255,255,255,0.85)", fontWeight: 600, fontSize: 14,
                  background: route === it.id ? "linear-gradient(135deg, rgba(244,123,32,0.25), rgba(139,63,196,0.25))" : "transparent",
                  border: route === it.id ? "1px solid rgba(244,123,32,0.5)" : "1px solid transparent",
                  boxShadow: route === it.id ? "0 8px 20px rgba(244,123,32,0.18)" : "none",
                  textAlign: "left", transition: "all 180ms var(--ease-out)",
                }}
              >
                <Icon name={it.icon} size={18} />
                <span className="sidebar-nav-label">{it.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-user" style={{ marginTop: "auto", padding: 14, background: "rgba(255,255,255,0.04)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="f-gap-3 flex" style={{ alignItems: "center" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #f47b20, #6b2c91)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                {currentUser.name?.[0] || currentUser.username[0]}
              </div>
              <div className="sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>@{currentUser.username} · {currentUser.role}</div>
              </div>
            </div>
            <button className="sidebar-logout-btn" onClick={async () => {
              await addAudit({ user: currentUser.username, action: "logout", target: "—", detail: "ออกจากระบบ" });
              await _supabase.auth.signOut();
            }} style={{
              marginTop: 10, width: "100%", padding: "8px 12px", borderRadius: 10,
              background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Icon name="logout" size={14} />
              <span className="sidebar-logout-text">ออกจากระบบ</span>
            </button>
          </div>
        </aside>

        {/* Topbar */}
        <header className="app-topbar" style={{
          background: "var(--surface)", borderBottom: "1px solid var(--line)",
          padding: "0 24px", display: "flex", alignItems: "center", gap: 14,
        }}>
          <div className="topbar-greeting" style={{ flex: 1 }}>
            <div className="t-mute text-xs">วันนี้ • {new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            <div className="fw-7" style={{ fontSize: 15 }}>
              สวัสดี <span style={{ color: "var(--pea-purple-600)" }}>{currentUser.name}</span> 👋
            </div>
          </div>

          <div className="topbar-mapswitcher tabs" style={{ padding: 4 }}>
            {Object.entries(TILE_LAYERS).map(([k, v]) => (
              <button key={k} className={"tab " + (baseMap === k ? "active" : "")} style={{ height: 36, padding: "0 14px", fontSize: 12 }} onClick={() => setBaseMap(k)}>
                <Icon name={k === "satellite" ? "layers" : k === "dark" ? "moon" : "map"} size={12} /> {v.label}
              </button>
            ))}
          </div>

          <button className="btn-icon" title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>

          <button className="btn-icon" title="แจ้งเตือน">
            <Icon name="bell" />
          </button>

          {/* Mobile only: user avatar + logout */}
          <button className="topbar-logout" title="ออกจากระบบ" onClick={async () => {
            await addAudit({ user: currentUser.username, action: "logout", target: "—", detail: "ออกจากระบบ" });
            await _supabase.auth.signOut();
          }} style={{
            display: "none", alignItems: "center", gap: 8,
            padding: "6px 10px", borderRadius: 20,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            color: "var(--red)", fontSize: 12, fontWeight: 700,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#f47b20,#6b2c91)", display: "grid", placeItems: "center", color: "white", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {currentUser.name?.[0] || currentUser.username[0]}
            </div>
            <Icon name="logout" size={14} />
          </button>
        </header>

        {/* Main */}
        <main className="app-main">
          {route === "search" && (
            <SearchView
              data={data}
              baseMap={baseMap}
              currentUser={currentUser}
              onLogSearch={(entry) => addAudit(entry)}
            />
          )}
          {route === "profile" && (
            <ProfileView currentUser={currentUser} data={data} addAudit={addAudit} />
          )}
          {route === "admin" && currentUser.role === "admin" && (
            <AdminPanel data={data} setData={setData} currentUser={currentUser} addAudit={addAudit} />
          )}
        </main>
      </div>
    </ConfirmProvider></ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
