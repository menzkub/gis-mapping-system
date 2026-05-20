/* global React, ReactDOM, Icon, ToastProvider, ConfirmProvider,
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

// ── Root App ──────────────────────────────────────────────────────────────
function App() {
  const [appState, setAppState] = useStateApp("checking"); // checking | loading | ready | unauthed
  const [currentUser, setCurrentUser] = useStateApp(null);
  const [data, setData] = useStateApp({
    // meters & transformers are intentionally empty — loaded on-demand via server-side search
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

  // ── Load app data after auth — no full meter/TR download ────────────────
  const loadAppData = useCallbackApp(async (supabaseUser) => {
    setAppState("loading");
    try {
      // Check profile first (fast single row)
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

      // Load lightweight data in parallel (profiles, audit, feeders list, dashboard stats)
      const [profilesRes, auditRes, feedersRes, statsRes] = await Promise.all([
        _supabase.from("profiles").select("*").order("created_at"),
        _supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(500),
        _supabase.rpc("get_feeders"),
        _supabase.rpc("get_dashboard_stats"),
      ]);

      const users     = (profilesRes.data || []).map(r => toProfile({ ...r, email: "" }));
      const auditLog  = (auditRes.data    || []).map(toAuditEntry);
      const feeders   = (feedersRes.data  || []).map(r => r.feeder).filter(Boolean);
      const dashStats = statsRes.data || {};

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

  // ── Auth state listener ─────────────────────────────────────────────────
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

  // ── addAudit — optimistic local update + Supabase persist ──────────────
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

  // ── Render states ───────────────────────────────────────────────────────
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
    { id: "search", icon: "search", label: "ค้นหา" },
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
          {route === "admin" && currentUser.role === "admin" && (
            <AdminPanel data={data} setData={setData} currentUser={currentUser} addAudit={addAudit} />
          )}
        </main>
      </div>
    </ConfirmProvider></ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
