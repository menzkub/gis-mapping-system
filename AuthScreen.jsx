/* global React, ReactDOM, Icon, _supabase, useLang */
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

  const [showInfo, setShowInfo] = useStateA(false);

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
        const raw = email.trim();
        let loginEmail = raw.toLowerCase();

        // If not an email, resolve username → email via secure RPC
        if (!raw.includes("@")) {
          const { data: resolved, error: rpcErr } = await _supabase.rpc(
            "get_email_by_username", { p_username: raw.toLowerCase() }
          );
          if (rpcErr || !resolved) {
            setErr(t("authUsernameNotFound"));
            return;
          }
          loginEmail = resolved;
        }

        const { error } = await _supabase.auth.signInWithPassword({
          email:    loginEmail,
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
          <img src="logo.svg" alt="PEA" style={{ width: 56, height: 56, borderRadius: 16, boxShadow: "0 12px 32px rgba(139,63,196,0.5)", flexShrink: 0, animation: "authLogoFloat 5s ease-in-out infinite" }} />
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
            {["PEA Meter", "PEA TR", "Satellite Map", "Heatmap", "Navigation"].map((label, idx) => (
              <div key={label} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, color: "white", animation: `authBadgeIn 420ms ${idx * 90 + 300}ms var(--ease-out) both` }}>
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
            <img src="logo.svg" alt="PEA" style={{ width: 50, height: 50, borderRadius: 14, boxShadow: "0 8px 24px rgba(139,63,196,0.45)", flexShrink: 0, animation: "authLogoFloat 5s ease-in-out infinite" }} />
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
                <div className="tabs" style={{ flex: 1, display: "flex" }}>
                  <button className={"tab " + (mode === "login" ? "active" : "")} onClick={() => { setMode("login"); setErr(null); }} style={{ flex: 1, justifyContent: "center" }}>
                    <Icon name="user" size={15} /> {t("authTabLogin")}
                  </button>
                  <button className={"tab " + (mode === "signup" ? "active" : "")} onClick={() => { setMode("signup"); setErr(null); setSignupDone(false); }} style={{ flex: 1, justifyContent: "center" }}>
                    <Icon name="plus" size={15} /> {t("authTabSignup")}
                  </button>
                </div>
                <div style={{ display: "flex", background: "var(--soft)", border: "1px solid var(--line)", borderRadius: 999, padding: 3, gap: 2, flexShrink: 0 }}>
                  {["th", "en"].map(l => (
                    <button key={l} onClick={() => setLang(l)} style={{
                      padding: "5px 12px", borderRadius: 999, border: "none", cursor: "pointer",
                      fontSize: 11, fontWeight: 800, letterSpacing: "0.06em",
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

              {signupDone ? (() => {
                const a = (th, en) => lang === "en" ? en : th;
                return (
                <div className="fade-up">
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                      background: "linear-gradient(135deg,#6b2c91,#8b3fc4)", display: "grid", placeItems: "center",
                      boxShadow: "0 8px 24px rgba(107,44,145,0.35)" }}>
                      <Icon name="mail" size={24} stroke={2} style={{ color: "white" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 20 }}>{a("สมัครสำเร็จ!", "Registration Submitted!")}</div>
                      <div className="t-mute text-sm">{a("กรุณาทำตามขั้นตอนด้านล่าง","Please follow the steps below")}</div>
                    </div>
                  </div>

                  {/* Step 1 — Confirm email */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 10, padding: "14px 16px",
                    background: "rgba(139,63,196,0.07)", borderRadius: 12, border: "1px solid rgba(139,63,196,0.18)" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                      background: "var(--pea-purple-600)", color: "white",
                      display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800 }}>1</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                        {a("ยืนยันอีเมลของคุณ", "Confirm your email")}
                      </div>
                      <div className="t-mute text-sm" style={{ lineHeight: 1.55 }}>
                        {a("เราส่งลิงก์ยืนยันไปที่", "We sent a confirmation link to")}{" "}
                        <b style={{ color: "var(--pea-purple-600)" }}>{signup.email}</b>
                        {" "}{a("กดลิงก์ในอีเมลนั้นเพื่อยืนยันตัวตน", "— click the link in that email to verify your identity")}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 — Admin approval */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 10, padding: "14px 16px",
                    background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--line)" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                      background: "var(--line-2)", color: "var(--ink-mute)",
                      display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800 }}>2</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                        {a("รอการอนุมัติจาก Admin", "Wait for Admin approval")}
                      </div>
                      <div className="t-mute text-sm" style={{ lineHeight: 1.55 }}>
                        {a("หลังยืนยันอีเมลแล้ว Admin จะตรวจสอบและอนุมัติบัญชี","After confirming your email, an Admin will review and approve the account")}{" "}
                        <b>{signup.username}</b>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 — Login */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, padding: "14px 16px",
                    background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--line)" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                      background: "var(--line-2)", color: "var(--ink-mute)",
                      display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800 }}>3</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                        {a("เข้าสู่ระบบได้เลย", "Log in to the system")}
                      </div>
                      <div className="t-mute text-sm" style={{ lineHeight: 1.55 }}>
                        {a("เมื่อได้รับการอนุมัติแล้ว เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่ตั้งไว้ได้เลย",
                          "Once approved, you can log in with the email and password you just set")}
                      </div>
                    </div>
                  </div>

                  {/* Spam tip */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 18, padding: "10px 14px",
                    background: "rgba(234,179,8,0.08)", borderRadius: 10, border: "1px solid rgba(234,179,8,0.25)" }}>
                    <Icon name="alert" size={15} style={{ color: "#ca8a04", flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.55 }}>
                      {a("ไม่พบอีเมล? ลองตรวจสอบใน","Email not found? Check your")}{" "}
                      <b>{a("โฟลเดอร์ Spam / Junk","Spam / Junk folder")}</b>
                      {" "}{a("หรือรออีกสักครู่ อีเมลอาจใช้เวลาสักสักครู่","or wait a moment — delivery may take a few minutes")}
                    </div>
                  </div>

                  <button className="btn btn-primary" style={{ width: "100%", height: 48 }}
                    onClick={() => { setMode("login"); setSignupDone(false); setSignup({ name: "", username: "", email: "", password: "" }); }}>
                    <Icon name="arrowRight" size={14} /> {t("authBackToLogin")}
                  </button>
                </div>
                );
              })() : (
                <form className="fade-up" onSubmit={submit}>
                  <div className="t-display" style={{ fontSize: 30, marginBottom: 6, letterSpacing: "-0.02em" }}>
                    {mode === "login" ? t("authWelcome") : t("authSignupTitle")}
                  </div>
                  <div className="t-mute" style={{ marginBottom: 28, fontSize: 15 }}>
                    {mode === "login" ? t("authLoginDesc2") : t("authSignupDesc")}
                  </div>

                  {mode === "login" ? (
                    <div className="f-col f-gap-4">
                      <div className="field">
                        <label className="field-label">{t("authEmailOrUsername")}</label>
                        <div style={{ position: "relative" }}>
                          <input className="input" style={{ paddingLeft: 42 }} type="text"
                            value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="username หรือ your@email.com" autoComplete="username email" required />
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
          {/* Version badge */}
          <div style={{ textAlign: "center", padding: "16px 0 4px", marginTop: "auto" }}>
            <button onClick={() => setShowInfo(true)} style={{
              background: "transparent", border: "1px solid transparent", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, color: "var(--ink-mute)",
              padding: "6px 16px", borderRadius: 999, transition: "all 180ms",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--soft)"; e.currentTarget.style.borderColor = "var(--line)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              ⚡ เวอร์ชัน:&nbsp;
              <span style={{ color: "var(--pea-purple-500)", fontWeight: 800 }}>
                {(window.PEA_META?.version) || "v3.3"}
              </span>
              &nbsp;·&nbsp;
              <span style={{ color: "var(--ink-mute)" }}>{window.PEA_META?.tag || "Privacy & Fixes"}</span>
            </button>
          </div>
        </div>

      </div>

      {showInfo && <AppInfoModal onClose={() => setShowInfo(false)} />}

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
          border-radius: 0 20px 20px 0;
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
          position: relative;
          z-index: 1;
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
            padding: 32px 24px 32px;
            max-width: 100%;
            flex: 1;
            display: flex;
            flex-direction: column;
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

/* ── AppInfoModal — version badge popup ──────────────────────────────────── */
function AppInfoModal({ onClose }) {
  const [tab, setTab] = useStateA("about");
  const [expandedVersion, setExpandedVersion] = useStateA(0);
  const { lang, setLang } = useLang();
  const [fetchedPrivacy, setFetchedPrivacy] = useStateA(null);
  const [fetchedContact, setFetchedContact] = useStateA(null);
  const meta = window.PEA_META || { version: "v3.3", tag: "Privacy & Fixes", date: "3 มิ.ย. 2569", changelog: [] };
  const s = (th, en) => lang === "en" ? en : th;

  useEffectA(() => {
    Promise.all([
      _supabase.from("settings").select("value").eq("key", "privacy_policy").maybeSingle(),
      _supabase.from("settings").select("value").eq("key", "contact_info").maybeSingle(),
    ]).then(([privRes, contRes]) => {
      if (!privRes.error && privRes.data?.value) { try { setFetchedPrivacy(JSON.parse(privRes.data.value)); } catch {} }
      if (!contRes.error && contRes.data?.value) { try { setFetchedContact(JSON.parse(contRes.data.value)); } catch {} }
    });
  }, []);

  const TABS = [
    { id: "about",   icon: "⚡", label: s("เกี่ยวกับแอป","About App") },
    { id: "privacy", icon: "🔒", label: s("นโยบายความเป็นส่วนตัว","Privacy Policy") },
    { id: "terms",   icon: "📋", label: s("ข้อตกลงการใช้งาน","Terms of Use") },
    { id: "updates", icon: "🕐", label: s("ประวัติเวอร์ชัน","Version History") },
    { id: "contact", icon: "📞", label: s("ช่องทางติดต่อ","Contact") },
  ];

  const DEFAULT_PRIVACY = [
    { icon: "🏢", title: s("ผู้ควบคุมข้อมูลส่วนบุคคล","Data Controller"), body: s("การไฟฟ้าส่วนภูมิภาค (PEA) — ระบบ PEA GIS Meter & TR ใช้สำหรับงานภายในองค์กรเท่านั้น","Provincial Electricity Authority (PEA) — The PEA GIS Meter & TR system is for internal organizational use only.") },
    { icon: "📋", title: s("ข้อมูลที่เก็บรวบรวม","Data Collected"), body: s("ตำแหน่ง GPS ที่ใช้แก้ไขพิกัด, ภาพถ่าย Meter/TR (เก็บบน Supabase Storage), ประวัติการค้นหา (เก็บบนอุปกรณ์), บันทึกการใช้งานระบบ (Audit Log)","GPS coordinates for location corrections, Meter/TR photos (stored on Supabase Storage), search history (on-device), and system audit logs.") },
    { icon: "🎯", title: s("วัตถุประสงค์การใช้ข้อมูล","Purpose of Use"), body: s("เพื่อปรับปรุงความถูกต้องของพิกัดมิเตอร์และหม้อแปลงในระบบ GIS และเพื่อการตรวจสอบการใช้งานระบบ","To improve the accuracy of meter and transformer coordinates in the GIS system and to audit system usage.") },
    { icon: "🔒", title: s("การเปิดเผยข้อมูล","Data Disclosure"), body: s("ข้อมูลไม่ถูกเปิดเผยแก่บุคคลภายนอก — เข้าถึงได้เฉพาะพนักงาน PEA ที่ได้รับอนุญาต","Data is not disclosed to third parties — accessible only to authorized PEA personnel.") },
    { icon: "⏱", title: s("ระยะเวลาเก็บรักษาข้อมูล","Retention Period"), body: s("ข้อมูล Audit Log เก็บไว้ตราบเท่าที่จำเป็น — ภาพถ่ายเก็บจนกว่า Admin จะลบออก","Audit logs are retained as long as necessary — photos are kept until removed by an Admin.") },
    { icon: "✅", title: s("สิทธิ์ของเจ้าของข้อมูล (PDPA)","Data Subject Rights (PDPA)"), body: s("ท่านมีสิทธิ์ขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนตัว โดยติดต่อผ่าน Admin ของระบบ","You have the right to access, correct, or delete your personal data by contacting the system Admin.") },
  ];
  const PRIVACY = (fetchedPrivacy && fetchedPrivacy.length > 0) ? fetchedPrivacy : DEFAULT_PRIVACY;

  const TERMS = [
    { icon: "🏛", title: s("ขอบเขตการใช้งาน","Scope of Use"), body: s("ระบบนี้จัดทำขึ้นสำหรับพนักงานการไฟฟ้าส่วนภูมิภาค (PEA) เท่านั้น ห้ามบุคคลภายนอกใช้งาน","This system is for PEA employees only. Unauthorized access by external parties is prohibited.") },
    { icon: "🔑", title: s("ความรับผิดชอบบัญชีผู้ใช้","Account Responsibility"), body: s("ผู้ใช้ต้องรักษาข้อมูลรหัสผ่านเป็นความลับ และรับผิดชอบต่อการกระทำทั้งหมดที่เกิดจากบัญชีของตน","Users must keep their passwords confidential and are responsible for all actions taken from their account.") },
    { icon: "📵", title: s("การใช้งานต้องห้าม","Prohibited Use"), body: s("ห้ามนำข้อมูลในระบบไปเปิดเผย แก้ไข หรือใช้เพื่อวัตถุประสงค์อื่นนอกจากงาน PEA","Disclosing, modifying, or using system data for any purpose other than PEA work is prohibited.") },
    { icon: "📷", title: s("ภาพถ่ายในระบบ","Photos in System"), body: s("ภาพถ่ายมิเตอร์และหม้อแปลงที่อัพโหลดถือเป็นทรัพย์สินของ PEA — ใช้เพื่อเอกสารภาคสนามเท่านั้น","Uploaded meter and transformer photos are PEA property — for field documentation purposes only.") },
    { icon: "⚖️", title: s("กฎหมายที่ใช้บังคับ","Governing Law"), body: s("ข้อตกลงนี้อยู่ภายใต้กฎหมายไทย รวมถึง พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)","This agreement is governed by Thai law, including the Personal Data Protection Act B.E. 2562 (PDPA).") },
    { icon: "🔄", title: s("การปรับปรุงข้อตกลง","Agreement Updates"), body: s("PEA ขอสงวนสิทธิ์ในการแก้ไขข้อตกลงได้ตลอดเวลา — การใช้งานต่อเนื่องถือว่ายอมรับข้อตกลงใหม่","PEA reserves the right to update this agreement at any time — continued use constitutes acceptance of new terms.") },
  ];

  const DEFAULT_CONTACT = [
    { icon: "🏢", title: s("หน่วยงาน","Department"), body: s(
      "IT · PEA FANG Smartflow\nการไฟฟ้าส่วนภูมิภาคสาขาฝาง\nโทรศัพท์: 053-453-170\nเวลาทำการ: จันทร์–ศุกร์ 08:30–16:30 น.",
      "IT · PEA FANG Smartflow\nProvincial Electricity Authority, Fang Branch\nPhone: 053-453-170\nOffice Hours: Mon–Fri 08:30–16:30"
    )},
    { icon: "👤", title: s("Admin ระบบ","System Admin"), body: s("ติดต่อผู้ดูแลระบบ (Admin) เพื่อขอสิทธิ์, รีเซ็ตรหัสผ่าน, หรือแก้ไขข้อมูล","Contact the system Admin for access requests, password resets, or data corrections.") },
    { icon: "🔄", title: s("ขอฟีเจอร์ใหม่","Feature Requests"), body: s("ต้องการฟีเจอร์เพิ่มเติม หรือมีข้อเสนอแนะ ยินดีรับฟังเพื่อพัฒนาระบบให้ดียิ่งขึ้น","Have feature requests or suggestions? We welcome your feedback to improve the system.") },
  ];
  const CONTACT = (fetchedContact && fetchedContact.length > 0) ? fetchedContact : DEFAULT_CONTACT;

  const FEATURES = [
    { icon: "🔍", t: s("ค้นหาข้อมูล","Search"), d: "Meter / Transformer" },
    { icon: "🗺️", t: s("แผนที่ GIS","GIS Map"), d: "Street & Satellite" },
    { icon: "📷", t: s("ถ่ายรูปอุปกรณ์","Device Photos"), d: "Cloud Storage" },
    { icon: "📍", t: s("นำทาง GPS","GPS Navigation"), d: "Google / Apple Maps" },
    { icon: "📝", t: s("แก้ไขพิกัด","Edit Coords"), d: s("ส่งคำขอ → Admin อนุมัติ","Request → Admin Approve") },
    { icon: "🔔", t: "Push Notification", d: s("แจ้งเตือนทุกอุปกรณ์","All-device alerts") },
  ];

  const CAT_COLOR = { new: "#059669", fix: "#3b82f6", ux: "#8b5cf6", perf: "#f59e0b", sec: "#ef4444" };
  const CAT_LABEL = { new: s("ใหม่","New"), fix: s("แก้ไข","Fix"), ux: "UX", perf: s("ประสิทธิภาพ","Perf"), sec: s("ความปลอดภัย","Security") };

  const content = {
    about: (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "20px", borderRadius: 16, background: "linear-gradient(135deg,rgba(107,44,145,0.08),rgba(244,123,32,0.06))", border: "1px solid rgba(107,44,145,0.15)" }}>
          <img src="logo.svg" alt="PEA" style={{ width: 64, height: 64, borderRadius: 18, boxShadow: "0 8px 24px rgba(107,44,145,0.3)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#f47b20", textTransform: "uppercase", marginBottom: 2 }}>การไฟฟ้าส่วนภูมิภาค · PEA</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)", lineHeight: 1.2 }}>GIS Meter & TR</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: "rgba(107,44,145,0.1)", color: "#6b2c91", border: "1px solid rgba(107,44,145,0.25)" }}>{meta.version}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 999, background: "var(--soft)", color: "var(--ink-mute)", border: "1px solid var(--line)" }}>{meta.tag}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 999, background: "var(--soft)", color: "var(--ink-mute)", border: "1px solid var(--line)" }}>{meta.date}</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 14, color: "var(--ink-mute)", lineHeight: 1.8, marginBottom: 20 }}>
          {s(
            <span>ระบบสารสนเทศภูมิศาสตร์ (GIS) สำหรับค้นหา ติดตาม และจัดการ <b style={{ color: "var(--ink)" }}>มิเตอร์ไฟฟ้า</b> และ <b style={{ color: "var(--ink)" }}>หม้อแปลงไฟฟ้า</b> ของการไฟฟ้าส่วนภูมิภาค ครอบคลุมทุกพื้นที่บริการ</span>,
            <span>A Geographic Information System (GIS) for searching, tracking, and managing <b style={{ color: "var(--ink)" }}>electricity meters</b> and <b style={{ color: "var(--ink)" }}>transformers</b> across all PEA service areas.</span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--soft)", border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{f.t}</div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>{f.d}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(244,123,32,0.06)", border: "1px solid rgba(244,123,32,0.2)", fontSize: 12, color: "var(--ink-mute)", textAlign: "center" }}>
          {s(
            <span>พัฒนาโดย <b style={{ color: "var(--ink)" }}>IT · PEA FANG Smartflow</b> · ลิขสิทธิ์ © 2569</span>,
            <span>Developed by <b style={{ color: "var(--ink)" }}>IT · PEA FANG Smartflow</b> · Copyright © 2026</span>
          )}
        </div>
      </div>
    ),
    privacy: (
      <div>
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)", fontSize: 12, color: "#047857", fontWeight: 600 }}>
          {s("🔒 อ้างอิง พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) · ปรับปรุงล่าสุด: มิถุนายน 2568","🔒 Reference: Personal Data Protection Act B.E. 2562 (PDPA) · Last updated: June 2025")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {PRIVACY.map((p, i) => (
            <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: "var(--soft)", border: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{p.icon}</span> {p.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.7 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    terms: (
      <div>
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(107,44,145,0.07)", border: "1px solid rgba(107,44,145,0.2)", fontSize: 12, color: "#6b2c91", fontWeight: 600 }}>
          {s("📋 ข้อตกลงนี้มีผลบังคับใช้เมื่อท่านเข้าสู่ระบบ PEA GIS Meter & TR","📋 This agreement takes effect when you log in to the PEA GIS Meter & TR system.")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TERMS.map((t, i) => (
            <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: "var(--soft)", border: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{t.icon}</span> {t.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.7 }}>{t.body}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    updates: (
      <div>
        {(meta.changelog || []).slice(0, 6).map((v, vi) => {
          const isOpen = expandedVersion === vi;
          const isLatest = vi === 0;
          return (
            <div key={vi} style={{ marginBottom: 8, borderRadius: 12, border: `1px solid ${isLatest ? "rgba(107,44,145,0.3)" : "var(--line)"}`, background: isLatest ? "rgba(107,44,145,0.04)" : "var(--soft)", overflow: "hidden" }}>
              <button onClick={() => setExpandedVersion(isOpen ? -1 : vi)} style={{
                width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", gap: 8,
                background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
              }}>
                <span style={{ fontWeight: 900, fontSize: 14, color: isLatest ? "#6b2c91" : "var(--ink)" }}>{v.version}</span>
                {isLatest && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "rgba(107,44,145,0.12)", color: "#6b2c91", border: "1px solid rgba(107,44,145,0.25)" }}>{s("ล่าสุด","Latest")}</span>}
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: v.tagColor ? `${v.tagColor}18` : "var(--surface)", color: v.tagColor || "var(--ink-mute)", border: `1px solid ${v.tagColor ? `${v.tagColor}30` : "var(--line)"}` }}>{v.tag}</span>
                <span style={{ fontSize: 11, color: "var(--ink-mute)", marginLeft: "auto", flexShrink: 0 }}>{v.date}</span>
                <span style={{ fontSize: 13, color: "var(--ink-mute)", flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>▾</span>
              </button>
              {isOpen && (
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {(v.items || []).slice(0, 5).map((item, ii) => (
                    <div key={ii} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: `${CAT_COLOR[item.cat] || "#6b7280"}18`, color: CAT_COLOR[item.cat] || "#6b7280", border: `1px solid ${CAT_COLOR[item.cat] || "#6b7280"}30`, flexShrink: 0, marginTop: 1 }}>
                        {CAT_LABEL[item.cat] || item.cat}
                      </span>
                      <span style={{ color: "var(--ink-mute)", lineHeight: 1.6 }}>
                        {typeof item.text === "object" ? (lang === "en" ? (item.text.en || item.text.th) : item.text.th) : item.text}
                      </span>
                    </div>
                  ))}
                  {(v.items || []).length > 5 && (
                    <div style={{ fontSize: 11, color: "var(--ink-mute)", paddingLeft: 4 }}>+{v.items.length - 5} {s("รายการ","items")}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    ),
    contact: (
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CONTACT.map((c, i) => (
            <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: "var(--soft)", border: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{c.icon}</span> {c.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{c.body}</div>
            </div>
          ))}
        </div>

        {/* Report Problem — highlighted card */}
        <div style={{ marginTop: 12, padding: "16px 18px", borderRadius: 12, background: "rgba(59,130,246,0.06)", border: "1.5px solid rgba(59,130,246,0.22)" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#2563eb", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <span>📋</span> {s("การรายงานปัญหา","Report an Issue")}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.7 }}>
            {s(
              "หากพบปัญหาด้านความปลอดภัยหรือการละเมิดข้อมูล กรุณาแจ้งให้เราทราบโดยทันทีผ่านช่องทางติดต่อด้านบน",
              "If you encounter a security issue or data breach, please notify us immediately through the contact channels above."
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 12, background: "rgba(107,44,145,0.06)", border: "1px solid rgba(107,44,145,0.18)", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{s("เวอร์ชันปัจจุบัน","Current Version")}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--pea-purple-500)", marginTop: 2 }}>{meta.version}</div>
          <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{meta.tag} · {meta.date}</div>
        </div>
      </div>
    ),
  };

  return ReactDOM.createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={onClose}>

      {/* Centered card */}
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 900, height: "min(88vh, 680px)",
        background: "var(--bg)", borderRadius: 20,
        boxShadow: "0 32px 80px rgba(0,0,0,0.35)", border: "1px solid var(--line)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* ── Title header ── */}
        <div style={{ textAlign: "center", padding: "22px 64px 16px", borderBottom: "1px solid var(--line)", flexShrink: 0, position: "relative" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            {s("ข้อกำหนดและนโยบายการใช้งาน","Terms & Policy")}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 3 }}>
            {s("ระบบ PEA GIS Meter & TR · การไฟฟ้าส่วนภูมิภาค","PEA GIS Meter & TR System · Provincial Electricity Authority")}
          </div>

          {/* Language toggle */}
          <div style={{ position: "absolute", top: 16, left: 16, display: "flex", background: "var(--soft)", border: "1px solid var(--line)", borderRadius: 999, padding: 3, gap: 2 }}>
            {["th","en"].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: "4px 12px", borderRadius: 999, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", transition: "all 180ms",
                background: lang === l ? "linear-gradient(135deg,#6b2c91,#8b3fc4)" : "transparent",
                color: lang === l ? "white" : "var(--ink-mute)",
                boxShadow: lang === l ? "0 2px 6px rgba(107,44,145,0.3)" : "none",
              }}>{l.toUpperCase()}</button>
            ))}
          </div>

          {/* Close button — prominent */}
          <button onClick={onClose} style={{
            position: "absolute", top: 14, right: 14,
            width: 40, height: 40, borderRadius: 10,
            border: "1.5px solid var(--line)", background: "var(--soft)",
            cursor: "pointer", display: "grid", placeItems: "center",
            transition: "all 160ms", color: "var(--ink)",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.45)"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--soft)"; e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink)"; }}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* ── Two-column body ── */}
        <div className="app-info-body">

          {/* Sidebar */}
          <div className="app-info-sidebar">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`app-info-tab${tab === t.id ? " active" : ""}`}>
                <span className="app-info-tab-icon">{t.icon}</span>
                <span className="app-info-tab-label">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="app-info-content">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 26 }}>{TABS.find(t => t.id === tab)?.icon}</span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "var(--ink)" }}>
                {TABS.find(t => t.id === tab)?.label}
              </h2>
            </div>
            {content[tab]}
          </div>
        </div>
      </div>

      <style>{`
        .app-info-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .app-info-sidebar {
          width: 240px;
          flex-shrink: 0;
          border-right: 1px solid var(--line);
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }
        .app-info-tab {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: all 160ms;
          position: relative;
        }
        .app-info-tab-icon { font-size: 17px; flex-shrink: 0; }
        .app-info-tab-label { font-size: 13px; font-weight: 600; color: var(--ink-mute); }
        .app-info-tab:hover .app-info-tab-label { color: var(--ink); }
        .app-info-tab:hover { background: var(--soft); }
        .app-info-tab.active { background: rgba(107,44,145,0.09); }
        .app-info-tab.active::before {
          content: "";
          position: absolute;
          left: 0; top: 6px; bottom: 6px;
          width: 3px;
          border-radius: 2px;
          background: #6b2c91;
        }
        .app-info-tab.active .app-info-tab-label { color: #6b2c91; font-weight: 700; }
        .app-info-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px 28px;
        }
        @media (max-width: 640px) {
          .app-info-body { flex-direction: column; }
          .app-info-sidebar {
            width: 100%;
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
            flex-shrink: 0;
            border-right: none;
            border-bottom: 1px solid var(--line);
            padding: 8px 10px;
            gap: 4px;
          }
          .app-info-tab {
            flex-direction: column;
            gap: 4px;
            padding: 8px 10px;
            flex-shrink: 0;
            border-radius: 10px;
          }
          .app-info-tab::before { display: none !important; }
          .app-info-tab.active { background: rgba(107,44,145,0.1); }
          .app-info-tab-icon { font-size: 18px; }
          .app-info-tab-label { font-size: 10px; white-space: nowrap; }
          .app-info-content { padding: 20px 16px; }
        }
      `}</style>
    </div>,
    document.body
  );
}

window.AuthScreen = AuthScreen;
