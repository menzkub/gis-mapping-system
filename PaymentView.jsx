/* global React, Icon, Modal, useToast, useLang, _supabase */
const {
  useState:  useStatePV,
  useEffect: useEffectPV,
  useRef:    useRefPV,
} = React;

/* ============================================================
   PaymentView — team leader monthly payment tab
   ============================================================ */
function PaymentView({ currentUser, addAudit }) {
  const { lang } = useLang();
  const s = (th, en) => lang === "en" ? en : th;
  const toast = useToast();

  const [activeTab, setActiveTab] = useStatePV("upload");
  const [team, setTeam]           = useStatePV([]);
  const [history, setHistory]     = useStatePV([]);
  const [loadingH, setLoadingH]   = useStatePV(true);
  const [viewSlip, setViewSlip]   = useStatePV(null);
  const [refreshKey, setRefreshKey] = useStatePV(0);

  const nowMonth = new Date().toISOString().slice(0, 7);
  const paidThisMonth = history.find(h => h.payment_month === nowMonth && h.status !== "rejected");

  useEffectPV(() => {
    _supabase.from("profiles").select("id,username,name,status")
      .eq("team_leader_id", currentUser.id)
      .then(({ data }) => setTeam(data || []));
  }, [currentUser.id]);

  useEffectPV(() => {
    setLoadingH(true);
    _supabase.from("payment_slips")
      .select("*")
      .eq("team_leader_id", currentUser.id)
      .order("submitted_at", { ascending: false })
      .then(({ data }) => { setHistory(data || []); setLoadingH(false); });
  }, [currentUser.id, refreshKey]);

  const fmtMonth = (ym) => {
    if (!ym) return "—";
    const [y, m] = ym.split("-");
    const thMonths = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    return `${thMonths[+m - 1]} ${+y + 543}`;
  };

  const activeTeam = team.filter(u => u.status === "active");

  return (
    <div className="fade-up" style={{ maxWidth: 800, margin: "0 auto", padding: "0 0 48px" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        .pv-tabs { display:flex; gap:0; border-bottom:1px solid var(--line); margin-bottom:24px; }
        .pv-tab { padding:10px 20px; font-size:14px; font-weight:600; color:var(--t-mute); border:none; background:none; cursor:pointer; border-bottom:2.5px solid transparent; transition:color 0.15s,border-color 0.15s; }
        .pv-tab.on { color:var(--pea-purple-600); border-bottom-color:var(--pea-purple-500); }
        .pv-drop { border:2px dashed var(--line); border-radius:16px; padding:40px 24px; text-align:center; cursor:pointer; transition:border-color 0.2s,background 0.2s; }
        .pv-drop:hover,.pv-drop.drag { border-color:var(--pea-purple-400); background:rgba(139,63,196,0.04); }
        .pv-ocr-row { display:flex; align-items:baseline; gap:14px; padding:9px 0; border-bottom:1px solid var(--line); }
        .pv-ocr-row:last-child { border-bottom:none; }
        .pv-ocr-label { width:100px; flex-shrink:0; font-size:11px; font-weight:700; color:var(--t-mute); text-transform:uppercase; letter-spacing:0.04em; }
        .pv-ocr-val { font-size:14px; font-family:'IBM Plex Mono',monospace; color:var(--ink); word-break:break-all; }
        .pv-hist-row { display:grid; grid-template-columns:110px 1fr 110px 90px 90px; gap:12px; align-items:center; padding:12px 16px; border-bottom:1px solid var(--line); cursor:pointer; transition:background 0.12s; }
        .pv-hist-row:hover { background:var(--surface2); }
        .pv-hist-head { display:grid; grid-template-columns:110px 1fr 110px 90px 90px; gap:12px; padding:8px 16px; background:var(--surface2); border-radius:10px 10px 0 0; }
        @media (max-width:640px) {
          .pv-hist-row,.pv-hist-head { grid-template-columns:80px 1fr 80px; }
          .pv-hist-row>*:nth-child(4),.pv-hist-row>*:nth-child(5),
          .pv-hist-head>*:nth-child(4),.pv-hist-head>*:nth-child(5) { display:none; }
        }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 24 }}>
        <div className="text-xl fw-8">{s("ชำระเงินประจำเดือน","Monthly Payment")}</div>
        <div className="t-mute text-sm" style={{ marginTop: 3 }}>
          {s("อัพโหลดสลิปการโอนเงินเพื่อต่ออายุการใช้งานทีมของคุณ","Upload a transfer slip to renew access for your team")}
        </div>
      </div>

      {/* ── Team summary card ── */}
      <div className="card card-elev" style={{ marginBottom: 24, display:"flex", gap:20, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:160 }}>
          <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg,#6b2c91,#8b3fc4)", display:"grid", placeItems:"center", color:"white", flexShrink:0 }}>
            <Icon name="users" size={22} />
          </div>
          <div>
            <div className="fw-7 text-lg">{activeTeam.length} {s("คน","members")}</div>
            <div className="t-mute text-xs">{s("สมาชิกที่ใช้งานอยู่","Active members in your team")}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:160 }}>
          <div style={{ width:46, height:46, borderRadius:14, background: paidThisMonth ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", display:"grid", placeItems:"center", color: paidThisMonth ? "#10b981" : "#d97706", flexShrink:0 }}>
            <Icon name={paidThisMonth ? "check" : "warning"} size={22} />
          </div>
          <div>
            <div className="fw-7 text-lg" style={{ color: paidThisMonth ? "#10b981" : "#d97706" }}>
              {paidThisMonth
                ? (paidThisMonth.status === "approved" ? s("ชำระแล้ว","Paid") : s("รอตรวจสอบ","Pending Review"))
                : s("ยังไม่ชำระ","Not Paid")}
            </div>
            <div className="t-mute text-xs">{fmtMonth(nowMonth)}</div>
          </div>
        </div>
        {team.length > 0 && (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {team.slice(0, 5).map(u => (
              <div key={u.id} title={u.name} style={{
                width:32, height:32, borderRadius:"50%",
                background: u.status === "active" ? "linear-gradient(135deg,#6b2c91,#f47b20)" : "var(--line)",
                color:"white", display:"grid", placeItems:"center",
                fontWeight:800, fontSize:13,
              }}>{u.name?.[0] || u.username[0]}</div>
            ))}
            {team.length > 5 && (
              <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--surface2)", border:"1px solid var(--line)", display:"grid", placeItems:"center", fontSize:11, fontWeight:700, color:"var(--t-mute)" }}>
                +{team.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="pv-tabs">
        <button className={"pv-tab" + (activeTab === "upload" ? " on" : "")} onClick={() => setActiveTab("upload")}>
          <Icon name="upload" size={13} style={{ marginRight:6 }} />{s("อัพโหลดสลิป","Upload Slip")}
        </button>
        <button className={"pv-tab" + (activeTab === "history" ? " on" : "")} onClick={() => setActiveTab("history")}>
          <Icon name="history" size={13} style={{ marginRight:6 }} />{s("ประวัติการชำระ","Payment History")}
          {history.filter(h => h.status === "pending").length > 0 && (
            <span style={{ marginLeft:6, background:"#f59e0b", color:"white", borderRadius:99, padding:"1px 7px", fontSize:10, fontWeight:700 }}>
              {history.filter(h => h.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "upload" && (
        <PaymentUploadTab
          currentUser={currentUser}
          paidThisMonth={paidThisMonth}
          fmtMonth={fmtMonth}
          toast={toast}
          s={s}
          onSuccess={() => { setRefreshKey(k => k + 1); setActiveTab("history"); }}
          addAudit={addAudit}
        />
      )}
      {activeTab === "history" && (
        <PaymentHistoryTab
          history={history}
          loading={loadingH}
          fmtMonth={fmtMonth}
          onView={setViewSlip}
          s={s}
        />
      )}

      {/* ── Slip viewer modal ── */}
      <Modal
        open={!!viewSlip}
        onClose={() => setViewSlip(null)}
        title={viewSlip ? `${s("สลิป","Slip")} · ${fmtMonth(viewSlip.payment_month)}` : ""}
        width={600}
        footer={<button className="btn btn-outline" onClick={() => setViewSlip(null)}>{s("ปิด","Close")}</button>}
      >
        {viewSlip && (
          <div>
            {viewSlip.slip_url && (
              <img src={viewSlip.slip_url} alt="slip" style={{ width:"100%", borderRadius:12, marginBottom:16, maxHeight:400, objectFit:"contain", background:"var(--surface2)" }} />
            )}
            <div style={{ background:"var(--surface2)", borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
              {[
                [s("เดือน","Month"),    fmtMonth(viewSlip.payment_month)],
                [s("จำนวนเงิน","Amount"), viewSlip.amount_baht ? `฿${Number(viewSlip.amount_baht).toLocaleString()}` : "—"],
                [s("เลขอ้างอิง","Ref"), viewSlip.ref_number || "—"],
                [s("สถานะ","Status"),    {pending:s("รอตรวจสอบ","Pending"),approved:s("อนุมัติแล้ว","Approved"),rejected:s("ปฏิเสธ","Rejected")}[viewSlip.status]],
                [s("ส่งเมื่อ","Submitted"), viewSlip.submitted_at?.slice(0,16).replace("T"," ")],
              ].map(([k, v]) => (
                <div key={k} className="pv-ocr-row">
                  <span className="pv-ocr-label">{k}</span>
                  <span className="pv-ocr-val">{v}</span>
                </div>
              ))}
            </div>
            {viewSlip.notes && (
              <div style={{ padding:"10px 14px", background: viewSlip.status === "rejected" ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", borderRadius:10, border:`1px solid ${viewSlip.status === "rejected" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`, fontSize:13, color:"var(--ink)" }}>
                <span className="fw-6">{s("หมายเหตุจากผู้ดูแล: ","Admin note: ")}</span>{viewSlip.notes}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Upload tab ── */
function PaymentUploadTab({ currentUser, paidThisMonth, fmtMonth, toast, s, onSuccess, addAudit }) {
  const nowMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth]         = useStatePV(nowMonth);
  const [file, setFile]           = useStatePV(null);
  const [preview, setPreview]     = useStatePV(null);
  const [drag, setDrag]           = useStatePV(false);
  const [extracting, setExtracting] = useStatePV(false);
  const [ocr, setOcr]             = useStatePV(null);
  const [amount, setAmount]       = useStatePV("");
  const [refNum, setRefNum]       = useStatePV("");
  const [submitting, setSubmitting] = useStatePV(false);
  const fileRef = useRefPV(null);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast?.(s("กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP)","Please select an image file (JPG, PNG, WebP)"), "error"); return; }
    if (f.size > 10 * 1024 * 1024) { toast?.(s("ไฟล์ขนาดใหญ่เกิน 10MB","File exceeds 10MB"), "error"); return; }
    setFile(f);
    setOcr(null);
    setAmount("");
    setRefNum("");
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const readSlip = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data, error } = await _supabase.functions.invoke("read-slip", {
        body: { image_base64: base64, mime_type: file.type },
      });
      if (error) throw new Error(error.message);
      const d = data?.data || {};
      setOcr(d);
      if (d.amount)    setAmount(String(d.amount));
      if (d.reference) setRefNum(d.reference);
      toast?.(s("อ่านสลิปสำเร็จ","Slip read successfully"), "success");
    } catch (err) {
      toast?.(s("อ่านสลิปไม่สำเร็จ — กรอกข้อมูลด้วยตนเอง","Could not read slip — please fill in manually"), "error");
    }
    setExtracting(false);
  };

  const submit = async () => {
    if (!file)  { toast?.(s("กรุณาเลือกไฟล์สลิป","Please select a slip image"), "error"); return; }
    if (!amount || isNaN(+amount) || +amount <= 0) { toast?.(s("กรุณาใส่จำนวนเงินที่ถูกต้อง","Please enter a valid amount"), "error"); return; }
    setSubmitting(true);

    const ext  = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${currentUser.id}/${month}.${ext}`;

    const { error: upErr } = await _supabase.storage.from("payment-slips").upload(path, file, { upsert: true });
    if (upErr) { toast?.(s("อัพโหลดไฟล์ไม่สำเร็จ: ","Upload failed: ") + upErr.message, "error"); setSubmitting(false); return; }

    const { data: { publicUrl } } = _supabase.storage.from("payment-slips").getPublicUrl(path);

    const { error: dbErr } = await _supabase.from("payment_slips").upsert({
      team_leader_id: currentUser.id,
      payment_month:  month,
      amount_baht:    +amount,
      ref_number:     refNum || null,
      slip_url:       publicUrl,
      ocr_data:       ocr || null,
      status:         "pending",
      notes:          null,
      reviewed_by:    null,
      reviewed_at:    null,
    }, { onConflict: "team_leader_id,payment_month" });

    if (dbErr) { toast?.(s("บันทึกข้อมูลไม่สำเร็จ: ","Database error: ") + dbErr.message, "error"); setSubmitting(false); return; }

    addAudit?.({ user: currentUser.username, action: "submit_payment", target: month, detail: `ส่งสลิปชำระเงินเดือน ${month} ฿${amount}` });
    toast?.(s(`ส่งสลิปเดือน ${fmtMonth(month)} สำเร็จ รอผู้ดูแลตรวจสอบ`,`Slip for ${month} submitted — awaiting review`), "success");
    onSuccess();
    setSubmitting(false);
  };

  return (
    <div>
      {paidThisMonth && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderRadius:14, marginBottom:20,
          background: paidThisMonth.status === "approved" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
          border: `1px solid ${paidThisMonth.status === "approved" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}` }}>
          <Icon name={paidThisMonth.status === "approved" ? "check" : "warning"} size={18}
            style={{ color: paidThisMonth.status === "approved" ? "#10b981" : "#d97706", flexShrink:0 }} />
          <div>
            <div className="fw-7" style={{ fontSize:14, color: paidThisMonth.status === "approved" ? "#10b981" : "#d97706" }}>
              {paidThisMonth.status === "approved"
                ? s("ชำระเงินเดือนนี้แล้ว","This month is already paid")
                : s("สลิปเดือนนี้อยู่ระหว่างตรวจสอบ","Slip for this month is pending review")}
            </div>
            <div className="t-mute text-xs" style={{ marginTop:2 }}>
              {s("คุณสามารถส่งสลิปใหม่เพื่อแทนที่ได้","You can submit a new slip to replace it")}
            </div>
          </div>
        </div>
      )}

      {/* Month picker */}
      <div className="card card-elev" style={{ marginBottom:16, padding:"16px 20px" }}>
        <div className="field" style={{ maxWidth:220, margin:0 }}>
          <label className="field-label">{s("เดือนที่ชำระ","Payment month")}</label>
          <input className="input" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width:"100%" }} />
        </div>
      </div>

      {/* Drop zone */}
      <div className="card card-elev" style={{ padding: "20px" }}>
        <div
          className={"pv-drop" + (drag ? " drag" : "")}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        >
          <Icon name="upload" size={32} style={{ color:"var(--pea-purple-400)", marginBottom:10 }} />
          <div className="fw-6" style={{ fontSize:15 }}>{s("วางไฟล์ที่นี่ หรือคลิกเพื่อเลือก","Drop file here or click to select")}</div>
          <div className="t-mute text-sm" style={{ marginTop:4 }}>{s("รองรับ JPG, PNG, WebP · สูงสุด 10MB","JPG, PNG, WebP · max 10MB")}</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => handleFile(e.target.files[0])} />
        </div>

        {preview && (
          <div style={{ marginTop:20 }}>
            {/* Preview */}
            <div style={{ position:"relative", borderRadius:12, overflow:"hidden", background:"var(--surface2)", marginBottom:16, lineHeight:0 }}>
              <img src={preview} alt="slip preview" style={{ width:"100%", maxHeight:360, objectFit:"contain", display:"block" }} />
              <button
                onClick={() => { setFile(null); setPreview(null); setOcr(null); setAmount(""); setRefNum(""); }}
                style={{ position:"absolute", top:8, right:8, width:30, height:30, borderRadius:"50%", background:"rgba(0,0,0,0.55)", color:"white", border:"none", cursor:"pointer", display:"grid", placeItems:"center" }}>
                <Icon name="close" size={14} />
              </button>
            </div>

            {/* Read slip button */}
            <button
              className="btn btn-outline"
              style={{ width:"100%", marginBottom:16, gap:8, height:44 }}
              onClick={readSlip}
              disabled={extracting}
            >
              {extracting
                ? <><span style={{ width:14, height:14, border:"2px solid var(--pea-purple-400)", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin 0.8s linear infinite" }} />{s("กำลังอ่านสลิป…","Reading slip…")}</>
                : <><Icon name="search" size={14} />{s("อ่านสลิปอัตโนมัติ","Auto-read slip")}</>}
            </button>

            {/* OCR result */}
            {ocr && (
              <div style={{ background:"var(--surface2)", borderRadius:12, padding:"12px 16px", marginBottom:16 }}>
                <div className="fw-7 text-xs" style={{ marginBottom:8, color:"var(--pea-purple-600)", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  {s("ข้อมูลที่อ่านได้จากสลิป","Extracted from slip")}
                </div>
                {[
                  [s("จำนวนเงิน","Amount"), ocr.amount != null ? `฿${Number(ocr.amount).toLocaleString()}` : null],
                  [s("เลขอ้างอิง","Reference"), ocr.reference],
                  [s("วันที่","Date"),  ocr.date && ocr.time ? `${ocr.date} ${ocr.time}` : ocr.date],
                  [s("ธนาคารต้นทาง","From bank"), ocr.from_bank],
                  [s("ธนาคารปลายทาง","To bank"), ocr.to_bank],
                  [s("บัญชีปลายทาง","To account"), ocr.to_account],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="pv-ocr-row">
                    <span className="pv-ocr-label">{k}</span>
                    <span className="pv-ocr-val">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Manual fields */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
              <div className="field">
                <label className="field-label">{s("จำนวนเงิน (บาท) *","Amount (THB) *")}</label>
                <input className="input" type="number" min="0" step="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="1500.00" />
              </div>
              <div className="field">
                <label className="field-label">{s("เลขอ้างอิง","Reference number")}</label>
                <input className="input" value={refNum} onChange={e => setRefNum(e.target.value)}
                  placeholder={s("ถ้ามี","Optional")} />
              </div>
            </div>

            <button className="btn btn-primary" style={{ width:"100%", height:48, fontSize:15 }} onClick={submit} disabled={submitting}>
              {submitting
                ? <><span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.5)", borderTopColor:"white", borderRadius:"50%", display:"inline-block", animation:"spin 0.8s linear infinite" }} />{s("กำลังส่ง…","Submitting…")}</>
                : <><Icon name="upload" size={15} />{s("ส่งสลิปการชำระเงิน","Submit Payment Slip")}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── History tab ── */
function PaymentHistoryTab({ history, loading, fmtMonth, onView, s }) {
  const statusBadge = (st) => {
    if (st === "approved") return <span className="badge badge-green">{s("อนุมัติแล้ว","Approved")}</span>;
    if (st === "rejected") return <span className="badge badge-red">{s("ปฏิเสธ","Rejected")}</span>;
    return <span className="badge badge-amber">{s("รอตรวจสอบ","Pending")}</span>;
  };

  if (loading) return (
    <div style={{ textAlign:"center", padding:48, color:"var(--t-mute)" }}>
      <Icon name="search" size={28} style={{ marginBottom:8, opacity:0.4 }} />
      <div>{s("กำลังโหลด…","Loading…")}</div>
    </div>
  );

  if (!history.length) return (
    <div style={{ textAlign:"center", padding:48, color:"var(--t-mute)" }}>
      <Icon name="history" size={36} style={{ marginBottom:10, opacity:0.25 }} />
      <div className="fw-6">{s("ยังไม่มีประวัติการชำระเงิน","No payment history yet")}</div>
      <div className="text-sm" style={{ marginTop:4 }}>{s("อัพโหลดสลิปแรกของคุณในแท็บ 'อัพโหลดสลิป'","Upload your first slip in the 'Upload Slip' tab")}</div>
    </div>
  );

  return (
    <div className="card card-elev" style={{ overflow:"hidden", padding:0 }}>
      <div className="pv-hist-head">
        {[s("เดือน","Month"), s("จำนวนเงิน","Amount"), s("สถานะ","Status"), s("ส่งเมื่อ","Submitted"), s("เลขอ้างอิง","Reference")].map(h => (
          <div key={h} className="text-xs fw-7 t-mute" style={{ textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</div>
        ))}
      </div>
      {history.map((h, i) => (
        <div key={h.id} className="pv-hist-row" style={{ borderBottom: i < history.length-1 ? undefined : "none" }} onClick={() => onView(h)}>
          <div className="fw-6">{fmtMonth(h.payment_month)}</div>
          <div className="mono fw-6">{h.amount_baht ? `฿${Number(h.amount_baht).toLocaleString()}` : "—"}</div>
          <div>{statusBadge(h.status)}</div>
          <div className="text-xs t-mute">{h.submitted_at?.slice(0,10)}</div>
          <div className="text-xs mono t-mute" style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.ref_number || "—"}</div>
        </div>
      ))}
    </div>
  );
}
