/* global React */
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

/* ============================================================
   Icons — tight 24px stroke set
   ============================================================ */
const Icon = ({ name, size = 18, stroke = 2 }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    search:   <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    map:      <><path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>,
    bolt:     <path d="m13 2-9 12h8l-1 8 9-12h-8l1-8Z" />,
    meter:    <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="12" cy="12" r="4" /><path d="M12 8v.5M14.83 9.17l-.35.35M16 12h-.5M14.83 14.83l-.35-.35M12 16v-.5M9.17 14.83l.35-.35M8 12h.5M9.17 9.17l.35.35" /></>,
    tr:       <><path d="M5 3h4v6h6V3h4v18h-4v-6H9v6H5V3Z" /></>,
    "meter-m":<><path d="M4 20V4l8 8 8-8v16" strokeLinejoin="round"/><circle cx="4"  cy="4"  r="1.5" fill="currentColor" stroke="none"/><circle cx="20" cy="4"  r="1.5" fill="currentColor" stroke="none"/><circle cx="4"  cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="20" cy="20" r="1.5" fill="currentColor" stroke="none"/></>,
    "tr-tri": <><path d="M12 3L21.5 20.5H2.5L12 3z" strokeLinejoin="round"/><path d="M12 8.5l5 9.5H7l5-9.5z" strokeLinejoin="round" fill="currentColor" fillOpacity="0.35" stroke="none"/></>,
    user:     <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
    users:    <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><circle cx="17" cy="9" r="3" /><path d="M21 19c0-2-2-4-4-4" /></>,
    dashboard:<><rect x="3" y="3" width="8" height="9" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="14" width="8" height="7" rx="1.5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
    history:  <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></>,
    upload:   <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
    plus:     <><path d="M12 5v14M5 12h14" /></>,
    edit:     <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    trash:    <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    close:    <><path d="M18 6 6 18M6 6l12 12" /></>,
    check:    <path d="M5 13l4 4L19 7" />,
    eye:      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff:   <><path d="M17.94 17.94A11 11 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A11 11 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="m1 1 22 22" /><path d="M9 9a3 3 0 1 0 4.24 4.24" /></>,
    filter:   <path d="M3 4h18l-7 9v6l-4 2v-8L3 4Z" />,
    layers:   <><path d="M12 2 2 8l10 6 10-6-10-6Z" /><path d="m2 16 10 6 10-6" /><path d="m2 12 10 6 10-6" /></>,
    moon:     <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
    sun:      <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    ruler:    <path d="m21 3-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2-2 2v2l16 16h2v-2L5 5l2-2" />,
    chevDown: <path d="m6 9 6 6 6-6" />,
    chevUp:   <path d="m6 15 6-6 6 6" />,
    chevRight:<path d="m9 6 6 6-6 6" />,
    chevLeft: <path d="m15 6-6 6 6 6" />,
    navigation: <path d="m3 11 19-8-8 19-2-9-9-2Z" />,
    location: <><path d="M12 22s8-8 8-13a8 8 0 1 0-16 0c0 5 8 13 8 13Z" /><circle cx="12" cy="9" r="3" /></>,
    lock:     <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
    mail:     <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 7 9-7" /></>,
    logout:   <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
    bell:     <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
    flame:    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.66 0 3-1.34 3-3 0-1.5-1-2.5-2-3.5C12.5 9 13 7 13 6c0-2-2-3-2-3s-1 1.5-1 3 1 3 1 3-2 .5-2 3a2.5 2.5 0 0 0 1.5 2.5" />,
    grid:     <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    table:    <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>,
    copy:     <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    arrowRight:<path d="M5 12h14m-6-6 6 6-6 6" />,
    menu:     <path d="M4 6h16M4 12h16M4 18h16" />,
    refresh:  <><path d="M3 12a9 9 0 0 1 15.75-6.5L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.75 6.5L3 16" /><path d="M3 21v-5h5" /></>,
    warning:  <><path d="M10.3 3.3 1.6 18a2 2 0 0 0 1.7 3h17.4a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v5" /><circle cx="12" cy="17" r=".5" fill="currentColor" /></>,
    book:     <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    code:     <><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></>,
    cpu:      <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2M15 20v2M9 2v2M9 20v2M2 15h2M20 15h2M2 9h2M20 9h2" /></>,
    link:     <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    package:  <><path d="m16.5 9.4-9-5.19" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" /></>,
    key:      <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></>,
    check:    <path d="M20 6 9 17l-5-5" />,
    info:     <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
    tip:      <><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2.26C4.19 13.47 3 11.38 3 9a7 7 0 0 1 7-7h2Z" /><path d="M9 21h6" /></>,
    moreV:    <><circle cx="12" cy="5" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="19" r="1.5" fill="currentColor" /></>,
    globe:    <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9Z" /></>,
    wallet:   <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>,
  };
  return <svg {...p} aria-hidden="true">{paths[name] || null}</svg>;
};

