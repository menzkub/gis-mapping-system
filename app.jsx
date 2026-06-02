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
  const [currentPw, setCurrentPw] = useStateApp("");
  const [newPw, setNewPw]         = useStateApp("");
  const [confirmPw, setConfirmPw] = useStateApp("");
  const [showCurrentPw, setShowCurrentPw] = useStateApp(false);
  const [showNewPw, setShowNewPw]         = useStateApp(false);
  const [showConfirmPw, setShowConfirmPw] = useStateApp(false);
  const [saving, setSaving]       = useStateApp(false);
  const [err, setErr]             = useStateApp(null);
  const [pwHistory, setPwHistory]     = useStateApp([]);
  const [pwHistLoad, setPwHistLoad]   = useStateApp(false);
  const [pwSuccess, setPwSuccess] = useStateApp(false);
  const [mfaStatus, setMfaStatus] = useStateApp(null); // null=loading | true=enrolled | false=not
  const [show2FASetup, setShow2FASetup] = useStateApp(false);
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
    if (!currentPw.trim()) {
      setErr(t("currentPwRequired")); return;
    }
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
    const { error } = await _supabase.auth.updateUser({ password: newPw, nonce: currentPw });
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
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSuccess(false), 4000);
    }
  };

  const disable2FA = async () => {
    const ok = await confirm({
      title: "ปิดใช้งาน 2FA",
      message: <>ปิด 2FA สำหรับบัญชี <b>{currentUser.username}</b>? บัญชีจะมีความปลอดภัยน้อยลง และ Backup Codes ทั้งหมดจะถูกลบ</>,
      confirmText: "ปิด 2FA",
      cancelText: "ยกเลิก",
      tone: "danger",
    });
    if (!ok) return;
    const { data: factors } = await _supabase.auth.mfa.listFactors();
    for (const f of (factors?.all || [])) {
      await _supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {});
    }
    await _supabase.from("mfa_backup_codes").delete().eq("user_id", currentUser.id);
    setMfaStatus(false);
    await addAudit({ user: currentUser.username, action: "disable_2fa", target: currentUser.username, detail: "ปิด 2FA และลบ Backup Codes แล้ว" });
    toast?.("ปิด 2FA เรียบร้อยแล้ว", "success");
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

      {/* ── 2FA Status ── */}
      {tab === "password" && (
        <div className="card card-elev fade-up" style={{ maxWidth: 480, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t("f2FA")}</div>
              <div className="t-mute text-sm">
                {mfaStatus === null ? "กำลังตรวจสอบ…" : mfaStatus ? "เปิดใช้งานอยู่" : "ยังไม่ได้เปิดใช้งาน"}
              </div>
            </div>
            <span style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: mfaStatus ? "rgba(22,163,74,0.12)" : "rgba(239,68,68,0.1)",
              color: mfaStatus ? "#16a34a" : "#dc2626",
              border: `1px solid ${mfaStatus ? "#16a34a44" : "#ef444444"}`,
            }}>
              {mfaStatus === null ? "…" : mfaStatus ? "🔒 เปิดอยู่" : "ปิดอยู่"}
            </span>
          </div>
          {mfaStatus === false && (
            <div>
              <div className="t-mute text-xs" style={{ marginBottom: 10, lineHeight: 1.6 }}>
                เพิ่มชั้นความปลอดภัยด้วย Authenticator App — ระบบจะขอรหัส 6 หลักทุกครั้งที่ login
              </div>
              <button className="btn btn-primary" style={{ height: 38, fontSize: 13 }}
                onClick={() => setShow2FASetup(true)}>
                <Icon name="lock" size={14} /> เปิดใช้งาน 2FA
              </button>
            </div>
          )}
          {mfaStatus === true && (
            <div className="t-mute text-xs" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="info" size={13} />
              หากต้องการปิด 2FA กรุณาติดต่อผู้ดูแลระบบ (Admin)
            </div>
          )}
        </div>
      )}
      {/* MFASetup modal portal */}
      {show2FASetup && ReactDOM.createPortal(
        <MFASetupScreen
          currentUser={currentUser}
          onComplete={async () => {
            setMfaStatus(true);
            setShow2FASetup(false);
            await addAudit({ user: currentUser.username, action: "enable_2fa", target: currentUser.username, detail: "เปิด 2FA ด้วยตนเอง" });
            toast?.("เปิด 2FA สำเร็จ — บัญชีมีความปลอดภัยมากขึ้น", "success");
          }}
          onCancel={() => setShow2FASetup(false)}
          completeBtnLabel="กลับไปโปรไฟล์"
        />,
        document.body
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
              <label className="field-label">{t("currentPassword")}</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showCurrentPw ? "text" : "password"}
                  style={{ paddingLeft: 42, paddingRight: 44 }}
                  value={currentPw} onChange={e => { setCurrentPw(e.target.value); setErr(null); }}
                  placeholder={t("currentPwPlaceholder")} autoComplete="current-password" required />
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", pointerEvents: "none" }}>
                  <Icon name="lock" size={18} />
                </div>
                <button type="button" onClick={() => setShowCurrentPw(s => !s)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", width: 32, height: 32 }}>
                  <Icon name={showCurrentPw ? "eyeOff" : "eye"} size={18} />
                </button>
              </div>
            </div>
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

// ── 2FA Backup Code Helpers ───────────────────────────────────────────────
function generateBackupCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ไม่มีตัวอักษรที่สับสน (0,O,1,I)
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  let code = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[arr[i] % chars.length];
  }
  return code; // รูปแบบ: XXXX-XXXX-XXXX
}
async function hashBackupCode(code) {
  const clean = code.toUpperCase().replace(/-/g, "");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clean));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── MFASetupScreen ────────────────────────────────────────────────────────
// SafeQR — วาด SVG ลง Canvas (raster image) เพื่อให้ scanner อ่านได้ทุก device
function SafeQR({ svg, size = 260 }) {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    if (!svg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, size, size);
    img.src = svg.startsWith("data:")
      ? svg
      : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }, [svg, size]);
  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

