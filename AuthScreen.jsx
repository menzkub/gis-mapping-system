/* global React, Icon, _supabase */
const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

/* ── Animated power-grid canvas ─────────────────────────────────────────── */
function AnimatedPowerGrid() {
  const ref = useRefA(null);
  useEffectA(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let raf;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      cv.width  = cv.offsetWidth  * dpr;
      cv.height = cv.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener("resize", fit);

    const W = () => cv.offsetWidth;
    const H = () => cv.offsetHeight;

    // Nodes: type "tr" = transformer (orange hexagon), "m" = meter (purple circle)
    const NODES = [
      { rx: 0.18, ry: 0.09, t: "tr" }, { rx: 0.80, ry: 0.06, t: "tr" },
      { rx: 0.52, ry: 0.30, t: "tr" }, { rx: 0.14, ry: 0.52, t: "m"  },
      { rx: 0.38, ry: 0.64, t: "m"  }, { rx: 0.67, ry: 0.55, t: "m"  },
      { rx: 0.88, ry: 0.38, t: "m"  }, { rx: 0.05, ry: 0.79, t: "m"  },
      { rx: 0.58, ry: 0.82, t: "m"  }, { rx: 0.93, ry: 0.71, t: "m"  },
    ];
    const EDGES = [
      [0,2],[1,2],[2,3],[2,4],[2,5],[1,6],[0,3],[3,7],[4,8],[5,8],[6,9],[5,9],[2,6],
    ];

    // Flowing electricity particles along each edge
    const parts = EDGES.flatMap((_, ei) =>
      Array.from({ length: ei % 3 === 0 ? 2 : 1 }, (__, j) => ({
        ei, t: Math.random(), spd: 0.0018 + Math.random() * 0.0026,
        dir: j === 0 ? 1 : -1,
      }))
    );

    // Random surge flashes per edge
    const surges = EDGES.map((_, i) => ({
      a: 0, next: 1500 + i * 700 + Math.random() * 7000,
    }));

    let prev = performance.now();

    const frame = (now) => {
      const dt = Math.min(now - prev, 50); prev = now;
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      // Surge timers
      surges.forEach(s => {
        s.next -= dt;
        if (s.next <= 0) { s.a = 1; s.next = 3500 + Math.random() * 9000; }
        if (s.a > 0) s.a = Math.max(0, s.a - dt * 0.003);
      });

      // Draw connection lines
      EDGES.forEach(([a, b], i) => {
        const sx = surges[i].a;
        ctx.beginPath();
        ctx.moveTo(NODES[a].rx * w, NODES[a].ry * h);
        ctx.lineTo(NODES[b].rx * w, NODES[b].ry * h);
        ctx.strokeStyle = sx > 0
          ? `rgba(255,205,80,${0.06 + sx * 0.52})`
          : "rgba(150,65,225,0.11)";
        ctx.lineWidth = sx > 0 ? 1 + sx * 2.5 : 0.8;
        ctx.stroke();
      });

      // Draw particles (electricity flowing along lines)
      parts.forEach(p => {
        p.t += (p.spd * p.dir * dt) / 16;
        if (p.t > 1) p.t = 0;
        if (p.t < 0) p.t = 1;
        const [a, b] = EDGES[p.ei];
        const px = (NODES[a].rx + (NODES[b].rx - NODES[a].rx) * p.t) * w;
        const py = (NODES[a].ry + (NODES[b].ry - NODES[a].ry) * p.t) * h;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 7);
        g.addColorStop(0,    "rgba(255,218,128,1)");
        g.addColorStop(0.38, "rgba(244,123,32,0.55)");
        g.addColorStop(1,    "rgba(244,123,32,0)");
        ctx.beginPath(); ctx.arc(px, py, 7, 0, 6.283);
        ctx.fillStyle = g; ctx.fill();
      });

      // Draw nodes
      const T = now / 1000;
      NODES.forEach((n, i) => {
        const x = n.rx * w, y = n.ry * h;
        const pulse = 1 + 0.14 * Math.sin(T * 1.6 + i * 0.85);
        const base  = n.t === "tr" ? 8 : 5;
        const sz    = base * pulse;

        // Outer glow
        const gr = sz * (n.t === "tr" ? 5 : 4.5);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, gr);
        glow.addColorStop(0, n.t === "tr" ? "rgba(244,123,32,0.38)" : "rgba(138,58,200,0.30)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(x, y, gr, 0, 6.283);
        ctx.fillStyle = glow; ctx.fill();

        // Shape
        ctx.beginPath();
        if (n.t === "tr") {
          for (let j = 0; j < 6; j++) {
            const a2 = j * 1.0472 - 0.5236;
            j ? ctx.lineTo(x + sz * Math.cos(a2), y + sz * Math.sin(a2))
              : ctx.moveTo(x + sz * Math.cos(a2), y + sz * Math.sin(a2));
          }
          ctx.closePath();
          ctx.fillStyle   = "rgba(244,123,32,0.88)";
          ctx.strokeStyle = "rgba(255,190,100,0.95)";
          ctx.lineWidth   = 1.5;
        } else {
          ctx.arc(x, y, sz, 0, 6.283);
          ctx.fillStyle   = "rgba(128,52,182,0.80)";
          ctx.strokeStyle = "rgba(200,145,255,0.85)";
          ctx.lineWidth   = 1;
        }
        ctx.fill(); ctx.stroke();

        // Inner accent
        if (n.t === "m") {
          ctx.beginPath(); ctx.arc(x, y, sz * 0.34, 0, 6.283);
          ctx.fillStyle = "rgba(228,180,255,0.9)"; ctx.fill();
        } else {
          // Mini bolt mark inside transformer
          ctx.save(); ctx.translate(x, y);
          ctx.fillStyle = "rgba(255,240,200,0.95)";
          ctx.beginPath();
          ctx.moveTo( 1.4, -3.2); ctx.lineTo(-1.4,  0.4);
          ctx.lineTo( 0.4,  0.4); ctx.lineTo(-1.0,  3.2);
          ctx.lineTo( 1.9, -0.4); ctx.lineTo( 0.0, -0.4);
          ctx.closePath(); ctx.fill(); ctx.restore();
        }
      });

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); };
  }, []);

  return (
    <canvas ref={ref} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none", opacity: 0.68,
    }} />
  );
}

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
    <div className="auth-root">
      {/* ── Left: brand panel (desktop) ───────────────────── */}
      <div className="auth-brand">
        <div className="auth-brand-blob auth-brand-blob--top" />
        <div className="auth-brand-blob auth-brand-blob--bottom" />
        <svg className="auth-brand-grid" aria-hidden="true">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <AnimatedPowerGrid />

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
          <img src="logo.svg" alt="PEA" style={{ width: 56, height: 56, borderRadius: 16, boxShadow: "0 12px 32px rgba(139,63,196,0.5)", flexShrink: 0 }} />
          <div>
            <div className="t-eyebrow" style={{ color: "#ffba7a" }}>PEA</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Meter &amp; TR Search</div>
          </div>
        </div>

        <div style={{ position: "relative", maxWidth: 480 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.18em", color: "#ffba7a", textTransform: "uppercase", marginBottom: 14 }}>
            ระบบค้นหา · กฟอ.ฝาง
          </div>
          <div style={{ fontSize: 52, lineHeight: 1.05, fontWeight: 800, marginBottom: 22, letterSpacing: "-0.025em", color: "white" }}>
            ค้นหา<br />
            <span style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundImage: "linear-gradient(120deg,#ffba7a,#f47b20,#fff)" }}>
              มิเตอร์ &amp; หม้อแปลง
            </span><br />
            ครบในที่เดียว
          </div>
          <div style={{ fontSize: 16, color: "#d4abff", lineHeight: 1.55, marginBottom: 28 }}>
            ค้นหารหัสเครื่องวัด หรือรหัสหม้อแปลง<br />
            ดูแผนที่ — Cluster · Heatmap · นำทาง
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["PEA Meter", "PEA TR", "Satellite Map", "Heatmap", "Navigation"].map(label => (
              <div key={label} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, color: "white" }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", fontSize: 12, opacity: 0.6, color: "white" }}>
          © 2026 ระบบสารสนเทศภูมิศาสตร์ · กฟอ.ฝาง
        </div>
      </div>

      {/* ── Right: form panel ─────────────────────────────── */}
      <div className="auth-form-panel">

        {/* Mobile-only hero header */}
        <div className="auth-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <img src="logo.svg" alt="PEA" style={{ width: 50, height: 50, borderRadius: 14, boxShadow: "0 8px 24px rgba(139,63,196,0.45)", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", fontWeight: 700, color: "#ffba7a", textTransform: "uppercase" }}>PEA FANG</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Meter &amp; TR Search</div>
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1.25, marginBottom: 4 }}>
            ค้นหา <span style={{ color: "#ffba7a" }}>มิเตอร์ &amp; หม้อแปลง</span>
          </div>
          <div style={{ fontSize: 13, color: "#c4b5fd" }}>ครบในที่เดียว · ระบบค้นหา กฟอ.ฝาง</div>
        </div>

        {/* Form card */}
        <div className="auth-card">

          {/* ── Forgot password ───────────────────────────── */}
          {mode === "forgot" ? (
            forgotDone ? (
              <div className="fade-up card" style={{ borderColor: "var(--green)", background: "var(--green-bg)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--green)", color: "white", display: "grid", placeItems: "center" }}>
                    <Icon name="check" size={22} stroke={3} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "#065f46" }}>ส่งอีเมลแล้ว!</div>
                </div>
                <div style={{ color: "#047857", fontSize: 14, lineHeight: 1.6 }}>
                  ลิงค์รีเซ็ตรหัสผ่านถูกส่งไปที่ <b>{forgotEmail}</b><br />
                  กรุณาตรวจสอบกล่องจดหมาย (รวมถึงโฟลเดอร์ Spam)
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
                <div className="t-display" style={{ fontSize: 30, marginBottom: 6, letterSpacing: "-0.02em" }}>รีเซ็ตรหัสผ่าน</div>
                <div className="t-mute" style={{ marginBottom: 28, fontSize: 15 }}>
                  กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงค์รีเซ็ตให้
                </div>
                <div className="f-col f-gap-4">
                  <div className="field">
                    <label className="field-label">อีเมล</label>
                    <div style={{ position: "relative" }}>
                      <input className="input" type="email" style={{ paddingLeft: 42 }}
                        value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                        placeholder="your@email.com" autoComplete="email" required />
                      <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", pointerEvents: "none" }}>
                        <Icon name="mail" size={18} />
                      </div>
                    </div>
                  </div>
                  {err && (
                    <div className="badge badge-red" style={{ alignSelf: "flex-start", padding: "8px 12px" }}>
                      <Icon name="close" size={14} />{err}
                    </div>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ height: 52, fontSize: 15, marginTop: 4 }} disabled={loading}>
                    {loading ? "กำลังส่ง…" : <><span>ส่งลิงค์รีเซ็ต</span> <Icon name="arrowRight" size={16} /></>}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* ── Login / Signup tabs ───────────────────────── */
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
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--green)", color: "white", display: "grid", placeItems: "center" }}>
                      <Icon name="check" size={22} stroke={3} />
                    </div>
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
                  <div className="t-display" style={{ fontSize: 30, marginBottom: 6, letterSpacing: "-0.02em" }}>
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
                          <input className="input" style={{ paddingLeft: 42 }} type="email"
                            value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="your@email.com" autoComplete="email" required />
                          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", pointerEvents: "none" }}>
                            <Icon name="user" size={18} />
                          </div>
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
                          <input className="input" type={showPw ? "text" : "password"}
                            style={{ paddingLeft: 42, paddingRight: 44 }}
                            value={password} onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password" required />
                          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", pointerEvents: "none" }}>
                            <Icon name="lock" size={18} />
                          </div>
                          <button type="button" onClick={() => setShowPw(s => !s)}
                            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", width: 32, height: 32 }}>
                            <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
                          </button>
                        </div>
                      </div>
                      {err && (
                        <div className="badge badge-red" style={{ alignSelf: "flex-start", padding: "8px 12px" }}>
                          <Icon name="close" size={14} />{err}
                        </div>
                      )}
                      <button type="submit" className="btn btn-primary" style={{ height: 52, fontSize: 15, marginTop: 4 }} disabled={loading}>
                        {loading ? "กำลังเข้าสู่ระบบ…" : <><span>เข้าสู่ระบบ</span> <Icon name="arrowRight" size={16} /></>}
                      </button>
                    </div>
                  ) : (() => {
                    const strength  = pwStrength(signup.password);
                    const checks    = pwChecks(signup.password);
                    const pwEntered = signup.password.length > 0;
                    const confirmOk  = confirmPw.length > 0 && confirmPw === signup.password;
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
                          {confirmBad && <div style={{ marginTop: 5, fontSize: 11, color: "var(--red)", fontWeight: 600 }}>{"✕ รหัสผ่านไม่ตรงกัน"}</div>}
                          {confirmOk  && <div style={{ marginTop: 5, fontSize: 11, color: "#16a34a", fontWeight: 600 }}>{"✓ รหัสผ่านตรงกัน"}</div>}
                        </div>
                        {err && (
                          <div className="badge badge-red" style={{ alignSelf: "flex-start", padding: "8px 12px" }}>
                            <Icon name="close" size={14} />{err}
                          </div>
                        )}
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
        /* ── Desktop ───────────────────────────────────── */
        .auth-root {
          height: 100vh;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          overflow: hidden;
          background: var(--bg);
        }
        .auth-brand {
          position: relative;
          overflow: hidden;
          background: radial-gradient(120% 100% at 0% 0%, #8b3fc4 0%, #6b2c91 35%, #321148 75%, #1b0926 100%);
          color: white;
          padding: 56px 64px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .auth-brand-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(20px);
        }
        .auth-brand-blob--top {
          top: -100px; right: -80px;
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(244,123,32,0.35), transparent 60%);
        }
        .auth-brand-blob--bottom {
          bottom: -120px; left: -60px;
          width: 360px; height: 360px;
          background: radial-gradient(circle, rgba(139,63,196,0.55), transparent 65%);
        }
        .auth-brand-grid {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0.08;
        }
        .auth-form-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          overflow-y: auto;
          background: var(--bg);
        }
        .auth-hero { display: none; }
        .auth-card {
          width: 100%;
          max-width: 420px;
        }

        /* ── Mobile ────────────────────────────────────── */
        @media (max-width: 1024px) {
          .auth-root {
            grid-template-columns: 1fr;
            height: auto;
            min-height: 100vh;
            overflow-y: auto;
            background: radial-gradient(160% 130% at 0% 0%, #8b3fc4 0%, #321148 55%, #1b0926 100%);
          }
          .auth-brand { display: none; }
          .auth-form-panel {
            padding: 0;
            justify-content: flex-start;
            align-items: stretch;
            background: transparent;
            min-height: 100vh;
          }
          .auth-hero {
            display: block;
            padding: 48px 24px 28px;
          }
          .auth-card {
            background: var(--surface);
            border-radius: 28px 28px 0 0;
            padding: 32px 24px 64px;
            max-width: 100%;
            flex: 1;
            box-shadow: 0 -8px 40px rgba(0,0,0,0.25);
            min-height: calc(100vh - 220px);
          }
        }
        @media (max-width: 480px) {
          .auth-hero { padding: 40px 20px 24px; }
          .auth-card { padding: 28px 20px 64px; }
        }
      `}</style>
    </div>
  );
}

window.AuthScreen = AuthScreen;
