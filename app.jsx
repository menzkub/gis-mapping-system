/* global React, ReactDOM, Icon, ToastProvider, ConfirmProvider, useToast, useConfirm,
   AuthScreen, SearchView, AdminPanel, TILE_LAYERS, formatThaiDate,
   _supabase, toProfile, toAuditEntry, useLang, LanguageProvider */
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
      <div style={{ textAlign: "center", color: "white", padding: "0 20px" }}>
        <img src="logo.svg" alt="PEA" style={{
          width: 96, height: 96, borderRadius: 28, margin: "0 auto 28px", display: "block",
          boxShadow: "0 20px 60px rgba(139,63,196,0.55)",
          animation: "pea-spin 1.4s linear infinite",
        }} />
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, letterSpacing: "-0.01em" }}>PEA Meter &amp; TR</div>
        <div style={{ fontSize: 15, opacity: 0.65 }}>{message}</div>
      </div>
      <style>{`@keyframes pea-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Profile helpers ───────────────────────────────────────────────────────
function activityLabel(a, t) {
  const m = {
    login: t("actLogin"), logout: t("actLogout"),
    change_password: t("actChangePassword"),
    search_meter: t("actSearchMeter"), search_tr: t("actSearchTr"),
    view_map: t("actViewMap"), create_user: t("actCreateUser"),
    update_meter: t("actUpdateMeter"), update_tr: t("actUpdateTr"),
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

// ── NotifPanel ────────────────────────────────────────────────────────────
function NotifPanel({ data, currentUser }) {
  const { t } = useLang();
  const pendingUsers = currentUser?.role === "admin"
    ? data.users.filter(u => u.status === "pending") : [];
  const recentLog = data.auditLog
    .filter(r => r.user === currentUser?.username)
    .slice(0, 7);

  return (
    <div style={{
      position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 2000,
      width: 300, background: "var(--surface)", borderRadius: 16,
      boxShadow: "0 20px 56px rgba(0,0,0,0.35)", border: "1px solid var(--line)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="bell" size={14} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>{t("notifications")}</span>
      </div>

      {pendingUsers.length > 0 && (
        <div style={{ padding: "10px 14px 12px", borderBottom: "1px solid var(--line)", background: "rgba(244,123,32,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--pea-orange-500)", marginBottom: 8 }}>
            <Icon name="warning" size={13} /> {pendingUsers.length} {t("pendingApproval")}
          </div>
          {pendingUsers.slice(0, 3).map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#f47b20,#6b2c91)", display: "grid", placeItems: "center", color: "white", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {(u.name || u.username || "?")[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>@{u.username}</div>
              </div>
            </div>
          ))}
          {pendingUsers.length > 3 && <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4 }}>{t("andMore")} {pendingUsers.length - 3} {t("people")}</div>}
        </div>
      )}

      {recentLog.length > 0 ? (
        <div style={{ padding: "8px 0", maxHeight: 220, overflowY: "auto" }}>
          <div style={{ padding: "2px 14px 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-mute)" }}>
            {t("recentActivity")}
          </div>
          {recentLog.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", fontSize: 12 }}>
              <span className={"badge " + activityBadge(r.action)} style={{ fontSize: 10, flexShrink: 0 }}>
                {activityLabel(r.action, t)}
              </span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, color: "var(--ink-mute)" }}>
                {r.user} · {r.at}
              </span>
            </div>
          ))}
        </div>
      ) : pendingUsers.length === 0 && (
        <div style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
          <div style={{ fontSize: 13, color: "var(--ink-mute)" }}>{t("noNotifications")}</div>
        </div>
      )}
    </div>
  );
}

// ── ProfileView ───────────────────────────────────────────────────────────
function ProfileView({ currentUser, data, addAudit }) {
  const { t } = useLang();
  const [tab, setTabPV]           = useStateApp("info");
  const [newPw, setNewPw]         = useStateApp("");
  const [confirmPw, setConfirmPw] = useStateApp("");
  const [showNewPw, setShowNewPw]         = useStateApp(false);
  const [showConfirmPw, setShowConfirmPw] = useStateApp(false);
  const [saving, setSaving]       = useStateApp(false);
  const [err, setErr]             = useStateApp(null);
  const [pwSuccess, setPwSuccess] = useStateApp(false);
  const [mfaStatus, setMfaStatus] = useStateApp(null); // null=loading | true=enrolled | false=not
  const toast = useToast();
  const confirm = useConfirm();

  useEffectApp(() => {
    _supabase.auth.mfa.listFactors().then(({ data: d }) => {
      setMfaStatus(d?.totp?.some(f => f.status === "verified") || false);
    });
  }, []);

  const checks = {
    length:  newPw.length >= 8,
    upper:   /[A-Z]/.test(newPw),
    lower:   /[a-z]/.test(newPw),
    number:  /[0-9]/.test(newPw),
    special: /[^A-Za-z0-9]/.test(newPw),
  };
  const strength = Object.values(checks).filter(Boolean).length;
  const sColors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
  const sLabels = ["", t("pwVeryWeak"), t("pwWeak"), t("pwFair"), t("pwStrong"), t("pwVeryStrong")];
  const confirmOk  = confirmPw.length > 0 && confirmPw === newPw;
  const confirmBad = confirmPw.length > 0 && confirmPw !== newPw;

  const changePassword = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!Object.values(checks).every(Boolean)) {
      setErr(t("pwCriteriaErr")); return;
    }
    if (newPw !== confirmPw) {
      setErr(t("pwNotMatchErr")); return;
    }
    const ok = await confirm({
      title: t("changePwTitle"),
      message: t("changePwConfirmMsg"),
      confirmText: t("changePwConfirmBtn"),
      cancelText: t("cancel"),
      tone: "primary",
    });
    if (!ok) return;
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
      toast?.(t("pwSuccessMsg"), "success");
      setPwSuccess(true);
      setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSuccess(false), 4000);
    }
  };


  return (
    <div className="pv-root" style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px", height: "100%", overflow: "auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div className="t-eyebrow" style={{ color: "var(--pea-orange-500)" }}>{t("myAccount")}</div>
        <div className="t-display" style={{ fontSize: 26 }}>{t("personalInfo")}</div>
      </div>

      <div className="tabs pv-tabs" style={{ marginBottom: 20 }}>
        {[
          { id: "info",     label: t("tabInfo"),     icon: "user" },
          { id: "password", label: t("tabPassword"),  icon: "lock" },
          { id: "activity", label: t("tabActivity"),  icon: "history" },
          { id: "search",   label: t("tabSearch"),    icon: "search" },
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
          <div className="pv-info-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {[
              { label: t("fFullName"),  value: currentUser.name },
              { label: t("fUsername"), value: "@" + currentUser.username },
              { label: t("fEmail"),    value: currentUser.email || "—" },
              { label: t("fRole"),     value: currentUser.role },
              { label: t("fStatus"),   value: currentUser.status === "active" ? t("statusActive") : currentUser.status },
              { label: t("fLastLogin"), value: currentUser.lastLogin || "—" },
              {
                label: t("f2FA"),
                value: currentUser.require_2fa
                  ? (mfaStatus === null ? "กำลังตรวจสอบ…"
                    : mfaStatus ? "🔒 เปิดใช้งานแล้ว"
                    : "⚠️ บังคับแต่ยังไม่ได้ตั้งค่า")
                  : (mfaStatus ? "🔒 เปิดใช้งาน (ไม่บังคับ)" : "ปิดอยู่"),
              },
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
            <div style={{ fontSize: 17, fontWeight: 700 }}>{t("changePwTitle")}</div>
            <div className="t-mute text-sm">{t("changePwSubtitle")}</div>
          </div>
          {pwSuccess && (
            <div className="badge badge-green fade-up" style={{ padding: "10px 14px", marginBottom: 16, width: "100%", display: "flex", gap: 8 }}>
              <Icon name="check" size={14} /> {t("pwSuccessMsg")}
            </div>
          )}
          <form className="f-col f-gap-4" onSubmit={changePassword}>
            <div className="field">
              <label className="field-label">{t("newPassword")}</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showNewPw ? "text" : "password"}
                  style={{ paddingLeft: 42, paddingRight: 44 }}
                  value={newPw} onChange={e => { setNewPw(e.target.value); setErr(null); }}
                  placeholder={t("pwPlaceholder")} autoComplete="new-password" />
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
                      { ok: checks.length,  label: t("pw8chars") },
                      { ok: checks.upper,   label: t("pwUpper") },
                      { ok: checks.lower,   label: t("pwLower") },
                      { ok: checks.number,  label: t("pwNumber") },
                      { ok: checks.special, label: t("pwSpecial") },
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
              <label className="field-label">{t("confirmPassword")}</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showConfirmPw ? "text" : "password"}
                  style={{ paddingLeft: 42, paddingRight: 44, borderColor: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : undefined }}
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder={t("confirmPlaceholder")} autoComplete="new-password" />
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
                  color: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : "var(--ink-mute)" }}>
                  <Icon name={confirmOk ? "check" : "lock"} size={18} />
                </div>
                <button type="button" onClick={() => setShowConfirmPw(s => !s)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", width: 32, height: 32 }}>
                  <Icon name={showConfirmPw ? "eyeOff" : "eye"} size={18} />
                </button>
              </div>
              {confirmBad && <div style={{ marginTop: 5, fontSize: 11, color: "var(--red)", fontWeight: 600 }}>{t("pwMismatch")}</div>}
              {confirmOk  && <div style={{ marginTop: 5, fontSize: 11, color: "#16a34a", fontWeight: 600 }}>{t("pwMatch")}</div>}
            </div>
            {err && <div className="badge badge-red" style={{ alignSelf: "flex-start", padding: "8px 12px" }}><Icon name="close" size={14} />{err}</div>}
            <button type="submit" className="btn btn-primary" style={{ height: 48 }} disabled={saving}>
              {saving ? t("saving") : <><Icon name="check" size={14} /> {t("savePasswordBtn")}</>}
            </button>
          </form>
        </div>
      )}

      {/* ── Activity (login/logout/password/2FA) ── */}
      {tab === "activity" && (() => {
        const USAGE_ACTIONS = ["login", "logout", "change_password", "enable_2fa", "disable_2fa"];
        const rows = data.auditLog.filter(r =>
          (currentUser.role === "admin" || r.user === currentUser.username) &&
          USAGE_ACTIONS.includes(r.action)
        );
        return (
          <div className="card card-elev fade-up">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>
                {t("actHistoryTitle")} ({rows.length})
                {currentUser.role === "admin" && <span className="badge badge-orange" style={{ marginLeft: 8, fontSize: 11 }}>{t("allUsers")}</span>}
              </div>
              <div className="t-mute text-sm">{t("actHistorySubtitle")}</div>
            </div>
            {rows.length === 0 ? (
              <div className="t-mute text-sm" style={{ padding: "20px 0" }}>{t("noHistory")}</div>
            ) : (
              <div style={{ overflow: "auto", maxHeight: "58vh" }}>
                <table className="table pv-dt">
                  <thead><tr>
                    <th>{t("colTime")}</th>
                    {currentUser.role === "admin" && <th>{t("colUser")}</th>}
                    <th>{t("colAction")}</th>
                    <th>{t("colDetail")}</th>
                    <th>{t("colDevice")}</th>
                  </tr></thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id}>
                        <td className="mono text-xs" style={{ whiteSpace: "nowrap" }}>{r.at}</td>
                        {currentUser.role === "admin" && <td className="mono text-sm">@{r.user}</td>}
                        <td><span className={"badge " + activityBadge(r.action)}>{activityLabel(r.action, t)}</span></td>
                        <td className="text-sm">{r.detail}</td>
                        <td className="text-xs t-mute" title={r.ip}>{r.ip ? parseDevice(r.ip) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pv-cards">
                  {rows.map(r => (
                    <div key={r.id} className="pv-card-row">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                        <span className={"badge " + activityBadge(r.action)} style={{ fontSize: 11 }}>{activityLabel(r.action, t)}</span>
                        <span className="mono t-mute" style={{ fontSize: 11 }}>{r.at}</span>
                      </div>
                      {currentUser.role === "admin" && <div className="text-xs t-mute" style={{ marginBottom: 3 }}>@{r.user}</div>}
                      <div className="text-sm fw-6">{r.detail}</div>
                      {r.ip && <div className="text-xs t-mute" style={{ marginTop: 4 }}>{parseDevice(r.ip)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Search History ── */}
      {tab === "search" && (() => {
        const SEARCH_ACTIONS = ["search_meter", "search_tr", "view_map"];
        const rows = data.auditLog.filter(r =>
          (currentUser.role === "admin" || r.user === currentUser.username) &&
          SEARCH_ACTIONS.includes(r.action)
        );
        return (
          <div className="card card-elev fade-up">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>
                {t("searchHistoryTitle")} ({rows.length})
                {currentUser.role === "admin" && <span className="badge badge-orange" style={{ marginLeft: 8, fontSize: 11 }}>{t("allUsers")}</span>}
              </div>
              <div className="t-mute text-sm">{t("searchHistorySubtitle")}</div>
            </div>
            {rows.length === 0 ? (
              <div className="t-mute text-sm" style={{ padding: "20px 0" }}>{t("noSearchHistory")}</div>
            ) : (
              <div style={{ overflow: "auto", maxHeight: "58vh" }}>
                <table className="table pv-dt">
                  <thead><tr>
                    <th>{t("colTime")}</th>
                    {currentUser.role === "admin" && <th>{t("colUser")}</th>}
                    <th>{t("colType")}</th>
                    <th>{t("colQuery")}</th>
                    <th>{t("colDetail")}</th>
                  </tr></thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id}>
                        <td className="mono text-xs" style={{ whiteSpace: "nowrap" }}>{r.at}</td>
                        {currentUser.role === "admin" && <td className="mono text-sm">@{r.user}</td>}
                        <td><span className={"badge " + activityBadge(r.action)}>{activityLabel(r.action, t)}</span></td>
                        <td className="mono text-sm">{r.target}</td>
                        <td className="text-sm">{r.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pv-cards">
                  {rows.map(r => (
                    <div key={r.id} className="pv-card-row">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                        <span className={"badge " + activityBadge(r.action)} style={{ fontSize: 11 }}>{activityLabel(r.action, t)}</span>
                        <span className="mono t-mute" style={{ fontSize: 11 }}>{r.at}</span>
                      </div>
                      {currentUser.role === "admin" && <div className="text-xs t-mute" style={{ marginBottom: 3 }}>@{r.user}</div>}
                      <div className="text-sm fw-6 mono">{r.target}</div>
                      <div className="text-sm t-mute">{r.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <style>{`
        .pv-tabs { flex-wrap: nowrap !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .pv-tabs::-webkit-scrollbar { display: none; }
        .pv-dt { display: table; }
        .pv-cards { display: none; }
        .pv-card-row { padding: 12px 0; border-bottom: 1px solid var(--line); }
        .pv-card-row:last-child { border-bottom: none; }
        @media (max-width: 680px) {
          .pv-root { padding: 16px 14px !important; }
          .pv-tabs .tab { font-size: 12px !important; padding: 0 10px !important; height: 34px !important; white-space: nowrap; }
          .pv-info-grid { grid-template-columns: 1fr !important; }
          .pv-dt { display: none !important; }
          .pv-cards { display: block !important; }
        }
      `}</style>
    </div>
  );
}

// ── MFASetupScreen ────────────────────────────────────────────────────────
function MFASetupScreen({ currentUser, onComplete, onCancel }) {
  const { useState: useStateMFAS, useEffect: useEffectMFAS } = React;
  const [step, setStep]       = useStateMFAS("loading"); // loading | scan | error
  const [factorId, setFactorId] = useStateMFAS("");
  const [qrSvg, setQrSvg]     = useStateMFAS("");
  const [secret, setSecret]   = useStateMFAS("");
  const [code, setCode]       = useStateMFAS("");
  const [err, setErr]         = useStateMFAS(null);
  const [busy, setBusy]       = useStateMFAS(false);

  useEffectMFAS(() => {
    (async () => {
      // Unenroll any pending (unverified) factors first to avoid conflict
      const { data: existing } = await _supabase.auth.mfa.listFactors();
      for (const f of (existing?.all || [])) {
        await _supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {});
      }
      const { data, error } = await _supabase.auth.mfa.enroll({
        factorType: "totp", friendlyName: `totp-${Date.now()}`,
      });
      if (error) { setErr(error.message); setStep("error"); return; }
      setFactorId(data.id);
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep("scan");
    })();
  }, []);

  const verify = async (e) => {
    e?.preventDefault();
    if (code.length !== 6) { setErr("กรุณากรอก 6 หลัก"); return; }
    setBusy(true); setErr(null);
    try {
      const { data: ch, error: chErr } = await _supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await _supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
      if (vErr) throw new Error("รหัสไม่ถูกต้อง กรุณาลองใหม่");
      // cleanup old factors now that we're at AAL2
      const { data: all } = await _supabase.auth.mfa.listFactors();
      for (const f of (all?.all || [])) {
        if (f.id !== factorId) await _supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {});
      }
      onComplete();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center",
      background: "radial-gradient(120% 100% at 0% 0%, #8b3fc4 0%, #321148 60%, #1b0926 100%)" }}>
      <div className="fade-up" style={{ width: "100%", maxWidth: 460, margin: "0 20px",
        background: "var(--surface)", borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", display: "grid", placeItems: "center",
            boxShadow: "0 8px 24px rgba(107,44,145,0.4)" }}>
            <Icon name="lock" size={22} stroke={2} style={{ color: "white" }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>ตั้งค่า 2-Factor Auth</div>
            <div className="t-mute text-sm">บัญชี <b>{currentUser.username}</b> ต้องเปิดใช้งาน 2FA</div>
          </div>
        </div>

        <div style={{ padding: "24px 28px 28px" }}>
          {step === "loading" && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-mute)" }}>
              <div style={{ width: 32, height: 32, margin: "0 auto 12px", borderRadius: "50%",
                border: "3px solid var(--line)", borderTopColor: "var(--pea-purple-500)",
                animation: "pea-spin 0.8s linear infinite" }} />
              กำลังสร้าง QR Code…
            </div>
          )}

          {step === "scan" && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>ขั้นตอนที่ 1 — สแกน QR Code</div>
                <div className="t-mute text-sm">เปิดแอป Authenticator เช่น Google Authenticator หรือ Authy แล้วสแกนรหัสด้านล่าง</div>
              </div>
              <div style={{ background: "white", padding: 14, borderRadius: 12,
                display: "inline-block", marginBottom: 14, border: "1px solid var(--line)" }}
                dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <div style={{ marginBottom: 20 }}>
                <div className="t-mute text-xs" style={{ marginBottom: 4 }}>หรือกรอก Secret Key ด้วยตนเอง</div>
                <code style={{ fontFamily: "monospace", fontSize: 11, background: "var(--surface-2)",
                  padding: "6px 10px", borderRadius: 6, display: "block", wordBreak: "break-all",
                  letterSpacing: "0.12em", color: "var(--pea-purple-600)" }}>{secret}</code>
              </div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>ขั้นตอนที่ 2 — กรอกรหัส 6 หลักเพื่อยืนยัน</div>
              <form onSubmit={verify} className="f-col f-gap-3">
                <input className="input"
                  style={{ fontSize: 26, letterSpacing: "0.5em", textAlign: "center", fontWeight: 700, height: 58 }}
                  maxLength={6} inputMode="numeric" autoComplete="one-time-code"
                  placeholder="000000" value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setErr(null); }}
                  autoFocus />
                {err && <div className="badge badge-red" style={{ padding: "8px 12px" }}><Icon name="close" size={14} />{err}</div>}
                <button type="submit" className="btn btn-primary" style={{ height: 50 }}
                  disabled={busy || code.length !== 6}>
                  {busy ? "กำลังยืนยัน…" : <><Icon name="check" size={14} /> ยืนยัน &amp; เปิดใช้งาน 2FA</>}
                </button>
              </form>
            </div>
          )}

          {step === "error" && (
            <div className="badge badge-red" style={{ padding: "10px 14px", marginBottom: 16 }}>
              <Icon name="close" size={14} /> {err}
            </div>
          )}

          <button onClick={onCancel} style={{ marginTop: 16, width: "100%", padding: 10,
            textAlign: "center", color: "var(--ink-mute)", fontSize: 13, background: "none" }}>
            ออกจากระบบแทน
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MFAVerifyScreen ───────────────────────────────────────────────────────
function MFAVerifyScreen({ currentUser, onComplete, onCancel }) {
  const { useState: useStateMFAV, useEffect: useEffectMFAV } = React;
  const [factorId, setFactorId] = useStateMFAV("");
  const [code, setCode]         = useStateMFAV("");
  const [err, setErr]           = useStateMFAV(null);
  const [busy, setBusy]         = useStateMFAV(false);

  useEffectMFAV(() => {
    _supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.find(f => f.status === "verified");
      if (totp) setFactorId(totp.id);
    });
  }, []);

  const verify = async (e) => {
    e?.preventDefault();
    if (!factorId) { setErr("ไม่พบ 2FA ที่ตั้งค่าไว้ กรุณาติดต่อ Admin"); return; }
    setBusy(true); setErr(null);
    try {
      const { data: ch, error: chErr } = await _supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await _supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
      if (vErr) throw new Error("รหัสไม่ถูกต้อง กรุณาลองใหม่");
      onComplete();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center",
      background: "radial-gradient(120% 100% at 0% 0%, #8b3fc4 0%, #321148 60%, #1b0926 100%)" }}>
      <div className="fade-up" style={{ width: "100%", maxWidth: 400, margin: "0 20px",
        background: "var(--surface)", borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", display: "grid", placeItems: "center",
              boxShadow: "0 8px 24px rgba(107,44,145,0.4)" }}>
              <Icon name="lock" size={24} stroke={2} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>ยืนยัน 2FA</div>
              <div className="t-mute text-sm">สวัสดี, <b>{currentUser.name}</b></div>
            </div>
          </div>
          <div className="t-mute text-sm" style={{ marginBottom: 20, lineHeight: 1.6 }}>
            เปิดแอป Authenticator แล้วกรอกรหัส 6 หลักของบัญชีนี้
          </div>
          <form onSubmit={verify} className="f-col f-gap-3">
            <input className="input"
              style={{ fontSize: 30, letterSpacing: "0.65em", textAlign: "center", fontWeight: 700, height: 68 }}
              maxLength={6} inputMode="numeric" autoComplete="one-time-code"
              placeholder="000000" value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setErr(null); }}
              autoFocus />
            {err && <div className="badge badge-red" style={{ padding: "8px 12px" }}><Icon name="close" size={14} />{err}</div>}
            <button type="submit" className="btn btn-primary" style={{ height: 52, fontSize: 15 }}
              disabled={busy || code.length !== 6}>
              {busy ? "กำลังยืนยัน…" : <><Icon name="check" size={14} /> ยืนยัน</>}
            </button>
          </form>
          <button onClick={onCancel} style={{ marginTop: 16, width: "100%", padding: 10,
            textAlign: "center", color: "var(--ink-mute)", fontSize: 13, background: "none" }}>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MaintenanceScreen ─────────────────────────────────────────────────────
const DEFAULT_MAINTENANCE_MSG = "ผู้ดูแลระบบกำลังดำเนินการปรับปรุงระบบ\nกรุณากลับมาใหม่ภายหลัง หากมีข้อสงสัยกรุณาติดต่อผู้ดูแลระบบ";

function formatUntil(until) {
  if (!until) return null;
  try {
    const d = new Date(until);
    if (isNaN(d)) return null;
    return d.toLocaleString("th-TH", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return null; }
}

/* ============================================================
   UserGuide — role-aware manual (user sees user sections, admin sees all)
   ============================================================ */
function UGSection({ icon, title, badge, children }) {
  const [open, setOpen] = useStateApp(false);
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

function UGStep({ n, text }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
      <span style={{ minWidth: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#6b2c91,#f47b20)", color: "white", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>{n}</span>
      <span style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>{text}</span>
    </div>
  );
}

function UGTip({ children }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(244,123,32,0.08)", border: "1px solid rgba(244,123,32,0.2)", marginTop: 10 }}>
      <Icon name="tip" size={15} style={{ color: "var(--pea-orange-500)", flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function UGNote({ children }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(139,63,196,0.07)", border: "1px solid rgba(139,63,196,0.18)", marginTop: 10 }}>
      <Icon name="info" size={15} style={{ color: "var(--pea-purple-500)", flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function UGTable({ rows }) {
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

function UserGuide({ role }) {
  const isAdmin = role === "admin";
  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px 40px" }}>
        {/* Hero */}
        <div style={{ borderRadius: 20, background: "linear-gradient(135deg,#6b2c91 0%,#8b3fc4 55%,#f47b20 130%)", color: "white", padding: "24px 28px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name="book" size={26} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>คู่มือการใช้งาน</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>GIS Meter & Transformer</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
                {isAdmin ? "สำหรับผู้ดูแลระบบ — ครอบคลุมทุก Feature" : "สำหรับผู้ใช้งานทั่วไป"}
              </div>
            </div>
          </div>
        </div>

        {/* ─── เข้าสู่ระบบ ─── */}
        <UGSection icon="lock" title="การเข้าสู่ระบบ & สมัครสมาชิก">
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>สมัครสมาชิก</div>
            <UGStep n={1} text="คลิก 'สมัครสมาชิก' บนหน้า Login" />
            <UGStep n={2} text="กรอกชื่อ-นามสกุล, ชื่อผู้ใช้, อีเมล, และรหัสผ่าน (ต้องมีตัวพิมพ์ใหญ่ + ตัวเลข + อักขระพิเศษ)" />
            <UGStep n={3} text="กด 'สมัครสมาชิก' — บัญชีจะอยู่ในสถานะ 'รออนุมัติ' จนกว่า Admin จะอนุมัติ" />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>เข้าสู่ระบบ</div>
            <UGStep n={1} text="กรอกอีเมลและรหัสผ่าน แล้วกด 'เข้าสู่ระบบ'" />
            <UGStep n={2} text="หากเปิด 2FA ไว้ — ระบบจะขอรหัส 6 หลักจาก Authenticator App" />
            <UGStep n={3} text="ติ๊ก 'จดจำฉันไว้ 7 วัน' เพื่อไม่ต้องล็อกอินบ่อย" />
            <UGTip>ลืมรหัสผ่าน? กดลิงก์ 'ลืมรหัสผ่าน' ระบบจะส่ง link รีเซ็ตไปยังอีเมล</UGTip>
            <UGNote>ระบบออกจากระบบอัตโนมัติหลังไม่ใช้งาน 30 นาที</UGNote>
          </div>
        </UGSection>

        {/* ─── ค้นหา ─── */}
        <UGSection icon="search" title="ค้นหาข้อมูล Meter / Transformer">
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>ค้นหา PEA มิเตอร์</div>
            <UGStep n={1} text="เลือกแท็บ 'PEA Meter' ในหน้าค้นหา" />
            <UGStep n={2} text="พิมพ์คำค้นหา: TAG, PEANO, ACCOUNTNUM, หรือ Feeder ID — ระบบค้นหาอัตโนมัติ" />
            <UGStep n={3} text="กรองเพิ่มเติม: เลือก Feeder, เจ้าของ (PEA/Customer), หรือ CODE" />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>ค้นหา PEA หม้อแปลง</div>
            <UGStep n={1} text="เลือกแท็บ 'PEA Transformer'" />
            <UGStep n={2} text="พิมพ์คำค้นหา: TAG, PEANO, สถานที่, หรือ Feeder" />
            <UGStep n={3} text="กรองเพิ่มเติม: ระบบเฟส, แรงดัน (22/33 kV), kVA ต่ำสุด-สูงสุด" />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Export ผลการค้นหา</div>
            <UGStep n={1} text="กดปุ่ม 'Export' — Dialog แสดงจำนวนรายการที่จะส่งออก" />
            <UGStep n={2} text="กด 'Export' อีกครั้งเพื่อดาวน์โหลดเป็นไฟล์ CSV" />
            <UGTip>ผลลัพธ์ถูกจำกัดสูงสุด 500 รายการ — พิมพ์คำค้นหาเพิ่มเพื่อลดจำนวน</UGTip>
          </div>
        </UGSection>

        {/* ─── แผนที่ ─── */}
        <UGSection icon="map" title="แผนที่และการนำทาง GPS">
          <div style={{ marginTop: 12 }}>
            <UGTable rows={[
              ["ฟีเจอร์", "วิธีใช้"],
              ["สลับ Street/Satellite", "กดปุ่ม Street หรือ Satellite บน Topbar"],
              ["Cluster", "กดปุ่ม Cluster บนแผนที่ — รวมกลุ่ม marker"],
              ["Heatmap", "กดปุ่ม Heatmap — แสดงความหนาแน่นพื้นที่"],
              ["Split View", "กดปุ่ม Split — ตารางและแผนที่อยู่คู่กัน"],
              ["คัดลอกพิกัด", "คลิก marker → กดปุ่ม Copy lat/lng"],
            ]} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>นำทาง GPS</div>
            <UGStep n={1} text="คลิก marker บนแผนที่ หรือกดปุ่มนำทางในตาราง" />
            <UGStep n={2} text="ระบบขอสิทธิ์ตำแหน่งปัจจุบัน — กด 'Allow'" />
            <UGStep n={3} text="ระบบคำนวณระยะทางและเวลาโดยประมาณ" />
            <UGStep n={4} text="กด 'นำทาง' เพื่อเปิด Google Maps หรือ Apple Maps" />
          </div>
        </UGSection>

        {/* ─── โปรไฟล์ ─── */}
        <UGSection icon="user" title="โปรไฟล์ & ความปลอดภัยส่วนตัว">
          <div style={{ marginTop: 12 }}>
            <UGTable rows={[
              ["แท็บ", "รายละเอียด"],
              ["ข้อมูล", "ดูและแก้ไขชื่อ, ชื่อผู้ใช้, อีเมล, บทบาท"],
              ["รหัสผ่าน", "เปลี่ยนรหัสผ่าน + เปิด/ปิด 2FA"],
              ["การใช้งาน", "ประวัติ login/logout พร้อม device info"],
              ["การค้นหา", "ประวัติค้นหา Meter/TR พร้อม timestamp"],
            ]} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>เปิด 2FA (TOTP)</div>
            <UGStep n={1} text="ไปที่โปรไฟล์ → แท็บ 'รหัสผ่าน' → กด 'เปิดใช้ 2FA'" />
            <UGStep n={2} text="สแกน QR Code ด้วย Google Authenticator หรือ Authy" />
            <UGStep n={3} text="กรอกรหัส 6 หลักเพื่อยืนยัน" />
            <UGTip>แนะนำให้เปิด 2FA เสมอเพื่อความปลอดภัยของบัญชี</UGTip>
          </div>
        </UGSection>

        {/* ─── UI ─── */}
        <UGSection icon="sun" title="การตั้งค่า UI">
          <div style={{ marginTop: 12 }}>
            <UGTable rows={[
              ["ปุ่ม", "ตำแหน่ง", "ฟังก์ชัน"],
              ["🌙 / ☀️", "Topbar ขวา", "สลับโหมดมืด/สว่าง (จำค่าไว้)"],
              ["TH / EN", "Topbar ขวา", "สลับภาษาไทย/อังกฤษ"],
              ["🔄 Refresh", "Topbar ขวา", "โหลดข้อมูลใหม่"],
            ]} />
          </div>
        </UGSection>

        {/* ─── Admin-only sections ─── */}
        {isAdmin && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 14px" }}>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              <span className="badge badge-orange" style={{ fontSize: 12, padding: "4px 12px" }}>Admin เท่านั้น</span>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>

            <UGSection icon="dashboard" title="Dashboard" badge="admin">
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  ["การ์ด", "ข้อมูลที่แสดง"],
                  ["มิเตอร์ทั้งหมด", "จำนวน PEA Meter ในระบบ"],
                  ["หม้อแปลงทั้งหมด", "จำนวน PEA Transformer ในระบบ"],
                  ["กำลัง (kVA)", "ผลรวม kVA ของหม้อแปลงทั้งหมด"],
                  ["ผู้ใช้งาน", "จำนวน user ทั้งหมด (active + pending)"],
                ]} />
                <UGNote>กด Refresh บน Topbar เพื่ออัปเดตข้อมูล Dashboard</UGNote>
              </div>
            </UGSection>

            <UGSection icon="users" title="จัดการผู้ใช้งาน" badge="admin">
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  ["Action", "ผลลัพธ์"],
                  ["อนุมัติ", "pending → active (ผู้ใช้เข้าระบบได้)"],
                  ["ระงับ", "→ banned (เข้าระบบไม่ได้)"],
                  ["ปลดระงับ", "banned → active"],
                  ["เปลี่ยน Role", "สลับ user ↔ admin"],
                  ["บังคับ 2FA", "เปิด/ปิด 2FA ทันที"],
                ]} />
                <UGTip>มี pending user — ระบบแสดง badge แดงที่ปุ่ม Bell บน Topbar</UGTip>
              </div>
            </UGSection>

            <UGSection icon="meter" title="จัดการ PEA มิเตอร์ & หม้อแปลง" badge="admin">
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  ["Action", "วิธีใช้"],
                  ["ค้นหา", "พิมพ์ในช่อง search — โหลดสูงสุด 100 รายการแรก"],
                  ["เพิ่ม", "กด '+เพิ่ม' → กรอกข้อมูล → บันทึก"],
                  ["แก้ไข", "กดปุ่มดินสอในแถว → แก้ไข → บันทึก"],
                  ["ลบ", "กดถังขยะ → ยืนยันใน Confirm Dialog"],
                  ["Export CSV", "กด Export → Dialog แสดงจำนวน → กด Export"],
                ]} />
                <UGNote>ทุกการเปลี่ยนแปลงถูกบันทึกใน Audit Log อัตโนมัติ</UGNote>
              </div>
            </UGSection>

            <UGSection icon="upload" title="นำเข้าข้อมูล CSV" badge="admin">
              <div style={{ marginTop: 12 }}>
                <UGStep n={1} text="เลือกประเภท: PEA Meter หรือ PEA Transformer" />
                <UGStep n={2} text="ลากหรือคลิกเพื่ออัปโหลดไฟล์ CSV (UTF-8)" />
                <UGStep n={3} text="ตรวจสอบ Preview 10 แถวแรก — ตรวจสอบหัวคอลัมน์" />
                <UGStep n={4} text="กด 'นำเข้าข้อมูล' — ระบบ upsert ตาม OBJECTID (500 rows/รอบ)" />
                <UGTip>ถ้า OBJECTID ซ้ำ ระบบจะ update ข้อมูลเดิม ไม่สร้างรายการใหม่</UGTip>
              </div>
            </UGSection>

            <UGSection icon="history" title="Audit Log" badge="admin">
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  ["Action ที่บันทึก", "ตัวอย่าง"],
                  ["login / logout", "เข้า-ออกระบบ"],
                  ["search_meter / search_tr", "ค้นหาข้อมูล"],
                  ["create / update / delete", "เพิ่ม แก้ไข ลบ Meter/TR"],
                  ["import_csv / export_csv", "นำเข้า/ส่งออกข้อมูล"],
                  ["approve_user / ban_user", "อนุมัติ/ระงับผู้ใช้งาน"],
                ]} />
                <UGNote>Audit Log แบ่งหน้า 50 รายการต่อหน้า — กรองตาม user, action, วันที่ได้</UGNote>
              </div>
            </UGSection>

            <UGSection icon="settings" title="ตั้งค่าระบบ" badge="admin">
              <div style={{ marginTop: 12 }}>
                <UGStep n={1} text="เปิด Toggle 'Maintenance Mode' — ผู้ใช้ทั่วไปจะเห็นหน้าปิดปรับปรุง" />
                <UGStep n={2} text="แก้ไขข้อความแจ้งผู้ใช้ แล้วกด 'บันทึกข้อความ'" />
                <UGStep n={3} text="ตั้งวันเวลาที่คาดว่าจะกลับมา แล้วกด 'บันทึกวันเวลา'" />
                <UGNote>Admin ยังคงเข้าใช้ระบบได้ปกติในช่วง Maintenance Mode</UGNote>
                <UGTip>อย่าลืมปิด Maintenance Mode หลังงานเสร็จ</UGTip>
              </div>
            </UGSection>
          </>
        )}
      </div>
    </div>
  );
}

function MaintenanceScreen({ currentUser, message, until, onLogout }) {
  const displayMsg = (message || "").trim() || DEFAULT_MAINTENANCE_MSG;
  const untilStr = formatUntil(until);
  const initials = (currentUser?.name || currentUser?.username || "?")[0].toUpperCase();
  const firstName = (currentUser?.name || currentUser?.username || "").split(" ")[0];

  return (
    <div style={{
      height: "100vh", display: "grid", placeItems: "center",
      background: "radial-gradient(120% 100% at 0% 0%, #8b3fc4 0%, #321148 60%, #1b0926 100%)",
      padding: "0 16px",
    }}>
      <div className="fade-up" style={{
        width: "100%", maxWidth: 500,
        background: "var(--surface)", borderRadius: 24,
        boxShadow: "0 28px 72px rgba(0,0,0,0.55)", overflow: "hidden",
      }}>

        {/* Orange header — title left, user right */}
        <div style={{
          background: "linear-gradient(135deg,#f47b20 0%,#e85d04 60%,#c94e00 100%)",
          padding: "22px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          position: "relative", overflow: "hidden",
        }}>
          {/* decorative circle */}
          <div style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />

          {/* Left: icon + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center",
            }}>
              <Icon name="settings" size={24} stroke={2} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "white", lineHeight: 1.2 }}>ระบบปิดปรับปรุง</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>System Maintenance</div>
            </div>
          </div>

          {/* Right: user avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, position: "relative" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>สวัสดี</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>{firstName}</div>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.5)",
              display: "grid", placeItems: "center",
              fontWeight: 800, fontSize: 16, color: "white",
            }}>
              {initials}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px 28px" }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>ขณะนี้ระบบปิดให้บริการชั่วคราว</div>
          <div className="t-mute" style={{ fontSize: 14, lineHeight: 1.75, marginBottom: 20, whiteSpace: "pre-line" }}>
            {displayMsg}
          </div>

          {untilStr && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 12, marginBottom: 16,
              background: "rgba(107,44,145,0.12)", border: "1px solid rgba(107,44,145,0.25)",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name="clock" size={15} style={{ color: "white" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>คาดว่าจะกลับมาให้บริการ</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{untilStr}</div>
              </div>
            </div>
          )}

          <button className="btn btn-outline" style={{ width: "100%", height: 46 }} onClick={onLogout}>
            <Icon name="logout" size={14} /> ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────
function App() {
  const { t, lang, setLang } = useLang();
  const [appState, setAppState] = useStateApp("checking");
  const [currentUser, setCurrentUser] = useStateApp(null);
  const [pendingUser, setPendingUser] = useStateApp(null);
  const [data, setData] = useStateApp({
    meters: [], transformers: [],
    users: [], auditLog: [], feeders: [],
    dashStats: {},
  });
  const [route, setRoute] = useStateApp("search");
  const [theme, setTheme] = useStateApp(() => localStorage.getItem("pea_theme") || "light");
  const [baseMap, setBaseMap] = useStateApp(() => {
    const saved = localStorage.getItem("pea_base") || "satellite";
    return saved === "dark" ? "satellite" : saved;
  });
  const [maintenanceMode, setMaintenanceMode] = useStateApp(false);
  const [maintenanceMessage, setMaintenanceMessage] = useStateApp("");
  const [maintenanceUntil, setMaintenanceUntil] = useStateApp("");
  const [showNotif, setShowNotif] = useStateApp(false);
  const [refreshing, setRefreshing] = useStateApp(false);
  const [refreshMsg, setRefreshMsg] = useStateApp(null); // null | "loading" | "done" | "error"
  const [adminTab, setAdminTab] = useStateApp("dashboard");
  const [showLogoutConfirm, setShowLogoutConfirm] = useStateApp(false);

  useEffectApp(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("pea_theme", theme);
  }, [theme]);
  useEffectApp(() => { localStorage.setItem("pea_base", baseMap); }, [baseMap]);

  // ── Load app data after auth ─────────────────────────────────────────────
  const loadAppData = useCallbackApp(async (supabaseUser, logLogin = false) => {
    setAppState("loading");
    try {
      const [myProfileRes, settingsRes] = await Promise.all([
        _supabase.from("profiles").select("*").eq("id", supabaseUser.id).single(),
        _supabase.from("settings").select("key,value"),
      ]);

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

      // ── Maintenance mode check ────────────────────────────────────────────
      const settingsMap = Object.fromEntries((settingsRes.data || []).map(r => [r.key, r.value]));
      const isMaintenance = settingsMap["maintenance_mode"] === "true";
      setMaintenanceMode(isMaintenance);
      setMaintenanceMessage(settingsMap["maintenance_message"] || "");
      setMaintenanceUntil(settingsMap["maintenance_until"] || "");
      if (isMaintenance && myProfile.role !== "admin") {
        setCurrentUser(toProfile({ ...myProfile, email: supabaseUser.email }));
        setAppState("maintenance");
        return;
      }

      // ── 2FA check ────────────────────────────────────────────────────────
      if (myProfile.require_2fa) {
        const { data: aal } = await _supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel !== "aal2") {
          setPendingUser(supabaseUser);
          setCurrentUser(toProfile({ ...myProfile, email: supabaseUser.email }));
          setAppState(aal?.nextLevel === "aal2" ? "mfa_verify" : "mfa_setup");
          return;
        }
      }
      // ── end 2FA check ────────────────────────────────────────────────────

      const [profilesRes, auditRes, feedersRes, statsRes] = await Promise.all([
        _supabase.from("profiles").select("*").order("created_at"),
        _supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(500),
        _supabase.rpc("get_feeders"),
        _supabase.rpc("get_dashboard_stats"),
      ]);

      const users     = (profilesRes.data || []).map(r => toProfile({ ...r, email: "" }));
      const feeders   = (feedersRes.data  || []).map(r => r.feeder).filter(Boolean);
      const dashStats = statsRes.data || {};

      let auditLog = (auditRes.data || []).map(toAuditEntry);
      if (logLogin) {
        const deviceInfo = (navigator.userAgent || "").substring(0, 200);
        const { data: loginRow } = await _supabase.from("audit_log").insert({
          user_id:  supabaseUser.id,
          username: myProfile.username || "",
          action:   "login",
          target:   "—",
          detail:   "เข้าสู่ระบบ",
          ip:       deviceInfo,
        }).select().single();
        if (loginRow) auditLog = [toAuditEntry(loginRow), ...auditLog].slice(0, 500);
      }

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
        loadAppData(session.user, false); // session restore — ไม่ log login ซ้ำ
      } else {
        setAppState("unauthed");
      }
    });

    const { data: { subscription } } = _supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        loadAppData(session.user, true); // login จริง — log ได้
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
      ip:       entry.ip        || (navigator.userAgent || "").substring(0, 200),
    };
    const { data: inserted, error } = await _supabase.from("audit_log").insert(row).select().single();
    if (error) {
      console.warn("[Audit] insert failed:", error.message, row);
      // still update local state optimistically so ProfileView shows it
      const fake = { id: String(Date.now()), at: new Date().toISOString().replace("T"," ").slice(0,19),
        user: row.username, action: row.action, target: row.target, detail: row.detail, ip: row.ip };
      setData(d => ({ ...d, auditLog: [fake, ...d.auditLog].slice(0, 500) }));
      return;
    }
    if (inserted) {
      setData(d => ({
        ...d,
        auditLog: [toAuditEntry(inserted), ...d.auditLog].slice(0, 500),
      }));
    }
  }, [currentUser]);

  const doLogout = useCallbackApp(async () => {
    setShowLogoutConfirm(false);
    await addAudit({ user: currentUser.username, action: "logout", target: "—", detail: "ออกจากระบบ" });
    await _supabase.auth.signOut();
  }, [currentUser, addAudit]);

  const handleRefresh = useCallbackApp(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMsg("loading");
    try {
      const [profilesRes, auditRes, statsRes] = await Promise.all([
        _supabase.from("profiles").select("*").order("created_at"),
        _supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(500),
        _supabase.rpc("get_dashboard_stats"),
      ]);
      setData(d => ({
        ...d,
        users:    (profilesRes.data || []).map(toProfile),
        auditLog: (auditRes.data   || []).map(toAuditEntry),
        dashStats: statsRes.data?.[0] || d.dashStats,
      }));
      setRefreshMsg("done");
      setTimeout(() => setRefreshMsg(null), 2500);
    } catch {
      setRefreshMsg("error");
      setTimeout(() => setRefreshMsg(null), 2500);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  // ── Render states ────────────────────────────────────────────────────────
  if (appState === "checking") return <LoadingScreen message="กำลังตรวจสอบการเข้าสู่ระบบ…" />;
  if (appState === "loading")  return <LoadingScreen message="กำลังโหลดข้อมูล…" />;

  if (appState === "maintenance") return (
    <MaintenanceScreen
      currentUser={currentUser}
      message={maintenanceMessage}
      until={maintenanceUntil}
      onLogout={async () => { await _supabase.auth.signOut(); }}
    />
  );

  if (appState === "unauthed" || !currentUser) {
    return (
      <ToastProvider><ConfirmProvider>
        <AuthScreen initialError={window.__peaAuthErr || null} />
      </ConfirmProvider></ToastProvider>
    );
  }

  if (appState === "mfa_setup") return (
    <MFASetupScreen
      currentUser={currentUser}
      onComplete={() => loadAppData(pendingUser, false)}
      onCancel={async () => { await _supabase.auth.signOut(); }}
    />
  );

  if (appState === "mfa_verify") return (
    <MFAVerifyScreen
      currentUser={currentUser}
      onComplete={() => loadAppData(pendingUser, false)}
      onCancel={async () => { await _supabase.auth.signOut(); }}
    />
  );

  const navItems = [
    { id: "search",  icon: "search",   label: t("navSearch")  },
    { id: "profile", icon: "user",     label: t("navProfile") },
    { id: "guide",   icon: "book",     label: t("navGuide")   },
    ...(currentUser.role === "admin" ? [{ id: "admin", icon: "settings", label: t("navAdmin") }] : []),
  ];
  const ADMIN_NAV = [
    { id: "dashboard", icon: "dashboard", label: t("admDashboard") },
    { id: "users",     icon: "users",     label: t("admUsers")     },
    { id: "meters",    icon: "meter",     label: t("admMeters")    },
    { id: "trs",       icon: "tr",        label: t("admTrs")       },
    { id: "import",    icon: "upload",    label: t("admImport")    },
    { id: "audit",     icon: "history",   label: t("admAudit")     },
    { id: "settings",  icon: "settings",  label: t("admSettings")  },
    { id: "guide",     icon: "book",      label: t("admGuide")     },
  ];
  const pendingCount = data.users.filter(u => u.status === "pending").length;

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
            <img src="logo.svg" alt="PEA" style={{ width: 42, height: 42, borderRadius: 12, boxShadow: "0 8px 24px rgba(139,63,196,0.4)", flexShrink: 0 }} />
            <div className="sidebar-brand-text">
              <div style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, color: "#ffba7a", textTransform: "uppercase" }}>PEA</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Meter &amp; TR</div>
            </div>
          </div>
          <nav className="sidebar-nav f-col f-gap-2">
            {navItems.map(it => (
              <React.Fragment key={it.id}>
                <button
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

                {/* Admin sub-nav — expands inline when Admin route is active */}
                {it.id === "admin" && route === "admin" && (
                  <div className="adm-subnav sidebar-nav-label" style={{ marginLeft: 10, paddingLeft: 10, borderLeft: "1px solid rgba(255,255,255,0.10)", display: "flex", flexDirection: "column", gap: 1 }}>
                    {ADMIN_NAV.map(sub => (
                      <button key={sub.id} onClick={() => setAdminTab(sub.id)} style={{
                        display: "flex", alignItems: "center", gap: 9,
                        padding: "7px 10px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                        color: adminTab === sub.id ? "white" : "rgba(255,255,255,0.58)",
                        background: adminTab === sub.id ? "rgba(244,123,32,0.20)" : "transparent",
                        border: adminTab === sub.id ? "1px solid rgba(244,123,32,0.32)" : "1px solid transparent",
                        cursor: "pointer", textAlign: "left", transition: "all 140ms",
                        position: "relative",
                      }}>
                        <Icon name={sub.icon} size={15} />
                        {sub.label}
                        {sub.id === "users" && pendingCount > 0 && (
                          <span style={{ background: "var(--pea-orange-500)", color: "white", borderRadius: 999, minWidth: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, padding: "0 4px", marginLeft: "auto" }}>
                            {pendingCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
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
            <button className="sidebar-logout-btn" onClick={() => setShowLogoutConfirm(true)} style={{
              marginTop: 10, width: "100%", padding: "8px 12px", borderRadius: 10,
              background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Icon name="logout" size={14} />
              <span className="sidebar-logout-text">{t("logout")}</span>
            </button>
          </div>
        </aside>

        {/* Topbar */}
        <header className="app-topbar" style={{
          background: "var(--surface)", borderBottom: "1px solid var(--line)",
          padding: "0 20px", display: "flex", alignItems: "center", gap: 10,
          position: "relative",
        }}>
          <style>{`
            .topbar-mobile-brand { display: none; flex: 1; align-items: center; gap: 8px; }
            .topbar-mobile-user  { display: none; align-items: center; gap: 6px; padding: 5px 10px 5px 6px; border-radius: 20px; border: 1px solid rgba(139,63,196,0.3); background: rgba(139,63,196,0.1); cursor: pointer; white-space: nowrap; }
            .topbar-mobile-user:hover { background: rgba(139,63,196,0.2); }
            @media (max-width: 680px) {
              .topbar-greeting       { display: none !important; }
              .topbar-mapswitcher    { display: none !important; }
              .topbar-logout         { display: none !important; }
              .topbar-mobile-brand   { display: flex !important; }
              .topbar-mobile-user    { display: flex !important; }
            }
          `}</style>

          {/* Desktop greeting */}
          <div className="topbar-greeting" style={{ flex: 1 }}>
            <div className="t-mute text-xs">{t("todayLabel")} {new Date().toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            <div className="fw-7" style={{ fontSize: 15 }}>
              {t("greeting")} <span style={{ color: "var(--pea-purple-600)" }}>{currentUser.name}</span> 👋
            </div>
          </div>

          {/* Mobile brand */}
          <div className="topbar-mobile-brand">
            <img src="logo.svg" alt="PEA" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
            <span style={{ fontWeight: 800, fontSize: 14 }}>PEA Meter & TR</span>
          </div>

          {/* Map layer switcher — only on search page */}
          {route === "search" && (
            <div className="topbar-mapswitcher tabs" style={{ padding: 4 }}>
              {Object.entries(TILE_LAYERS).filter(([k]) => k !== "dark").map(([k]) => (
                <button key={k} className={"tab " + (baseMap === k ? "active" : "")} style={{ height: 36, padding: "0 14px", fontSize: 12 }} onClick={() => setBaseMap(k)}>
                  <Icon name={k === "satellite" ? "layers" : "map"} size={12} />
                  {k === "satellite" ? t("mapSatellite") : t("mapStreet")}
                </button>
              ))}
            </div>
          )}

          {/* Language toggle */}
          <button
            onClick={() => setLang(l => l === "th" ? "en" : "th")}
            title={t("switchLang")}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: "rgba(139,63,196,0.1)", border: "1px solid rgba(139,63,196,0.25)",
              color: "var(--pea-purple-600)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {lang === "th" ? "EN" : "TH"}
          </button>

          {/* Theme toggle */}
          <button
            className="btn-icon"
            onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
            title={theme === "light" ? "โหมดมืด" : "โหมดสว่าง"}
          >
            <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
          </button>

          {/* Refresh + feedback */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="btn-icon" title={t("refreshData")} onClick={handleRefresh} disabled={refreshing}
              style={{ color: refreshing ? "var(--pea-purple-500)" : undefined }}>
              <Icon name="refresh" size={18} style={{ animation: refreshing ? "pea-spin 0.8s linear infinite" : "none" }} />
            </button>
            {refreshMsg && (
              <div className="fade-in" style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                background: refreshMsg === "done" ? "rgba(16,185,129,0.12)" : refreshMsg === "error" ? "rgba(239,68,68,0.1)" : "rgba(139,63,196,0.1)",
                color: refreshMsg === "done" ? "#047857" : refreshMsg === "error" ? "var(--red)" : "var(--pea-purple-500)",
                border: `1px solid ${refreshMsg === "done" ? "rgba(16,185,129,0.3)" : refreshMsg === "error" ? "rgba(239,68,68,0.25)" : "rgba(139,63,196,0.25)"}`,
              }}>
                {refreshMsg === "loading" ? t("refreshing") : refreshMsg === "done" ? t("refreshDone") : t("refreshError")}
              </div>
            )}
          </div>

          {/* Bell notification */}
          <div style={{ position: "relative" }}>
            <button className="btn-icon" title={t("notifications")} onClick={() => setShowNotif(s => !s)} style={{ position: "relative" }}>
              <Icon name="bell" />
              {currentUser.role === "admin" && data.users.filter(u => u.status === "pending").length > 0 && (
                <span style={{
                  position: "absolute", top: 2, right: 2,
                  minWidth: 16, height: 16, padding: "0 3px", borderRadius: 999,
                  background: "var(--pea-orange-500)", color: "white",
                  display: "grid", placeItems: "center", fontSize: 9, fontWeight: 800,
                  pointerEvents: "none",
                }}>
                  {data.users.filter(u => u.status === "pending").length}
                </span>
              )}
            </button>
            {showNotif && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 1999 }} onClick={() => setShowNotif(false)} />
                <NotifPanel data={data} currentUser={currentUser} />
              </>
            )}
          </div>

          {/* Desktop logout (hidden on mobile) */}
          <button className="topbar-logout" title={t("logout")} onClick={() => setShowLogoutConfirm(true)} style={{
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

          {/* Mobile: user name + logout */}
          <button className="topbar-mobile-user" onClick={() => setShowLogoutConfirm(true)}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#f47b20,#6b2c91)", display: "grid", placeItems: "center", color: "white", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
              {currentUser.name?.[0] || currentUser.username[0]}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pea-purple-600)" }}>
              {(currentUser.name || currentUser.username).split(" ")[0]}
            </span>
            <Icon name="logout" size={13} style={{ color: "var(--red)" }} />
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
          {route === "guide" && (
            <UserGuide role={currentUser.role} />
          )}
          {route === "admin" && currentUser.role === "admin" && (
            <AdminPanel data={data} setData={setData} currentUser={currentUser} addAudit={addAudit}
              tab={adminTab} setTab={setAdminTab}
              maintenanceMode={maintenanceMode} setMaintenanceMode={setMaintenanceMode}
              maintenanceMessage={maintenanceMessage} setMaintenanceMessage={setMaintenanceMessage}
              maintenanceUntil={maintenanceUntil} setMaintenanceUntil={setMaintenanceUntil} />
          )}
        </main>

        {/* Logout confirm dialog */}
        {showLogoutConfirm && (
          <div className="fade-in" style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(14,10,22,0.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowLogoutConfirm(false)}>
            <div className="fade-up" onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 22, width: "100%", maxWidth: 420, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
              <div style={{ padding: "24px 24px 18px", background: "linear-gradient(135deg,#f47b20 0%,#d96512 60%,#6b2c91 130%)", color: "white", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -30, top: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.1)", pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", display: "grid", placeItems: "center" }}>
                    <Icon name="logout" size={26} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.82 }}>{t("caution")}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{t("logoutTitle")}</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--soft)", borderRadius: 12, marginBottom: 16, border: "1px solid var(--soft-border)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#f47b20,#6b2c91)", display: "grid", placeItems: "center", color: "white", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                    {currentUser.name?.[0] || currentUser.username[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{currentUser.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>@{currentUser.username}</div>
                  </div>
                </div>
                <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 18, lineHeight: 1.65 }}>
                  {t("logoutMessage")}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button className="btn btn-outline" style={{ height: 46 }} onClick={() => setShowLogoutConfirm(false)}>{t("cancel")}</button>
                  <button className="btn" style={{ height: 46, background: "linear-gradient(135deg,#f47b20,#d96512)", color: "white", fontWeight: 700, boxShadow: "0 8px 22px rgba(244,123,32,0.35)" }} onClick={doLogout}>
                    <Icon name="logout" size={14} /> {t("logoutBtn")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ConfirmProvider></ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <LanguageProvider><App /></LanguageProvider>
);