function MFASetupScreen({ currentUser, onComplete, onCancel, completeBtnLabel }) {
  const { useState: useStateMFAS, useEffect: useEffectMFAS } = React;
  const { lang } = useLang();
  const ug = (th, en) => lang === "en" ? en : th;
  const [step, setStep]       = useStateMFAS("loading"); // loading | scan | backup | error
  const [factorId, setFactorId] = useStateMFAS("");
  const [qrSvg, setQrSvg]     = useStateMFAS("");
  const [secret, setSecret]   = useStateMFAS("");
  const [code, setCode]       = useStateMFAS("");
  const [err, setErr]         = useStateMFAS(null);
  const [busy, setBusy]       = useStateMFAS(false);
  const [backupCodes, setBackupCodes] = useStateMFAS([]);
  const [copied, setCopied]   = useStateMFAS(false);

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
      // สร้างและบันทึก backup codes (hash ก่อนเก็บ)
      const codes = Array.from({ length: 10 }, generateBackupCode);
      const hashes = await Promise.all(codes.map(hashBackupCode));
      await _supabase.from("mfa_backup_codes").delete().eq("user_id", currentUser.id);
      await _supabase.from("mfa_backup_codes").insert(hashes.map(h => ({ user_id: currentUser.id, code_hash: h })));
      setBackupCodes(codes);
      setStep("backup");
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
            <div style={{ fontWeight: 800, fontSize: 20 }}>{ug("ตั้งค่า 2-Factor Auth", "Setup 2-Factor Auth")}</div>
            <div className="t-mute text-sm">{ug("บัญชี", "Account")} <b>{currentUser.username}</b> {ug("ต้องเปิดใช้งาน 2FA", "must enable 2FA")}</div>
          </div>
        </div>

        <div style={{ padding: "24px 28px 28px" }}>
          {step === "loading" && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-mute)" }}>
              <div style={{ width: 32, height: 32, margin: "0 auto 12px", borderRadius: "50%",
                border: "3px solid var(--line)", borderTopColor: "var(--pea-purple-500)",
                animation: "pea-spin 0.8s linear infinite" }} />
              {ug("กำลังสร้าง QR Code…", "Generating QR Code…")}
            </div>
          )}

          {step === "scan" && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{ug("ขั้นตอนที่ 1 — สแกน QR Code", "Step 1 — Scan QR Code")}</div>
                <div className="t-mute text-sm">{ug("เปิดแอป Authenticator เช่น Google Authenticator หรือ Authy แล้วสแกนรหัสด้านล่าง", "Open an Authenticator app (e.g. Google Authenticator or Authy) and scan the code below")}</div>
              </div>
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ background: "white", padding: 24, borderRadius: 12,
                  border: "1px solid var(--line)", display: "inline-block",
                  lineHeight: 0, colorScheme: "light" }}>
                  <SafeQR svg={qrSvg} size={260} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="t-mute text-xs" style={{ marginBottom: 4 }}>{ug("หรือกรอก Secret Key ด้วยตนเอง", "Or enter the Secret Key manually")}</div>
                <code style={{ fontFamily: "monospace", fontSize: 11, background: "var(--surface-2)",
                  padding: "6px 10px", borderRadius: 6, display: "block", wordBreak: "break-all",
                  letterSpacing: "0.12em", color: "var(--pea-purple-600)" }}>{secret}</code>
              </div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>{ug("ขั้นตอนที่ 2 — กรอกรหัส 6 หลักเพื่อยืนยัน", "Step 2 — Enter 6-digit code to verify")}</div>
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
                  {busy ? ug("กำลังยืนยัน…", "Verifying…") : <><Icon name="check" size={14} /> {ug("ยืนยัน & เปิดใช้งาน 2FA", "Verify & Enable 2FA")}</>}
                </button>
              </form>
            </div>
          )}

          {step === "backup" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: "rgba(139,63,196,0.12)", display: "grid", placeItems: "center" }}>
                  <Icon name="lock" size={18} style={{ color: "var(--pea-purple-600)" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{ug("รหัสสำรอง 2FA", "2FA Backup Codes")}</div>
                  <div className="t-mute text-xs">{ug("บันทึกรหัสเหล่านี้ในที่ปลอดภัย", "Save these codes in a safe place")}</div>
                </div>
              </div>
              <div style={{ background: "var(--surface-2)", borderRadius: 10, marginBottom: 12,
                border: "1px solid var(--line)", overflow: "hidden" }}>
                {backupCodes.map((c, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 14px",
                    borderBottom: i < backupCodes.length - 1 ? "1px solid var(--line)" : "none",
                  }}>
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600,
                      letterSpacing: "0.1em", color: "var(--pea-purple-600)" }}>{c}</span>
                    <span className="t-mute" style={{ fontSize: 11, background: "var(--surface)",
                      padding: "2px 7px", borderRadius: 20, border: "1px solid var(--line)" }}>#{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="badge badge-orange" style={{ padding: "8px 12px", marginBottom: 14, fontSize: 12 }}>
                <Icon name="alert" size={13} /> {ug("แต่ละรหัสใช้ได้เพียงครั้งเดียว — บันทึกก่อนดำเนินการต่อ", "Each code can only be used once — save before continuing")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button className="btn" style={{ height: 42 }}
                  onClick={async () => {
                    await navigator.clipboard.writeText(backupCodes.join("\n")).catch(() => {});
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}>
                  <Icon name={copied ? "check" : "copy"} size={14} />
                  {copied ? ug("คัดลอกแล้ว!", "Copied!") : ug("คัดลอกรหัสทั้งหมด", "Copy All Codes")}
                </button>
                <button className="btn btn-primary" style={{ height: 46 }} onClick={onComplete}>
                  <Icon name="check" size={14} /> {completeBtnLabel || ug("บันทึกรหัสแล้ว — เข้าสู่ระบบ", "Codes saved — Sign In")}
                </button>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="badge badge-red" style={{ padding: "10px 14px", marginBottom: 16 }}>
              <Icon name="close" size={14} /> {err}
            </div>
          )}

          {step !== "backup" && (
            <button onClick={onCancel} style={{ marginTop: 16, width: "100%", padding: 10,
              textAlign: "center", color: "var(--ink-mute)", fontSize: 13, background: "none" }}>
              {ug("ออกจากระบบแทน", "Sign out instead")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MFAVerifyScreen ───────────────────────────────────────────────────────
function MFAVerifyScreen({ currentUser, onComplete, onCancel }) {
  const { useState: useStateMFAV, useEffect: useEffectMFAV } = React;
  const [factorId, setFactorId]   = useStateMFAV("");
  const [code, setCode]           = useStateMFAV("");
  const [err, setErr]             = useStateMFAV(null);
  const [busy, setBusy]           = useStateMFAV(false);
  const [useBackup, setUseBackup] = useStateMFAV(false);
  const [backupCode, setBackupCode] = useStateMFAV("");

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

  const validateBackup = async (e) => {
    e?.preventDefault();
    const clean = backupCode.toUpperCase().replace(/-/g, "");
    if (clean.length < 12) { setErr("กรุณากรอกรหัสสำรองให้ครบ"); return; }
    setBusy(true); setErr(null);
    try {
      const hash = await hashBackupCode(backupCode);
      const { data, error } = await _supabase
        .from("mfa_backup_codes")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("code_hash", hash)
        .is("used_at", null)
        .maybeSingle();
      if (error || !data) throw new Error("รหัสสำรองไม่ถูกต้องหรือถูกใช้ไปแล้ว");
      await _supabase.from("mfa_backup_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", data.id);
      onComplete();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const dk = { card: "#1a1030", surface2: "#221440", ink: "#ffffff", mute: "rgba(255,255,255,0.55)", border: "rgba(139,63,196,0.35)" };
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center",
      background: "radial-gradient(120% 100% at 0% 0%, #8b3fc4 0%, #321148 60%, #1b0926 100%)" }}>
      <style>{`
        @keyframes mfa-caret { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
      <div className="fade-up" style={{ width: "100%", maxWidth: 420, margin: "0 16px",
        background: dk.card, borderRadius: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        border: `1px solid ${dk.border}` }}>
        <div style={{ padding: "24px clamp(20px, 6vw, 36px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", display: "grid", placeItems: "center",
              boxShadow: "0 8px 24px rgba(107,44,145,0.4)" }}>
              <Icon name="lock" size={24} stroke={2} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22, color: dk.ink }}>ยืนยัน 2FA</div>
              <div style={{ fontSize: 13, color: dk.mute }}>สวัสดี, <b style={{ color: dk.ink }}>{currentUser.name}</b></div>
            </div>
          </div>
          {!useBackup ? (
            <>
              <div style={{ marginBottom: 20, lineHeight: 1.6, fontSize: 13, color: dk.mute }}>
                เปิดแอป Authenticator แล้วกรอกรหัส 6 หลักของบัญชีนี้
              </div>
              <form onSubmit={verify} className="f-col f-gap-3">
                {/* 6-box OTP display with hidden real input */}
                <div style={{ position: "relative", marginBottom: 4 }}>
                  <div style={{ display: "flex", gap: "clamp(6px,2vw,10px)", justifyContent: "center" }}>
                    {[0,1,2,3,4,5].map(i => {
                      const filled = i < code.length;
                      const active = i === code.length;
                      return (
                        <div key={i} style={{
                          flex: 1, maxWidth: "clamp(48px,14vw,60px)",
                          height: "clamp(64px,18vw,80px)",
                          borderRadius: 14,
                          background: filled ? "rgba(139,63,196,0.18)" : dk.surface2,
                          border: `2px solid ${filled ? "#8b3fc4" : active ? "rgba(139,63,196,0.7)" : dk.border}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "clamp(26px,8vw,38px)", fontWeight: 800, color: dk.ink,
                          transition: "all 140ms",
                          boxShadow: active ? "0 0 0 4px rgba(139,63,196,0.22)" : filled ? "0 0 0 2px rgba(139,63,196,0.12)" : "none",
                          position: "relative",
                        }}>
                          {filled ? code[i] : active ? (
                            <span style={{ width: 2, height: "40%", borderRadius: 2, background: "#c084fc", animation: "mfa-caret 1.1s step-end infinite", display: "block" }} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <input
                    style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "text", fontSize: 1 }}
                    maxLength={6} inputMode="numeric" autoComplete="one-time-code"
                    value={code}
                    onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setErr(null); }}
                    autoFocus
                  />
                </div>
                {err && <div className="badge badge-red" style={{ padding: "8px 12px" }}><Icon name="close" size={14} />{err}</div>}
                <button type="submit" className="btn btn-primary" style={{ height: 52, fontSize: 15 }}
                  disabled={busy || code.length !== 6}>
                  {busy ? "กำลังยืนยัน…" : <><Icon name="check" size={14} /> ยืนยัน</>}
                </button>
              </form>
              <button onClick={() => { setUseBackup(true); setErr(null); setCode(""); }}
                style={{ marginTop: 12, width: "100%", padding: 9, textAlign: "center",
                  color: "#c084fc", fontSize: 13, background: "none", fontWeight: 500, border: "none", cursor: "pointer" }}>
                ไม่มีแอป Authenticator? ใช้รหัสสำรอง
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 20, lineHeight: 1.6, fontSize: 13, color: dk.mute }}>
                กรอกรหัสสำรอง (XXXX-XXXX-XXXX) ที่บันทึกไว้ตอนตั้งค่า 2FA
              </div>
              <form onSubmit={validateBackup} className="f-col f-gap-3">
                <input
                  style={{ fontFamily: "monospace", letterSpacing: "0.12em", textAlign: "center",
                    fontWeight: 600, height: 56, fontSize: 16, textTransform: "uppercase",
                    borderRadius: 14, border: `2px solid ${dk.border}`, background: dk.surface2,
                    color: dk.ink, outline: "none", width: "100%", boxSizing: "border-box" }}
                  maxLength={14} placeholder="XXXX-XXXX-XXXX" value={backupCode}
                  onChange={e => { setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")); setErr(null); }}
                  autoFocus />
                {err && <div className="badge badge-red" style={{ padding: "8px 12px" }}><Icon name="close" size={14} />{err}</div>}
                <button type="submit" className="btn btn-primary" style={{ height: 52, fontSize: 15 }}
                  disabled={busy || backupCode.replace(/-/g, "").length < 12}>
                  {busy ? "กำลังตรวจสอบ…" : <><Icon name="check" size={14} /> ยืนยันรหัสสำรอง</>}
                </button>
              </form>
              <button onClick={() => { setUseBackup(false); setErr(null); setBackupCode(""); }}
                style={{ marginTop: 12, width: "100%", padding: 9, textAlign: "center",
                  color: "#c084fc", fontSize: 13, background: "none", fontWeight: 500, border: "none", cursor: "pointer" }}>
                กลับไปใช้ Authenticator แทน
              </button>
            </>
          )}
          <button onClick={onCancel} style={{ marginTop: 4, width: "100%", padding: 10,
            textAlign: "center", color: dk.mute, fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>
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
    version: "v3.2", date: "2 มิ.ย. 2569", tag: "UX Overhaul",
    tagColor: "#8b3fc4", items: [
      { cat: "ux",   text: { th: "Dashboard มือถือ: มิเตอร์ + หม้อแปลง 2 ช่องเท่ากัน (บน) / KVA เต็มความกว้าง (ล่าง) — ดูสมดุลกว่าเดิม", en: "Mobile dashboard: Meter + Transformer 2-col equal (top) / KVA full-width (bottom) — balanced layout" } },
      { cat: "ux",   text: { th: "Admin แท็บมือถือ: จัดกลุ่ม 5 แท็บหลัก + ปุ่ม 'เพิ่มเติม ⋯' เปิด dropdown สำหรับแท็บที่เหลือ — ไม่ต้อง scroll ยาว", en: "Admin mobile tabs: 5 primary tabs + '⋯ More' dropdown for secondary tabs — no long horizontal scroll" } },
      { cat: "new",  text: { th: "Skeleton Loading: Dashboard card แสดง shimmer animation ระหว่างโหลดข้อมูล — ลด layout shift", en: "Skeleton Loading: Dashboard cards show shimmer animation while loading — reduces layout shift" } },
      { cat: "ux",   text: { th: "Donut Chart Interactive: hover/แตะ segment → แสดง %, จำนวน, ชื่อหมวด ตรงกลางวงกลมทันที", en: "Donut Chart Interactive: hover/tap segment → shows %, count, category name in center instantly" } },
      { cat: "new",  text: { th: "Column Sort: กดหัวคอลัมน์ตาราง Meter / Transformer เพื่อ sort ▲▼ (client-side)", en: "Column Sort: click any column header in Meter / Transformer tables to sort ▲▼ (client-side)" } },
      { cat: "ux",   text: { th: "Import Progress: ปุ่มยืนยันนำเข้าแสดง % fill animation ตาม batch ที่สำเร็จ", en: "Import Progress: confirm button shows % fill animation per completed batch" } },
      { cat: "new",  text: { th: "Search History: จำ keyword ล่าสุด 6 รายการใน localStorage — กด dropdown เลือกได้เลย + ปุ่ม ✕ ลบทีละรายการ", en: "Search History: remembers last 6 keywords in localStorage — tap dropdown to reuse + ✕ to remove individual items" } },
      { cat: "new",  text: { th: "แผนที่: ปุ่ม 📍 'ตำแหน่งของฉัน' มุมขวาล่าง — กด 1 ครั้ง GPS fly to จุดที่อยู่ปัจจุบัน", en: "Map: 📍 'My Location' button bottom-right — one tap GPS fly-to current position" } },
      { cat: "ux",   text: { th: "Topbar มือถือ: นำ 'ตั้งค่า ⋮' ออก → รวมทุก option (ภาษา/ธีม/รีเฟรช/logout) ไว้ใน user chip dropdown", en: "Mobile topbar: removed standalone '⋮ Settings' → all options (lang/theme/refresh/logout) merged into user chip dropdown" } },
      { cat: "ux",   text: { th: "2FA OTP input: ตัวเลขใหญ่ขึ้น (36–46px) ช่องสูงขึ้น (82–96px) — อ่านง่ายบนมือถือ", en: "2FA OTP input: larger digits (36–46px), taller field (82–96px) — easier to read on mobile" } },
      { cat: "new",  text: { th: "Maintenance Banner: ปุ่ม ✕ ซ่อน banner ชั่วคราวสำหรับ session นี้ — Admin ไม่ต้องเห็น banner ตลอดเวลา", en: "Maintenance Banner: ✕ dismiss button hides banner for current session — Admin not forced to see it constantly" } },
      { cat: "fix",  text: { th: "Feeder Chart: แก้นับ transformer ต่อ feeder → นับมิเตอร์ต่อ feeder จริง (meters.feederid) — ตัวเลขจากหลักร้อยเป็นหลักพัน", en: "Feeder Chart: fix counted transformers per feeder → now counts meters per feeder (meters.feederid) — numbers jump from hundreds to thousands" } },
      { cat: "fix",  text: { th: "Audit Log Security query 400: แก้ column name ผิด (created_at→at, user_id→username) ตรงกับ schema จริง", en: "Audit Log Security query 400: fix wrong column names (created_at→at, user_id→username) to match actual schema" } },
      { cat: "fix",  text: { th: "Leaflet _leaflet_pos crash: เพิ่ม map.stop() + map.remove() ใน useEffect cleanup ป้องกัน animation ค้างหลัง unmount", en: "Leaflet _leaflet_pos crash: add map.stop() + map.remove() in useEffect cleanup to prevent stale animations after unmount" } },
    ],
  },
  {
    version: "v3.1", date: "2 มิ.ย. 2569", tag: "UX/UI & Fix",
    tagColor: "#6366f1", items: [
      { cat: "ux",   text: { th: "Dashboard: ตัวเลข StatCard ปรับขนาดอัตโนมัติ (FitText) ด้วย ResizeObserver — ไม่ว่าจะกี่หลักก็ไม่ล้น", en: "Dashboard: StatCard numbers auto-resize (FitText) via ResizeObserver — no overflow regardless of digit count" } },
      { cat: "new",  text: { th: "Dashboard KVA: แยกแสดง PEA / Customer — frontend fallback หากยังไม่ได้อัปเดต RPC", en: "Dashboard KVA: breakdown by PEA / Customer — frontend fallback if RPC not yet updated" } },
      { cat: "ux",   text: { th: "Dashboard ไอคอน: มิเตอร์ → M (meter-m), หม้อแปลง → สามเหลี่ยม (tr-tri)", en: "Dashboard icons: Meter → M (meter-m), Transformer → triangle (tr-tri)" } },
      { cat: "ux",   text: { th: "Dashboard Donut บนมือถือ: เปลี่ยนเป็น row (donut ซ้าย + legend ขวา) ดูสมดุลกว่าเดิม", en: "Dashboard Donut on mobile: changed to row layout (donut left + legend right) for balanced look" } },
      { cat: "fix",  text: { th: "แผนที่ภาพรวม Admin: แก้แสดงไม่เต็มความสูง — flex chain ถูกต้อง + double-rAF invalidateSize", en: "Admin overview map: fix partial height — correct flex chain + double-rAF invalidateSize" } },
      { cat: "new",  text: { th: "แผนที่ภาพรวม: คลิก cluster (วงกลมตัวเลข) → zoom เข้าพื้นที่กลุ่มนั้น แล้วคลิก marker รายตัวได้", en: "Overview map: click cluster bubble → zoom into group area, then click individual markers" } },
      { cat: "ux",   text: { th: "แผนที่ภาพรวม ค้นหา: เพิ่ม accountnum field + บังคับคีย์บอร์ดตัวเลขบนมือถือ", en: "Overview map search: add accountnum field + force numeric keyboard on mobile" } },
      { cat: "fix",  text: { th: "ป้องกัน iOS Safari ซูมเมื่อแตะ input — font-size: 16px บน input ทุกช่อง ≤768px", en: "Prevent iOS Safari auto-zoom on input focus — font-size: 16px on all inputs ≤768px" } },
      { cat: "fix",  text: { th: "ไม่มีหน้าจอขาว Flash: เพิ่ม background: #1b0926 ใน <head> ก่อน CSS โหลด", en: "No white flash: add background: #1b0926 in <head> before CSS loads" } },
      { cat: "fix",  text: { th: "ออกจากระบบ 403: แก้ token หมดอายุ → force clear state แม้ signOut() ล้มเหลว", en: "Logout 403: fix expired token — force clear state even when signOut() fails" } },
      { cat: "fix",  text: { th: "หน้า 2FA Verify: บังคับ dark theme เสมอ — card สีเข้ม, ตัวเลข OTP ขนาดใหญ่ขึ้น (32px)", en: "2FA Verify screen: always dark theme — dark card, larger OTP digits (32px)" } },
      { cat: "ux",   text: { th: "ระบบนำทาง: แสดงหมายเหตุ 'คำนวณที่ 40 กม./ชม.' ใต้เวลาโดยประมาณ", en: "Navigation: show note 'Calculated at 40 km/h' below estimated travel time" } },
      { cat: "fix",  text: { th: "SearchView: แผนที่ไม่เต็มความสูงบน desktop — แก้ flex chain (flex:1 + minHeight:0) ตลอด chain", en: "SearchView: map not full height on desktop — fix flex chain (flex:1 + minHeight:0) throughout" } },
    ],
  },
  {
    version: "v3.0", date: "1 มิ.ย. 2569", tag: "Security & Map",
    tagColor: "#10b981", items: [
      { cat: "new",  text: { th: "แจ้งแก้ไขพิกัด: กด marker → ลากหมุด/กดแผนที่/ใช้ GPS เพื่อวางพิกัดใหม่ → ส่งคำขอรอ Admin อนุมัติ", en: "Coordinate correction: tap marker → drag pin/tap map/use GPS to set new coords → submit for Admin approval" } },
      { cat: "new",  text: { th: "Admin: แผง 'คำขอแก้ไข' แสดงรายการ Pending พร้อมปุ่ม อนุมัติ / ปฏิเสธ", en: "Admin: 'Correction Requests' panel shows pending items with Approve / Reject buttons" } },
      { cat: "new",  text: { th: "ปุ่ม GPS 'ใช้ตำแหน่งปัจจุบัน' ในหน้าแจ้งแก้ไขพิกัด — สะดวกสำหรับใช้งานที่หน้างาน", en: "GPS 'Use Current Location' button in correction modal — convenient for field use" } },
      { cat: "new",  text: { th: "แดชบอร์ดผู้ใช้: การ์ดสถิติ (ทั้งหมด/Active/Pending/Banned/Admin/2FA/รหัสหมดอายุ) กดได้ — filter ตารางและ scroll ลงทันที", en: "User dashboard: stat cards (Total/Active/Pending/Banned/Admin/2FA/PwExpired) are clickable — filter table and scroll instantly" } },
      { cat: "new",  text: { th: "ความปลอดภัย: แท็บใหม่ใน Admin — คะแนนความปลอดภัย (0-100) + รายการตรวจสอบ 6 รายการ + ตรวจจับกิจกรรมต้องสงสัยจาก Audit Log", en: "Security: new Admin tab — security score (0-100) + 6 security checks + threat detection from Audit Log" } },
      { cat: "new",  text: { th: "PWA: ติดตั้งแอปบน iOS และ Android ได้ผ่าน 'เพิ่มลงหน้าจอหลัก' — icon, offline cache, standalone mode", en: "PWA: install app on iOS & Android via 'Add to Home Screen' — icon, offline cache, standalone mode" } },
      { cat: "new",  text: { th: "Web Push Notification (Admin เท่านั้น): Admin ส่งการแจ้งเตือนถึงอุปกรณ์ที่ subscribe ทุกเครื่องทันที — preset 4 แบบ (ปิดระบบ/อัปเดต/กลับมาแล้ว/แจ้งด่วน)", en: "Web Push Notification (Admin only): Admin sends instant push alerts to all subscribed devices — 4 presets (Maintenance/Update/Back Online/Alert)" } },
      { cat: "fix",  text: { th: "DateTimePicker บนมือถือ: เปลี่ยนเป็น bottom sheet เลื่อนขึ้นจากล่าง — ปฏิทิน + เวลา + ปุ่มยืนยันครบในจอเดียว", en: "DateTimePicker on mobile: bottom sheet slides up from screen bottom — calendar, time picker, confirm all visible" } },
      { cat: "ux",   text: { th: "Basemap เปลี่ยนจาก tab แบนเป็น dropdown picker (Street / Satellite) ทั้ง Topbar และ Admin Map", en: "Basemap changed from flat tabs to dropdown picker (Street / Satellite) on Topbar and Admin Map" } },
      { cat: "ux",   text: { th: "Hero stat card รูปแบบเดียวกันทุก view (คู่มือ/อัปเดต/Dev) — ตัวเลขเรียงระดับเดียว + ปุ่มขยาย/ยุบรวมเป็นปุ่มเดียว", en: "Hero stat cards unified across all views — numbers baseline-aligned + expand/collapse merged into single toggle" } },
      { cat: "fix",  text: { th: "iOS Push Permission: เพิ่มปุ่ม 'ลองอีกครั้ง' + re-check อัตโนมัติเมื่อกลับจาก Settings — ไม่ต้อง reload แอป", en: "iOS Push Permission: added 'Try Again' button + auto re-check on app focus — no app reload needed" } },
      { cat: "fix",  text: { th: "นำ Dark basemap ออก — ใช้ Street / Satellite เท่านั้น", en: "Remove Dark basemap — Street / Satellite only" } },
      { cat: "new",  text: { th: "Deploy popup: ปุ่ม 'ตรวจสอบอีกครั้ง' (refetch) และ 'โหลดเวอร์ชันใหม่' (force reload bypass cache) + ข้อความตามภาษา", en: "Deploy popup: 'Re-check' (refetch) and 'Load New Version' (force reload bypass cache) + bilingual labels" } },
      { cat: "fix",  text: { th: "ดาวน์โหลด PDF: แก้เนื้อหาถูกตัดออก (body{overflow:hidden}) — ตอนนี้แสดงเต็มหน้า A4", en: "PDF download: fix content clipped by body{overflow:hidden} — now renders full A4 width" } },
      { cat: "fix",  text: { th: "เมนู Settings: Dark/Light mode + Deploy popup เปลี่ยนภาษาตามระบบทั้งหมด", en: "Settings menu: Dark/Light mode + Deploy popup all follow system language" } },
      { cat: "new",  text: { th: "Admin แผนที่ภาพรวม: ปุ่ม 'ตำแหน่งฉัน' — กด GPS ระบุตำแหน่งปัจจุบัน แผนที่บินไปพร้อมหมุดสีน้ำเงิน + ความแม่นยำ (±X ม.)", en: "Admin Overview Map: 'My Location' button — one-tap GPS locate, map flies to position with blue accuracy pin" } },
      { cat: "ux",   text: { th: "แท็บอัปเดต: กดหัวการ์ดเวอร์ชันเพื่อยุบ/ขยายรายการ — เวอร์ชันล่าสุดเปิดอัตโนมัติ เวอร์ชันเก่าพับไว้", en: "Updates tab: click version card header to collapse/expand items — latest version starts expanded, older versions collapsed" } },
      { cat: "fix",  text: { th: "ปุ่มนักพัฒนา (floating): แก้การลากไปขวาสุดติดขอบจอบนมือถือไม่ได้ — คำนวณ clamp จากขนาดจริงของปุ่มแทนค่าตายตัว", en: "Developer button (floating): fix unable to drag to right screen edge on mobile — clamp now uses actual button width" } },
    ],
  },
  {
    version: "v2.9", date: "31 พ.ค. 2569", tag: "2FA & UI",
    tagColor: "#8b3fc4", items: [
      { cat: "fix",  text: { th: "แก้ไข QR Code 2FA: เปลี่ยนเป็น Canvas rendering (สแกนได้ทุก device, iOS Safari)", en: "Fix 2FA QR Code: Canvas rendering — scannable on all devices incl. iOS Safari" } },
      { cat: "new",  text: { th: "หน้าตั้งค่า 2FA รองรับ 2 ภาษา (TH/EN) ตาม language toggle", en: "2FA setup screen is now bilingual (TH/EN) per language toggle" } },
      { cat: "new",  text: { th: "2FA เปิด/ปิดได้โดย Admin เท่านั้น — Profile แสดงสถานะ read-only พร้อมข้อความแจ้ง", en: "2FA enable/disable restricted to Admin only — Profile shows status read-only with notice" } },
      { cat: "fix",  text: { th: "iPad layout: ย้าย Maintenance/Password banner เข้าใน main content (ไม่ไปอยู่ใน sidebar column)", en: "iPad layout: move banners inside main content (no longer misplaced in sidebar column)" } },
      { cat: "fix",  text: { th: "iPad sidebar: ซ่อน label, sub-nav ถูกต้องทั้ง portrait/landscape ด้วย !important", en: "iPad sidebar: properly hide labels and sub-nav in portrait/landscape via !important" } },
    ],
  },
  {
    version: "v2.8", date: "31 พ.ค. 2569", tag: "Security",
    tagColor: "#ef4444", items: [
      { cat: "fix",  text: { th: "แก้ไข audit_log RLS: จำกัดเฉพาะ admin เท่านั้น",                   en: "Fix audit_log RLS: restricted to admin only" } },
      { cat: "fix",  text: { th: "แก้ไข QR Code 2FA ป้องกัน XSS (base64 แทน innerHTML)",             en: "Fix 2FA QR Code XSS (base64 instead of innerHTML)" } },
      { cat: "new",  text: { th: "เพิ่ม Backup Codes 10 รหัสสำหรับ 2FA (SHA-256 hash)",              en: "Add 2FA Backup Codes: 10 codes, SHA-256 hashed" } },
      { cat: "new",  text: { th: "ตั้งค่า Rate Limiting, Attack Protection, Email Confirmation",      en: "Configure Rate Limiting, Attack Protection, Email Confirmation" } },
      { cat: "new",  text: { th: "กำหนด Password Policy: min 8, upper+lower+digit+symbol",            en: "Add Password Policy: min 8, upper+lower+digit+symbol" } },
      { cat: "fix",  text: { th: "แก้ไขการเปลี่ยนรหัสผ่าน: ต้องยืนยันรหัสเดิม (nonce)",              en: "Fix password change: requires current password verification (nonce)" } },
      { cat: "new",  text: { th: "อัปเดต Supabase Anon Key และ Pin CDN เวอร์ชัน 2.49.4",             en: "Update Supabase Anon Key and pin CDN to version 2.49.4" } },
    ],
  },
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
  new:  { label: { th: "ใหม่",         en: "New" },         bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  text: "#047857" },
  ux:   { label: { th: "UX/UI",        en: "UX/UI" },       bg: "rgba(139,63,196,0.12)",  border: "rgba(139,63,196,0.3)",  text: "var(--pea-purple-600)" },
  fix:  { label: { th: "แก้ไข",        en: "Fix" },         bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)",  text: "#1d4ed8" },
  perf: { label: { th: "ประสิทธิภาพ", en: "Performance" }, bg: "rgba(244,123,32,0.12)", border: "rgba(244,123,32,0.3)", text: "var(--pea-orange-600)" },
};

