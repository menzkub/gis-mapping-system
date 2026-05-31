/* global React, ReactDOM, Icon, ToastProvider, ConfirmProvider, useToast, useConfirm,
   AuthScreen, SearchView, AdminPanel, TILE_LAYERS, formatThaiDate,
   _supabase, toProfile, toAuditEntry, useLang, LanguageProvider */
const {
  useState: useStateApp,
  useEffect: useEffectApp,
  useCallback: useCallbackApp,
} = React;

// ── Capture URL recovery type BEFORE Supabase clears the hash ────────────
const _hashOnLoad   = window.location.hash;
const _searchOnLoad = window.location.search;
const _urlTypeOnLoad = (
  new URLSearchParams(_hashOnLoad.replace(/^#/, "")).get("type") ||
  new URLSearchParams(_searchOnLoad).get("type") ||
  ""
);
const _isRecoveryLoad = _urlTypeOnLoad === "recovery";
// Persist across MFA verification flow
if (_isRecoveryLoad) sessionStorage.setItem("pea_recovery", "1");
// PKCE recovery: link URL contains ?code= (no type= visible) — detect early
const _hasOAuthCode = new URLSearchParams(_searchOnLoad).has("code");
if (_hasOAuthCode && !_isRecoveryLoad) sessionStorage.setItem("pea_recovery", "1");

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
    reset_password_initiated: "ขอรีเซ็ตรหัสผ่าน",
    reset_password_failed:    "รีเซ็ตรหัสผ่านไม่สำเร็จ",
  };
  return m[a] || a;
}
function activityBadge(a) {
  if (a === "login")                       return "badge-green";
  if (a === "logout")                      return "badge-purple";
  if (a === "change_password")             return "badge-orange";
  if (a === "reset_password_initiated")    return "badge-blue";
  if (a === "reset_password_failed")       return "badge-red";
  if (a.startsWith("search"))              return "badge-blue";
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
function ProfileView({ currentUser, data, addAudit, onPasswordChanged }) {
  const { t } = useLang();
  const [tab, setTabPV]           = useStateApp("info");
  const [newPw, setNewPw]         = useStateApp("");
  const [confirmPw, setConfirmPw] = useStateApp("");
  const [showNewPw, setShowNewPw]         = useStateApp(false);
  const [showConfirmPw, setShowConfirmPw] = useStateApp(false);
  const [saving, setSaving]       = useStateApp(false);
  const [err, setErr]             = useStateApp(null);
  const [pwHistory, setPwHistory]     = useStateApp([]);
  const [pwHistLoad, setPwHistLoad]   = useStateApp(false);
  const [pwSuccess, setPwSuccess] = useStateApp(false);
  const [mfaStatus, setMfaStatus] = useStateApp(null); // null=loading | true=enrolled | false=not
  const toast = useToast();
  const confirm = useConfirm();

  useEffectApp(() => {
    _supabase.auth.mfa.listFactors().then(({ data: d }) => {
      setMfaStatus(d?.totp?.some(f => f.status === "verified") || false);
    });
  }, []);

  useEffectApp(() => {
    if (tab !== "password") return;
    setPwHistLoad(true);
    _supabase.from("password_history")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("changed_at", { ascending: false })
      .limit(20)
      .then(({ data: rows }) => {
        setPwHistory(rows || []);
        setPwHistLoad(false);
      });
  }, [tab]);

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
    if (error) {
      setSaving(false);
      setErr(error.message);
    } else {
      const now = new Date().toISOString();
      await _supabase.from("profiles").update({ password_changed_at: now }).eq("id", currentUser.id);
      await _supabase.from("password_history").insert({
        user_id: currentUser.id, username: currentUser.username,
        changed_at: now, action: "change_password", note: "เปลี่ยนรหัสผ่านด้วยตนเอง",
      });
      await addAudit({
        user: currentUser.username, action: "change_password",
        target: currentUser.username, detail: "เปลี่ยนรหัสผ่านสำเร็จ",
      });
      setSaving(false);
      onPasswordChanged?.();
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

      {/* ── Password expiry status + history ── */}
      {tab === "password" && (() => {
        const pwDaysLeft = (() => {
          if (!currentUser.passwordChangedAt) return null;
          const daysOld = (Date.now() - new Date(currentUser.passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24);
          return Math.ceil(45 - daysOld);
        })();
        const isExpired = pwDaysLeft !== null && pwDaysLeft <= 0;
        const isWarning = pwDaysLeft !== null && pwDaysLeft > 0 && pwDaysLeft <= 7;
        const statusColor = isExpired ? "#dc2626" : isWarning ? "#d97706" : "#16a34a";
        const statusLabel = isExpired ? "หมดอายุแล้ว" : pwDaysLeft === null ? "ไม่มีข้อมูล" : `เหลือ ${pwDaysLeft} วัน`;
        const daysUsed = pwDaysLeft !== null ? Math.min(45, 45 - pwDaysLeft) : 0;
        const progress = Math.min(100, Math.max(0, (daysUsed / 45) * 100));
        const actionLabel = a => ({
          change_password:  "เปลี่ยนรหัสผ่าน",
          force_change:     "บังคับเปลี่ยน (Admin)",
          admin_reset:      "รีเซ็ตโดย Admin",
          unlock_password:  "Admin ปลดล็อค",
          initial_setup:    "ตั้งรหัสผ่านครั้งแรก",
        }[a] || a);
        return (
          <>
            {/* Expiry status card */}
            <div className="card card-elev fade-up" style={{ marginTop: 16, padding: "18px 20px", maxWidth: 480 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>สถานะรหัสผ่าน</div>
                <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: statusColor + "22", color: statusColor, border: `1px solid ${statusColor}44` }}>
                  {statusLabel}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "var(--line)", overflow: "hidden", marginBottom: 10 }}>
                <div style={{ height: "100%", width: progress + "%", borderRadius: 999, background: isExpired ? "#dc2626" : isWarning ? "#f59e0b" : "#22c55e", transition: "width 600ms" }} />
              </div>
              <div className="pv-stat-grid">
                {[
                  { label: "ใช้ไปแล้ว",    value: pwDaysLeft !== null ? `${Math.max(0, daysUsed)} / 45 วัน` : "—" },
                  { label: "เปลี่ยนล่าสุด", value: currentUser.passwordChangedAt ? currentUser.passwordChangedAt.slice(0, 10) : "—" },
                  { label: "หมดอายุ",       value: currentUser.passwordChangedAt ? (() => { const d = new Date(currentUser.passwordChangedAt); d.setDate(d.getDate() + 45); return d.toISOString().slice(0, 10); })() : "—" },
                ].map(r => (
                  <div key={r.label} style={{ background: "var(--soft)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-mute)", marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Password change history list */}
            <div className="card card-elev fade-up" style={{ marginTop: 14, maxWidth: 480 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>ประวัติการเปลี่ยนรหัสผ่าน</div>
                <span className="badge" style={{ fontSize: 11 }}>{pwHistory.length} รายการ</span>
              </div>
              {pwHistLoad ? (
                <div className="t-mute text-sm" style={{ padding: "20px 0", textAlign: "center" }}>กำลังโหลด…</div>
              ) : pwHistory.length === 0 ? (
                <div className="t-mute text-sm" style={{ padding: "20px 0", textAlign: "center" }}>ยังไม่มีประวัติ</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {pwHistory.map((row, i) => (
                    <div key={row.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 0", borderBottom: i < pwHistory.length - 1 ? "1px solid var(--line)" : "none" }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6b2c91,#f47b20)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                        <Icon name="lock" size={14} style={{ color: "white" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{actionLabel(row.action)}</div>
                        {row.note && <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>{row.note}</div>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-mute)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {row.changed_at ? row.changed_at.replace("T", " ").slice(0, 16) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );
      })()}

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
   ChangelogView — UX/UI improvement history
   ============================================================ */
const CHANGELOG = [
  {
    version: "v2.7", date: "31 พ.ค. 2569", tag: "Deploy",
    tagColor: "#3b82f6", items: [
      { cat: "new",  text: "Deploy Status Dot ใน Topbar: admin คลิกเพื่อดู popup สถานะ deploy ทันที (🟢/🟡/⚫)" },
      { cat: "new",  text: "Deployment Status card ใน Changelog: เปรียบเทียบ hash ที่รันบนเว็บกับ commit ล่าสุดบน GitHub" },
      { cat: "new",  text: "version.json: ไฟล์ที่ root repo บันทึก commit hash ที่ deploy จริง" },
      { cat: "fix",  text: "Forgot Password: ลิงก์รีเซ็ตในอีเมลพาไปหน้าตั้งรหัสผ่านใหม่ทันที ทั้ง user และ admin (แก้ PKCE race condition)" },
      { cat: "new",  text: "Audit Log: เพิ่ม action reset_password_initiated, reset_password_failed" },
      { cat: "fix",  text: "Modal popup ผู้ใช้: กึ่งกลาง content area จริง ทุก breakpoint (desktop/tablet/mobile)" },
    ],
  },
  {
    version: "v2.6", date: "30 พ.ค. 2569", tag: "Changelog",
    tagColor: "#10b981", items: [
      { cat: "new",  text: "เพิ่มหน้าประวัติการปรับปรุง UX/UI (หน้านี้)" },
      { cat: "fix",  text: "Audit Log: เพิ่ม action change_password, enable/disable_2fa, unlock_password" },
      { cat: "fix",  text: "AdminGuide: เพิ่มเอกสาร popup ข้อมูลผู้ใช้เมื่อคลิกแถว" },
    ],
  },
  {
    version: "v2.5", date: "28 พ.ค. 2569", tag: "UX",
    tagColor: "#8b3fc4", items: [
      { cat: "new",  text: "โปรไฟล์ แท็บรหัสผ่าน: การ์ดสถานะ progress bar + วันหมดอายุ + ประวัติการเปลี่ยนรหัส" },
      { cat: "new",  text: "Admin ตารางผู้ใช้: คลิกแถวเปิด popup ข้อมูลส่วนตัว + สถานะรหัสผ่าน + ประวัติ" },
      { cat: "new",  text: "คู่มือ: ปุ่มยุบ/ขยายทั้งหมด และ ปุ่มดาวน์โหลด (เฉพาะ Admin)" },
      { cat: "new",  text: "คู่มือ: Stat cards แสดงจำนวนหัวข้อ / ขั้นตอน / ฟีเจอร์ / เคล็ดลับ" },
      { cat: "ux",   text: "แท็บโปรไฟล์: ความกว้างเท่ากันทุกแท็บ (CSS Grid)" },
      { cat: "ux",   text: "Popup บนมือถือ: กลางจอ ชดเชย Topbar 56px + Bottom nav 64px" },
      { cat: "ux",   text: "Sidebar: โลโก้ขนาดใหญ่ขึ้น + ข้อความ 'GIS Mapping System'" },
    ],
  },
  {
    version: "v2.4", date: "20 พ.ค. 2569", tag: "Security",
    tagColor: "#ef4444", items: [
      { cat: "new",  text: "ระบบรหัสผ่านหมดอายุ 45 วัน พร้อม progress bar" },
      { cat: "new",  text: "Warning banner แจ้งเตือนล่วงหน้า 7 / 3 / 1 วัน" },
      { cat: "new",  text: "Admin: ปลดล็อครหัสผ่านหมดอายุ (unlock_password)" },
      { cat: "new",  text: "บังคับเปลี่ยนรหัสผ่านทันทีหลัง Admin ปลดล็อค" },
      { cat: "new",  text: "ตาราง password_history บันทึกประวัติทุกครั้งที่เปลี่ยน" },
      { cat: "fix",  text: "อัปเดตคู่มือการใช้งานให้ครอบคลุมทุก Feature" },
    ],
  },
  {
    version: "v2.3", date: "10 พ.ค. 2569", tag: "2FA",
    tagColor: "#f59e0b", items: [
      { cat: "new",  text: "ยืนยันตัวตน 2 ขั้นตอน (TOTP) รองรับ Google Authenticator / Authy" },
      { cat: "new",  text: "จัดการผู้ใช้: อนุมัติ / ระงับ / เปลี่ยน Role" },
      { cat: "new",  text: "Audit Log บันทึกทุก action (login, search, CRUD, import, export)" },
      { cat: "ux",   text: "Badge แจ้งเตือน pending user ที่ปุ่ม Bell บน Topbar" },
    ],
  },
  {
    version: "v2.2", date: "1 พ.ค. 2569", tag: "Map",
    tagColor: "#3b82f6", items: [
      { cat: "new",  text: "แผนที่: Cluster, Heatmap, Split View" },
      { cat: "new",  text: "นำทาง GPS พร้อมคำนวณระยะทางและเวลา" },
      { cat: "new",  text: "Export CSV ผลการค้นหา (สูงสุด 500 รายการ)" },
      { cat: "ux",   text: "Popup marker แสดงข้อมูล + ปุ่ม Copy พิกัด" },
    ],
  },
  {
    version: "v2.1", date: "15 เม.ย. 2569", tag: "Admin",
    tagColor: "#f47b20", items: [
      { cat: "new",  text: "Dashboard: การ์ดสถิติ มิเตอร์ / หม้อแปลง / kVA / ผู้ใช้" },
      { cat: "new",  text: "นำเข้าข้อมูล CSV แบบ upsert ตาม OBJECTID (500 rows/รอบ)" },
      { cat: "ux",   text: "Dark / Light Mode — จำค่าใน browser" },
      { cat: "ux",   text: "รองรับภาษาไทย / อังกฤษ สลับได้ทันที" },
    ],
  },
  {
    version: "v2.0", date: "1 เม.ย. 2569", tag: "เปิดตัว",
    tagColor: "#6b2c91", items: [
      { cat: "new",  text: "เปิดตัวระบบ GIS Meter & Transformer Mapping System" },
      { cat: "new",  text: "ค้นหา PEA Meter และ Transformer พร้อมตัวกรอง" },
      { cat: "new",  text: "แผนที่ Street และ Satellite" },
      { cat: "new",  text: "ระบบล็อกอิน / สมัครสมาชิก / ลืมรหัสผ่าน" },
    ],
  },
];

const CAT_META = {
  new:  { label: "ใหม่",      bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  text: "#047857" },
  ux:   { label: "UX/UI",     bg: "rgba(139,63,196,0.12)",  border: "rgba(139,63,196,0.3)",  text: "var(--pea-purple-600)" },
  fix:  { label: "แก้ไข",    bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)",  text: "#1d4ed8" },
  perf: { label: "ประสิทธิภาพ", bg: "rgba(244,123,32,0.12)", border: "rgba(244,123,32,0.3)", text: "var(--pea-orange-600)" },
};

// ── Shared deploy-data hook ──────────────────────────────────────────────
function useDeployStatus() {
  const [deployed, setDeployed]   = useStateApp(null);
  const [ghCommit, setGhCommit]   = useStateApp(null);
  const [loading, setLoading]     = useStateApp(true);
  const [ghLoading, setGhLoading] = useStateApp(true);

  useEffectApp(() => {
    fetch("version.json?t=" + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDeployed(d); setLoading(false); })
      .catch(() => setLoading(false));

    fetch("https://api.github.com/repos/menzkub/gis-mapping-system/commits/main", {
      headers: { Accept: "application/vnd.github.v3+json" },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setGhCommit(d); setGhLoading(false); })
      .catch(() => setGhLoading(false));
  }, []);

  const deployedHash = deployed?.shortCommit || deployed?.commit?.slice(0, 7);
  const ghHash = ghCommit?.sha?.slice(0, 7);
  const isLoading = loading || ghLoading;
  const inSync = !isLoading && deployedHash && ghHash && deployedHash === ghHash;

  return { deployed, ghCommit, deployedHash, ghHash, loading, ghLoading, isLoading, inSync };
}

// ── DeployStatusDot — topbar indicator for admins ────────────────────────
function DeployStatusDot() {
  const [open, setOpen] = useStateApp(false);
  const { deployed, ghCommit, deployedHash, ghHash, loading, ghLoading, isLoading, inSync } = useDeployStatus();

  const pending  = !isLoading && deployedHash && ghHash && !inSync;
  const dotColor = isLoading ? "#9ca3af" : inSync ? "#059669" : "#d97706";
  const dotLabel = isLoading ? "กำลังตรวจสอบ…" : inSync ? "ระบบเป็นปัจจุบัน" : "มีการอัปเดตรอ Deploy";

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) +
      " · " + d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={dotLabel}
        style={{
          width: 32, height: 32, borderRadius: "50%",
          display: "grid", placeItems: "center",
          background: open ? "var(--soft)" : "transparent",
          border: "none", cursor: "pointer", position: "relative", flexShrink: 0,
        }}
      >
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: dotColor, transition: "background 0.3s",
          boxShadow: `0 0 0 3px ${dotColor}33`,
          animation: isLoading ? "pea-pulse 1.4s ease-in-out infinite" : "none",
        }} />
        {pending && (
          <span style={{
            position: "absolute", top: 5, right: 5,
            width: 7, height: 7, borderRadius: "50%",
            background: "#f59e0b", border: "2px solid var(--surface)",
          }} />
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1999 }} onClick={() => setOpen(false)} />
          <div className="fade-up" style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 2000,
            width: 300, background: "var(--surface)", borderRadius: 16,
            boxShadow: "0 20px 56px rgba(0,0,0,0.35)", border: "1px solid var(--line)",
            overflow: "hidden",
          }}>
            {/* Status header */}
            <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0,
                animation: isLoading ? "pea-pulse 1.4s ease-in-out infinite" : "none",
              }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: dotColor, flex: 1 }}>{dotLabel}</span>
              <span style={{ fontSize: 10, color: "var(--ink-mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Deploy</span>
            </div>

            {/* Deployed version */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-mute)", marginBottom: 5 }}>🌐 กำลังรันบนเว็บ</div>
              {loading ? (
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>กำลังโหลด…</div>
              ) : deployed ? (
                <>
                  <code style={{ fontSize: 12, fontWeight: 800, fontFamily: "'IBM Plex Mono',monospace", color: "#059669", background: "rgba(5,150,105,0.1)", padding: "1px 7px", borderRadius: 5 }}>{deployedHash}</code>
                  <div style={{ fontSize: 11, color: "var(--ink)", marginTop: 4, lineHeight: 1.4 }}>{deployed.message}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 2 }}>{fmtDate(deployed.date)}</div>
                </>
              ) : <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>ไม่พบข้อมูล version.json</div>}
            </div>

            {/* GitHub latest */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-mute)", marginBottom: 5 }}>☁️ ล่าสุดบน GitHub</div>
              {ghLoading ? (
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>กำลังโหลด…</div>
              ) : ghCommit ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <code style={{ fontSize: 12, fontWeight: 800, fontFamily: "'IBM Plex Mono',monospace", color: "var(--pea-purple-600)", background: "rgba(139,63,196,0.12)", padding: "1px 7px", borderRadius: 5 }}>{ghHash}</code>
                    {pending && <span style={{ fontSize: 9, fontWeight: 700, color: "#d97706", background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)", padding: "1px 5px", borderRadius: 4 }}>รอ Deploy</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink)", marginTop: 4, lineHeight: 1.4 }}>{ghCommit.commit?.message?.split("\n")[0] || "—"}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 2 }}>{fmtDate(ghCommit.commit?.author?.date)} · {ghCommit.commit?.author?.name}</div>
                </>
              ) : <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>ไม่สามารถเชื่อมต่อ GitHub API</div>}
            </div>

            <div style={{ padding: "8px 14px", fontSize: 10, color: "var(--ink-mute)" }}>
              GitHub Pages ใช้เวลา 1–3 นาทีหลัง push
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── DeploymentStatus — full card in ChangelogView ────────────────────────
function DeploymentStatus() {
  const { deployed, ghCommit, deployedHash, ghHash, loading, ghLoading, isLoading, inSync } = useDeployStatus();

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  };

  const statusColor  = isLoading ? "#6b7280" : inSync ? "#059669" : "#d97706";
  const statusBg     = isLoading ? "rgba(107,114,128,0.1)" : inSync ? "rgba(5,150,105,0.1)" : "rgba(217,119,6,0.1)";
  const statusBorder = isLoading ? "rgba(107,114,128,0.25)" : inSync ? "rgba(5,150,105,0.25)" : "rgba(217,119,6,0.25)";
  const statusLabel  = isLoading ? "กำลังตรวจสอบ…" : inSync ? "ระบบเป็นปัจจุบัน" : "มีการอัปเดตรอ Deploy";

  return (
    <div style={{ marginBottom: 24, borderRadius: 16, border: `1px solid ${statusBorder}`, background: statusBg, overflow: "hidden" }}>
      {/* Header row */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${statusBorder}` }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor, flexShrink: 0,
          boxShadow: `0 0 0 3px ${statusColor}33`,
          animation: isLoading ? "pea-pulse 1.4s ease-in-out infinite" : "none",
        }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: statusColor }}>{statusLabel}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Deployment Status</span>
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {/* Deployed */}
        <div style={{ padding: "14px 18px", borderRight: `1px solid ${statusBorder}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-mute)", marginBottom: 8 }}>
            🌐 กำลังรันบนเว็บไซต์
          </div>
          {loading ? (
            <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>กำลังโหลด…</div>
          ) : deployed ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <code style={{ fontSize: 13, fontWeight: 800, fontFamily: "'IBM Plex Mono','Courier New',monospace", color: inSync ? "#059669" : "#d97706", background: inSync ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                  {deployedHash}
                </code>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink)", marginBottom: 3, lineHeight: 1.4 }}>{deployed.message}</div>
              <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>{fmtDate(deployed.date)}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>ไม่พบข้อมูล</div>
          )}
        </div>

        {/* GitHub latest */}
        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-mute)", marginBottom: 8 }}>
            ☁️ ล่าสุดบน GitHub
          </div>
          {ghLoading ? (
            <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>กำลังโหลด…</div>
          ) : ghCommit ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <code style={{ fontSize: 13, fontWeight: 800, fontFamily: "'IBM Plex Mono','Courier New',monospace", color: "var(--pea-purple-600)", background: "rgba(139,63,196,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                  {ghHash}
                </code>
                {!inSync && ghHash && deployedHash && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706", background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)", padding: "1px 6px", borderRadius: 4 }}>
                    รอ Deploy
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink)", marginBottom: 3, lineHeight: 1.4 }}>
                {ghCommit.commit?.message?.split("\n")[0] || "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                {fmtDate(ghCommit.commit?.author?.date)} · {ghCommit.commit?.author?.name}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>ไม่สามารถเชื่อมต่อ GitHub API</div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div style={{ padding: "8px 18px 10px", borderTop: `1px solid ${statusBorder}`, fontSize: 11, color: "var(--ink-mute)" }}>
        GitHub Pages มักใช้เวลา 1–3 นาทีหลัง push · repo: <b>menzkub/gis-mapping-system</b>
      </div>
    </div>
  );
}

function ChangelogView() {
  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 20px 48px" }}>

        {/* Hero */}
        <div style={{
          borderRadius: 20,
          background: "linear-gradient(135deg,#1b0926 0%,#321148 50%,#6b2c91 100%)",
          color: "white", padding: "24px 28px", marginBottom: 24,
          position: "relative", overflow: "hidden",
          border: "1px solid rgba(139,63,196,0.35)",
        }}>
          <div style={{ position: "absolute", right: -50, top: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(244,123,32,0.08)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(244,123,32,0.2)", display: "grid", placeItems: "center", flexShrink: 0, border: "1px solid rgba(244,123,32,0.3)" }}>
              <Icon name="bolt" size={26} style={{ color: "#ffba7a" }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Release Notes</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>ประวัติการปรับปรุง UX/UI</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
                บันทึกการพัฒนาและปรับปรุงระบบทั้งหมด — อัปเดตโดย Claude AI
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                  <Icon name="history" size={10} /> อัปเดตล่าสุด: {CHANGELOG[0].date}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                  <Icon name="package" size={10} /> {CHANGELOG[0].version} · {CHANGELOG[0].tag}
                </span>
              </div>
            </div>
          </div>

          {/* Summary chips */}
          <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
            {[
              { label: "เวอร์ชัน", value: CHANGELOG.length, icon: "package" },
              { label: "ฟีเจอร์ใหม่", value: CHANGELOG.reduce((a, v) => a + v.items.filter(i => i.cat === "new").length, 0), icon: "bolt" },
              { label: "UX/UI", value: CHANGELOG.reduce((a, v) => a + v.items.filter(i => i.cat === "ux").length, 0), icon: "sun" },
              { label: "แก้ไข", value: CHANGELOG.reduce((a, v) => a + v.items.filter(i => i.cat === "fix").length, 0), icon: "check" },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name={icon} size={13} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deployment status */}
        <DeploymentStatus />

        {/* Legend */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {Object.entries(CAT_META).map(([k, m]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.bg, border: `1px solid ${m.border}`, color: m.text }}>
              {m.label}
            </span>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: "var(--line)", borderRadius: 2 }} />

          {CHANGELOG.map((ver, vi) => (
            <div key={ver.version} style={{ position: "relative", paddingLeft: 52, marginBottom: vi < CHANGELOG.length - 1 ? 28 : 0 }}>
              {/* Dot */}
              <div style={{
                position: "absolute", left: 10, top: 14, width: 20, height: 20, borderRadius: "50%",
                background: ver.tagColor, border: "3px solid var(--bg)",
                boxShadow: `0 0 0 2px ${ver.tagColor}55`,
                zIndex: 1,
              }} />

              {/* Card */}
              <div style={{
                background: "var(--surface)", borderRadius: 16, border: "1px solid var(--line)",
                overflow: "hidden", boxShadow: vi === 0 ? `0 4px 24px ${ver.tagColor}22` : "none",
              }}>
                {/* Card header */}
                <div style={{
                  padding: "14px 18px", display: "flex", alignItems: "center", gap: 10,
                  borderBottom: "1px solid var(--line)",
                  background: vi === 0 ? `linear-gradient(135deg, ${ver.tagColor}18, transparent)` : "transparent",
                }}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono','Courier New',monospace",
                    fontSize: 16, fontWeight: 800, color: ver.tagColor, letterSpacing: "-0.02em",
                  }}>{ver.version}</div>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 10,
                    fontWeight: 700, background: `${ver.tagColor}20`, color: ver.tagColor,
                    border: `1px solid ${ver.tagColor}40`,
                  }}>{ver.tag}</span>
                  {vi === 0 && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
                      borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: "rgba(16,185,129,0.15)", color: "#047857",
                      border: "1px solid rgba(16,185,129,0.3)",
                    }}>
                      <Icon name="check" size={10} /> ล่าสุด
                    </span>
                  )}
                  <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-mute)", fontWeight: 500 }}>{ver.date}</div>
                </div>

                {/* Items */}
                <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {ver.items.map((item, ii) => {
                    const m = CAT_META[item.cat] || CAT_META.new;
                    return (
                      <div key={ii} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{
                          display: "inline-block", padding: "2px 7px", borderRadius: 6, fontSize: 10,
                          fontWeight: 700, flexShrink: 0, marginTop: 1,
                          background: m.bg, border: `1px solid ${m.border}`, color: m.text,
                        }}>{m.label}</span>
                        <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, padding: "16px 20px", borderRadius: 14, background: "var(--soft)", border: "1px solid var(--soft-border)", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="info" size={16} style={{ color: "var(--pea-purple-500)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.5 }}>
            ประวัตินี้บันทึกการพัฒนาโดย Claude AI — หากพบปัญหาหรือต้องการปรับปรุงเพิ่มเติม กรุณาติดต่อนักพัฒนาระบบ
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   UserGuide — role-aware manual (user sees user sections, admin sees all)
   ============================================================ */
function UGSection({ icon, title, badge, children, expandSignal }) {
  const [open, setOpen] = useStateApp(false);
  useEffectApp(() => {
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
  const guideRef = React.useRef(null);
  const [expandSig, setExpandSig] = useStateApp({ count: 0, open: false });
  const expandAll  = () => setExpandSig(s => ({ count: s.count + 1, open: true }));
  const collapseAll = () => setExpandSig(s => ({ count: s.count + 1, open: false }));

  function downloadGuide() {
    const el = guideRef.current;
    if (!el) return;
    const css = `body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f4f6;margin:0;padding:0;color:#1a1a2e;}*{box-sizing:border-box;}`;
    const html = `<!DOCTYPE html>\n<html lang="th">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>คู่มือการใช้งาน GIS Meter &amp; Transformer</title>\n<style>${css}</style>\n</head>\n<body>${el.innerHTML}</body>\n</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "UserGuide-GIS.html";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div ref={guideRef} style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px 40px" }}>
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
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                  <Icon name="history" size={10} /> อัปเดตล่าสุด: {CHANGELOG[0].date}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                  <Icon name="package" size={10} /> {CHANGELOG[0].version}
                </span>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 16 }}>
            {[
              { label: "หัวข้อ",   value: isAdmin ? 12 : 5,  icon: "book",    sub: "sections" },
              { label: "ขั้นตอน", value: isAdmin ? 41 : 16, icon: "check",   sub: "steps" },
              { label: "ฟีเจอร์",  value: isAdmin ? 12 : 8,  icon: "bolt",    sub: "features" },
              { label: "เคล็ดลับ", value: isAdmin ? 16 : 7,  icon: "warning", sub: "tips & notes" },
            ].map(({ label, value, icon, sub }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Icon name={icon} size={13} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>{label}</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Expand/Collapse + Download buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={expandAll} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "white", borderRadius: 8, padding: "6px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                <Icon name="chevDown" size={13} /> ขยายทั้งหมด
              </button>
              <button onClick={collapseAll} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "white", borderRadius: 8, padding: "6px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                <Icon name="chevRight" size={13} /> ยุบทั้งหมด
              </button>
            </div>
            {isAdmin && (
              <button onClick={downloadGuide} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 10, padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, backdropFilter: "blur(4px)" }}>
                <Icon name="download" size={14} /> ดาวน์โหลดคู่มือ
              </button>
            )}
          </div>
        </div>

        {/* ─── เข้าสู่ระบบ ─── */}
        <UGSection icon="lock" title="การเข้าสู่ระบบ & สมัครสมาชิก" expandSignal={expandSig}>
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
        <UGSection icon="search" title="ค้นหาข้อมูล Meter / Transformer" expandSignal={expandSig}>
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
        <UGSection icon="map" title="แผนที่และการนำทาง GPS" expandSignal={expandSig}>
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
        <UGSection icon="user" title="โปรไฟล์ & ความปลอดภัยส่วนตัว" expandSignal={expandSig}>
          <div style={{ marginTop: 12 }}>
            <UGTable rows={[
              ["แท็บ", "รายละเอียด"],
              ["ข้อมูล", "ดูชื่อ, username, อีเมล, บทบาท, สถานะบัญชี"],
              ["รหัสผ่าน", "สถานะรหัสผ่าน (progress bar + วันหมดอายุ) · ประวัติการเปลี่ยนรหัส · เปิด/ปิด 2FA"],
              ["การใช้งาน", "ประวัติ login/logout/เปลี่ยนรหัส พร้อม device info"],
              ["การค้นหา", "ประวัติค้นหา Meter/TR พร้อม timestamp"],
            ]} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>แท็บ "รหัสผ่าน" — รายละเอียด</div>
            <UGStep n={1} text="การ์ดสถานะแสดง: progress bar (วันที่ใช้ไปจาก 45 วัน), วันที่เปลี่ยนล่าสุด, วันหมดอายุ" />
            <UGStep n={2} text="รายการ 'ประวัติการเปลี่ยนรหัสผ่าน' แสดงทุกครั้งที่มีการเปลี่ยน พร้อมวันที่และหมายเหตุ" />
            <UGStep n={3} text="สีการ์ดเปลี่ยนตามสถานะ: เขียว (ปกติ) → เหลือง (≤7 วัน) → แดง (≤3 วัน / หมดอายุ)" />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>นโยบายรหัสผ่าน (45 วัน)</div>
            <UGStep n={1} text="รหัสผ่านมีอายุ 45 วัน — ระบบแจ้งเตือนล่วงหน้า 7/3/1 วัน ด้วย banner สีต่างกัน" />
            <UGStep n={2} text="หากหมดอายุโดยไม่เปลี่ยน — จะเข้าสู่ระบบไม่ได้ ต้องให้ Admin ปลดล็อค" />
            <UGStep n={3} text="หลัง Admin ปลดล็อค — ระบบบังคับเปลี่ยนรหัสทันที ก่อนใช้งานระบบ" />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>เปิด 2FA (TOTP)</div>
            <UGStep n={1} text="ไปที่โปรไฟล์ → แท็บ 'รหัสผ่าน' → กด 'เปิดใช้ 2FA'" />
            <UGStep n={2} text="สแกน QR Code ด้วย Google Authenticator หรือ Authy" />
            <UGStep n={3} text="กรอกรหัส 6 หลักเพื่อยืนยัน" />
            <UGTip>แนะนำให้เปิด 2FA เสมอเพื่อความปลอดภัยของบัญชี</UGTip>
          </div>
        </UGSection>

        {/* ─── UI ─── */}
        <UGSection icon="sun" title="การตั้งค่า UI" expandSignal={expandSig}>
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

            <UGSection icon="dashboard" title="Dashboard" badge="admin" expandSignal={expandSig}>
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

            <UGSection icon="users" title="จัดการผู้ใช้งาน" badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  ["Action", "ผลลัพธ์"],
                  ["คลิกแถวผู้ใช้", "เปิด popup ข้อมูลส่วนตัว + สถานะรหัสผ่าน + ประวัติการเปลี่ยนรหัส"],
                  ["อนุมัติ", "pending → active (ผู้ใช้เข้าระบบได้)"],
                  ["ระงับ", "→ banned (เข้าระบบไม่ได้)"],
                  ["ปลดระงับ", "banned → active"],
                  ["เปลี่ยน Role", "สลับ user ↔ admin (2FA เปิด/ปิดอัตโนมัติ)"],
                  ["บังคับ 2FA", "คลิก toggle 2FA ในแถว"],
                  ["ปลดล็อครหัสผ่าน", "กดปุ่ม 'ปลดล็อค' → user ต้องเปลี่ยนรหัสเมื่อ login"],
                ]} />
                <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>Popup ข้อมูลผู้ใช้ (คลิกแถว)</div>
                <UGStep n={1} text="คลิกที่แถวใดก็ได้ในตารางผู้ใช้ — popup เปิดแสดงอีเมล, สถานะ, บทบาท, 2FA, เข้าล่าสุด, วันสมัคร" />
                <UGStep n={2} text="การ์ดสถานะรหัสผ่านแสดง progress bar + วันใช้ไป/45 วัน + วันหมดอายุ" />
                <UGStep n={3} text="รายการประวัติการเปลี่ยนรหัสผ่านแสดงครบทุกครั้งพร้อมวันที่" />
                <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>คอลัมน์ "รหัสผ่าน" ในตารางผู้ใช้</div>
                <UGTable rows={[
                  ["สีที่แสดง", "ความหมาย"],
                  ["🟢 เขียว (XX วัน)", "รหัสผ่านยังใช้งานได้ตามปกติ"],
                  ["🟡 เหลือง (≤7 วัน)", "ใกล้หมดอายุ — ควรเปลี่ยน"],
                  ["🔴 แดง (≤3 วัน)", "ใกล้หมดอายุมาก"],
                  ["🔴 หมดอายุ + ปลดล็อค", "รหัสหมดอายุแล้ว — กดปลดล็อคให้ผู้ใช้"],
                  ["🟡 ต้องเปลี่ยน", "Admin ปลดล็อคแล้ว รอผู้ใช้เข้ามาเปลี่ยน"],
                ]} />
                <UGTip>มี pending user — ระบบแสดง badge แดงที่ปุ่ม Bell บน Topbar</UGTip>
              </div>
            </UGSection>

            <UGSection icon="meter" title="จัดการ PEA มิเตอร์ & หม้อแปลง" badge="admin" expandSignal={expandSig}>
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

            <UGSection icon="upload" title="นำเข้าข้อมูล CSV" badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGStep n={1} text="เลือกประเภท: PEA Meter หรือ PEA Transformer" />
                <UGStep n={2} text="ลากหรือคลิกเพื่ออัปโหลดไฟล์ CSV (UTF-8)" />
                <UGStep n={3} text="ตรวจสอบ Preview 10 แถวแรก — ตรวจสอบหัวคอลัมน์" />
                <UGStep n={4} text="กด 'นำเข้าข้อมูล' — ระบบ upsert ตาม OBJECTID (500 rows/รอบ)" />
                <UGTip>ถ้า OBJECTID ซ้ำ ระบบจะ update ข้อมูลเดิม ไม่สร้างรายการใหม่</UGTip>
              </div>
            </UGSection>

            <UGSection icon="history" title="Audit Log" badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  ["Action ที่บันทึก", "ตัวอย่าง"],
                  ["login / logout", "เข้า-ออกระบบ"],
                  ["search_meter / search_tr", "ค้นหาข้อมูล"],
                  ["create / update / delete", "เพิ่ม แก้ไข ลบ Meter/TR"],
                  ["import_csv / export_csv", "นำเข้า/ส่งออกข้อมูล"],
                  ["change_password", "เปลี่ยนรหัสผ่าน (บันทึกใน password_history ด้วย)"],
                  ["reset_password_initiated", "เปิดหน้ารีเซ็ตรหัสผ่านผ่านลิงก์อีเมล"],
                  ["reset_password_failed", "รีเซ็ตรหัสผ่านไม่สำเร็จ (มี error)"],
                  ["enable_2fa / disable_2fa", "เปิด/ปิด 2FA"],
                  ["approve_user / ban_user", "อนุมัติ/ระงับผู้ใช้งาน"],
                  ["unlock_password", "Admin ปลดล็อครหัสผ่านหมดอายุ"],
                ]} />
                <UGNote>Audit Log แบ่งหน้า 50 รายการต่อหน้า — กรองตาม user, action, วันที่ได้</UGNote>
              </div>
            </UGSection>

            <UGSection icon="settings" title="ตั้งค่าระบบ" badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Maintenance Mode</div>
                <UGStep n={1} text="เปิด Toggle 'Maintenance Mode' — ผู้ใช้ทั่วไปจะเห็นหน้าปิดปรับปรุง" />
                <UGStep n={2} text="แก้ไขข้อความแจ้งผู้ใช้ แล้วกด 'บันทึกข้อความ'" />
                <UGStep n={3} text="เลือกวันที่/เวลาที่คาดว่าจะกลับมาผ่านปฏิทินไทย — กดปุ่มนาฬิกาเพื่อเปิด" />
                <UGStep n={4} text="นำทางเดือนด้วยปุ่ม ← → เลือกวัน จากนั้นปรับชั่วโมง/นาที แล้วกด 'ยืนยัน'" />
                <UGNote>Admin ยังคงเข้าใช้ระบบได้ปกติ — จะเห็น banner แจ้งเตือนแดงบน Topbar</UGNote>
                <UGTip>อย่าลืมปิด Maintenance Mode หลังงานเสร็จ — กดปุ่ม "เปิดระบบ" ใน banner ได้เลย</UGTip>
                <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>ข้อมูลนักพัฒนาระบบ</div>
                <UGStep n={1} text="กรอกชื่อ, ตำแหน่ง, หน่วยงาน, สถานที่ ในการ์ด 'ข้อมูลนักพัฒนาระบบ'" />
                <UGStep n={2} text="เปิด Toggle 'แสดงปุ่มนักพัฒนา' — ปุ่มลอยจะปรากฏที่มุมหน้าจอ" />
                <UGStep n={3} text="ลากปุ่มไปวางตำแหน่งที่ต้องการ — ระบบจำตำแหน่งไว้อัตโนมัติ" />
                <UGNote>ทั้ง Maintenance Mode และข้อมูลนักพัฒนา สามารถย่อ/ขยายได้โดยกดหัวการ์ด</UGNote>
              </div>
            </UGSection>

            <UGSection icon="bolt" title="ประวัติการปรับปรุง UX/UI" badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  ["รายการ", "รายละเอียด"],
                  ["ตำแหน่ง", "Sidebar (desktop) / Bottom nav (mobile) — ไอคอน ⚡ 'อัปเดต'"],
                  ["สิทธิ์", "Admin เท่านั้น"],
                  ["ข้อมูล", "Timeline ทุก version พร้อมวันที่, category chip, stat summary"],
                  ["Deploy Status dot", "จุดสีใน Topbar — 🟢 ปัจจุบัน / 🟡 รอ Deploy / ⚫ กำลังโหลด"],
                ]} />
                <UGStep n={1} text="กดแท็บ 'อัปเดต ⚡' ใน sidebar — timeline แสดงทุก version ตั้งแต่ v2.0" />
                <UGStep n={2} text="การ์ด Deployment Status ด้านบน timeline — เปรียบเทียบ hash ที่รันกับ GitHub latest" />
                <UGStep n={3} text="แต่ละรายการมี chip บอกประเภท: ใหม่ / UX/UI / แก้ไข / ประสิทธิภาพ" />
                <UGStep n={4} text="กดจุดสีใน Topbar เพื่อดู popup สถานะ deploy ได้ทันทีโดยไม่ต้องเปิดหน้า อัปเดต" />
                <UGTip>หลังจาก push โค้ดขึ้น GitHub Pages ใช้เวลา 1–3 นาที — สถานะจะเปลี่ยนเป็น 🟢 โดยอัตโนมัติ</UGTip>
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

// ── PasswordExpiredScreen ─────────────────────────────────────────────────
function PasswordExpiredScreen({ currentUser, onLogout }) {
  const initials = (currentUser?.name || currentUser?.username || "?")[0].toUpperCase();
  const firstName = (currentUser?.name || currentUser?.username || "").split(" ")[0];
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center",
      background: "radial-gradient(120% 100% at 0% 0%, #8b3fc4 0%, #321148 60%, #1b0926 100%)", padding: "0 16px" }}>
      <div className="fade-up" style={{ width: "100%", maxWidth: 500,
        background: "var(--surface)", borderRadius: 24, boxShadow: "0 28px 72px rgba(0,0,0,0.55)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#991b1b 0%,#dc2626 60%,#ef4444 100%)",
          padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160,
            borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}>
              <Icon name="lock" size={24} stroke={2} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "white", lineHeight: 1.2 }}>รหัสผ่านหมดอายุ</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Password Expired</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, position: "relative" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>สวัสดี</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>{firstName}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.5)",
              display: "grid", placeItems: "center", fontWeight: 800, fontSize: 16, color: "white" }}>
              {initials}
            </div>
          </div>
        </div>
        <div style={{ padding: "24px 28px 28px" }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>รหัสผ่านของคุณหมดอายุแล้ว</div>
          <div className="t-mute" style={{ fontSize: 14, lineHeight: 1.75, marginBottom: 20 }}>
            รหัสผ่านมีอายุ 45 วัน คุณไม่สามารถเข้าสู่ระบบได้จนกว่าผู้ดูแลระบบจะปลดล็อค<br />
            กรุณาติดต่อผู้ดูแลระบบเพื่อขอรีเซ็ตสถานะรหัสผ่าน
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px",
            borderRadius: 12, marginBottom: 20, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Icon name="warning" size={16} style={{ color: "#dc2626", flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6 }}>
              เมื่อผู้ดูแลระบบปลดล็อคแล้ว ระบบจะพาคุณไปยังหน้าเปลี่ยนรหัสผ่านทันที
            </div>
          </div>
          <button className="btn btn-outline" style={{ width: "100%", height: 46 }} onClick={onLogout}>
            <Icon name="logout" size={14} /> ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ResetPasswordScreen — via email recovery link ─────────────────────────
function ResetPasswordScreen({ recoveryUser, onComplete }) {
  const [newPw, setNewPw]         = useStateApp("");
  const [confirmPw, setConfirmPw] = useStateApp("");
  const [showNew, setShowNew]     = useStateApp(false);
  const [showConf, setShowConf]   = useStateApp(false);
  const [err, setErr]             = useStateApp(null);
  const [saving, setSaving]       = useStateApp(false);
  const [done, setDone]           = useStateApp(false);

  // Log when user actually arrives at the reset form (link was clicked & code exchanged)
  useEffectApp(() => {
    if (!recoveryUser?.id) return;
    _supabase.from("audit_log").insert({
      user_id: recoveryUser.id, username: recoveryUser.email || "",
      action: "reset_password_initiated", target: recoveryUser.email || "",
      detail: "เข้าสู่หน้ารีเซ็ตรหัสผ่านผ่านลิงก์อีเมล",
      ip: (navigator.userAgent || "").slice(0, 200),
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
  const sColors  = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
  const confirmOk  = confirmPw.length > 0 && confirmPw === newPw;
  const confirmBad = confirmPw.length > 0 && confirmPw !== newPw;

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!Object.values(checks).every(Boolean)) { setErr("รหัสผ่านต้องผ่านทุกเงื่อนไข"); return; }
    if (newPw !== confirmPw) { setErr("รหัสผ่านไม่ตรงกัน"); return; }
    setSaving(true);
    try {
      const { error: pwErr } = await _supabase.auth.updateUser({ password: newPw });
      if (pwErr) throw pwErr;
      const now = new Date().toISOString();
      const uid = recoveryUser?.id;
      const uname = recoveryUser?.email || "";
      if (uid) {
        await Promise.all([
          _supabase.from("profiles").update({ password_changed_at: now, pw_force_change: false }).eq("id", uid),
          _supabase.from("password_history").insert({ user_id: uid, username: uname, changed_at: now, action: "reset", note: "รีเซ็ตรหัสผ่านผ่านลิงก์อีเมล" }),
          _supabase.from("audit_log").insert({ user_id: uid, username: uname, action: "change_password", target: uname, detail: "รีเซ็ตรหัสผ่านผ่านลิงก์อีเมล", ip: (navigator.userAgent||"").slice(0,200) }),
        ]);
      }
      setDone(true);
      setTimeout(async () => { await _supabase.auth.signOut(); onComplete(); }, 2200);
    } catch (e2) {
      if (recoveryUser?.id) {
        _supabase.from("audit_log").insert({
          user_id: recoveryUser.id, username: recoveryUser.email || "",
          action: "reset_password_failed", target: recoveryUser.email || "",
          detail: `รีเซ็ตรหัสผ่านไม่สำเร็จ: ${e2.message || "Unknown error"}`,
          ip: (navigator.userAgent || "").slice(0, 200),
        });
      }
      setErr(e2.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center",
      background: "radial-gradient(120% 100% at 0% 0%, #1d4ed8 0%, #1e3a5f 55%, #0f172a 100%)",
      padding: "0 16px", overflow: "auto" }}>
      <div className="fade-up" style={{ width: "100%", maxWidth: 460, margin: "20px auto",
        background: "var(--surface)", borderRadius: 24, boxShadow: "0 24px 72px rgba(0,0,0,0.55)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#1d4ed8 0%,#2563eb 55%,#3b82f6 130%)",
          padding: "28px 28px 22px", color: "white", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", right: -50, top: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: -30, bottom: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)",
              display: "grid", placeItems: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
              <Icon name="key" size={26} stroke={2} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: 2 }}>ตั้งค่ารหัสผ่านใหม่</div>
              <div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1.2 }}>รีเซ็ตรหัสผ่าน</div>
            </div>
          </div>
          {recoveryUser?.email && (
            <div style={{ marginTop: 16, position: "relative", display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}>
              <Icon name="mail" size={14} style={{ flexShrink: 0, opacity: 0.8 }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{recoveryUser.email}</span>
            </div>
          )}
        </div>

        {done ? (
          /* Success state */
          <div style={{ padding: "40px 28px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              display: "grid", placeItems: "center", boxShadow: "0 12px 32px rgba(22,163,74,0.35)" }}>
              <Icon name="check" size={32} style={{ color: "white" }} stroke={2.5} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>รีเซ็ตสำเร็จ!</div>
            <div style={{ fontSize: 14, color: "var(--ink-mute)", lineHeight: 1.6 }}>
              รหัสผ่านของคุณถูกอัปเดตแล้ว<br />กำลังพาไปหน้าเข้าสู่ระบบ…
            </div>
            <div style={{ marginTop: 20, height: 3, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
              <div className="fade-in" style={{ height: "100%", background: "linear-gradient(90deg,#22c55e,#16a34a)", animation: "grow 2.2s linear forwards",
                width: "0%", borderRadius: 99 }} />
            </div>
            <style>{`@keyframes grow { from{width:0%} to{width:100%} }`}</style>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: "24px 28px 28px" }}>

            {/* New password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>รหัสผ่านใหม่</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showNew ? "text" : "password"} value={newPw}
                  onChange={e => setNewPw(e.target.value)} placeholder="รหัสผ่านใหม่"
                  style={{ paddingRight: 44, borderColor: newPw && (strength < 5 ? sColors[strength] : "#22c55e") }} />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-mute)" }}>
                  <Icon name={showNew ? "eyeOff" : "eye"} size={16} />
                </button>
              </div>
              {/* Strength bar */}
              {newPw && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 99,
                        background: i <= strength ? sColors[strength] : "var(--line)",
                        transition: "background 200ms" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                    {[
                      { key: "length",  label: "8+ ตัวอักษร" },
                      { key: "upper",   label: "A-Z" },
                      { key: "lower",   label: "a-z" },
                      { key: "number",  label: "0-9" },
                      { key: "special", label: "อักขระพิเศษ" },
                    ].map(r => (
                      <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11,
                        color: checks[r.key] ? "#16a34a" : "var(--ink-mute)", fontWeight: checks[r.key] ? 700 : 400 }}>
                        <Icon name={checks[r.key] ? "check" : "close"} size={10} />
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>ยืนยันรหัสผ่าน</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showConf ? "text" : "password"} value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง"
                  style={{ paddingLeft: 42, paddingRight: 44,
                    borderColor: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : undefined }} />
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  color: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : "var(--ink-mute)" }}>
                  <Icon name={confirmOk ? "check" : "lock"} size={15} />
                </span>
                <button type="button" onClick={() => setShowConf(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-mute)" }}>
                  <Icon name={showConf ? "eyeOff" : "eye"} size={16} />
                </button>
              </div>
              {confirmOk  && <div style={{ marginTop: 5, fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ รหัสผ่านตรงกัน</div>}
              {confirmBad && <div style={{ marginTop: 5, fontSize: 11, color: "var(--red)", fontWeight: 600 }}>✗ รหัสผ่านไม่ตรงกัน</div>}
            </div>

            {err && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)", color: "#dc2626", fontSize: 13, marginBottom: 16,
                display: "flex", gap: 8, alignItems: "center" }}>
                <Icon name="warning" size={14} style={{ flexShrink: 0 }} />
                {err}
              </div>
            )}

            <button type="submit" disabled={saving || !confirmOk}
              style={{ width: "100%", height: 48, borderRadius: 14, border: "none", cursor: saving || !confirmOk ? "not-allowed" : "pointer",
                background: saving || !confirmOk ? "var(--line)" : "linear-gradient(135deg,#1d4ed8,#2563eb)",
                color: saving || !confirmOk ? "var(--ink-mute)" : "white",
                fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 180ms", boxShadow: !saving && confirmOk ? "0 8px 24px rgba(29,78,216,0.35)" : "none" }}>
              {saving ? <><Icon name="refresh" size={16} />กำลังรีเซ็ต…</> : <><Icon name="key" size={16} />ตั้งรหัสผ่านใหม่</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── ForcePasswordChangeScreen ─────────────────────────────────────────────
function ForcePasswordChangeScreen({ currentUser, supabaseUser, onComplete }) {
  const [newPw, setNewPw]         = useStateApp("");
  const [confirmPw, setConfirmPw] = useStateApp("");
  const [showNew, setShowNew]     = useStateApp(false);
  const [showConf, setShowConf]   = useStateApp(false);
  const [err, setErr]             = useStateApp(null);
  const [saving, setSaving]       = useStateApp(false);

  const checks = {
    length:  newPw.length >= 8,
    upper:   /[A-Z]/.test(newPw),
    lower:   /[a-z]/.test(newPw),
    number:  /[0-9]/.test(newPw),
    special: /[^A-Za-z0-9]/.test(newPw),
  };
  const strength = Object.values(checks).filter(Boolean).length;
  const sColors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
  const confirmOk  = confirmPw.length > 0 && confirmPw === newPw;
  const confirmBad = confirmPw.length > 0 && confirmPw !== newPw;

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!Object.values(checks).every(Boolean)) { setErr("รหัสผ่านต้องผ่านทุกเงื่อนไข"); return; }
    if (newPw !== confirmPw) { setErr("รหัสผ่านไม่ตรงกัน"); return; }
    setSaving(true);
    try {
      const { error: pwErr } = await _supabase.auth.updateUser({ password: newPw });
      if (pwErr) throw pwErr;
      const now = new Date().toISOString();
      await _supabase.from("profiles").update({ password_changed_at: now, pw_force_change: false }).eq("id", supabaseUser.id);
      await _supabase.from("password_history").insert({
        user_id: supabaseUser.id, username: currentUser.username,
        changed_at: now, action: "force_change", note: "เปลี่ยนรหัสผ่านหลังถูกบังคับโดยผู้ดูแลระบบ",
      });
      await _supabase.from("audit_log").insert({
        user_id: supabaseUser.id, username: currentUser.username,
        action: "change_password", target: currentUser.username,
        detail: "เปลี่ยนรหัสผ่าน (บังคับ — ผู้ดูแลระบบปลดล็อค)",
        ip: (navigator.userAgent || "").substring(0, 200),
      });
      onComplete();
    } catch (e2) {
      setErr(e2.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center",
      background: "radial-gradient(120% 100% at 0% 0%, #8b3fc4 0%, #321148 60%, #1b0926 100%)",
      padding: "0 16px", overflow: "auto" }}>
      <div className="fade-up" style={{ width: "100%", maxWidth: 460, margin: "20px auto",
        background: "var(--surface)", borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", padding: "24px 28px 20px",
          color: "white", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160,
            borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}>
              <Icon name="lock" size={22} stroke={2} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>ตั้งรหัสผ่านใหม่</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>สวัสดี, <b>{currentUser.name || currentUser.username}</b></div>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 28px 28px" }}>
          <div style={{ padding: "12px 16px", borderRadius: 12, marginBottom: 20,
            background: "rgba(244,123,32,0.08)", border: "1px solid rgba(244,123,32,0.2)",
            display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="warning" size={16} style={{ color: "var(--pea-orange-500)", flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              ผู้ดูแลระบบกำหนดให้คุณต้องเปลี่ยนรหัสผ่าน — คุณจะใช้งานระบบได้หลังตั้งรหัสผ่านใหม่เท่านั้น
            </div>
          </div>

          <form className="f-col f-gap-4" onSubmit={submit}>
            <div className="field">
              <label className="field-label">รหัสผ่านใหม่</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showNew ? "text" : "password"}
                  style={{ paddingLeft: 42, paddingRight: 44 }}
                  value={newPw} onChange={e => { setNewPw(e.target.value); setErr(null); }}
                  placeholder="รหัสผ่านใหม่" autoComplete="new-password" autoFocus />
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", pointerEvents: "none" }}>
                  <Icon name="lock" size={18} />
                </div>
                <button type="button" onClick={() => setShowNew(s => !s)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", width: 32, height: 32 }}>
                  <Icon name={showNew ? "eyeOff" : "eye"} size={18} />
                </button>
              </div>
              {newPw.length > 0 && (
                <>
                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= strength ? sColors[strength] : "var(--line)", transition: "background 300ms" }} />
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", marginTop: 8 }}>
                    {[
                      { ok: checks.length,  label: "ตัวอักษร ≥ 8" },
                      { ok: checks.upper,   label: "ตัวพิมพ์ใหญ่" },
                      { ok: checks.lower,   label: "ตัวพิมพ์เล็ก" },
                      { ok: checks.number,  label: "ตัวเลข" },
                      { ok: checks.special, label: "อักขระพิเศษ" },
                    ].map(r => (
                      <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11,
                        color: r.ok ? "#16a34a" : "var(--ink-mute)", fontWeight: r.ok ? 700 : 400 }}>
                        <span>{r.ok ? "✓" : "○"}</span>{r.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="field">
              <label className="field-label">ยืนยันรหัสผ่าน</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showConf ? "text" : "password"}
                  style={{ paddingLeft: 42, paddingRight: 44,
                    borderColor: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : undefined }}
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="ยืนยันรหัสผ่านอีกครั้ง" autoComplete="new-password" />
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
                  color: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : "var(--ink-mute)" }}>
                  <Icon name={confirmOk ? "check" : "lock"} size={18} />
                </div>
                <button type="button" onClick={() => setShowConf(s => !s)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", width: 32, height: 32 }}>
                  <Icon name={showConf ? "eyeOff" : "eye"} size={18} />
                </button>
              </div>
              {confirmBad && <div style={{ marginTop: 5, fontSize: 11, color: "var(--red)", fontWeight: 600 }}>รหัสผ่านไม่ตรงกัน</div>}
              {confirmOk  && <div style={{ marginTop: 5, fontSize: 11, color: "#16a34a", fontWeight: 600 }}>รหัสผ่านตรงกัน ✓</div>}
            </div>

            {err && (
              <div className="badge badge-red" style={{ padding: "8px 12px", alignSelf: "flex-start" }}>
                <Icon name="close" size={14} /> {err}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ height: 48 }} disabled={saving || !confirmOk}>
              {saving ? "กำลังบันทึก…" : <><Icon name="check" size={14} /> ตั้งรหัสผ่านใหม่</>}
            </button>
          </form>

          <button onClick={async () => { await _supabase.auth.signOut(); }}
            style={{ marginTop: 14, width: "100%", padding: 10, textAlign: "center", color: "var(--ink-mute)", fontSize: 13, background: "none" }}>
            ออกจากระบบแทน
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DevInfo floating button & modal ───────────────────────────────────────
function DevInfoModal({ devInfo, onClose }) {
  const [expanded, setExpanded] = useStateApp(false);
  const initials = (devInfo.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hasDetails = devInfo.database || devInfo.stack || devInfo.systems;

  return (
    <div
      onClick={onClose}
      className="pea-modal-overlay" style={{ zIndex: 9000 }}
    >
      <div onClick={e => e.stopPropagation()} className="fade-up" style={{ background: "var(--surface)", borderRadius: 24, width: "100%", maxWidth: 420, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
        {/* Gradient header */}
        <div style={{ background: "linear-gradient(135deg,#6b2c91 0%,#8b3fc4 50%,#f47b20 130%)", padding: "28px 24px 24px", color: "white", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: -20, bottom: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.75, marginBottom: 16, position: "relative" }}>DEVELOPED BY</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.35)", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{devInfo.name || "—"}</div>
              {devInfo.position && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>{devInfo.position}</div>}
              {devInfo.department && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{devInfo.department}</div>}
            </div>
          </div>
          {devInfo.location && (
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600, position: "relative" }}>
              <Icon name="location" size={12} /> {devInfo.location}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {hasDetails && (
            <div>
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--soft)", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 12, justifyContent: "space-between" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="info" size={14} /> รายละเอียดเพิ่มเติม</span>
                <Icon name={expanded ? "chevUp" : "chevDown"} size={14} />
              </button>

              {expanded && (
                <div className="fade-up f-col f-gap-2" style={{ marginBottom: 12 }}>
                  {devInfo.database && (
                    <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--soft)", border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 12, marginBottom: 6, color: "var(--pea-orange-500)" }}>
                        <Icon name="database" size={13} /> ฐานข้อมูล
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>{devInfo.database}</div>
                    </div>
                  )}
                  {devInfo.stack && (
                    <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--soft)", border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 12, marginBottom: 6, color: "var(--pea-orange-500)" }}>
                        <Icon name="cpu" size={13} /> Tech Stack
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>{devInfo.stack}</div>
                    </div>
                  )}
                  {devInfo.systems && (
                    <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--soft)", border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 12, marginBottom: 6, color: "var(--pea-orange-500)" }}>
                        <Icon name="link" size={13} /> ระบบ/การเชื่อมต่อ
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>{devInfo.systems}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>{devInfo.footer || "พัฒนาเพื่อใช้งานภายใน การไฟฟ้าส่วนภูมิภาค (PEA)"}</div>
            {devInfo.version && (
              <span className="badge" style={{ fontSize: 10, background: "rgba(107,44,145,0.12)", color: "#6b2c91", borderRadius: 999, padding: "3px 9px", fontWeight: 700 }}>v{devInfo.version}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DevInfoButton({ devInfo }) {
  const [open, setOpen] = useStateApp(false);
  const getSavedPos = () => {
    try {
      const s = localStorage.getItem("pea_devbtn_pos");
      if (s) return JSON.parse(s);
    } catch (_) {}
    return { x: window.innerWidth - 160, y: window.innerHeight - 60 };
  };
  const [pos, setPos] = useStateApp(getSavedPos);
  const dragging = React.useRef(false);
  const moved = React.useRef(false);
  const offset = React.useRef({ x: 0, y: 0 });

  useEffectApp(() => {
    const clamp = (p) => ({
      x: Math.min(Math.max(0, p.x), window.innerWidth  - 160),
      y: Math.min(Math.max(0, p.y), window.innerHeight - 60),
    });

    const onMove = (cx, cy) => {
      if (!dragging.current) return;
      moved.current = true;
      const next = clamp({ x: cx - offset.current.x, y: cy - offset.current.y });
      setPos(next);
    };
    const onUp = () => { dragging.current = false; };

    const onMouseMove = e => onMove(e.clientX, e.clientY);
    const onTouchMove = e => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onResize = () => setPos(p => clamp(p));

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend",  onUp);
    window.addEventListener("resize",    onResize);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend",  onUp);
      window.removeEventListener("resize",    onResize);
    };
  }, []);

  useEffectApp(() => {
    try { localStorage.setItem("pea_devbtn_pos", JSON.stringify(pos)); } catch (_) {}
  }, [pos.x, pos.y]);

  if (!devInfo.showBtn || !devInfo.name) return null;
  const firstName = devInfo.name.split(" ")[0];

  const startDrag = (cx, cy) => {
    dragging.current = true;
    moved.current = false;
    offset.current = { x: cx - pos.x, y: cy - pos.y };
  };

  return (
    <>
      <button
        onMouseDown={e => startDrag(e.clientX, e.clientY)}
        onTouchStart={e => { if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY); }}
        onClick={() => { if (!moved.current) setOpen(true); }}
        style={{
          position: "fixed", left: pos.x, top: pos.y, zIndex: 800,
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px 8px 10px", borderRadius: 999,
          background: "linear-gradient(135deg,#6b2c91,#8b3fc4)",
          color: "white", border: "none", cursor: "grab",
          boxShadow: "0 4px 20px rgba(107,44,145,0.45)",
          fontSize: 13, fontWeight: 700, userSelect: "none",
          touchAction: "none",
        }}
      >
        <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}>
          <Icon name="code" size={14} />
        </span>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 9, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.08em" }}>พัฒนาโดย</div>
          <div style={{ fontSize: 13 }}>{firstName}</div>
        </div>
      </button>
      {open && <DevInfoModal devInfo={devInfo} onClose={() => setOpen(false)} />}
    </>
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
  const [devInfo, setDevInfo] = useStateApp({
    name: "", position: "", department: "", location: "",
    database: "", stack: "", systems: "",
    version: "1.0.0", footer: "", showBtn: false,
  });
  const [daysUntilExpiry, setDaysUntilExpiry] = useStateApp(null);

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
      setDevInfo({
        name:       settingsMap["dev_name"]       || "",
        position:   settingsMap["dev_position"]   || "",
        department: settingsMap["dev_department"] || "",
        location:   settingsMap["dev_location"]   || "",
        database:   settingsMap["dev_database"]   || "",
        stack:      settingsMap["dev_stack"]      || "",
        systems:    settingsMap["dev_systems"]    || "",
        version:    settingsMap["dev_version"]    || "1.0.0",
        footer:     settingsMap["dev_footer"]     || "พัฒนาเพื่อใช้งานภายใน การไฟฟ้าส่วนภูมิภาค (PEA)",
        showBtn:    settingsMap["dev_show_btn"]   === "true",
      });
      if (isMaintenance && myProfile.role !== "admin") {
        setCurrentUser(toProfile({ ...myProfile, email: supabaseUser.email }));
        setAppState("maintenance");
        return;
      }

      // ── Password expiry check ─────────────────────────────────────────────
      if (myProfile.pw_force_change) {
        setPendingUser(supabaseUser);
        setCurrentUser(toProfile({ ...myProfile, email: supabaseUser.email }));
        setAppState("pw_force_change");
        return;
      }
      const pwChangedAt = myProfile.password_changed_at ? new Date(myProfile.password_changed_at) : null;
      if (pwChangedAt) {
        const daysOld  = (Date.now() - pwChangedAt.getTime()) / (1000 * 60 * 60 * 24);
        const daysLeft = Math.ceil(45 - daysOld);
        if (daysLeft <= 0) {
          setPendingUser(supabaseUser);
          setCurrentUser(toProfile({ ...myProfile, email: supabaseUser.email }));
          setAppState("pw_expired");
          return;
        }
        setDaysUntilExpiry(daysLeft);
      } else {
        setDaysUntilExpiry(null);
      }
      // ── end password expiry check ─────────────────────────────────────────

      // ── Recovery intercept — skip 2FA and load, go straight to reset ────
      if (sessionStorage.getItem("pea_recovery") || inRecoveryRef.current) {
        sessionStorage.removeItem("pea_recovery");
        inRecoveryRef.current = true;
        setCurrentUser(toProfile({ ...myProfile, email: supabaseUser.email }));
        setPendingUser(supabaseUser);
        setAppState("pw_reset");
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
  const inRecoveryRef = React.useRef(false);

  useEffectApp(() => {
    // Pre-arm ref BEFORE async callbacks — ensures getSession callback sees the flag
    if (_isRecoveryLoad || _hasOAuthCode) inRecoveryRef.current = true;

    _supabase.auth.getSession().then(({ data: { session } }) => {
      if (inRecoveryRef.current) {
        // Recovery/PKCE mode: if code was already exchanged, session is ready now
        if (session?.user) {
          setPendingUser(session.user);
          setAppState("pw_reset");
        }
        // No session yet — PASSWORD_RECOVERY or SIGNED_IN will handle it
        return;
      }
      if (session?.user) {
        loadAppData(session.user, false); // session restore — ไม่ log login ซ้ำ
      } else {
        setAppState("unauthed");
      }
    });

    const { data: { subscription } } = _supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("pea_recovery", "1");
        inRecoveryRef.current = true;
        setPendingUser(session?.user || null);
        setAppState("pw_reset");
        return;
      }
      if (event === "SIGNED_IN" && session?.user) {
        if (sessionStorage.getItem("pea_recovery") || inRecoveryRef.current) {
          // Recovery flow — route directly; skip loadAppData so 2FA never intercepts
          inRecoveryRef.current = true;
          sessionStorage.removeItem("pea_recovery");
          setPendingUser(session.user);
          setAppState("pw_reset");
          return;
        }
        loadAppData(session.user, true); // normal login — log it
        return;
      }
      if (event === "SIGNED_OUT") {
        inRecoveryRef.current = false;
        sessionStorage.removeItem("pea_recovery");
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

  if (appState === "pw_expired") return (
    <PasswordExpiredScreen
      currentUser={currentUser}
      onLogout={async () => { await _supabase.auth.signOut(); }}
    />
  );

  if (appState === "pw_reset") return (
    <ResetPasswordScreen
      recoveryUser={pendingUser}
      onComplete={() => { inRecoveryRef.current = false; sessionStorage.removeItem("pea_recovery"); setPendingUser(null); setAppState("unauthed"); }}
    />
  );

  if (appState === "pw_force_change") return (
    <ForcePasswordChangeScreen
      currentUser={currentUser}
      supabaseUser={pendingUser}
      onComplete={() => loadAppData(pendingUser, false)}
    />
  );

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

  const isAdmin = currentUser.role === "admin";
  const navItems = [
    { id: "search",    icon: "search",   label: t("navSearch")    },
    { id: "profile",   icon: "user",     label: t("navProfile")   },
    { id: "guide",     icon: "book",     label: t("navGuide")     },
    ...(isAdmin ? [
      { id: "changelog", icon: "bolt",     label: "อัปเดต"          },
      { id: "admin",     icon: "settings", label: t("navAdmin")     },
    ] : []),
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
    ...(isAdmin ? [{ id: "dev", icon: "code", label: t("admDev") }] : []),
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
          <div className="sidebar-brand" style={{ padding: "4px 6px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img src="logo.svg" alt="PEA" style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                boxShadow: "0 12px 32px rgba(139,63,196,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
              }} />
              <div className="sidebar-brand-text">
                <div style={{ fontSize: 10, letterSpacing: "0.22em", fontWeight: 800, color: "#ffba7a", textTransform: "uppercase", marginBottom: 3 }}>
                  การไฟฟ้าส่วนภูมิภาค
                </div>
                <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.1, letterSpacing: "-0.01em" }}>Meter &amp; TR</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4, fontWeight: 500 }}>GIS Mapping System</div>
              </div>
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

          {/* Deploy status dot — admin only */}
          {currentUser.role === "admin" && <DeployStatusDot />}

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

        {/* Password Expiry Warning Banner */}
        {daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
            background: daysUntilExpiry <= 1
              ? "linear-gradient(90deg,#7c2d12,#9a3412)"
              : daysUntilExpiry <= 3
              ? "linear-gradient(90deg,#78350f,#92400e)"
              : "linear-gradient(90deg,#1e3a5f,#1d4ed8)",
            color: "white", flexShrink: 0, flexWrap: "wrap",
            borderBottom: "2px solid rgba(255,255,255,0.15)",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              <Icon name="warning" size={16} />
              {daysUntilExpiry <= 1
                ? "⚠️ รหัสผ่านหมดอายุพรุ่งนี้!"
                : `⚠️ รหัสผ่านหมดอายุใน ${daysUntilExpiry} วัน`}
            </span>
            <span style={{ fontSize: 12, opacity: 0.9, flex: 1 }}>
              กรุณาเปลี่ยนรหัสผ่านก่อนหมดอายุ มิฉะนั้นจะไม่สามารถเข้าสู่ระบบได้
            </span>
            <button
              onClick={() => setRoute("profile")}
              style={{
                padding: "5px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.5)",
                background: "rgba(255,255,255,0.15)", color: "white",
                cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0,
                backdropFilter: "blur(4px)",
              }}
            >
              <Icon name="lock" size={12} /> เปลี่ยนรหัสผ่าน
            </button>
          </div>
        )}

        {/* Maintenance Mode Warning Banner — admin only */}
        {maintenanceMode && currentUser.role === "admin" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 20px",
            background: "linear-gradient(90deg,#7c2d12,#9a3412,#c2410c)",
            color: "white", flexShrink: 0, flexWrap: "wrap",
            borderBottom: "2px solid rgba(255,255,255,0.15)",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              <Icon name="warning" size={16} />
              ⚠️ ระบบปิดปรับปรุงอยู่
            </span>
            <span style={{ fontSize: 12, opacity: 0.9, flex: 1 }}>
              ผู้ใช้ทั่วไปไม่สามารถเข้าใช้งานได้ในขณะนี้
              {maintenanceUntil && ` · คาดว่าเปิดให้บริการ: ${new Date(maintenanceUntil).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
            </span>
            <button
              onClick={() => { setRoute("admin"); setAdminTab("settings"); }}
              style={{
                padding: "5px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.5)",
                background: "rgba(255,255,255,0.15)", color: "white",
                cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0,
                backdropFilter: "blur(4px)",
              }}
            >
              <Icon name="settings" size={12} /> เปิดระบบ
            </button>
          </div>
        )}

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
            <ProfileView currentUser={currentUser} data={data} addAudit={addAudit}
              onPasswordChanged={() => setDaysUntilExpiry(45)} />
          )}
          {route === "guide" && (
            <UserGuide role={currentUser.role} />
          )}
          {route === "changelog" && currentUser.role === "admin" && (
            <ChangelogView />
          )}
          {route === "admin" && currentUser.role === "admin" && (
            <AdminPanel data={data} setData={setData} currentUser={currentUser} addAudit={addAudit}
              tab={adminTab} setTab={setAdminTab}
              maintenanceMode={maintenanceMode} setMaintenanceMode={setMaintenanceMode}
              maintenanceMessage={maintenanceMessage} setMaintenanceMessage={setMaintenanceMessage}
              maintenanceUntil={maintenanceUntil} setMaintenanceUntil={setMaintenanceUntil}
              devInfo={devInfo} setDevInfo={setDevInfo} />
          )}
        </main>

        <DevInfoButton devInfo={devInfo} />

        {/* Logout confirm dialog */}
        {showLogoutConfirm && (
          <div className="fade-in pea-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
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
