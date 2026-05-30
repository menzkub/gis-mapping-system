/* global React, Icon, _supabase, useLang */
const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

/* ── Animated power poles canvas ────────────────────────────────────────── */
function AnimatedPowerGrid() {
  const ref = useRefA(null);
  useEffectA(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let raf;
    const PI2 = Math.PI * 2;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      cv.width  = cv.offsetWidth  * dpr;
      cv.height = cv.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const W = () => cv.offsetWidth;
    const H = () => cv.offsetHeight;

    // Sample a quadratic bezier at t
    const bpt = (t, x0,y0,x1,y1,x2,y2) => {
      const u = 1 - t;
      return [u*u*x0 + 2*u*t*x1 + t*t*x2, u*u*y0 + 2*u*t*y1 + t*t*y2];
    };

    // Pole definitions (relative x, scale, has transformer)
    const DEFS = [
      { rx:0.04, sz:0.70, hasTr:false },
      { rx:0.27, sz:1.00, hasTr:true  },
      { rx:0.53, sz:1.10, hasTr:false },
      { rx:0.77, sz:0.96, hasTr:true  },
      { rx:0.97, sz:0.68, hasTr:false },
    ];

    // Twinkling stars
    const STARS = Array.from({length:45}, () => ({
      rx: Math.random(), ry: Math.random() * 0.82,
      r:  0.4 + Math.random() * 1.1,
      a:  0.20 + Math.random() * 0.45,
      ph: Math.random() * PI2,
      sp: 0.4 + Math.random() * 2.0,
    }));

    const buildScene = () => {
      const w = W(), h = H();
      const GY = h * 0.875; // ground y

      const poles = DEFS.map(d => {
        const x      = d.rx * w;
        const poleH  = h * (0.24 + d.sz * 0.06);
        const topY   = GY - poleH;
        const crossW = 34 * d.sz;
        const crossY = topY + poleH * 0.055;
        return {
          x, GY, poleH, topY, crossW, crossY,
          hasTr: d.hasTr, sz: d.sz,
          ins: [
            { x: x - crossW, y: crossY },
            { x,              y: crossY - 4 * d.sz },
            { x: x + crossW, y: crossY },
          ],
          trX: x + crossW * 0.52,
          trY: topY + poleH * 0.32,
        };
      });

      // 3 wires per span between adjacent poles
      const wires = [];
      for (let i = 0; i < poles.length - 1; i++) {
        const A = poles[i], B = poles[i + 1];
        for (let w2 = 0; w2 < 3; w2++) {
          const p0 = A.ins[w2], p2 = B.ins[w2];
          const span = Math.abs(p2.x - p0.x);
          wires.push({
            p0x: p0.x, p0y: p0.y,
            p1x: (p0.x + p2.x) / 2,
            p1y: Math.max(p0.y, p2.y) + span * 0.058,
            p2x: p2.x, p2y: p2.y,
          });
        }
      }
      return { poles, wires };
    };

    let scene = buildScene();

    const makeParts = (wires) => wires.flatMap((_, wi) =>
      Array.from({length: 2}, (__, j) => ({
        wi, t: j * 0.45 + Math.random() * 0.4,
        spd: 0.0016 + Math.random() * 0.003,
        dir: j === 0 ? 1 : -1,
      }))
    );
    let parts = makeParts(scene.wires);

    const onResize = () => {
      fit();
      scene = buildScene();
      parts = makeParts(scene.wires);
    };
    window.addEventListener("resize", onResize);

    let prev = performance.now();

    const frame = (now) => {
      const dt = Math.min(now - prev, 50); prev = now;
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);
      const T = now / 1000;
      const { poles, wires } = scene;

      // ── Stars ──────────────────────────────────────────────
      STARS.forEach(s => {
        const a = s.a * (0.5 + 0.5 * Math.sin(T * s.sp + s.ph));
        ctx.beginPath(); ctx.arc(s.rx * w, s.ry * h, s.r, 0, PI2);
        ctx.fillStyle = `rgba(215,195,255,${a})`; ctx.fill();
      });

      // ── Wires (behind poles) ────────────────────────────────
      wires.forEach(({ p0x,p0y,p1x,p1y,p2x,p2y }) => {
        // Soft glow pass
        ctx.beginPath(); ctx.moveTo(p0x,p0y); ctx.quadraticCurveTo(p1x,p1y,p2x,p2y);
        ctx.strokeStyle = "rgba(165,95,255,0.09)"; ctx.lineWidth = 4.5; ctx.stroke();
        // Wire line
        ctx.beginPath(); ctx.moveTo(p0x,p0y); ctx.quadraticCurveTo(p1x,p1y,p2x,p2y);
        ctx.strokeStyle = "rgba(82,30,138,0.65)"; ctx.lineWidth = 1.2; ctx.stroke();
      });

      // ── Poles ───────────────────────────────────────────────
      [...poles].sort((a, b) => a.sz - b.sz).forEach(pole => {
        const { x, GY, poleH, topY, crossW, crossY, sz, ins, hasTr, trX, trY } = pole;
        const pw = 3.2 * sz;

        // Ground shadow
        const sg = ctx.createRadialGradient(x, GY, 0, x, GY, 14 * sz);
        sg.addColorStop(0, "rgba(0,0,0,0.30)"); sg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.ellipse(x, GY, 13*sz, 3.5*sz, 0, 0, PI2);
        ctx.fillStyle = sg; ctx.fill();

        // Pole shaft
        ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x, topY);
        ctx.strokeStyle = "rgba(52,20,98,0.93)"; ctx.lineWidth = pw; ctx.lineCap = "round"; ctx.stroke();
        // Edge highlight
        ctx.beginPath(); ctx.moveTo(x - pw*0.25, GY); ctx.lineTo(x - pw*0.25, topY);
        ctx.strokeStyle = "rgba(115,55,185,0.22)"; ctx.lineWidth = pw*0.28; ctx.stroke();

        // Crossarm
        ctx.beginPath(); ctx.moveTo(x - crossW, crossY); ctx.lineTo(x + crossW, crossY);
        ctx.strokeStyle = "rgba(45,16,85,0.92)"; ctx.lineWidth = pw * 0.72; ctx.stroke();

        // Diagonal braces
        ctx.beginPath();
        ctx.moveTo(x - crossW*0.60, crossY); ctx.lineTo(x, crossY + crossW*0.28);
        ctx.moveTo(x + crossW*0.60, crossY); ctx.lineTo(x, crossY + crossW*0.28);
        ctx.strokeStyle = "rgba(40,15,75,0.78)"; ctx.lineWidth = pw * 0.40; ctx.stroke();

        // Insulators on crossarm
        ins.forEach(({ x: ix, y: iy }) => {
          ctx.beginPath(); ctx.arc(ix, iy, 6.5*sz, 0, PI2);
          ctx.fillStyle = "rgba(135,55,205,0.08)"; ctx.fill();
          ctx.beginPath(); ctx.arc(ix, iy, 3.2*sz, 0, PI2);
          ctx.fillStyle = "rgba(122,52,192,0.83)";
          ctx.strokeStyle = "rgba(195,138,255,0.70)"; ctx.lineWidth = 0.7;
          ctx.fill(); ctx.stroke();
          // Glint
          ctx.beginPath(); ctx.arc(ix - sz, iy - sz, 0.9*sz, 0, PI2);
          ctx.fillStyle = "rgba(218,192,255,0.62)"; ctx.fill();
        });

        // ── Transformer ──────────────────────────────────────
        if (hasTr) {
          const pulse = 1 + 0.07 * Math.sin(T * 2.1 + x * 0.05);
          const tw = 8.5 * sz, th = 19 * sz;
          const r = 3.5 * sz;
          const bx = trX - tw, by = trY - th/2, bw = tw*2, bh = th;

          // Glow halo
          const tg = ctx.createRadialGradient(trX, trY, 0, trX, trY, th * 2.2 * pulse);
          tg.addColorStop(0,   "rgba(244,123,32,0.28)");
          tg.addColorStop(0.5, "rgba(244,123,32,0.09)");
          tg.addColorStop(1,   "rgba(244,123,32,0)");
          ctx.beginPath(); ctx.arc(trX, trY, th * 2.2 * pulse, 0, PI2);
          ctx.fillStyle = tg; ctx.fill();

          // Cylindrical body (linear gradient for 3D illusion)
          const bg = ctx.createLinearGradient(bx, trY, bx + bw, trY);
          bg.addColorStop(0,    "rgba(52,18,7,0.97)");
          bg.addColorStop(0.22, "rgba(170,65,16,0.97)");
          bg.addColorStop(0.52, "rgba(205,96,26,0.97)");
          bg.addColorStop(0.78, "rgba(178,72,20,0.97)");
          bg.addColorStop(1,    "rgba(52,18,7,0.97)");

          // Rounded rect
          ctx.beginPath();
          ctx.moveTo(bx+r, by); ctx.lineTo(bx+bw-r, by);
          ctx.arc(bx+bw-r, by+r, r, -Math.PI/2, 0);
          ctx.lineTo(bx+bw, by+bh-r);
          ctx.arc(bx+bw-r, by+bh-r, r, 0, Math.PI/2);
          ctx.lineTo(bx+r, by+bh);
          ctx.arc(bx+r, by+bh-r, r, Math.PI/2, Math.PI);
          ctx.lineTo(bx, by+r);
          ctx.arc(bx+r, by+r, r, Math.PI, -Math.PI/2);
          ctx.closePath();
          ctx.fillStyle = bg; ctx.fill();
          ctx.strokeStyle = `rgba(255,158,62,${0.48 + 0.18*Math.sin(T*3 + x*0.08)})`;
          ctx.lineWidth = 1; ctx.stroke();

          // Top cap (ellipse)
          ctx.beginPath();
          ctx.ellipse(trX, by, tw*0.88, 3.0*sz, 0, 0, PI2);
          ctx.fillStyle = "rgba(235,136,50,0.94)"; ctx.fill();
          ctx.strokeStyle = "rgba(255,198,98,0.65)"; ctx.lineWidth = 0.7; ctx.stroke();

          // Horizontal ribs detail
          for (let i = 1; i <= 4; i++) {
            const ry = by + bh * i / 5;
            ctx.beginPath(); ctx.moveTo(bx+r, ry); ctx.lineTo(bx+bw-r, ry);
            ctx.strokeStyle = "rgba(75,25,6,0.40)"; ctx.lineWidth = 0.6; ctx.stroke();
          }

          // Bottom cap
          ctx.beginPath();
          ctx.ellipse(trX, by+bh, tw*0.88, 3.0*sz, 0, 0, PI2);
          ctx.fillStyle = "rgba(80,30,10,0.88)"; ctx.fill();

          // Bushing wire from pole to transformer top
          ctx.beginPath();
          ctx.moveTo(x, crossY + 5*sz);
          ctx.lineTo(trX, by - 1);
          ctx.strokeStyle = "rgba(185,120,45,0.70)"; ctx.lineWidth = 1.4*sz; ctx.stroke();

          // Small TR label
          ctx.save();
          ctx.fillStyle = "rgba(255,205,130,0.88)";
          ctx.font = `bold ${7.5*sz}px monospace`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("TR", trX, trY + 1);
          ctx.restore();
        }
      });

      // ── Electricity particles on wires ──────────────────────
      parts.forEach(p => {
        p.t += (p.spd * p.dir * dt) / 16;
        if (p.t > 1) p.t = 0;
        if (p.t < 0) p.t = 1;
        if (p.wi >= wires.length) return;
        const wr = wires[p.wi];
        const [px, py] = bpt(p.t, wr.p0x,wr.p0y, wr.p1x,wr.p1y, wr.p2x,wr.p2y);
        const g = ctx.createRadialGradient(px, py, 0, px, py, 6.5);
        g.addColorStop(0,    "rgba(255,228,135,1)");
        g.addColorStop(0.38, "rgba(244,123,32,0.55)");
        g.addColorStop(1,    "rgba(244,123,32,0)");
        ctx.beginPath(); ctx.arc(px, py, 6.5, 0, PI2);
        ctx.fillStyle = g; ctx.fill();
      });

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <canvas ref={ref} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none", opacity: 0.80,
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
const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

function AuthScreen({ initialError }) {
  const { t, lang, setLang } = useLang();
  const strengthLabel = ["", t("pwVeryWeak"), t("pwWeak"), t("pwFair"), t("pwStrong"), t("pwVeryStrong")];
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
            setErr(t("authInvalidCreds"));
          } else {
            setErr(error.message);
          }
        }
      } else {
        if (!signup.name || !signup.username || !signup.email || !signup.password) {
          setErr(t("authFillAll")); return;
        }
        const checks = pwChecks(signup.password);
        if (!checks.length || !checks.upper || !checks.lower || !checks.number || !checks.special) {
          setErr(t("authPwCriteria")); return;
        }
        if (signup.password !== confirmPw) {
          setErr(t("authPwMismatch")); return;
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
            {t("authBrandTag")}
          </div>
          <div style={{ fontSize: 52, lineHeight: 1.05, fontWeight: 800, marginBottom: 22, letterSpacing: "-0.025em", color: "white" }}>
            {t("authBrandTitle1")}<br />
            <span style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundImage: "linear-gradient(120deg,#ffba7a,#f47b20,#fff)" }}>
              {t("authBrandTitle2")}
            </span><br />
            {t("authBrandTitle3")}
          </div>
          <div style={{ fontSize: 16, color: "#d4abff", lineHeight: 1.55, marginBottom: 28, whiteSpace: "pre-line" }}>
            {t("authBrandDesc")}
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
          {t("authCopyright")}
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
            {t("authBrandTitle1")} <span style={{ color: "#ffba7a" }}>{t("authBrandTitle2")}</span>
          </div>
          <div style={{ fontSize: 13, color: "#c4b5fd" }}>{t("authBrandTitle3")} · {t("authBrandTag")}</div>
        </div>

        {/* Language toggle — segmented pill above card */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <div style={{ display: "flex", background: "var(--soft)", border: "1px solid var(--line)", borderRadius: 999, padding: 3, gap: 2 }}>
            {["th", "en"].map(l => (
              <button key={l} onClick={() => setLang(l)} title={t("switchLang")} style={{
                padding: "5px 16px", borderRadius: 999, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 800, letterSpacing: "0.06em",
                transition: "all 180ms",
                background: lang === l ? "linear-gradient(135deg,#6b2c91,#8b3fc4)" : "transparent",
                color: lang === l ? "white" : "var(--ink-mute)",
                boxShadow: lang === l ? "0 2px 8px rgba(107,44,145,0.3)" : "none",
              }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
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
                  <div style={{ fontWeight: 800, fontSize: 18, color: "#065f46" }}>{t("authEmailSent")}</div>
                </div>
                <div style={{ color: "#047857", fontSize: 14, lineHeight: 1.6 }}>
                  {t("authEmailSentDesc")} <b>{forgotEmail}</b><br />
                  {t("authCheckInbox")}
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16, width: "100%" }} onClick={goLogin}>
                  {t("authBackToLogin")}
                </button>
              </div>
            ) : (
              <form className="fade-up" onSubmit={submit}>
                <button type="button" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-mute)", fontWeight: 600, marginBottom: 24, padding: 0 }} onClick={goLogin}>
                  <Icon name="chevLeft" size={16} /> {t("authBackToLogin")}
                </button>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", display: "grid", placeItems: "center", marginBottom: 20, boxShadow: "0 8px 24px rgba(107,44,145,0.35)" }}>
                  <Icon name="lock" size={24} stroke={2} style={{ color: "white" }} />
                </div>
                <div className="t-display" style={{ fontSize: 30, marginBottom: 6, letterSpacing: "-0.02em" }}>{t("authResetTitle")}</div>
                <div className="t-mute" style={{ marginBottom: 28, fontSize: 15 }}>
                  {t("authResetDesc")}
                </div>
                <div className="f-col f-gap-4">
                  <div className="field">
                    <label className="field-label">{t("authEmail")}</label>
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
                    {loading ? t("authSending") : <><span>{t("authSendReset")}</span> <Icon name="arrowRight" size={16} /></>}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* ── Login / Signup tabs ───────────────────────── */
            <>
              <div className="tabs" style={{ marginBottom: 28 }}>
                <button className={"tab " + (mode === "login" ? "active" : "")} onClick={() => { setMode("login"); setErr(null); }}>
                  <Icon name="user" size={15} /> {t("authTabLogin")}
                </button>
                <button className={"tab " + (mode === "signup" ? "active" : "")} onClick={() => { setMode("signup"); setErr(null); setSignupDone(false); }}>
                  <Icon name="plus" size={15} /> {t("authTabSignup")}
                </button>
              </div>

              {signupDone ? (
                <div className="fade-up card" style={{ borderColor: "var(--green)", background: "var(--green-bg)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--green)", color: "white", display: "grid", placeItems: "center" }}>
                      <Icon name="check" size={22} stroke={3} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: "#065f46" }}>{t("authRequestSent")}</div>
                  </div>
                  <div style={{ color: "#047857", fontSize: 14, lineHeight: 1.55 }}>
                    บัญชี <b>{signup.username}</b> {t("authPendingApproval")}
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: 16, width: "100%" }} onClick={() => { setMode("login"); setSignupDone(false); setSignup({ name: "", username: "", email: "", password: "" }); }}>
                    {t("authBackToLogin")}
                  </button>
                </div>
              ) : (
                <form className="fade-up" onSubmit={submit}>
                  <div className="t-display" style={{ fontSize: 30, marginBottom: 6, letterSpacing: "-0.02em" }}>
                    {mode === "login" ? t("authWelcome") : t("authSignupTitle")}
                  </div>
                  <div className="t-mute" style={{ marginBottom: 28, fontSize: 15 }}>
                    {mode === "login" ? t("authLoginDesc") : t("authSignupDesc")}
                  </div>

                  {mode === "login" ? (
                    <div className="f-col f-gap-4">
                      <div className="field">
                        <label className="field-label">{t("authEmail")}</label>
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
                          <label className="field-label" style={{ margin: 0 }}>{t("authPassword")}</label>
                          <button type="button" onClick={goForgot} style={{ fontSize: 12, color: "var(--pea-purple-500)", fontWeight: 600, padding: 0, background: "none" }}>
                            {t("authForgotPw")}
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
                        {loading ? t("authLoggingIn") : <><span>{t("authLoginBtn")}</span> <Icon name="arrowRight" size={16} /></>}
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
                          <label className="field-label">{t("authFullName")}</label>
                          <input className="input" value={signup.name} onChange={e => setSignup(s => ({ ...s, name: e.target.value }))} placeholder="เช่น สมชาย ใจดี" />
                        </div>
                        <div className="field">
                          <label className="field-label">{t("authUsernameLabel")}</label>
                          <input className="input" value={signup.username} onChange={e => setSignup(s => ({ ...s, username: e.target.value }))} placeholder="somchai.j" />
                        </div>
                        <div className="field">
                          <label className="field-label">{t("authEmail")}</label>
                          <input className="input" type="email" value={signup.email} onChange={e => setSignup(s => ({ ...s, email: e.target.value }))} placeholder="your@email.com" />
                        </div>
                        <div className="field">
                          <label className="field-label">{t("authPassword")}</label>
                          <div style={{ position: "relative" }}>
                            <input className="input" type={showSignupPw ? "text" : "password"}
                              style={{ paddingLeft: 42, paddingRight: 44 }}
                              value={signup.password}
                              onChange={e => setSignup(s => ({ ...s, password: e.target.value }))}
                              placeholder={t("pwPlaceholder")}
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
                                { ok: checks.length,  label: t("pw8chars") },
                                { ok: checks.upper,   label: t("pwUpper") },
                                { ok: checks.lower,   label: t("pwLower") },
                                { ok: checks.number,  label: t("pwNumber") },
                                { ok: checks.special, label: t("pwSpecial") },
                              ].map(r => (
                                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: r.ok ? "#16a34a" : "var(--ink-mute)", fontWeight: r.ok ? 700 : 400 }}>
                                  <span style={{ fontSize: 13 }}>{r.ok ? "✓" : "○"}</span>{r.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="field">
                          <label className="field-label">{t("authConfirmPw")}</label>
                          <div style={{ position: "relative" }}>
                            <input className="input" type={showConfirmPw ? "text" : "password"}
                              style={{ paddingLeft: 42, paddingRight: 44, borderColor: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : undefined }}
                              value={confirmPw}
                              onChange={e => setConfirmPw(e.target.value)}
                              placeholder={t("confirmPlaceholder")}
                              autoComplete="new-password" />
                            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: confirmBad ? "var(--red)" : confirmOk ? "#22c55e" : "var(--ink-mute)", pointerEvents: "none" }}>
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
                        {err && (
                          <div className="badge badge-red" style={{ alignSelf: "flex-start", padding: "8px 12px" }}>
                            <Icon name="close" size={14} />{err}
                          </div>
                        )}
                        <button type="submit" className="btn btn-primary" style={{ height: 52, fontSize: 15, marginTop: 4 }} disabled={loading}>
                          {loading ? t("authRegistering") : <><span>{t("authRegisterBtn")}</span> <Icon name="arrowRight" size={16} /></>}
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