// ── Shared deploy-data hook ──────────────────────────────────────────────
function useDeployStatus() {
  const [deployed, setDeployed]   = useStateApp(null);
  const [ghCommit, setGhCommit]   = useStateApp(null);
  const [loading, setLoading]     = useStateApp(true);
  const [ghLoading, setGhLoading] = useStateApp(true);
  const [tick, setTick]           = useStateApp(0);

  const refetch = React.useCallback(() => {
    setLoading(true);
    setGhLoading(true);
    setTick(t => t + 1);
  }, []);

  useEffectApp(() => {
    setLoading(true);
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
  }, [tick]);

  const deployedHash = deployed?.shortCommit || deployed?.commit?.slice(0, 7);
  const ghHash = ghCommit?.sha?.slice(0, 7);
  const isLoading = loading || ghLoading;
  // Also in-sync if GitHub's latest commit is the version.json chore update for this deployed hash
  const ghMsgHasDeployed = deployedHash && ghCommit?.commit?.message?.includes(deployedHash);
  const inSync = !isLoading && deployedHash && ghHash && (deployedHash === ghHash || ghMsgHasDeployed);

  return { deployed, ghCommit, deployedHash, ghHash, loading, ghLoading, isLoading, inSync, refetch };
}

// ── DeployStatusDot — topbar indicator for admins ────────────────────────
function DeployStatusDot() {
  const [open, setOpen] = useStateApp(false);
  const { deployed, ghCommit, deployedHash, ghHash, loading, ghLoading, isLoading, inSync, refetch } = useDeployStatus();
  const { t, lang } = useLang();

  const pending  = !isLoading && deployedHash && ghHash && !inSync;
  const dotColor = isLoading ? "#9ca3af" : inSync ? "#059669" : "#d97706";
  const dotLabel = isLoading ? t("deployChecking") : inSync ? t("deployCurrent") : t("deployPending");

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const loc = lang === "en" ? "en-GB" : "th-TH";
    return d.toLocaleDateString(loc, { day: "numeric", month: "short" }) +
      " · " + d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
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
          <div className="fade-up deploy-popup" style={{
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
              <span style={{ fontSize: 10, color: "var(--ink-mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("deployLabel")}</span>
            </div>

            {/* Deployed version */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-mute)", marginBottom: 5 }}>🌐 {t("deployRunning")}</div>
              {loading ? (
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t("deployChecking")}</div>
              ) : deployed ? (
                <>
                  <code style={{ fontSize: 12, fontWeight: 800, fontFamily: "'IBM Plex Mono',monospace", color: "#059669", background: "rgba(5,150,105,0.1)", padding: "1px 7px", borderRadius: 5 }}>{deployedHash}</code>
                  <div style={{ fontSize: 11, color: "var(--ink)", marginTop: 4, lineHeight: 1.4 }}>{deployed.message}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 2 }}>{fmtDate(deployed.date)}</div>
                </>
              ) : <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t("deployNoVersion")}</div>}
            </div>

            {/* GitHub latest */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-mute)", marginBottom: 5 }}>☁️ {t("deployLatestGH")}</div>
              {ghLoading ? (
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t("deployChecking")}</div>
              ) : ghCommit ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <code style={{ fontSize: 12, fontWeight: 800, fontFamily: "'IBM Plex Mono',monospace", color: "var(--pea-purple-600)", background: "rgba(139,63,196,0.12)", padding: "1px 7px", borderRadius: 5 }}>{ghHash}</code>
                    {pending && <span style={{ fontSize: 9, fontWeight: 700, color: "#d97706", background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)", padding: "1px 5px", borderRadius: 4 }}>{t("deployAwait")}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink)", marginTop: 4, lineHeight: 1.4 }}>{ghCommit.commit?.message?.split("\n")[0] || "—"}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 2 }}>{fmtDate(ghCommit.commit?.author?.date)} · {ghCommit.commit?.author?.name}</div>
                </>
              ) : <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t("deployNoGH")}</div>}
            </div>

            {/* Action buttons */}
            <div style={{ padding: "10px 12px 12px", borderTop: "1px solid var(--line)", display: "flex", gap: 6 }}>
              <button onClick={refetch} disabled={isLoading} style={{
                flex: 1, padding: "8px 0", borderRadius: 10,
                border: "1px solid var(--line)", background: "var(--surface-2)",
                fontSize: 12, fontWeight: 700, cursor: isLoading ? "wait" : "pointer",
                color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                opacity: isLoading ? 0.6 : 1,
              }}>
                <Icon name="refresh" size={13} style={{ animation: isLoading ? "pea-spin 0.8s linear infinite" : "none" }} />
                {t("deployRecheck")}
              </button>
              <button onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("v", Date.now());
                window.location.replace(url.toString());
              }} style={{
                flex: 1, padding: "8px 0", borderRadius: 10,
                border: "1px solid rgba(139,63,196,0.4)", background: "rgba(139,63,196,0.09)",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                color: "var(--pea-purple-600)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}>
                <Icon name="download" size={13} />
                {t("deployLoadNew")}
              </button>
            </div>
            <div style={{ padding: "0 14px 10px", fontSize: 10, color: "var(--ink-mute)", lineHeight: 1.5 }}>
              {pending ? t("deployHintPending") : t("deployHintSync")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── DeploymentStatus — full card in ChangelogView ────────────────────────
function DeploymentStatus() {
  const { t } = useLang();
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
  const statusLabel  = isLoading ? t("deployChecking") : inSync ? t("deployCurrent") : t("deployPending");

  return (
    <div style={{ marginBottom: 24, borderRadius: 16, border: `1px solid ${statusBorder}`, background: statusBg, overflow: "hidden" }}>
      {/* Header row */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${statusBorder}` }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor, flexShrink: 0,
          boxShadow: `0 0 0 3px ${statusColor}33`,
          animation: isLoading ? "pea-pulse 1.4s ease-in-out infinite" : "none",
        }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: statusColor }}>{statusLabel}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-mute)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("deployStatusTitle")}</span>
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {/* Deployed */}
        <div style={{ padding: "14px 18px", borderRight: `1px solid ${statusBorder}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-mute)", marginBottom: 8 }}>
            🌐 {t("deployRunning")}
          </div>
          {loading ? (
            <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t("deployChecking")}</div>
          ) : deployed ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <code style={{ fontSize: 13, fontWeight: 800, fontFamily: "'Courier New',monospace", fontVariantLigatures: "none", color: inSync ? "#059669" : "#d97706", background: inSync ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                  {deployedHash}
                </code>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink)", marginBottom: 3, lineHeight: 1.4 }}>{deployed.message}</div>
              <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>{fmtDate(deployed.date)}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t("deployNoData")}</div>
          )}
        </div>

        {/* GitHub latest */}
        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-mute)", marginBottom: 8 }}>
            ☁️ {t("deployLatestGH")}
          </div>
          {ghLoading ? (
            <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t("deployChecking")}</div>
          ) : ghCommit ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <code style={{ fontSize: 13, fontWeight: 800, fontFamily: "'Courier New',monospace", fontVariantLigatures: "none", color: "var(--pea-purple-600)", background: "rgba(139,63,196,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                  {ghHash}
                </code>
                {!inSync && ghHash && deployedHash && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706", background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)", padding: "1px 6px", borderRadius: 4 }}>
                    {t("deployAwait")}
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
            <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{t("deployNoGH")}</div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div style={{ padding: "8px 18px 10px", borderTop: `1px solid ${statusBorder}`, fontSize: 11, color: "var(--ink-mute)" }}>
        {t("deployFooterNote")}
      </div>
    </div>
  );
}

function ChangelogView() {
  const { lang, t } = useLang();
  const clText = (item) => (item && typeof item === "object") ? (item[lang] ?? item.th) : item;
  const [collapsed, setCollapsed] = useStateApp(() => new Set(CHANGELOG.slice(1).map(v => v.version)));
  const toggleVer = (version) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(version) ? next.delete(version) : next.add(version);
    return next;
  });
  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <style>{`
        .cl-hero  { padding: 24px 28px; }
        .cl-title { font-size: 22px; font-weight: 800; }
        .cl-sgrid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-top: 16px; }
        .cl-hash  { font-family: 'Courier New',monospace; font-variant-ligatures: none; font-feature-settings: "liga" 0; }
        @media (max-width: 520px) {
          .cl-hero  { padding: 16px; }
          .cl-title { font-size: 17px; }
          .cl-sgrid { grid-template-columns: repeat(2,1fr) !important; gap: 8px; }
        }
      `}</style>
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
              <div className="cl-title">{t("clTitle")}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
                {t("clSubtitle")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                  <Icon name="history" size={10} /> {t("clLastUpdate")} {CHANGELOG[0].date}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                  <Icon name="package" size={10} /> {CHANGELOG[0].version} · {CHANGELOG[0].tag}
                </span>
              </div>
            </div>
          </div>

          {/* Summary stat grid */}
          <div className="cl-sgrid">
            {[
              { label: t("clVersions"),   value: CHANGELOG.length, icon: "package", sub: "versions" },
              { label: t("clNewFeatures"), value: CHANGELOG.reduce((a, v) => a + v.items.filter(i => i.cat === "new").length, 0), icon: "bolt", sub: "new features" },
              { label: "UX/UI",      value: CHANGELOG.reduce((a, v) => a + v.items.filter(i => i.cat === "ux").length, 0), icon: "sun", sub: "improvements" },
              { label: t("catFix"),  value: CHANGELOG.reduce((a, v) => a + v.items.filter(i => i.cat === "fix").length, 0), icon: "check", sub: "bug fixes" },
            ].map(({ label, value, icon, sub }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 13px", border: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 5, minHeight: 34 }}>
                  <Icon name={icon} size={12} style={{ color: "rgba(255,255,255,0.5)", marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>{label}</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{sub}</div>
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
              {clText(m.label)}
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
                {/* Card header — clickable to collapse/expand */}
                <div onClick={() => toggleVer(ver.version)} style={{
                  padding: "14px 18px", display: "flex", alignItems: "center", gap: 10,
                  borderBottom: collapsed.has(ver.version) ? "none" : "1px solid var(--line)",
                  background: vi === 0 ? `linear-gradient(135deg, ${ver.tagColor}18, transparent)` : "transparent",
                  cursor: "pointer", userSelect: "none",
                }}>
                  <div style={{
                    fontFamily: "'Courier New',monospace", fontVariantLigatures: "none",
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
                      <Icon name="check" size={10} /> {t("clLatest")}
                    </span>
                  )}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 500 }}>{ver.date}</span>
                    <Icon
                      name={collapsed.has(ver.version) ? "chevRight" : "chevDown"}
                      size={15}
                      style={{ color: "var(--ink-mute)", transition: "transform 180ms", flexShrink: 0 }}
                    />
                  </div>
                </div>

                {/* Items */}
                {!collapsed.has(ver.version) && (
                  <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {ver.items.map((item, ii) => {
                      const m = CAT_META[item.cat] || CAT_META.new;
                      return (
                        <div key={ii} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <span style={{
                            display: "inline-block", padding: "2px 7px", borderRadius: 6, fontSize: 10,
                            fontWeight: 700, flexShrink: 0, marginTop: 1,
                            background: m.bg, border: `1px solid ${m.border}`, color: m.text,
                          }}>{clText(m.label)}</span>
                          <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>{clText(item.text)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, padding: "16px 20px", borderRadius: 14, background: "var(--soft)", border: "1px solid var(--soft-border)", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="info" size={16} style={{ color: "var(--pea-purple-500)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.5 }}>
            {t("clFooter")}
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
  const { lang } = useLang();
  const ug = (th, en) => lang === "en" ? en : th;
  const isAdmin = role === "admin";
  const guideRef = React.useRef(null);
  const [expandSig, setExpandSig] = useStateApp({ count: 0, open: false });
  const [pdfLoading, setPdfLoading] = useStateApp(false);
  const expandAll  = () => setExpandSig(s => ({ count: s.count + 1, open: true }));
  const collapseAll = () => setExpandSig(s => ({ count: s.count + 1, open: false }));

  function downloadGuide() {
    const el = guideRef.current;
    if (!el || pdfLoading || typeof html2pdf === "undefined") return;
    // Expand all sections first, then wait for React to re-render
    expandAll();
    setPdfLoading(true);
    setTimeout(() => {
      // Clone so we can strip interactive elements without affecting the UI
      const clone = el.cloneNode(true);
      // Remove all buttons (expand/collapse/download — not needed in PDF)
      clone.querySelectorAll("button").forEach(b => b.remove());
      // Force all collapsed accordion bodies to be fully visible
      clone.querySelectorAll("[style]").forEach(node => {
        const s = node.style;
        if (s.overflow === "hidden" && (s.maxHeight === "0px" || s.height === "0px")) {
          s.overflow = "visible";
          s.maxHeight = "none";
          s.height = "auto";
        }
      });
      clone.style.cssText += ";width:820px;max-width:820px;margin:0;";
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:fixed;left:0;top:0;width:820px;opacity:0;pointer-events:none;z-index:2147483647;overflow:visible;background:#f5f4f6;";
      wrap.appendChild(clone);
      document.body.appendChild(wrap);
      // body { overflow: hidden } clips html2canvas past viewport width — override temporarily
      document.body.style.overflow = "visible";
      const cleanup = (wrap) => { document.body.removeChild(wrap); document.body.style.overflow = ""; setPdfLoading(false); };
      html2pdf().set({
        margin: [10, 8, 10, 8],
        filename: "คู่มือการใช้งาน-GIS-Meter.pdf",
        image: { type: "jpeg", quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#f5f4f6", windowWidth: 820 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: [".card", "li", "tr"] },
      }).from(clone).save()
        .then(() => cleanup(wrap))
        .catch(() => cleanup(wrap));
    }, 450); // Wait for accordion animation to complete
  }

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <style>{`
        .ug-hero   { padding: 24px 28px; }
        .ug-sgrid  { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-top: 16px; }
        .ug-title  { font-size: 22px; font-weight: 800; line-height: 1.2; }
        .ug-btns   { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
        @media (max-width: 520px) {
          .ug-hero  { padding: 16px; }
          .ug-sgrid { grid-template-columns: repeat(2,1fr) !important; gap: 8px; }
          .ug-title { font-size: 17px; }
          .ug-btns  { margin-top: 12px; }
        }
      `}</style>
      <div ref={guideRef} style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px 40px" }}>
        {/* Hero */}
        <div className="ug-hero" style={{ borderRadius: 20, background: "linear-gradient(135deg,#6b2c91 0%,#8b3fc4 55%,#f47b20 130%)", color: "white", marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name="book" size={26} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>{ug("คู่มือการใช้งาน", "User Manual")}</div>
              <div className="ug-title">GIS Meter & Transformer</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
                {isAdmin ? ug("สำหรับผู้ดูแลระบบ — ครอบคลุมทุก Feature", "For Administrators — All Features") : ug("สำหรับผู้ใช้งานทั่วไป", "For General Users")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                  <Icon name="history" size={10} /> {ug("อัปเดตล่าสุด: ", "Last updated: ")}{CHANGELOG[0].date}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                  <Icon name="package" size={10} /> {CHANGELOG[0].version}
                </span>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="ug-sgrid">
            {[
              { label: ug("หัวข้อ","Sections"),   value: isAdmin ? 16 : 6,  icon: "book",    sub: "sections" },
              { label: ug("ขั้นตอน","Steps"),     value: isAdmin ? 57 : 24, icon: "check",   sub: "steps" },
              { label: ug("ฟีเจอร์","Features"),  value: isAdmin ? 15 : 10, icon: "bolt",    sub: "features" },
              { label: ug("เคล็ดลับ","Tips"),     value: isAdmin ? 20 : 10, icon: "warning", sub: "tips & notes" },
            ].map(({ label, value, icon, sub }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "11px 13px", border: "1px solid rgba(255,255,255,0.15)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 5, minHeight: 34 }}>
                  <Icon name={icon} size={12} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", lineHeight: 1.35 }}>{label}</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Toggle expand/collapse + Download — single row */}
          <div className="ug-btns">
            <button onClick={expandSig.open ? collapseAll : expandAll} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "white", borderRadius: 8, padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
              <Icon name={expandSig.open ? "chevRight" : "chevDown"} size={13} />
              {expandSig.open ? ug("ยุบทั้งหมด","Collapse All") : ug("ขยายทั้งหมด","Expand All")}
            </button>
            {isAdmin && (
              <button onClick={downloadGuide} disabled={pdfLoading} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "7px 14px", cursor: pdfLoading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, opacity: pdfLoading ? 0.7 : 1 }}>
                <Icon name="download" size={13} style={{ animation: pdfLoading ? "pea-spin 1s linear infinite" : "none" }} />
                {pdfLoading ? ug("กำลังสร้าง…","Generating…") : ug("โหลด PDF","PDF")}
              </button>
            )}
          </div>
        </div>

        {/* ─── เข้าสู่ระบบ ─── */}
        <UGSection icon="lock" title={ug("การเข้าสู่ระบบ & สมัครสมาชิก","Login & Registration")} expandSignal={expandSig}>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{ug("สมัครสมาชิก","Registration")}</div>
            <UGStep n={1} text={ug("คลิก 'สมัครสมาชิก' บนหน้า Login","Click 'Register' on the Login page")} />
            <UGStep n={2} text={ug("กรอกชื่อ-นามสกุล, ชื่อผู้ใช้, อีเมล, และรหัสผ่าน (ต้องมีตัวพิมพ์ใหญ่ + ตัวเลข + อักขระพิเศษ)","Fill in full name, username, email, and password (must include uppercase + number + special character)")} />
            <UGStep n={3} text={ug("กด 'สมัครสมาชิก' — บัญชีจะอยู่ในสถานะ 'รออนุมัติ' จนกว่า Admin จะอนุมัติ","Press 'Register' — account will be in 'Pending' status until approved by Admin")} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("เข้าสู่ระบบ","Login")}</div>
            <UGStep n={1} text={ug("กรอกอีเมลและรหัสผ่าน แล้วกด 'เข้าสู่ระบบ'","Enter email and password, then press 'Login'")} />
            <UGStep n={2} text={ug("หากเปิด 2FA ไว้ — ระบบจะขอรหัส 6 หลักจาก Authenticator App","If 2FA is enabled — enter the 6-digit code from your Authenticator App")} />
            <UGStep n={3} text={ug("ติ๊ก 'จดจำฉันไว้ 7 วัน' เพื่อไม่ต้องล็อกอินบ่อย","Check 'Remember me for 7 days' to avoid frequent logins")} />
            <UGTip>{ug("ลืมรหัสผ่าน? กดลิงก์ 'ลืมรหัสผ่าน' ระบบจะส่ง link รีเซ็ตไปยังอีเมล","Forgot password? Click 'Forgot Password' — the system will send a reset link to your email")}</UGTip>
            <UGNote>{ug("ระบบออกจากระบบอัตโนมัติหลังไม่ใช้งาน 30 นาที","System auto-logs out after 30 minutes of inactivity")}</UGNote>
          </div>
        </UGSection>

        {/* ─── ค้นหา ─── */}
        <UGSection icon="search" title={ug("ค้นหาข้อมูล Meter / Transformer","Search Meter / Transformer Data")} expandSignal={expandSig}>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{ug("ค้นหา PEA มิเตอร์","Search PEA Meter")}</div>
            <UGStep n={1} text={ug("เลือกแท็บ 'PEA Meter' ในหน้าค้นหา","Select the 'PEA Meter' tab on the search page")} />
            <UGStep n={2} text={ug("พิมพ์คำค้นหา: TAG, PEANO, ACCOUNTNUM, หรือ Feeder ID — ระบบค้นหาอัตโนมัติ","Type search query: TAG, PEANO, ACCOUNTNUM, or Feeder ID — auto-search")} />
            <UGStep n={3} text={ug("กรองเพิ่มเติม: เลือก Feeder, เจ้าของ (PEA/Customer), หรือ CODE","Filter by Feeder, Owner (PEA/Customer), or CODE")} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("ค้นหา PEA หม้อแปลง","Search PEA Transformer")}</div>
            <UGStep n={1} text={ug("เลือกแท็บ 'PEA Transformer'","Select the 'PEA Transformer' tab")} />
            <UGStep n={2} text={ug("พิมพ์คำค้นหา: TAG, PEANO, สถานที่, หรือ Feeder","Type: TAG, PEANO, location, or Feeder")} />
            <UGStep n={3} text={ug("กรองเพิ่มเติม: ระบบเฟส, แรงดัน (22/33 kV), kVA ต่ำสุด-สูงสุด","Filter by phase, voltage (22/33 kV), min-max kVA")} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("Export ผลการค้นหา","Export Search Results")}</div>
            <UGStep n={1} text={ug("กดปุ่ม 'Export' — Dialog แสดงจำนวนรายการที่จะส่งออก","Press 'Export' — a dialog shows the number of records to export")} />
            <UGStep n={2} text={ug("กด 'Export' อีกครั้งเพื่อดาวน์โหลดเป็นไฟล์ CSV","Press 'Export' again to download as CSV file")} />
            <UGTip>{ug("ผลลัพธ์ถูกจำกัดสูงสุด 500 รายการ — พิมพ์คำค้นหาเพิ่มเพื่อลดจำนวน","Results limited to 500 rows — type more to narrow down")}</UGTip>
          </div>
        </UGSection>

        {/* ─── แผนที่ ─── */}
        <UGSection icon="map" title={ug("แผนที่และการนำทาง GPS","Map & GPS Navigation")} expandSignal={expandSig}>
          <div style={{ marginTop: 12 }}>
            <UGTable rows={[
              [ug("ฟีเจอร์","Feature"), ug("วิธีใช้","How to use")],
              [ug("สลับ Street/Satellite","Switch Street/Satellite"), ug("กดปุ่ม dropdown มุมมองแผนที่บน Topbar → เลือก Street หรือ Satellite","Press basemap dropdown on Topbar → choose Street or Satellite")],
              ["Cluster", ug("กดปุ่ม Cluster บนแผนที่ — รวมกลุ่ม marker","Press Cluster on map — groups nearby markers")],
              ["Heatmap", ug("กดปุ่ม Heatmap — แสดงความหนาแน่นพื้นที่","Press Heatmap — shows density overlay")],
              ["Split View", ug("กดปุ่ม Split — ตารางและแผนที่อยู่คู่กัน","Press Split — table and map side by side")],
              [ug("คัดลอกพิกัด","Copy coordinates"), ug("คลิก marker → กดปุ่ม Copy lat/lng","Click marker → press Copy lat/lng button")],
              [ug("แจ้งแก้ไขพิกัด","Report Wrong Coords"), ug("คลิก marker → กด 'แจ้งแก้ไขพิกัด' → วางพิกัดใหม่ → ส่งคำขอ","Click marker → press 'Report Coords' → place new pin → submit")],
            ]} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("นำทาง GPS","GPS Navigation")}</div>
            <UGStep n={1} text={ug("คลิก marker บนแผนที่ หรือกดปุ่มนำทางในตาราง","Click a marker on the map or press Navigate in the table")} />
            <UGStep n={2} text={ug("ระบบขอสิทธิ์ตำแหน่งปัจจุบัน — กด 'Allow'","System requests location permission — press 'Allow'")} />
            <UGStep n={3} text={ug("ระบบคำนวณระยะทางและเวลาโดยประมาณ","System calculates distance and estimated time")} />
            <UGStep n={4} text={ug("กด 'นำทาง' เพื่อเปิด Google Maps หรือ Apple Maps","Press 'Navigate' to open Google Maps or Apple Maps")} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("แจ้งแก้ไขพิกัดที่ไม่ถูกต้อง","Reporting Wrong Coordinates")}</div>
            <UGStep n={1} text={ug("คลิก marker ของมิเตอร์หรือหม้อแปลงที่พิกัดไม่ตรง → กดปุ่ม 'แจ้งแก้ไขพิกัด'","Click the marker of the meter or transformer with wrong coords → press 'Report Coords'")} />
            <UGStep n={2} text={ug("ในหน้าต่าง: กด '📡 ใช้ตำแหน่งปัจจุบัน (GPS)' เพื่อรับพิกัดจาก GPS หรือลากหมุดสีเขียวบนแผนที่","In the modal: press '📡 Use Current Location (GPS)' to get GPS coords, or drag the green pin on the mini-map")} />
            <UGStep n={3} text={ug("หรือกดตรงจุดที่ต้องการบนแผนที่ — หมุดจะย้ายไปทันที","Or tap anywhere on the mini-map — the pin moves instantly")} />
            <UGStep n={4} text={ug("ใส่หมายเหตุ (ถ้ามี) แล้วกด 'ส่งคำขอแก้ไข' — ระบบส่งให้ Admin พิจารณา","Add a note (optional) then press 'Submit Correction' — sent to Admin for review")} />
            <UGTip>{ug("หลัง Admin อนุมัติ พิกัดในระบบจะอัปเดตอัตโนมัติ","After Admin approves, the system coordinates are updated automatically")}</UGTip>
          </div>
        </UGSection>

        {/* ─── โปรไฟล์ ─── */}
        <UGSection icon="user" title={ug("โปรไฟล์ & ความปลอดภัยส่วนตัว","Profile & Personal Security")} expandSignal={expandSig}>
          <div style={{ marginTop: 12 }}>
            <UGTable rows={[
              [ug("แท็บ","Tab"), ug("รายละเอียด","Details")],
              [ug("ข้อมูล","Info"), ug("ดูชื่อ, username, อีเมล, บทบาท, สถานะบัญชี","View name, username, email, role, account status")],
              [ug("รหัสผ่าน","Password"), ug("สถานะรหัสผ่าน (progress bar + วันหมดอายุ) · ประวัติการเปลี่ยนรหัส · เปิด/ปิด 2FA","Password status (progress bar + expiry) · Change history · Enable/Disable 2FA")],
              [ug("การใช้งาน","Activity"), ug("ประวัติ login/logout/เปลี่ยนรหัส พร้อม device info","Login/logout/password change history with device info")],
              [ug("การค้นหา","Search"), ug("ประวัติค้นหา Meter/TR พร้อม timestamp","Meter/TR search history with timestamps")],
            ]} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug('แท็บ "รหัสผ่าน" — รายละเอียด','Password Tab — Details')}</div>
            <UGStep n={1} text={ug("การ์ดสถานะแสดง: progress bar (วันที่ใช้ไปจาก 45 วัน), วันที่เปลี่ยนล่าสุด, วันหมดอายุ","Status card shows: progress bar (days used of 45), last changed date, expiry date")} />
            <UGStep n={2} text={ug("รายการ 'ประวัติการเปลี่ยนรหัสผ่าน' แสดงทุกครั้งที่มีการเปลี่ยน พร้อมวันที่และหมายเหตุ","'Password History' lists every change with date and note")} />
            <UGStep n={3} text={ug("สีการ์ดเปลี่ยนตามสถานะ: เขียว (ปกติ) → เหลือง (≤7 วัน) → แดง (≤3 วัน / หมดอายุ)","Card color by status: green (ok) → yellow (≤7 days) → red (≤3 days / expired)")} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("นโยบายรหัสผ่าน (45 วัน)","Password Policy (45 days)")}</div>
            <UGStep n={1} text={ug("รหัสผ่านมีอายุ 45 วัน — ระบบแจ้งเตือนล่วงหน้า 7/3/1 วัน ด้วย banner สีต่างกัน","Password expires after 45 days — system warns 7/3/1 days ahead with colored banners")} />
            <UGStep n={2} text={ug("หากหมดอายุโดยไม่เปลี่ยน — จะเข้าสู่ระบบไม่ได้ ต้องให้ Admin ปลดล็อค","If expired without changing — cannot login until Admin unlocks")} />
            <UGStep n={3} text={ug("หลัง Admin ปลดล็อค — ระบบบังคับเปลี่ยนรหัสทันที ก่อนใช้งานระบบ","After Admin unlocks — system forces password change before access")} />
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("เปิด 2FA (TOTP)","Enable 2FA (TOTP)")}</div>
            <UGStep n={1} text={ug("ไปที่โปรไฟล์ → แท็บ 'รหัสผ่าน' → กด 'เปิดใช้ 2FA'","Go to Profile → Password tab → press 'Enable 2FA'")} />
            <UGStep n={2} text={ug("สแกน QR Code ด้วย Google Authenticator หรือ Authy","Scan QR Code with Google Authenticator or Authy")} />
            <UGStep n={3} text={ug("กรอกรหัส 6 หลักเพื่อยืนยัน","Enter the 6-digit code to confirm")} />
            <UGTip>{ug("แนะนำให้เปิด 2FA เสมอเพื่อความปลอดภัยของบัญชี","Always enable 2FA for account security")}</UGTip>
            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("ความปลอดภัยของรหัสผ่าน","Password Security")}</div>
            <UGNote>{ug("นโยบายรหัสผ่าน: ต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์ใหญ่ + ตัวพิมพ์เล็ก + ตัวเลข + อักขระพิเศษ","Password policy: minimum 8 characters including uppercase + lowercase + digit + special character")}</UGNote>
            <UGNote>{ug("Backup Codes สำหรับ 2FA: เมื่อเปิด 2FA ระบบจะสร้างรหัสสำรอง 10 รหัส — เก็บรหัสเหล่านี้ไว้ในที่ปลอดภัย ใช้ได้เมื่อไม่มี Authenticator App","2FA Backup Codes: when enabling 2FA the system generates 10 backup codes — store them securely, use when Authenticator App is unavailable")}</UGNote>
          </div>
        </UGSection>

        {/* ─── UI ─── */}
        <UGSection icon="sun" title={ug("การตั้งค่า UI","UI Settings")} expandSignal={expandSig}>
          <div style={{ marginTop: 12 }}>
            <UGTable rows={[
              [ug("ปุ่ม","Button"), ug("ตำแหน่ง","Location"), ug("ฟังก์ชัน","Function")],
              ["🌙 / ☀️", "Topbar ขวา", ug("สลับโหมดมืด/สว่าง (จำค่าไว้)","Toggle dark/light mode (remembered)")],
              ["TH / EN", "Topbar ขวา", ug("สลับภาษาไทย/อังกฤษ","Toggle Thai/English")],
              ["🔄 Refresh", "Topbar ขวา", ug("โหลดข้อมูลใหม่","Reload data")],
            ]} />
          </div>
        </UGSection>

        <UGSection icon="bell" title={ug("PWA & การแจ้งเตือน","PWA & Notifications")} expandSignal={expandSig}>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{ug("ติดตั้งแอป (PWA)","Install App (PWA)")}</div>
            <UGStep n={1} text={ug("เปิดเว็บใน Safari (iOS) หรือ Chrome (Android)","Open the website in Safari (iOS) or Chrome (Android)")} />
            <UGStep n={2} text={ug("iOS: กดปุ่ม Share (กล่องลูกศรขึ้น) → 'เพิ่มลงหน้าจอหลัก' → ตั้งชื่อ → กด 'เพิ่ม'","iOS: tap Share button (box with arrow) → 'Add to Home Screen' → set name → tap 'Add'")} />
            <UGStep n={3} text={ug("Android: กดเมนู ⋮ → 'เพิ่มใน หน้าจอหลัก' หรือ 'ติดตั้งแอป'","Android: tap ⋮ menu → 'Add to Home Screen' or 'Install App'")} />
            <UGStep n={4} text={ug("เปิดแอปจาก icon บน home screen — ทำงานแบบ standalone ไม่มี browser bar","Open app from home screen icon — works standalone without browser bar")} />
            <UGTip>{ug("หลังอัปเดตโค้ด ระบบจะโหลด version ใหม่ในรอบถัดไปที่เปิดแอป หรือกด 'โหลดเวอร์ชันใหม่' ใน Deploy popup","After code updates, the app loads the new version on next open, or press 'Load New Version' in the Deploy popup")}</UGTip>

            <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("การแจ้งเตือน Push","Push Notifications")}</div>
            <UGNote>{ug("การแจ้งเตือน Push ถูกส่งโดย Admin เท่านั้น — ผู้ใช้งานจะได้รับแจ้งเตือนเมื่อ Admin ส่งประกาศสำคัญ เช่น ปิดระบบ อัปเดต หรือแจ้งด่วน","Push notifications are sent by Admin only — users receive alerts when Admin sends important announcements such as maintenance, updates, or urgent notices")}</UGNote>
            <UGNote>{ug("ต้องติดตั้งแอปบน home screen (PWA) และเปิดอนุญาตการแจ้งเตือนก่อน จึงจะได้รับแจ้งเตือน","App must be installed on home screen (PWA) and notification permission must be allowed to receive alerts")}</UGNote>
            <UGNote>{ug("iOS: ต้องใช้ iOS 16.4 ขึ้นไป และเปิดจาก home screen เท่านั้น — ไม่รองรับใน browser tab ปกติ","iOS: requires iOS 16.4+ and must be opened from home screen — not supported in regular browser tab")}</UGNote>
          </div>
        </UGSection>

        {/* ─── Admin-only sections ─── */}
        {isAdmin && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 14px" }}>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              <span className="badge badge-orange" style={{ fontSize: 12, padding: "4px 12px" }}>{ug("Admin เท่านั้น","Admin Only")}</span>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>

            <UGSection icon="dashboard" title="Dashboard" badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  [ug("การ์ด","Card"), ug("ข้อมูลที่แสดง","Data shown")],
                  [ug("มิเตอร์ทั้งหมด","Total Meters"), ug("จำนวน PEA Meter ในระบบ","Number of PEA Meters in system")],
                  [ug("หม้อแปลงทั้งหมด","Total Transformers"), ug("จำนวน PEA Transformer ในระบบ","Number of PEA Transformers in system")],
                  [ug("กำลัง (kVA)","Power (kVA)"), ug("ผลรวม kVA ของหม้อแปลงทั้งหมด","Total kVA sum of all transformers")],
                  [ug("ผู้ใช้งาน","Users"), ug("จำนวน user ทั้งหมด (active + pending)","Total users (active + pending)")],
                ]} />
                <UGNote>{ug("กด Refresh บน Topbar เพื่ออัปเดตข้อมูล Dashboard","Press Refresh on Topbar to update Dashboard data")}</UGNote>
              </div>
            </UGSection>

            <UGSection icon="users" title={ug("จัดการผู้ใช้งาน","User Management")} badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  ["Action", ug("ผลลัพธ์","Result")],
                  [ug("คลิกแถวผู้ใช้","Click user row"), ug("เปิด popup ข้อมูลส่วนตัว + สถานะรหัสผ่าน + ประวัติการเปลี่ยนรหัส","Opens popup with personal info + password status + change history")],
                  [ug("อนุมัติ","Approve"), ug("pending → active (ผู้ใช้เข้าระบบได้)","pending → active (user can login)")],
                  [ug("ระงับ","Suspend"), ug("→ banned (เข้าระบบไม่ได้)","→ banned (cannot login)")],
                  [ug("ปลดระงับ","Unsuspend"), "banned → active"],
                  [ug("เปลี่ยน Role","Change Role"), ug("สลับ user ↔ admin (2FA เปิด/ปิดอัตโนมัติ)","Toggle user ↔ admin (2FA auto-enabled/disabled)")],
                  [ug("บังคับ 2FA","Force 2FA"), ug("คลิก toggle 2FA ในแถว","Click 2FA toggle in row")],
                  [ug("ปลดล็อครหัสผ่าน","Unlock Password"), ug("กดปุ่ม 'ปลดล็อค' → user ต้องเปลี่ยนรหัสเมื่อ login","Press 'Unlock' → user must change password on next login")],
                ]} />
                <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("Popup ข้อมูลผู้ใช้ (คลิกแถว)","User Details Popup (click row)")}</div>
                <UGStep n={1} text={ug("คลิกที่แถวใดก็ได้ในตารางผู้ใช้ — popup เปิดแสดงอีเมล, สถานะ, บทบาท, 2FA, เข้าล่าสุด, วันสมัคร","Click any user row — popup shows email, status, role, 2FA, last login, registration date")} />
                <UGStep n={2} text={ug("การ์ดสถานะรหัสผ่านแสดง progress bar + วันใช้ไป/45 วัน + วันหมดอายุ","Password status card shows progress bar + days used/45 + expiry date")} />
                <UGStep n={3} text={ug("รายการประวัติการเปลี่ยนรหัสผ่านแสดงครบทุกครั้งพร้อมวันที่","Password history list shows every change with dates")} />
                <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug('คอลัมน์ "รหัสผ่าน" ในตารางผู้ใช้','Password column in user table')}</div>
                <UGTable rows={[
                  [ug("สีที่แสดง","Color"), ug("ความหมาย","Meaning")],
                  [ug("🟢 เขียว (XX วัน)","🟢 Green (XX days)"), ug("รหัสผ่านยังใช้งานได้ตามปกติ","Password is still valid")],
                  [ug("🟡 เหลือง (≤7 วัน)","🟡 Yellow (≤7 days)"), ug("ใกล้หมดอายุ — ควรเปลี่ยน","Expiring soon — should change")],
                  [ug("🔴 แดง (≤3 วัน)","🔴 Red (≤3 days)"), ug("ใกล้หมดอายุมาก","Critically close to expiry")],
                  [ug("🔴 หมดอายุ + ปลดล็อค","🔴 Expired + Unlock"), ug("รหัสหมดอายุแล้ว — กดปลดล็อคให้ผู้ใช้","Password expired — press Unlock for the user")],
                  [ug("🟡 ต้องเปลี่ยน","🟡 Must Change"), ug("Admin ปลดล็อคแล้ว รอผู้ใช้เข้ามาเปลี่ยน","Admin unlocked — waiting for user to change")],
                ]} />
                <UGTip>{ug("มี pending user — ระบบแสดง badge แดงที่ปุ่ม Bell บน Topbar","Pending users — red badge appears on Bell button in Topbar")}</UGTip>
              </div>
            </UGSection>

            <UGSection icon="meter" title={ug("จัดการ PEA มิเตอร์ & หม้อแปลง","Manage PEA Meter & Transformer")} badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  ["Action", ug("วิธีใช้","How to use")],
                  [ug("ค้นหา","Search"), ug("พิมพ์ในช่อง search — โหลดสูงสุด 100 รายการแรก","Type in search box — loads first 100 records")],
                  [ug("เพิ่ม","Add"), ug("กด '+เพิ่ม' → กรอกข้อมูล → บันทึก","Press '+Add' → fill data → save")],
                  [ug("แก้ไข","Edit"), ug("กดปุ่มดินสอในแถว → แก้ไข → บันทึก","Press pencil button in row → edit → save")],
                  [ug("ลบ","Delete"), ug("กดถังขยะ → ยืนยันใน Confirm Dialog","Press trash icon → confirm in dialog")],
                  ["Export CSV", ug("กด Export → Dialog แสดงจำนวน → กด Export","Press Export → dialog shows count → press Export")],
                ]} />
                <UGNote>{ug("ทุกการเปลี่ยนแปลงถูกบันทึกใน Audit Log อัตโนมัติ","All changes are automatically recorded in Audit Log")}</UGNote>
              </div>
            </UGSection>

            <UGSection icon="upload" title={ug("นำเข้าข้อมูล CSV","Import CSV Data")} badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGStep n={1} text={ug("เลือกประเภท: PEA Meter หรือ PEA Transformer","Select type: PEA Meter or PEA Transformer")} />
                <UGStep n={2} text={ug("ลากหรือคลิกเพื่ออัปโหลดไฟล์ CSV (UTF-8)","Drag or click to upload CSV file (UTF-8)")} />
                <UGStep n={3} text={ug("ตรวจสอบ Preview 10 แถวแรก — ตรวจสอบหัวคอลัมน์","Check Preview of first 10 rows — verify column headers")} />
                <UGStep n={4} text={ug("กด 'นำเข้าข้อมูล' — ระบบ upsert ตาม OBJECTID (500 rows/รอบ)","Press 'Import' — system upserts by OBJECTID (500 rows/batch)")} />
                <UGTip>{ug("ถ้า OBJECTID ซ้ำ ระบบจะ update ข้อมูลเดิม ไม่สร้างรายการใหม่","If OBJECTID exists, system updates the record instead of creating a new one")}</UGTip>
              </div>
            </UGSection>

            <UGSection icon="map" title={ug("แผนที่ภาพรวม & อนุมัติแก้ไขพิกัด","Overview Map & Coordinate Corrections")} badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  [ug("ฟีเจอร์","Feature"), ug("วิธีใช้","How to use")],
                  [ug("มุมมองแผนที่","Basemap"), ug("กด dropdown 'Street / Satellite' บนแผนที่ Admin","Press 'Street / Satellite' dropdown on Admin map")],
                  [ug("ตำแหน่งฉัน","My Location"), ug("กดปุ่ม '📍 ตำแหน่งฉัน' ในแถบควบคุม — แผนที่บินไปตำแหน่ง GPS ปัจจุบัน พร้อมหมุดสีน้ำเงิน + ความแม่นยำ","Press '📍 My Location' in the controls bar — map flies to current GPS position with blue pin + accuracy radius")],
                  [ug("คำขอแก้ไขพิกัด","Correction Requests"), ug("กดปุ่ม '📋 คำขอแก้ไข (N)' — N = จำนวนที่รอ","Press '📋 Correction Requests (N)' — N = pending count")],
                  [ug("อนุมัติ","Approve"), ug("กดปุ่ม 'อนุมัติ' — พิกัดในตาราง Meter/TR จะอัปเดตทันที","Press 'Approve' — Meter/TR table coords update immediately")],
                  [ug("ปฏิเสธ","Reject"), ug("กดปุ่ม 'ปฏิเสธ' — คำขอถูกยกเลิก ไม่มีการเปลี่ยนแปลง","Press 'Reject' — request cancelled, no changes made")],
                ]} />
                <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("ขั้นตอนอนุมัติพิกัด","Coordinate Approval Steps")}</div>
                <UGStep n={1} text={ug("ไปที่ Admin → แผนที่ภาพรวม — สังเกตตัวเลขสีส้มที่ปุ่ม '📋 คำขอแก้ไข'","Go to Admin → Overview Map — notice orange count on '📋 Correction Requests' button")} />
                <UGStep n={2} text={ug("กดปุ่มนั้น — แผงด้านขวาแสดงรายการ pending พร้อมพิกัดเดิม (🔴) และพิกัดใหม่ (🟢)","Press the button — right panel shows pending items with old (🔴) and new (🟢) coords")} />
                <UGStep n={3} text={ug("ตรวจสอบพิกัดที่ส่งมา เปรียบเทียบ lat/lng เดิมกับใหม่","Review submitted coords, compare old vs new lat/lng")} />
                <UGStep n={4} text={ug("กด 'อนุมัติ' เพื่อบันทึกพิกัดใหม่ลงฐานข้อมูล หรือ 'ปฏิเสธ' เพื่อยกเลิก","Press 'Approve' to save new coords to DB, or 'Reject' to cancel")} />
                <UGNote>{ug("การอนุมัติพิกัดจะอัปเดตทั้งตาราง meters/transformers และ marker บนแผนที่ทันที","Approving coords updates both the meters/transformers table and map markers immediately")}</UGNote>
              </div>
            </UGSection>

            <UGSection icon="history" title="Audit Log" badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  [ug("Action ที่บันทึก","Action recorded"), ug("ตัวอย่าง","Example")],
                  ["login / logout", ug("เข้า-ออกระบบ","Login/logout")],
                  ["search_meter / search_tr", ug("ค้นหาข้อมูล","Search data")],
                  ["create / update / delete", ug("เพิ่ม แก้ไข ลบ Meter/TR","Add/edit/delete Meter/TR")],
                  ["import_csv / export_csv", ug("นำเข้า/ส่งออกข้อมูล","Import/export data")],
                  ["change_password", ug("เปลี่ยนรหัสผ่าน (บันทึกใน password_history ด้วย)","Change password (also saved in password_history)")],
                  ["reset_password_initiated", ug("เปิดหน้ารีเซ็ตรหัสผ่านผ่านลิงก์อีเมล","Opened reset password page via email link")],
                  ["reset_password_failed", ug("รีเซ็ตรหัสผ่านไม่สำเร็จ (มี error)","Password reset failed (error occurred)")],
                  ["enable_2fa / disable_2fa", ug("เปิด/ปิด 2FA","Enable/Disable 2FA")],
                  ["approve_user / ban_user", ug("อนุมัติ/ระงับผู้ใช้งาน","Approve/suspend user")],
                  ["unlock_password", ug("Admin ปลดล็อครหัสผ่านหมดอายุ","Admin unlocked expired password")],
                ]} />
                <UGNote>{ug("Audit Log แบ่งหน้า 50 รายการต่อหน้า — กรองตาม user, action, วันที่ได้","Audit Log paginated 50 per page — filter by user, action, date")}</UGNote>
              </div>
            </UGSection>

            <UGSection icon="settings" title={ug("ตั้งค่าระบบ","System Settings")} badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Maintenance Mode</div>
                <UGStep n={1} text={ug("เปิด Toggle 'Maintenance Mode' — ผู้ใช้ทั่วไปจะเห็นหน้าปิดปรับปรุง","Enable 'Maintenance Mode' — regular users will see maintenance page")} />
                <UGStep n={2} text={ug("แก้ไขข้อความแจ้งผู้ใช้ แล้วกด 'บันทึกข้อความ'","Edit message for users, then press 'Save Message'")} />
                <UGStep n={3} text={ug("เลือกวันที่/เวลาที่คาดว่าจะกลับมาผ่านปฏิทินไทย — กดปุ่มนาฬิกาเพื่อเปิด","Set expected return date/time via Thai calendar — press clock button to open")} />
                <UGStep n={4} text={ug("บนมือถือ: ปฏิทินเลื่อนขึ้นจากล่าง (bottom sheet) — เลือกวัน ปรับชั่วโมง/นาที กด 'ยืนยัน'","Mobile: calendar slides up from bottom — select day, adjust hour/minute, press 'Confirm'")} />
                <UGStep n={5} text={ug("บน desktop: ปฏิทิน dropdown เปิดใต้ช่อง — นำทางเดือนด้วยปุ่ม ← → กด 'ยืนยัน'","Desktop: dropdown opens below the field — navigate months with ← → , press 'Confirm'")} />
                <UGNote>{ug("Admin ยังคงเข้าใช้ระบบได้ปกติ — จะเห็น banner แจ้งเตือนแดงบน Topbar","Admin can still access the system — will see a red warning banner on Topbar")}</UGNote>
                <UGTip>{ug("อย่าลืมปิด Maintenance Mode หลังงานเสร็จ — กดปุ่ม 'เปิดระบบ' ใน banner ได้เลย","Remember to disable Maintenance Mode when done — press 'Open System' button in the banner")}</UGTip>
                <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("ข้อมูลนักพัฒนาระบบ","Developer Info")}</div>
                <UGStep n={1} text={ug("กรอกชื่อ, ตำแหน่ง, หน่วยงาน, สถานที่ ในการ์ด 'ข้อมูลนักพัฒนาระบบ'","Fill name, position, department, location in the 'Developer Info' card")} />
                <UGStep n={2} text={ug("เปิด Toggle 'แสดงปุ่มนักพัฒนา' — ปุ่มลอยจะปรากฏที่มุมหน้าจอ","Enable 'Show Developer Button' — a floating button appears at screen corner")} />
                <UGStep n={3} text={ug("ลากปุ่มไปวางตำแหน่งที่ต้องการ — ระบบจำตำแหน่งไว้อัตโนมัติ","Drag the button to desired position — position is saved automatically")} />
                <UGNote>{ug("ทั้ง Maintenance Mode และข้อมูลนักพัฒนา สามารถย่อ/ขยายได้โดยกดหัวการ์ด","Both Maintenance Mode and Developer Info cards can be collapsed by clicking the header")}</UGNote>
              </div>
            </UGSection>

            <UGSection icon="bell" title={ug("ส่ง Push Notification (Admin เท่านั้น)","Send Push Notifications (Admin Only)")} badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGNote>{ug("สิทธิ์ส่งการแจ้งเตือน Push เป็นของ Admin เท่านั้น — ผู้ใช้งานทั่วไปไม่สามารถส่งได้","Push notification sending is Admin-only — regular users cannot send notifications")}</UGNote>
                <div style={{ fontWeight: 700, margin: "12px 0 8px" }}>{ug("เปิดใช้งานการแจ้งเตือนบนอุปกรณ์ Admin (ครั้งแรก)","Enable notifications on Admin device (first time)")}</div>
                <UGStep n={1} text={ug("ไปที่ Admin → ตั้งค่า → เลื่อนลงถึงการ์ด 'ส่งการแจ้งเตือน Push'","Go to Admin → Settings → scroll to 'Push Notifications' card")} />
                <UGStep n={2} text={ug("กดปุ่ม 'เปิดการแจ้งเตือน' → กด 'อนุญาต' บน dialog — จุดเขียวจะปรากฏ","Press 'Enable Notifications' → tap 'Allow' on dialog — green dot will appear")} />
                <UGNote>{ug("iOS: ต้องเปิดจาก home screen (PWA) + iOS 16.4+ ถ้าขึ้น 'ถูกบล็อก' → ไปที่ Settings → GIS Meter → Allow Notifications → กด 'ลองอีกครั้ง'","iOS: must open from home screen (PWA) + iOS 16.4+ · If 'Blocked' appears → Settings → GIS Meter → Allow Notifications → tap 'Try Again'")}</UGNote>
                <div style={{ fontWeight: 700, margin: "12px 0 8px" }}>{ug("ส่งการแจ้งเตือน","Send Notification")}</div>
                <UGStep n={3} text={ug("ตรวจสอบสถานะ 'เปิดการแจ้งเตือนแล้ว' (จุดเขียว) ก่อนส่ง","Confirm 'Notifications enabled' (green dot) before sending")} />
                <UGStep n={4} text={ug("เลือกเทมเพลตด่วน หรือพิมพ์หัวข้อ+ข้อความเอง","Select a quick template or type a custom title + message")} />
                <UGStep n={5} text={ug("กด 'ส่งการแจ้งเตือน' — ระบบส่งถึงทุกเครื่องที่ subscribe ทันที","Press 'Send Notification' — instantly alerts all subscribed devices")} />
                <UGTable rows={[
                  [ug("เทมเพลต","Template"), ug("ใช้เมื่อ","Use when")],
                  [ug("🔧 ปิดระบบชั่วคราว","🔧 Maintenance"), ug("แจ้งก่อนปิดระบบเพื่อบำรุงรักษา","Notify before taking system offline")],
                  [ug("⚡ อัปเดตระบบ","⚡ Update"), ug("แจ้งเมื่อ deploy version ใหม่","Notify after deploying a new version")],
                  [ug("✅ ระบบกลับมาแล้ว","✅ Back Online"), ug("แจ้งหลังซ่อมบำรุงเสร็จ","Notify after maintenance is complete")],
                  [ug("⚠️ แจ้งเตือนด่วน","⚠️ Alert"), ug("ประกาศสำคัญเร่งด่วน","Urgent announcements")],
                ]} />
                <UGTip>{ug("ระบบลบ subscription ที่หมดอายุ (410 Gone) อัตโนมัติหลังส่งทุกครั้ง","Expired subscriptions (410 Gone) are automatically cleaned up after each send")}</UGTip>
              </div>
            </UGSection>

            <UGSection icon="lock" title={ug("ความปลอดภัย","Security Monitoring")} badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  [ug("รายการตรวจสอบ","Check"), ug("ความหมาย","Meaning"), ug("คะแนนสูงสุด","Max Score")],
                  ["HTTPS", ug("การเชื่อมต่อเข้ารหัส TLS","Encrypted TLS connection"), "20"],
                  [ug("Admin 2FA","Admin 2FA"), ug("ทุกบัญชี Admin มี 2FA","All Admin accounts have 2FA"), "20"],
                  [ug("อัตราการใช้ 2FA","2FA Adoption"), ug("สัดส่วน user ที่เปิด 2FA","% of users with 2FA enabled"), "10"],
                  [ug("รหัสผ่านตามนโยบาย","Password Compliance"), ug("ไม่มีรหัสผ่านหมดอายุ","No expired passwords"), "15"],
                  [ug("กิจกรรมต้องสงสัย","Suspicious Activity"), ug("ไม่มี pw_reset_failed หรือ rapid login ใน 24 ชม.","No pw_reset_failed or rapid login in 24h"), "20"],
                  [ug("ฐานข้อมูล","Database"), ug("Supabase เชื่อมต่อปกติ","Supabase connected"), "15"],
                ]} />
                <div style={{ fontWeight: 700, margin: "14px 0 8px" }}>{ug("ระดับความปลอดภัย","Security Levels")}</div>
                <UGTable rows={[
                  [ug("คะแนน","Score"), ug("สถานะ","Status"), ug("ความหมาย","Meaning")],
                  ["≥ 80", ug("🟢 ปลอดภัย","🟢 Secure"), ug("ผ่านตรวจสอบส่วนใหญ่","Most checks passed")],
                  ["60–79", ug("🟡 มีความเสี่ยง","🟡 Warning"), ug("มีรายการที่ต้องแก้ไข","Some items need attention")],
                  ["< 60", ug("🔴 ต้องดำเนินการ","🔴 Critical"), ug("มีปัญหาสำคัญ — ดำเนินการทันที","Serious issues — act immediately")],
                ]} />
                <UGStep n={1} text={ug("ไปที่ Admin → ความปลอดภัย — ระบบโหลด Audit Log 7 วันย้อนหลังอัตโนมัติ","Go to Admin → Security — system auto-loads 7-day Audit Log")} />
                <UGStep n={2} text={ug("ดูคะแนนรวมในวงกลม + สถานะ (ปลอดภัย/มีความเสี่ยง/ต้องดำเนินการ)","Check overall score in the gauge + status (Secure/Warning/Critical)")} />
                <UGStep n={3} text={ug("ตรวจสอบรายการตรวจสอบทีละรายการ — รายการที่ไม่ผ่านจะแสดงวิธีแก้ไข","Review each check — failed items show how to fix")} />
                <UGStep n={4} text={ug("ดูส่วน 'กิจกรรมที่น่าสังเกต' — แสดง event ต้องสงสัยจาก Audit Log","View 'Notable Activity' — shows suspicious events from Audit Log")} />
                <UGTip>{ug("กด 'ตรวจสอบอีกครั้ง' เพื่อ refresh ข้อมูล Audit Log สดทันที","Press 'Re-check' to refresh Audit Log data instantly")}</UGTip>
              </div>
            </UGSection>

            <UGSection icon="bolt" title={ug("ประวัติการปรับปรุง UX/UI","UX/UI Update History")} badge="admin" expandSignal={expandSig}>
              <div style={{ marginTop: 12 }}>
                <UGTable rows={[
                  [ug("รายการ","Item"), ug("รายละเอียด","Details")],
                  [ug("ตำแหน่ง","Location"), ug("Sidebar (desktop) / Bottom nav (mobile) — ไอคอน ⚡ 'อัปเดต'","Sidebar (desktop) / Bottom nav (mobile) — ⚡ 'Updates' icon")],
                  [ug("สิทธิ์","Access"), ug("Admin เท่านั้น","Admin only")],
                  [ug("ข้อมูล","Content"), ug("Timeline ทุก version พร้อมวันที่, category chip, stat summary","Timeline of every version with dates, category chips, stat summary")],
                  ["Deploy Status dot", ug("จุดสีใน Topbar — 🟢 ปัจจุบัน / 🟡 รอ Deploy / ⚫ กำลังโหลด","Colored dot in Topbar — 🟢 Current / 🟡 Awaiting Deploy / ⚫ Loading")],
                  [ug("ตรวจสอบอีกครั้ง","Re-check"), ug("ปุ่มใน deploy popup — refetch version.json + GitHub API ดูว่า deploy เสร็จแล้วหรือยัง","Button in deploy popup — refetch version.json + GitHub API to see if deploy finished")],
                  [ug("โหลดเวอร์ชันใหม่","Load New Version"), ug("ปุ่มใน deploy popup — force reload หน้าเว็บด้วย ?v=timestamp เพื่อดึง JS/CSS ใหม่ bypass cache","Button in deploy popup — force reload with ?v=timestamp to get fresh JS/CSS bypassing cache")],
                ]} />
                <UGStep n={1} text={ug("กดแท็บ 'อัปเดต ⚡' ใน sidebar — timeline แสดงทุก version ตั้งแต่ v2.0","Press 'Updates ⚡' in sidebar — timeline shows all versions since v2.0")} />
                <UGStep n={2} text={ug("การ์ด Deployment Status ด้านบน timeline — เปรียบเทียบ hash ที่รันกับ GitHub latest","Deployment Status card above timeline — compares running hash with GitHub latest")} />
                <UGStep n={3} text={ug("แต่ละรายการมี chip บอกประเภท: ใหม่ / UX/UI / แก้ไข / ประสิทธิภาพ","Each item has a category chip: new / UX/UI / fix / performance")} />
                <UGStep n={4} text={ug("กดจุดสีใน Topbar เพื่อดู popup สถานะ deploy ได้ทันทีโดยไม่ต้องเปิดหน้า อัปเดต","Press the colored dot in Topbar for an instant deploy status popup without opening Updates page")} />
                <UGTip>{ug("หลังจาก push โค้ดขึ้น GitHub Pages ใช้เวลา 1–3 นาที — สถานะจะเปลี่ยนเป็น 🟢 โดยอัตโนมัติ","After pushing to GitHub Pages, wait 1–3 minutes — status will automatically turn 🟢")}</UGTip>
              </div>
            </UGSection>
          </>
        )}

        {/* ─── README / Project Docs ─── */}
        <UGSection icon="book" title={ug("เอกสารโครงการ (README)","Project Documentation (README)")} expandSignal={expandSig}>
          <div style={{ marginTop: 12 }}>
            <UGNote>{ug("เอกสารครบถ้วนรวมถึง Architecture, การติดตั้ง, ฐานข้อมูล และ Tech Stack อยู่ใน README.md บน GitHub","Full documentation including Architecture, Setup, Database, and Tech Stack is in README.md on GitHub")}</UGNote>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {[
                { icon: "📋", title: ug("ภาพรวมระบบ","System Overview"),   desc: ug("Architecture, Tech Stack, โครงสร้างไฟล์","Architecture, Tech Stack, File Structure") },
                { icon: "🗄️", title: ug("ฐานข้อมูล","Database"),            desc: ug("Tables, RLS, RPC Functions","Tables, RLS, RPC Functions") },
                { icon: "🚀", title: ug("การติดตั้ง","Setup Guide"),         desc: ug("Supabase setup, config.js, Admin คนแรก","Supabase setup, config.js, First Admin") },
                { icon: "🔒", title: ug("ความปลอดภัย","Security"),          desc: ug("Anon Key + RLS, VAPID, Service Role Key","Anon Key + RLS, VAPID, Service Role Key") },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "var(--soft)", border: "1px solid var(--soft-border)" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <a href="https://github.com/menzkub/gis-mapping-system/blob/main/README.md" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "rgba(139,63,196,0.12)", border: "1px solid rgba(139,63,196,0.3)", color: "var(--pea-purple-500)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                <Icon name="book" size={14} /> {ug("อ่าน README.md","Read README.md")}
              </a>
              <a href="https://github.com/menzkub/gis-mapping-system" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid var(--line)", color: "var(--ink-mute)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                <Icon name="code" size={14} /> GitHub Repository
              </a>
            </div>
          </div>
        </UGSection>

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
  const { t } = useLang();
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
                {hasDetails ? (
                  <>
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
                  </>
                ) : (
                  <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--soft)", border: "1px solid var(--line)", textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.7 }}>
                      ยังไม่ได้กรอกข้อมูลเพิ่มเติม<br />
                      <span style={{ fontSize: 11 }}>Admin → ตั้งค่า → ข้อมูลนักพัฒนา → กรอก ฐานข้อมูล / Tech Stack / ระบบ</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>{devInfo.footer || t("devFooter")}</div>
            {devInfo.version && (
              <span className="badge" style={{ fontSize: 10, background: "rgba(107,44,145,0.12)", color: "#6b2c91", borderRadius: 999, padding: "3px 9px", fontWeight: 700 }}>{devInfo.version}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DevInfoButton({ devInfo }) {
  const { t } = useLang();
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
  const btnRef = React.useRef(null);

  useEffectApp(() => {
    const clamp = (p) => {
      const w = btnRef.current ? btnRef.current.offsetWidth  : 120;
      const h = btnRef.current ? btnRef.current.offsetHeight : 44;
      return {
        x: Math.min(Math.max(0, p.x), window.innerWidth  - w),
        y: Math.min(Math.max(0, p.y), window.innerHeight - h),
      };
    };

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
        ref={btnRef}
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
          <div style={{ fontSize: 9, opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("devBy")}</div>
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
  const [sidebarExpanded, setSidebarExpanded] = useStateApp(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useStateApp(() => {
    try { return localStorage.getItem("pea_sidebar_collapsed") === "true"; } catch(_) { return false; }
  });
  const [maintenanceMode, setMaintenanceMode] = useStateApp(false);
  const [maintenanceMessage, setMaintenanceMessage] = useStateApp("");
  const [maintenanceUntil, setMaintenanceUntil] = useStateApp("");
  const [allowExport, setAllowExport] = useStateApp(true);
  const [showNotif, setShowNotif] = useStateApp(false);
  const [refreshing, setRefreshing] = useStateApp(false);
  const [refreshMsg, setRefreshMsg] = useStateApp(null); // null | "loading" | "done" | "error"
  const [showUtilMenu, setShowUtilMenu] = useStateApp(false);
  const [showBaseMenu, setShowBaseMenu] = useStateApp(false);
  const [showMobileUserMenu, setShowMobileUserMenu] = useStateApp(false);
  const [maintDismissed, setMaintDismissed] = useStateApp(() => sessionStorage.getItem("pea_maint_dismissed") === "true");
  const [adminTab, setAdminTab] = useStateApp("dashboard");
  const [showLogoutConfirm, setShowLogoutConfirm] = useStateApp(false);
  const [devInfo, setDevInfo] = useStateApp({
    name: "", position: "", department: "", location: "",
    database: "", stack: "", systems: "",
    version: "1.0.0", footer: "", showBtn: false,
  });
  const [daysUntilExpiry, setDaysUntilExpiry] = useStateApp(null);
  const [idleWarnSecs, setIdleWarnSecs] = useStateApp(null);
  const [pushPermission, setPushPermission] = useStateApp(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

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
      setAllowExport(settingsMap["allow_export"] !== "false");
      setDevInfo({
        name:       settingsMap["dev_name"]       || "",
        position:   settingsMap["dev_position"]   || "",
        department: settingsMap["dev_department"] || "",
        location:   settingsMap["dev_location"]   || "",
        database:   settingsMap["dev_database"]   || "Supabase (PostgreSQL 15) · Authentication · Row-Level Security (RLS) · Realtime",
        stack:      settingsMap["dev_stack"]      || "React 18 (UMD) · Babel Standalone · Leaflet.js 1.9 · Service Worker (PWA) · GitHub Pages · Plus Jakarta Sans · Noto Sans Thai",
        systems:    settingsMap["dev_systems"]    || "GIS Mapping · 2FA/MFA · Push Notifications · GitHub Actions CI/CD · Google Fonts API · Supabase Auth",
        version:    settingsMap["dev_version"]    || "v3.2",
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
      // Fallback: if RPC doesn't return pea_kva (old function), compute from direct query
      if (dashStats.pea_kva === undefined || dashStats.pea_kva === null) {
        try {
          const { data: trKva } = await _supabase
            .from("transformers").select("kva,owner_tr").not("kva", "is", null);
          if (trKva) {
            dashStats.pea_kva  = trKva.filter(r => r.owner_tr === "PEA").reduce((s,r) => s + (+r.kva||0), 0);
            dashStats.cust_kva = trKva.filter(r => r.owner_tr === "Customer").reduce((s,r) => s + (+r.kva||0), 0);
          }
        } catch(_) {}
      }

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

  // ── Push Notification subscription ───────────────────────────────────────
  const subscribePush = React.useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission !== "granted") return permission;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: window.VAPID_PUBLIC_KEY,
    });
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return "no-session";
    await _supabase.from("push_subscriptions").upsert(
      { user_id: session.user.id, subscription: sub.toJSON() },
      { onConflict: "user_id" }
    );
    return "granted";
  }, []);

  const unsubscribePush = React.useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) await _supabase.from("push_subscriptions").delete().eq("user_id", session.user.id);
    setPushPermission("default");
  }, []);

  // Auto-subscribe when user logs in and permission was already granted
  useEffectApp(() => {
    if (!currentUser) return;
    if (typeof Notification !== "undefined" && Notification.permission === "granted") subscribePush();
  }, [currentUser?.id]);

  // Re-read Notification.permission when user returns to the tab/app
  // (covers the case where user enables notifications in iOS Settings then comes back)
  useEffectApp(() => {
    if (typeof Notification === "undefined") return;
    const onVisible = () => {
      const perm = Notification.permission;
      setPushPermission(perm);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  // ── Auto-logout หลังไม่ใช้งาน 30 นาที (warning 2 นาทีก่อน) ──────────────
  useEffectApp(() => {
    if (!currentUser) return;
    const TIMEOUT     = 30 * 60 * 1000;
    const WARN_BEFORE = 2  * 60 * 1000;
    let mainTimer, warnTimer, countdownRef;

    const reset = () => {
      clearTimeout(mainTimer);
      clearTimeout(warnTimer);
      clearInterval(countdownRef);
      setIdleWarnSecs(null);

      warnTimer = setTimeout(() => {
        let secs = Math.floor(WARN_BEFORE / 1000);
        setIdleWarnSecs(secs);
        countdownRef = setInterval(() => {
          secs -= 1;
          setIdleWarnSecs(secs > 0 ? secs : 0);
          if (secs <= 0) clearInterval(countdownRef);
        }, 1000);
      }, TIMEOUT - WARN_BEFORE);

      mainTimer = setTimeout(async () => {
        clearInterval(countdownRef);
        setIdleWarnSecs(null);
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
      clearTimeout(mainTimer);
      clearTimeout(warnTimer);
      clearInterval(countdownRef);
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
    try { await addAudit({ user: currentUser.username, action: "logout", target: "—", detail: "ออกจากระบบ" }); } catch (_) {}
    try { await _supabase.auth.signOut(); } catch (_) {}
    // Force clear regardless of signOut result (handles expired-session 403)
    setCurrentUser(null);
    setAppState("unauthed");
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
      const freshStats = statsRes.data?.[0] || statsRes.data || {};
      if (freshStats.pea_kva === undefined || freshStats.pea_kva === null) {
        try {
          const { data: trKva } = await _supabase
            .from("transformers").select("kva,owner_tr").not("kva", "is", null);
          if (trKva) {
            freshStats.pea_kva  = trKva.filter(r => r.owner_tr === "PEA").reduce((s,r) => s + (+r.kva||0), 0);
            freshStats.cust_kva = trKva.filter(r => r.owner_tr === "Customer").reduce((s,r) => s + (+r.kva||0), 0);
          }
        } catch(_) {}
      }
      setData(d => ({
        ...d,
        users:    (profilesRes.data || []).map(toProfile),
        auditLog: (auditRes.data   || []).map(toAuditEntry),
        dashStats: Object.keys(freshStats).length ? freshStats : d.dashStats,
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
      { id: "changelog", icon: "bolt",     label: t("navChangelog") },
      { id: "admin",     icon: "settings", label: t("navAdmin")     },
    ] : []),
  ];
  const ADMIN_NAV = [
    { id: "dashboard", icon: "dashboard", label: t("admDashboard") },
    { id: "users",     icon: "users",     label: t("admUsers")     },
    { id: "meters",    icon: "meter",     label: t("admMeters")    },
    { id: "trs",       icon: "tr",        label: t("admTrs")       },
    { id: "map",       icon: "map",       label: t("admMap")       },
    { id: "import",    icon: "upload",    label: t("admImport")    },
    { id: "audit",     icon: "history",   label: t("admAudit")     },
    { id: "security",  icon: "lock",      label: t("admSecurity")  },
    { id: "settings",  icon: "settings",  label: t("admSettings")  },
    { id: "guide",     icon: "book",      label: t("admGuide")     },
    { id: "powered",   icon: "bolt",      label: t("admPowered")   },
    ...(isAdmin ? [{ id: "dev", icon: "code", label: t("admDev") }] : []),
  ];
  const pendingCount = data.users.filter(u => u.status === "pending").length;

  return (
    <ToastProvider><ConfirmProvider>
      <div className={"app-root" + (sidebarExpanded ? " sidebar-expanded" : "") + (sidebarCollapsed ? " sidebar-dt-collapsed" : "")}>

        {/* ── Idle-logout warning banner ── */}
        {idleWarnSecs !== null && (
          <div className="fade-up" style={{
            position: "fixed", zIndex: 9800,
            top: 72, right: 16, left: "auto",
            maxWidth: 360, width: "calc(100% - 32px)",
            background: "linear-gradient(135deg,#f47b20,#d96512)",
            color: "white", borderRadius: 16,
            padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 12px 40px rgba(244,123,32,0.55)",
          }}>
            <Icon name="warning" size={20} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3 }}>
                {lang === "en" ? "Session expiring" : "เซสชันใกล้หมดอายุ"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                {lang === "en"
                  ? `Auto-logout in ${Math.floor(idleWarnSecs / 60)}:${String(idleWarnSecs % 60).padStart(2,"0")}`
                  : `ออกจากระบบใน ${Math.floor(idleWarnSecs / 60)}:${String(idleWarnSecs % 60).padStart(2,"0")} นาที`}
              </div>
            </div>
            <button
              onClick={() => window.dispatchEvent(new MouseEvent("mousemove"))}
              style={{
                background: "rgba(255,255,255,0.22)", border: "none", color: "white",
                fontWeight: 700, fontSize: 13, padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                flexShrink: 0, whiteSpace: "nowrap",
              }}>
              {lang === "en" ? "Stay" : "ยังอยู่"}
            </button>
          </div>
        )}

        {/* Sidebar backdrop removed — sidebar uses grid push layout, not overlay */}

        {/* Sidebar */}
        <aside className="app-sidebar" style={{
          background: "linear-gradient(180deg, #1b0926 0%, #321148 50%, #1b0926 100%)",
          color: "white", padding: "22px 16px", display: "flex", flexDirection: "column", gap: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div className="sidebar-brand" style={{ padding: "4px 6px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
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
          <nav className="sidebar-nav f-col f-gap-2 sidebar-nav-scroll">
            {navItems.map(it => (
              <React.Fragment key={it.id}>
                <button
                  className={"sidebar-nav-btn" + (route === it.id ? " sidebar-nav-btn--active" : "")}
                  onClick={() => setRoute(it.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                    borderRadius: 12, color: "rgba(255,255,255,0.85)", fontWeight: 600, fontSize: 15,
                    background: route === it.id ? "linear-gradient(135deg, rgba(244,123,32,0.25), rgba(139,63,196,0.25))" : "transparent",
                    border: route === it.id ? "1px solid rgba(244,123,32,0.5)" : "1px solid transparent",
                    boxShadow: route === it.id ? "0 8px 20px rgba(244,123,32,0.18)" : "none",
                    textAlign: "left", transition: "all 180ms var(--ease-out)",
                  }}
                >
                  <Icon name={it.icon} size={20} />
                  <span className="sidebar-nav-label">{it.label}</span>
                </button>

                {/* Admin sub-nav — shows when on admin route OR when sidebar is expanded */}
                {it.id === "admin" && (route === "admin" || sidebarExpanded) && (
                  <div className="adm-subnav sidebar-nav-label" style={{ marginLeft: 10, paddingLeft: 10, borderLeft: "1px solid rgba(255,255,255,0.10)", display: "flex", flexDirection: "column", gap: 1 }}>
                    {ADMIN_NAV.map(sub => (
                      <button key={sub.id} onClick={() => { setRoute("admin"); setAdminTab(sub.id); setSidebarExpanded(false); }} style={{
                        display: "flex", alignItems: "center", gap: 9,
                        padding: "8px 12px", borderRadius: 9, fontSize: 14, fontWeight: 600,
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

          <div className="sidebar-user" style={{ marginTop: "auto", flexShrink: 0, padding: 14, background: "rgba(255,255,255,0.04)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="f-gap-3 flex" style={{ alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #f47b20, #6b2c91)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                {currentUser.name?.[0] || currentUser.username[0]}
              </div>
              <div className="sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>@{currentUser.username} · {currentUser.role}</div>
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
            .topbar-util-btn  { display: flex; }
            .topbar-util-dots { display: none !important; }
            .topbar-mob-user-wrap { display: none; position: relative; }
            .sidebar-hamburger { display: none; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); cursor: pointer; flex-shrink: 0; }
            .sidebar-hamburger:hover { background: rgba(139,63,196,0.12); border-color: var(--pea-purple-400); color: var(--pea-purple-600); }
            @media (min-width: 641px) and (max-width: 1024px) {
              .sidebar-hamburger { display: flex !important; }
            }
            @media (max-width: 680px) {
              .topbar-greeting       { display: none !important; }
              .topbar-mapswitcher    { display: none !important; }
              .topbar-logout         { display: none !important; }
              .topbar-mobile-brand   { display: flex !important; }
              .topbar-mobile-user    { display: none !important; }
              .topbar-util-btn       { display: none !important; }
              .topbar-util-dots      { display: none !important; }
              .topbar-mob-user-wrap  { display: block !important; }
            }
          `}</style>

          {/* Hamburger — tablet only */}
          <button className="sidebar-hamburger" onClick={() => setSidebarExpanded(e => !e)}
            title={sidebarExpanded ? "ยุบ Sidebar" : "ขยาย Sidebar"}>
            <Icon name={sidebarExpanded ? "close" : "menu"} size={18} />
          </button>

          {/* Desktop sidebar collapse toggle */}
          <button className="sidebar-dt-toggle" onClick={() => setSidebarCollapsed(c => {
            const next = !c;
            try { localStorage.setItem("pea_sidebar_collapsed", String(next)); } catch(_) {}
            return next;
          })} title={sidebarCollapsed ? "ขยาย Sidebar" : "ยุบ Sidebar"}>
            <Icon name={sidebarCollapsed ? "chevRight" : "chevLeft"} size={16} />
          </button>

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
            <div className="topbar-mapswitcher" style={{ position: "relative" }}>
              <button onClick={() => setShowBaseMenu(s => !s)} style={{
                display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px",
                borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: "1px solid var(--pea-purple-300)",
                background: "rgba(107,44,145,0.08)", color: "var(--pea-purple-600)",
              }}>
                <Icon name={baseMap === "satellite" ? "layers" : "map"} size={13} />
                {baseMap === "satellite" ? t("mapSatellite") : t("mapStreet")}
                <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
              </button>
              {showBaseMenu && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 599 }} onClick={() => setShowBaseMenu(false)} />
                  <div style={{
                    position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 600,
                    background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12,
                    boxShadow: "0 8px 28px rgba(0,0,0,0.16)", overflow: "hidden", minWidth: 150,
                  }}>
                    {[["street", "map", t("mapStreet")], ["satellite", "layers", t("mapSatellite")]].map(([k, icon, label]) => (
                      <button key={k} onClick={() => { setBaseMap(k); setShowBaseMenu(false); }} style={{
                        display: "flex", alignItems: "center", gap: 9, width: "100%",
                        padding: "10px 16px", background: baseMap === k ? "var(--pea-purple-50)" : "transparent",
                        color: baseMap === k ? "var(--pea-purple-600)" : "var(--ink)",
                        border: "none", cursor: "pointer", fontSize: 13, fontWeight: baseMap === k ? 700 : 500,
                        textAlign: "left",
                      }}>
                        <Icon name={icon} size={15} />
                        {label}
                        {baseMap === k && <span style={{ marginLeft: "auto" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Util buttons — desktop: individual, mobile: three-dots dropdown */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
            {/* Desktop: individual buttons */}
            <button className="topbar-util-btn" onClick={() => setLang(l => l === "th" ? "en" : "th")} title={t("switchLang")} style={{
              alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: "rgba(139,63,196,0.1)", border: "1px solid rgba(139,63,196,0.25)",
              color: "var(--pea-purple-600)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {lang === "th" ? "EN" : "TH"}
            </button>
            <button className="btn-icon topbar-util-btn" onClick={() => setTheme(t => t === "light" ? "dark" : "light")} title={theme === "light" ? t("themeDark") : t("themeLight")}>
              <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
            </button>
            <button className="btn-icon topbar-util-btn" title={t("refreshData")} onClick={handleRefresh} disabled={refreshing}
              style={{ color: refreshing ? "var(--pea-purple-500)" : undefined }}>
              <Icon name="refresh" size={18} style={{ animation: refreshing ? "pea-spin 0.8s linear infinite" : "none" }} />
            </button>

            {/* Mobile: three-dots button */}
            <button className="topbar-util-dots" onClick={() => setShowUtilMenu(s => !s)} title="ตั้งค่า" style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px 6px 10px", borderRadius: 999, flexShrink: 0, cursor: "pointer",
              background: showUtilMenu ? "rgba(139,63,196,0.18)" : "rgba(139,63,196,0.1)",
              border: `1px solid ${showUtilMenu ? "rgba(139,63,196,0.5)" : "rgba(139,63,196,0.25)"}`,
              color: "var(--pea-purple-600)", fontSize: 12, fontWeight: 700,
              transition: "background 0.15s, border-color 0.15s",
            }}>
              <Icon name="moreV" size={15} />
              <span>ตั้งค่า</span>
            </button>

            {/* Refresh feedback toast */}
            {refreshMsg && (
              <div className="fade-in topbar-util-btn" style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                background: refreshMsg === "done" ? "rgba(16,185,129,0.12)" : refreshMsg === "error" ? "rgba(239,68,68,0.1)" : "rgba(139,63,196,0.1)",
                color: refreshMsg === "done" ? "#047857" : refreshMsg === "error" ? "var(--red)" : "var(--pea-purple-500)",
                border: `1px solid ${refreshMsg === "done" ? "rgba(16,185,129,0.3)" : refreshMsg === "error" ? "rgba(239,68,68,0.25)" : "rgba(139,63,196,0.25)"}`,
              }}>
                {refreshMsg === "loading" ? t("refreshing") : refreshMsg === "done" ? t("refreshDone") : t("refreshError")}
              </div>
            )}

            {/* Three-dots dropdown popup */}
            {showUtilMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 1999 }} onClick={() => setShowUtilMenu(false)} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 2000,
                  background: "var(--surface)", border: "1px solid var(--line)",
                  borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  padding: "6px", minWidth: 180, display: "flex", flexDirection: "column", gap: 2,
                }}>
                  {/* Language */}
                  <button onClick={() => { setLang(l => l === "th" ? "en" : "th"); setShowUtilMenu(false); }} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                    background: "transparent", border: "none", cursor: "pointer", color: "var(--text)",
                    fontSize: 14, fontWeight: 600, textAlign: "left",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,63,196,0.12)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, color: "var(--pea-purple-600)", flexShrink: 0 }}>
                      {lang === "th" ? "EN" : "TH"}
                    </span>
                    <span>{lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}</span>
                  </button>

                  {/* Basemap — only on search page */}
                  {route === "search" && [["street", "map", t("mapStreet")], ["satellite", "layers", t("mapSatellite")]].map(([k, icon, label]) => (
                    <button key={k} onClick={() => { setBaseMap(k); setShowUtilMenu(false); }} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                      background: baseMap === k ? "rgba(107,44,145,0.08)" : "transparent",
                      border: "none", cursor: "pointer", color: baseMap === k ? "var(--pea-purple-600)" : "var(--text)",
                      fontSize: 14, fontWeight: baseMap === k ? 700 : 600, textAlign: "left",
                    }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,63,196,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Icon name={icon} size={15} style={{ color: "var(--pea-purple-600)" }} />
                      </span>
                      <span>{label}</span>
                      {baseMap === k && <span style={{ marginLeft: "auto", color: "var(--pea-purple-600)" }}>✓</span>}
                    </button>
                  ))}

                  {/* Theme */}
                  <button onClick={() => { setTheme(t => t === "light" ? "dark" : "light"); setShowUtilMenu(false); }} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                    background: "transparent", border: "none", cursor: "pointer", color: "var(--text)",
                    fontSize: 14, fontWeight: 600, textAlign: "left",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,63,196,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon name={theme === "light" ? "moon" : "sun"} size={15} style={{ color: "var(--pea-purple-600)" }} />
                    </span>
                    <span>{theme === "light" ? t("themeDark") : t("themeLight")}</span>
                  </button>

                  {/* Refresh */}
                  <button onClick={() => { handleRefresh(); setShowUtilMenu(false); }} disabled={refreshing} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                    background: "transparent", border: "none", cursor: refreshing ? "not-allowed" : "pointer", color: "var(--text)",
                    fontSize: 14, fontWeight: 600, textAlign: "left", opacity: refreshing ? 0.5 : 1,
                  }}
                    onMouseEnter={e => { if (!refreshing) e.currentTarget.style.background = "var(--hover)"; }}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,63,196,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon name="refresh" size={15} style={{ color: "var(--pea-purple-600)", animation: refreshing ? "pea-spin 0.8s linear infinite" : "none" }} />
                    </span>
                    <span>{refreshing ? t("refreshing") : t("refreshData")}</span>
                  </button>

                  {refreshMsg && refreshMsg !== "loading" && (
                    <div style={{ margin: "4px 8px 2px", padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: refreshMsg === "done" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      color: refreshMsg === "done" ? "#047857" : "var(--red)",
                      border: `1px solid ${refreshMsg === "done" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)"}`,
                    }}>
                      {refreshMsg === "done" ? t("refreshDone") : t("refreshError")}
                    </div>
                  )}
                </div>
              </>
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

          {/* Mobile: user chip → dropdown with settings + logout */}
          <div className="topbar-mob-user-wrap">
            <button onClick={() => setShowMobileUserMenu(s => !s)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px 5px 6px", borderRadius: 20, cursor: "pointer",
              border: `1px solid ${showMobileUserMenu ? "rgba(139,63,196,0.5)" : "rgba(139,63,196,0.3)"}`,
              background: showMobileUserMenu ? "rgba(139,63,196,0.18)" : "rgba(139,63,196,0.1)",
              transition: "background 0.15s, border-color 0.15s",
            }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#f47b20,#6b2c91)", display: "grid", placeItems: "center", color: "white", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                {currentUser.name?.[0] || currentUser.username[0]}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pea-purple-600)", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(currentUser.name || currentUser.username).split(" ")[0]}
              </span>
              <Icon name="chevDown" size={11} style={{ color: "var(--ink-mute)", transition: "transform 0.2s", transform: showMobileUserMenu ? "rotate(180deg)" : "none", flexShrink: 0 }} />
            </button>

            {showMobileUserMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 1999 }} onClick={() => setShowMobileUserMenu(false)} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 2000,
                  background: "var(--surface)", border: "1px solid var(--line)",
                  borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                  padding: "6px", minWidth: 210, display: "flex", flexDirection: "column", gap: 2,
                }}>
                  {/* User info */}
                  <div style={{ padding: "10px 14px 8px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#f47b20,#6b2c91)", display: "grid", placeItems: "center", color: "white", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                      {currentUser.name?.[0] || currentUser.username[0]}
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>@{currentUser.username}</div>
                    </div>
                  </div>
                  <div style={{ height: 1, background: "var(--line)", margin: "0 8px 2px" }} />

                  {/* Language */}
                  <button onClick={() => { setLang(l => l === "th" ? "en" : "th"); setShowMobileUserMenu(false); }} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                    background: "transparent", border: "none", cursor: "pointer", color: "var(--text)",
                    fontSize: 14, fontWeight: 600, textAlign: "left", width: "100%",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,63,196,0.12)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, color: "var(--pea-purple-600)", flexShrink: 0 }}>
                      {lang === "th" ? "EN" : "TH"}
                    </span>
                    <span>{lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}</span>
                  </button>

                  {/* Theme */}
                  <button onClick={() => { setTheme(t => t === "light" ? "dark" : "light"); setShowMobileUserMenu(false); }} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                    background: "transparent", border: "none", cursor: "pointer", color: "var(--text)",
                    fontSize: 14, fontWeight: 600, textAlign: "left", width: "100%",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,63,196,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon name={theme === "light" ? "moon" : "sun"} size={15} style={{ color: "var(--pea-purple-600)" }} />
                    </span>
                    <span>{theme === "light" ? t("themeDark") : t("themeLight")}</span>
                  </button>

                  {/* Refresh */}
                  <button onClick={() => { handleRefresh(); setShowMobileUserMenu(false); }} disabled={refreshing} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                    background: "transparent", border: "none", cursor: refreshing ? "not-allowed" : "pointer", color: "var(--text)",
                    fontSize: 14, fontWeight: 600, textAlign: "left", width: "100%", opacity: refreshing ? 0.5 : 1,
                  }}
                    onMouseEnter={e => { if (!refreshing) e.currentTarget.style.background = "var(--hover)"; }}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,63,196,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon name="refresh" size={15} style={{ color: "var(--pea-purple-600)", animation: refreshing ? "pea-spin 0.8s linear infinite" : "none" }} />
                    </span>
                    <span>{refreshing ? t("refreshing") : t("refreshData")}</span>
                  </button>

                  <div style={{ height: 1, background: "var(--line)", margin: "2px 8px" }} />

                  {/* Logout */}
                  <button onClick={() => { setShowMobileUserMenu(false); setShowLogoutConfirm(true); }} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: 600, textAlign: "left", width: "100%", color: "var(--red)",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.07)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(239,68,68,0.1)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon name="logout" size={15} style={{ color: "var(--red)" }} />
                    </span>
                    <span>{t("logout")}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Main */}
        <main className="app-main">

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
        {maintenanceMode && currentUser.role === "admin" && !maintDismissed && (
          <div style={{ position: "relative", flexShrink: 0, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(-45deg, #f59e0b 0px, #f59e0b 11px, #111 11px, #111 22px)" }} />
            <div style={{
              position: "relative", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 20px", flexWrap: "wrap",
              background: "rgba(5, 2, 0, 0.78)",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 900, fontSize: 13, color: "#fde047", flexShrink: 0, letterSpacing: "0.02em", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                <Icon name="warning" size={16} style={{ color: "#fbbf24" }} />
                ⚠ ระบบปิดปรับปรุงอยู่
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.92)", flex: 1, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
                ผู้ใช้ทั่วไปไม่สามารถเข้าใช้งานได้ในขณะนี้
                {maintenanceUntil && ` · คาดว่าเปิดให้บริการ: ${new Date(maintenanceUntil).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
              </span>
              <button onClick={() => { setRoute("admin"); setAdminTab("settings"); }} style={{
                padding: "5px 14px", borderRadius: 999, border: "1.5px solid #f59e0b",
                background: "#f59e0b", color: "#000", cursor: "pointer", fontSize: 12, fontWeight: 900,
                flexShrink: 0, display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px rgba(245,158,11,0.4)",
              }}>
                <Icon name="settings" size={12} /> เปิดระบบ
              </button>
              <button onClick={() => { setMaintDismissed(true); sessionStorage.setItem("pea_maint_dismissed", "true"); }} style={{
                width: 28, height: 28, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700,
              }} title="ซ่อน banner (เฉพาะ session นี้)">✕</button>
            </div>
          </div>
        )}

          <div key={route} className="route-view" style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
          {route === "search" && (
            <SearchView
              data={data}
              baseMap={baseMap}
              currentUser={currentUser}
              onLogSearch={(entry) => addAudit(entry)}
              allowExport={allowExport}
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
              devInfo={devInfo} setDevInfo={setDevInfo}
              allowExport={allowExport} setAllowExport={setAllowExport}
              pushPermission={pushPermission} subscribePush={subscribePush} unsubscribePush={unsubscribePush} />
          )}
          </div>
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

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#1b0926", color:"white", padding:24, fontFamily:"monospace" }}>
          <div style={{ maxWidth:600, width:"100%" }}>
            <div style={{ fontSize:22, fontWeight:800, color:"#f47b20", marginBottom:12 }}>⚠ Application Error</div>
            <div style={{ fontSize:13, color:"#d4abff", marginBottom:16, lineHeight:1.6 }}>{this.state.error.message}</div>
            <div style={{ background:"#321148", padding:14, borderRadius:10, fontSize:11, color:"#a78bfa", wordBreak:"break-all", whiteSpace:"pre-wrap" }}>
              {this.state.error.stack || "No stack trace available"}
            </div>
            <button onClick={() => location.reload()} style={{ marginTop:16, padding:"10px 24px", background:"#8b3fc4", color:"white", border:"none", borderRadius:8, fontSize:14, cursor:"pointer" }}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary><LanguageProvider><App /></LanguageProvider></ErrorBoundary>
);

// Global error handler — แสดง crash แทนหน้าขาว
window.addEventListener("error", (e) => {
  const root = document.getElementById("root");
  if (root && !root.innerHTML.trim()) {
    root.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;background:#1b0926;color:white;padding:24px;font-family:monospace">
      <div style="max-width:600px;width:100%">
        <div style="font-size:22px;font-weight:800;color:#f47b20;margin-bottom:12px">⚠ JavaScript Error</div>
        <div style="font-size:13px;color:#d4abff;margin-bottom:16px;line-height:1.6">${e.message || "Unknown error"}</div>
        <div style="background:#321148;padding:14px;border-radius:10px;font-size:11px;color:#a78bfa;word-break:break-all">
          ${e.filename || ""}:${e.lineno || ""}:${e.colno || ""}
        </div>
        <button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#8b3fc4;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer">Reload</button>
      </div>
    </div>`;
  }
});
window.addEventListener("unhandledrejection", (e) => {
  const root = document.getElementById("root");
  if (root && !root.innerHTML.trim()) {
    root.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;background:#1b0926;color:white;padding:24px;font-family:monospace">
      <div style="max-width:600px;width:100%">
        <div style="font-size:22px;font-weight:800;color:#f47b20;margin-bottom:12px">⚠ Unhandled Promise Rejection</div>
        <div style="font-size:13px;color:#d4abff;margin-bottom:16px;line-height:1.6">${e.reason?.message || String(e.reason) || "Unknown"}</div>
        <button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#8b3fc4;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer">Reload</button>
      </div>
    </div>`;
  }
});
