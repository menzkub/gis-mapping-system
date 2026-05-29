/* global React, Icon, _supabase */
const { useState: useStateA } = React;

/* ============================================================
   AuthScreen — Login / Signup backed by Supabase Auth
   ============================================================ */

function pwChecks(pw) {
  return {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    number:  /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}
function pwStrength(pw) {
  const c = pwChecks(pw);
  return Object.values(c).filter(Boolean).length; // 0–5
}
const strengthLabel = ["", "อ่อนมาก", "อ่อน", "ปานกลาง", "แข็งแกร่ง", "แข็งแกร่งมาก"];
const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

function AuthScreen({ initialError }) {
  const [mode, setMode] = useStateA("login"); // login | signup | forgot
  const [email, setEmail] = useStateA("");
  const [password, setPassword] = useStateA("");
  const [showPw, setShowPw] = useStateA(false);
  const [signup, setSignup] = useStateA({ name: "", username: "", email: "", password: "" });
  const [confirmPw, setConfirmPw] = useStateA("");
  const [showSignupPw, setShowSignupPw] = useStateA(false);
  const [showConfirmPw, setShowConfirmPw] = useStateA(false);
  const [err, setErr] = useStateA(initialError || null);
  const [loading, setLoading] = useStateA(false);
  const [signupDone, setSignupDone] = useStateA(false);
  const [forgotEmail, setForgotEmail] = useStateA("");
  const [forgotDone, setForgotDone] = useStateA(false);

  const goForgot = () => { setMode("forgot"); setErr(null); setForgotDone(false); setForgotEmail(email); };
  const goLogin  = () => { setMode("login");  setErr(null); };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await _supabase.auth.resetPasswordForEmail(
          forgotEmail.trim().toLowerCase(),
          { redirectTo: "https://menzkub.github.io/gis-mapping-system/" }
        );
        if (error) { setErr(error.message); } else { setForgotDone(true); }
        return;
      }
      if (mode === "login") {
        const { error } = await _supabase.auth.signInWithPassword({
          email:    email.trim().toLowerCase(),
          password: password,
        });
        if (error) {
          if (error.message.includes("Invalid login") || error.message.includes("invalid_credentials")) {
            setErr("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
          } else {
            setErr(error.message);
          }
        }
      } else {
        if (!signup.name || !signup.username || !signup.email || !signup.password) {
          setErr("กรุณากรอกข้อมูลให้ครบทุกช่อง"); return;
        }
        const checks = pwChecks(signup.password);
        if (!checks.length || !checks.upper || !checks.lower || !checks.number || !checks.special) {
          setErr("รหัสผ่านไม่ตรงตามเกณฑ์ความปลอดภัย กรุณาตรวจสอบรายการด้านล่าง"); return;
        }
        if (signup.password !== confirmPw) {
          setErr("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน"); return;
        }
        const { error } = await _supabase.auth.signUp({
          email:    signup.email.trim().toLowerCase(),
          password: signup.password,
          options: { data: { username: signup.username.trim().toLowerCase(), name: signup.name.trim() } },
        });
        if (error) { setErr(error.message); } else { setSignupDone(true); }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root" style={{ height: "100vh", display: "grid", gridTemplateColumns: "1.1fr 1fr", overflow: "hidden", background: "var(--bg)" }}>
      {/* Left — brand panel */}
      <div className="auth-brand" style={{
        position: "relative", overflow: "hidden",
        background: "radial-gradient(120% 100% at 0% 0%, #8b3fc4 0%, #6b2c91 35%, #321148 75%, #1b0926 100%)",
        color: "white", padding: "56px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ position: "absolute", top: -100, right: -80, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(244,123,32,0.35), transparent 60%)", filter: "blur(20px)" }} />
        <div style={{ position: "absolute", bottom: -120, left: -60, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,63,196,0.55), transparent 65%)", filter: "blur(20px)" }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08 }} aria-hidden="true">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #f47b20, #ffba7a)", display: "grid", placeItems: "center", boxShadow: "0 12px 32px rgba(244,123,32,0.5)" }}>
            <Icon name="bolt" size={28} stroke={2.4} />
          </div>
          <div>
            <div className="t-eyebrow" style={{ color: "#ffba7a" }}>PEA</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Meter &amp; TR Search</div>
          </div>
        </div>

        <div style={{ position: "relative", maxWidth: 480 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", color: "#ffba7a", textTransform: "uppercase", marginBottom: 14 }}>ระบบค้นหา · กฟอ.ฝาง</div>
          <div className="t-display" style={{ fontSize: 56, lineHeight: 1.02, fontWeight: 800, marginBottom: 22, letterSpacing: "-0.025em" }}>
            ค้นหา<br />
            <span style={{ background: "linear-gradient(120deg,#ffba7a,#f47b20,#fff)", WebkitBackgroundClip: "text", color: "transparent" }}>มิเตอร์ &amp; หม้อแปลง</span><br />
            ครบในที่เดียว
          </div>
          <div style={{ fontSize: 16, color: "#d4abff", lineHeight: 1.55, marginBottom: 28 }}>
            ค้นหารหัสเครื่องวัด หรือรหัสหม้อแปลง<br />ดูแผนที่ — Cluster · Heatmap · นำทาง ในไม่กี่วินาที
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { icon: "meter", label: "PEA Meter" },
              { icon: "tr", label: "PEA TR" },
              { icon: "map", label: "Satellite Map" },
              { icon: "flame", label: "Heatmap" },
              { icon: "navigation", label: "Navigation" },
            ].map(c => (
              <div key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, backdropFilter: "blur(8px)" }}>
                <Icon name={c.icon} size={14} />{c.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", fontSize: 12, opacity: 0.6 }}>© 2026 ระบบสารสนเทศภูมิศาสตร์ · กฟอ.ฝาง</div>
      </div>

      {/* Right — form */}
      <div className="auth-form-panel" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, overflow: "auto" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* ── Forgot password screen ───────────────────────────── */}
          {mode === "forgot" ? (
            forgotDone ? (
              <div className="fade-up card" style={{ borderColor: "var(--green)", background: "var(--green-bg)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--green)", color: "white", display: "grid", placeItems: "center" }}><Icon name="check" size={22} stroke={3} /></div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "#065f46" }}>ส่งอีเมลแล้ว!</div>
                </div>
                <div style={{ color: "#047857", fontSize: 14, lineHeight: 1.6 }}>
                  ลิงค์รีเซ็ตรหัสผ่านถูกส่งไปที่ <b>{forgotEmail}</b><br />กรุณาตรวจสอบกล่องจดหมาย (รวมถึงโฟลเดอร์ Spam)
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16, width: "100%" }} onClick={goLogin}>
                  กลับไปหน้าเข้าสู่ระบบ
                </button>
              </div>
            ) : (
              <form className="fade-up" onSubmit={submit}>
                <button type="button" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-mute)", fontWeight: 600, marginBottom: 24, padding: 0 }} onClick={goLogin}>
                  <Icon name="chevLeft" size={16} /> กลับหน้าเข้าสู่ระบบ
                </button>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", display: "grid", placeItems: "center", marginBottom: 20, boxShadow: "0 8px 24px rgba(107,44,145,0.35)" }}>
                  <Icon name="lock" size={24} stroke={2} style={{ color: "white" }} />
                </div>
                <div className="t-display" style={{ fontSize: 32, marginBottom: 6, letterSpacing: "-0.02em" }}>รีเซ็ตรหัสผ่าน</div>
                <div className="t-mute" style={{ marginBottom: 28, fontSize: 15 }}>
                  กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงค์รีเซ็ตให้
                </div>
                <div className="f-col f-gap-4">
                  <div className="field">
                    <label className="field-label">อีเมล</label>
                    <div style={{ position: "relative" }}>
                      <input className="input" type="email" style={{ paddingLeft: 42 }} value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" required />
                      <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", pointerEvents: "none" }}><Icon name="mail" size={18} /></div>
                    </div>
                  </div>
                  {err && <div className="badge badge-red" style={{ alignSelf: "flex-start", padding: "8px 12px" }}><Icon name="close" size={14} />{err}</div>}
                  <button type="submit" className="btn btn-primary" style={{ height: 52, fontSize: 15, marginTop: 4 }} disabled={loading}>
                    {loading ? "กำลังส่ง…" : <><span>ส่งลิงค์รีเซ็ต</span> <Icon name="arrowRight" size={16} /></>}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* ── Login / Signup tabs ────────────────────────────── */
            <>
              <div className="tabs" style={{ marginBottom: 28 }}>
                <button className={"tab " + (mode === "login" ? "active" : "")} onClick={() => { setMode("login"); setErr(null); }}>
                  <Icon name="user" size={15} /> เข้าสู่ระบบ
                </button>
                <button className={"tab " + (mode === "signup" ? "active" : "")} onClick={() => { setMode("signup"); setErr(null); setSignupDone(false); }}>
                  <Icon name="plus" size={15} /> สมัครสมาชิก
                </button>
              </div>

              {signupDone ? (
                <div className="fade-up card" style={{ borderColor: "var(--green)", background: "var(--green-bg)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--green)", color: "white", display: "grid", placeItems: "center" }}><Icon name="check" size={22} stroke={3} /></div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: "#065f46" }}>ส่งคำขอแล้ว</div>
                  </div>
                  <div style={{ color: "#047857", fontSize: 14, lineHeight: 1.55 }}>
                    บัญชี <b>{signup.username}</b> รอการอนุมัติจากผู้ดูแลระบบ
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: 16, width: "100%" }} onClick={() => { setMode("login"); setSignupDone(false); setSignup({ name: "", username: "", email: "", password: "" }); }}>
                    กลับไปหน้าเข้าสู่ระบบ
                  </button>
                </div>
              ) : (
                <form className="fade-up" onSubmit={submit}>
                  <div className="t-display" style={{ fontSize: 32, marginBottom: 6, letterSpacing: "-0.02em" }}>
                    {mode === "login" ? "ยินดีต้อนรับกลับ" : "สร้างบัญชีใหม่"}
                  </div>
                  <div className="t-mute" style={{ marginBottom: 28, fontSize: 15 }}>
                    {mode === "login" ? "กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ" : "กรอกข้อมูลเพื่อขออนุมัติเข้าใช้งาน"}
                  </div>

                  {mode === "login" ? (
                    <div className="f-col f-gap-4">
                      <div className="field">
                        <label className="field-label">อีเมล</label>
                        <div style={{ position: "relative" }}>
                          <input className="input" style={{ paddingLeft: 42 }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" required />
                          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", pointerEvents: "none" }}><Icon name="user" size={18} /></div>
                        </div>
                      </div>
                      <div className="field">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <label className="field-label" style={{ margin: 0 }}>รหัสผ่าน</label>
                          <button type="button" onClick={goForgot} style={{ fontSize: 12, color: "var(--pea-purple-500)", fontWeight: 600, padding: 0, background: "none" }}>
                            ลืมรหัสผ่าน?
                          </button>
                        </div>
                        <div style={{ position: "relative" }}>
                          <input className="input" type={showPw ? "text" : "password"} style={{ paddingLeft: 42, paddingRight: 44 }} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
                          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", pointerEvents: "none" }}><Icon name="lock" size={18} /></div>
                          <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", width: 32, height: 32 }}>
                            <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
                          </button>
                        </div>
                      </div>
                      {err && <div className="badge badge-red" style={{ alignSelf: "flex-start", padding: "8px 12px" }}><Icon name="close" size={14} />{err}</div>}
                      <button type="submit" className="btn btn-primary" style={{ height: 52, fontSize: 15, marginTop: 4 }} disabled={loading}>
                        {loading ? "กำลังเข้าสู่ระบบ…" : <><span>เข้าสู่ระบบ</span> <Icon name="arrowRight" size={16} /></>}
                      </button>
                    </div>
                  ) : (() => {
                    const strength = pwStrength(signup.password);
                    const checks   = pwChecks(signup.password);
                    const pwEntered = signup.password.length > 0;
                    const confirmOk = confirmPw.length > 0 && confirmPw === signup.password;
                    const confirmBad = confirmPw.length > 0 && confirmPw !== signup.password;
                    return (
                    <div className="f-col f-gap-4">
                      <div className="field">
                        <label className="field-label">ชื่อ-นามสกุล</label>
                        <input className="input" value={signup.name} onChange={e => setSignup(s => ({ ...s, name: e.target.value }))} placeholder="เช่น สมชาย ใจดี" />
                      </div>
                      <div className="field">
                        <label className="field-label">ชื่อผู้ใช้ (username)</label>
                        <input className="input" value={signup.username} onChange={e => setSignup(s => ({ ...s, username: e.target.value }))} placeholder="somchai.j" />
                      </div>
                      <div className="field">
                        <label className="field-label">อีเมล</label>
                        <input className="input" type="email" value={signup.email} onChange={e => setSignup(s => ({ ...s, email: e.target.value }))} placeholder="your@email.com" />
                      </div>

                      {/* Password + strength */}
                      <div className="field">
                        <label className="field-label">รหัสผ่าน</label>
                        <div style={{ position: "relative" }}>
                          <input className="input" type={showSignupPw ? "text" : "password"}
                            style={{ paddingLeft: 42, paddingRight: 44 }}
                            value={signup.password}
                            onChange={e => setSignup(s => ({ ...s, password: e.target.value }))}
                            placeholder="อย่างน้อย 8 ตัวอักษร"
                            autoComplete="new-password" />
                          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", pointerEvents: "none" }}>
                            <Icon name="lock" size={18} />
                          </div>
                          <button type="button" onClick={() => setShowSignupPw(s => !s)}
                            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", width: 32, height: 32 }}>
                            <Icon name={showSignupPw ? "eyeOff" : "eye"} size={18} />
                          </button>
                        </div>

                        {/* Strength bar */}
                        {pwEntered && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                              {[1,2,3,4,5].map(i => (
                                <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= strength ? strengthColor[strength] : "var(--line)", transition: "background 300ms" }} />
                              ))}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: strengthColor[strength] }}>{strengthLabel[strength]}</div>
                          </div>
                        )}

                        {/* Requirements checklist */}
                        {pwEntered && (
                          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                            {[
                              { ok: checks.length,  label: "ขั้นต่ำ 8 ตัวอักษร" },
                              { ok: checks.upper,   label: "ตัวพิมพ์ใหญ่ (A-Z)" },
                              { ok: checks.lower,   label: "ตัวพิมพ์เล็ก (a-z)" },
                              { ok: checks.number,  label: "ตัวเลข (0-9)" },
                              { ok: checks.special, label: "อักขระพิเศษ (!@#$...)" },
                            ].map(r => (
                              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: r.ok ? "#16a34a" : "var(--ink-mute)", fontWeight: r.ok ? 700 : 400 }}>
                                <span style={{ fontSize: 13 }}>{r.ok ? "✓" : "○"}</span>{r.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Confirm password */}
                      <div className="field">
                        <label className="field-label">ยืนยันรหัสผ่าน</label>
                        <div style={{ position: "relative" }}>
                          <input className="input" type={showConfirmPw ? "text" : "password"}
                            style={{ paddingLeft: 42, paddingRight: 44, borderColor: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : undefined }}
                            value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)}
                            placeholder="กรอกรหัสผ่านอีกครั้ง"
                            autoComplete="new-password" />
                          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : "var(--ink-mute)", pointerEvents: "none" }}>
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
                      <button type="submit" className="btn btn-primary" style={{ height: 52, fontSize: 15, marginTop: 4 }} disabled={loading}>
                        {loading ? "กำลังสมัครสมาชิก…" : <><span>สมัครสมาชิก</span> <Icon name="arrowRight" size={16} /></>}
                      </button>
                    </div>
                    );
                  })()}
                </form>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .auth-root { grid-template-columns: 1fr !important; }
          .auth-brand { display: none !important; }
        }
        @media (max-width: 640px) {
          .auth-form-panel { padding: 28px 20px !important; align-items: flex-start !important; padding-top: 48px !important; }
        }
      `}</style>
    </div>
  );
}

window.AuthScreen = AuthScreen;