/* ============================================================
   Toast / notification
   ============================================================ */
const ToastCtx = createContext(null);
const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setItems(s => [...s, { id, msg, type }]);
    setTimeout(() => setItems(s => s.filter(i => i.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(i => (
          <div key={i.id} className="fade-up" style={{
            padding: "12px 18px", borderRadius: 14, background: "var(--surface)",
            boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)",
            display: "flex", alignItems: "center", gap: 10, minWidth: 240,
            borderLeft: `4px solid ${i.type === "success" ? "var(--green)" : i.type === "error" ? "var(--red)" : "var(--pea-purple-500)"}`,
          }}>
            <Icon name={i.type === "success" ? "check" : i.type === "error" ? "close" : "bell"} size={18} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{i.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ============================================================
   Modal
   ============================================================ */
function Modal({ open, onClose, title, children, footer, width = 520 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fade-in pea-modal-overlay" style={{ zIndex: 9000 }} onClick={onClose}>
      <div className="fade-up" onClick={e => e.stopPropagation()} style={{
        background: "var(--surface)", borderRadius: 20, width: "100%", maxWidth: width,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)", overflow: "hidden",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{title}</div>
          <button className="btn-icon" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div style={{ padding: "20px 24px", flex: 1, overflow: "auto" }}>{children}</div>
        {footer && <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--line)", background: "var(--bg)", flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   Empty state
   ============================================================ */
function EmptyState({ icon = "search", title, hint }) {
  return (
    <div className="f-col f-center" style={{ padding: 60, gap: 16, color: "var(--ink-mute)" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--pea-purple-50)", display: "grid", placeItems: "center", color: "var(--pea-purple-500)" }}>
        <Icon name={icon} size={32} stroke={1.6} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{title}</div>
        {hint && <div style={{ marginTop: 4, fontSize: 13 }}>{hint}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   StatCard (used in dashboard)
   ============================================================ */
/* Auto-shrinks text to always fit its container — no hardcoded sizes needed */
function FitText({ children, maxSize = 30, minSize = 12 }) {
  const ref = useRef(null);
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = maxSize + "px";
    let size = maxSize;
    while (el.scrollWidth > el.offsetWidth + 1 && size > minSize) {
      size -= 0.5;
      el.style.fontSize = size + "px";
    }
  }, [maxSize, minSize]);
  useEffect(() => {
    fit();
    if (!ref.current) return;
    const ro = new ResizeObserver(fit);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [children, fit]);
  return (
    <div ref={ref} style={{ overflow: "hidden", whiteSpace: "nowrap", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--ink)", marginTop: 4 }}>
      {children}
    </div>
  );
}

/* breakdown: [{ label, value, color }] — optional sub-stats shown below main value */
function StatCard({ label, value, delta, icon, accent = "purple", breakdown }) {
  const colorMap = {
    purple: ["#6b2c91", "#8b3fc4"],
    orange: ["#f47b20", "#ffba7a"],
    green:  ["#10b981", "#34d399"],
    blue:   ["#3b82f6", "#60a5fa"],
  };
  const [c1, c2] = colorMap[accent];
  return (
    <div className="card card-elev" style={{ overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c1},${c2})`, borderRadius: "14px 14px 0 0" }} />
      <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${c1}22, transparent 70%)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, position: "relative" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${c1}, ${c2})`, color: "white", display: "grid", placeItems: "center", boxShadow: `0 8px 22px ${c1}55` }}>
          <Icon name={icon} size={22} />
        </div>
        {delta != null && (
          <div className={"badge " + (delta >= 0 ? "badge-green" : "badge-red")} style={{ position: "relative" }}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div className="t-mute fw-6" style={{
        fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
        minHeight: "2.6em", display: "-webkit-box",
        WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        lineHeight: 1.3,
      }}>{label}</div>
      <FitText>{value}</FitText>
      {breakdown && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          {breakdown.map((b, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: b.color, display: "inline-block", flexShrink: 0 }} />
                  {b.label}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {b.pct != null && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: b.color, background: b.color + "22", borderRadius: 4, padding: "1px 5px", letterSpacing: "0.02em" }}>
                      {b.pct}%
                    </span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "'IBM Plex Mono',monospace", color: "var(--ink)" }}>{b.value}</span>
                </div>
              </div>
              {b.pct != null && (
                <div style={{ height: 3, borderRadius: 2, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: b.pct + "%", background: b.color, borderRadius: 2, transition: "width 600ms cubic-bezier(.22,1,.36,1)" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Helpers
   ============================================================ */
function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [
    cols.join(","),
    ...rows.map(r => cols.map(c => {
      const v = (r[c] ?? "").toString().replace(/"/g, '""');
      return /[",\n]/.test(v) ? `"${v}"` : v;
    }).join(",")),
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function formatThaiDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ============================================================
   ConfirmDialog — themed replacement for window.confirm()
   ============================================================ */
const ConfirmCtx = createContext(null);
const useConfirm = () => useContext(ConfirmCtx);

function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        title: "ยืนยันการดำเนินการ",
        message: "คุณแน่ใจหรือไม่ที่จะดำเนินการนี้?",
        confirmText: "ยืนยัน",
        cancelText: "ยกเลิก",
        tone: "danger",
        ...opts,
        resolve,
      });
    });
  }, []);

  const close = (val) => {
    state?.resolve?.(val);
    setState(null);
  };

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const tone = state?.tone || "danger";
  const accent = tone === "danger"
    ? { bg: "linear-gradient(135deg,#ef4444,#dc2626)", soft: "#fee2e2", color: "#b91c1c", btn: "btn-danger", icon: "trash" }
    : tone === "warning"
    ? { bg: "linear-gradient(135deg,#f59e0b,#f47b20)", soft: "#fef3c7", color: "#b45309", btn: "btn-orange", icon: "bell" }
    : { bg: "linear-gradient(135deg,#6b2c91,#8b3fc4)", soft: "#f6efff", color: "#4f1e6e", btn: "btn-primary", icon: "check" };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div className="fade-in pea-modal-overlay" onClick={() => close(false)}>
          <div className="fade-up" onClick={e => e.stopPropagation()} style={{
            background: "var(--surface)", borderRadius: 22, width: "100%", maxWidth: 460,
            boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)", overflow: "hidden",
          }}>
            <div style={{
              padding: "24px 24px 18px",
              background: accent.bg,
              color: "white", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
              <div style={{ position: "absolute", right: 40, bottom: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
              <div className="f-gap-3 flex" style={{ alignItems: "center", position: "relative" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)",
                  display: "grid", placeItems: "center", backdropFilter: "blur(8px)",
                }}>
                  <Icon name={accent.icon} size={26} stroke={2.2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.85 }}>
                    {tone === "danger" ? "ลบข้อมูล" : tone === "warning" ? "ระวัง" : "ยืนยัน"}
                  </div>
                  <div className="t-display" style={{ fontSize: 20, fontWeight: 800, marginTop: 2, letterSpacing: "-0.01em" }}>
                    {state.title}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "20px 24px 4px" }}>
              <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
                {state.message}
              </div>
              {state.target && (
                <div className="mono" style={{
                  marginTop: 12, padding: "10px 14px",
                  background: accent.soft, color: accent.color,
                  borderRadius: 12, fontSize: 13, fontWeight: 700,
                  display: "inline-flex", alignItems: "center", gap: 8,
                  border: `1px dashed ${accent.color}33`,
                }}>
                  <Icon name="bolt" size={14} />{state.target}
                </div>
              )}
              {tone === "danger" && (
                <div style={{
                  marginTop: 14, fontSize: 12, color: "var(--ink-mute)",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Icon name="bell" size={13} /> การกระทำนี้ไม่สามารถย้อนกลับได้
                </div>
              )}
            </div>

            <div style={{ padding: "18px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => close(false)}>
                {state.cancelText}
              </button>
              <button className={"btn " + accent.btn} onClick={() => close(true)} autoFocus>
                {tone === "danger" && <Icon name="trash" size={14} />}
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

/* expose */
Object.assign(window, { Icon, ToastProvider, useToast, ConfirmProvider, useConfirm, Modal, EmptyState, StatCard, SkeletonCard, downloadCSV, formatThaiDate });

/* ── SkeletonCard ───────────────────────────────────────────── */
function SkeletonCard({ height = 120, style = {} }) {
  return (
    <div className="card" style={{ height, overflow: "hidden", position: "relative", ...style }}>
      <style>{`
        @keyframes skShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        .sk-shimmer::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%); animation:skShimmer 1.4s ease infinite; }
        .sk-line { border-radius:6px; background:var(--line); position:relative; overflow:hidden; }
        .sk-line::after { content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent); animation:skShimmer 1.4s ease infinite; }
      `}</style>
      <div className="sk-shimmer" style={{ position:"absolute", inset:0, borderRadius:"inherit", background:"var(--soft)", overflow:"hidden" }} />
      <div style={{ position:"relative", padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
        <div className="sk-line" style={{ height:14, width:"55%" }} />
        <div className="sk-line" style={{ height:28, width:"72%", marginTop:4 }} />
        <div className="sk-line" style={{ height:10, width:"40%", marginTop:6 }} />
      </div>
    </div>
  );
}
