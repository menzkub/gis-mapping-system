/* global React */
/* ============================================================
   Language / i18n — Thai (th) & English (en)
   ============================================================ */
const {
  useState:      useStateLang,
  useEffect:     useEffectLang,
  useContext:    useContextLang,
  createContext: createContextLang,
} = React;

const LangCtx = createContextLang(null);
const useLang = () => useContextLang(LangCtx);

const TRANSLATIONS = {
  th: {
    // ── Common ─────────────────────────────────────────────
    cancel: "ยกเลิก", confirm: "ยืนยัน", save: "บันทึก",
    close: "ปิด", edit: "แก้ไข", delete: "ลบ",
    caution: "ระวัง", allUsers: "ทุก user",

    // ── Navigation ─────────────────────────────────────────
    navSearch: "ค้นหา", navProfile: "บัญชีฉัน", navAdmin: "Admin", navGuide: "คู่มือการใช้งาน", navChangelog: "อัปเดต",
    navPayment: "ชำระเงิน",
    baseMapStreet: "ถนน", baseMapSatellite: "ดาวเทียม",

    // ── Admin payments tab ──────────────────────────────────
    admPayments: "การชำระเงิน",

    // ── Topbar ─────────────────────────────────────────────
    todayLabel: "วันนี้ •", greeting: "สวัสดี",
    refreshData: "รีเฟรชข้อมูล", refreshing: "กำลังรีเฟรช…",
    refreshDone: "✓ อัปเดตแล้ว", refreshError: "✕ เกิดข้อผิดพลาด",
    notifications: "การแจ้งเตือน", logout: "ออกจากระบบ",
    switchLang: "Switch to English",
    themeDark: "โหมดมืด", themeLight: "โหมดสว่าง",
    mapStreet: "Street", mapSatellite: "Satellite",

    // ── Deploy status popup ────────────────────────────────
    deployChecking: "กำลังตรวจสอบ…", deployCurrent: "ระบบเป็นปัจจุบัน", deployPending: "มีการอัปเดตรอ Deploy",
    deployRunning: "กำลังรันบนเว็บ", deployLatestGH: "ล่าสุดบน GitHub",
    deployAwait: "รอ Deploy", deployRecheck: "ตรวจสอบอีกครั้ง", deployLoadNew: "โหลดเวอร์ชันใหม่",
    deployNoVersion: "ไม่พบข้อมูล version.json", deployNoGH: "ไม่สามารถเชื่อมต่อ GitHub API",
    deployHintPending: "GitHub Pages ใช้เวลา 1–3 นาทีหลัง push — กด ตรวจสอบอีกครั้ง เมื่อ deploy เสร็จ",
    deployHintSync: "กด โหลดเวอร์ชันใหม่ เพื่อดึงไฟล์ล่าสุดจาก GitHub Pages (bypass cache)",
    deployLabel: "Deploy",
    deployStatusTitle: "Deployment Status",
    deployNoData: "ไม่พบข้อมูล",
    deployFooterNote: "GitHub Pages มักใช้เวลา 1–3 นาทีหลัง push · repo: menzkub/gis-mapping-system",

    // ── Changelog view ─────────────────────────────────────
    clTitle: "ประวัติการปรับปรุง UX/UI",
    clSubtitle: "บันทึกการพัฒนาและปรับปรุงระบบทั้งหมด — อัปเดตโดย Claude AI",
    clLastUpdate: "อัปเดตล่าสุด:",
    clVersions: "เวอร์ชัน",
    clNewFeatures: "ฟีเจอร์ใหม่",
    clLatest: "ล่าสุด",
    clFooter: "ประวัตินี้บันทึกการพัฒนาโดย Claude AI — หากพบปัญหาหรือต้องการปรับปรุงเพิ่มเติม กรุณาติดต่อนักพัฒนาระบบ",
    catNew: "ใหม่", catFix: "แก้ไข", catPerf: "ประสิทธิภาพ",
    devBy: "พัฒนาโดย", devFooter: "พัฒนาเพื่อใช้งานภายใน การไฟฟ้าส่วนภูมิภาค (PEA)",

    // ── Notification panel ─────────────────────────────────
    pendingApproval: "บัญชีรอการอนุมัติ", recentActivity: "กิจกรรมล่าสุด",
    noNotifications: "ไม่มีการแจ้งเตือน", andMore: "และอีก", people: "คน…",

    // ── Activity labels ────────────────────────────────────
    actLogin: "เข้าสู่ระบบ", actLogout: "ออกจากระบบ",
    actChangePassword: "เปลี่ยนรหัสผ่าน", actSearchMeter: "ค้นหา Meter",
    actSearchTr: "ค้นหา TR", actViewMap: "ดูแผนที่",
    actCreateUser: "สร้างบัญชี", actUpdateMeter: "แก้ไข Meter", actUpdateTr: "แก้ไข TR",

    // ── Logout dialog ──────────────────────────────────────
    logoutTitle: "ออกจากระบบ", logoutMessage: "คุณต้องการออกจากระบบใช่หรือไม่?",
    logoutBtn: "ออกจากระบบ",

    // ── Search view ────────────────────────────────────────
    searchDataLabel: "ค้นหาข้อมูล",
    peaMeter: "PEA มิเตอร์", peaTr: "PEA หม้อแปลง",
    searchPeaMeter: "ค้นหา PEA มิเตอร์", searchPeaTr: "ค้นหา PEA หม้อแปลง",
    totalItems: "รายการทั้งหมด", foundItems: "รายการ",
    searching: "กำลังค้นหา…", filterLabel: "ตัวกรอง", clearFilter: "ล้างตัวกรอง",
    splitView: "Split", mapView: "แผนที่", exportLabel: "Export",
    exportDisabled: "ขณะนี้ระบบปิดการ Export ข้อมูลชั่วคราว — หากต้องการข้อมูล กรุณาติดต่อ Admin",
    phMeter: "พิมพ์ TAG, PEANO, ACCOUNTNUM, Feeder…",
    phTr: "พิมพ์ TAG, PEANO หม้อแปลง, สถานที่, Feeder…",
    typeToSearch: "พิมพ์รหัสเพื่อค้นหา",
    searchFromMeter: "ค้นหาจาก {n} มิเตอร์ · พิมพ์ TAG, PEANO, ACCOUNTNUM หรือ Feeder",
    searchFromTr: "ค้นหาจาก {n} หม้อแปลง · พิมพ์ TAG, PEANO, สถานที่ หรือ Feeder",
    useFilter: "หรือเลือกตัวกรองด้านบนเพื่อดูข้อมูลทั้งกลุ่ม",
    notFound: "ไม่พบข้อมูลที่ค้นหา",
    notFoundHint: "ลองพิมพ์รหัสบางส่วน หรือเปลี่ยน/ล้างตัวกรอง",
    cappedNote: "แสดง {n} รายการแรก — พิมพ์คำค้นหาเพิ่มเติมเพื่อจำกัดผลลัพธ์",
    navigateBtn: "นำทาง", copiedCoords: "คัดลอกแล้ว!",
    fFeeder: "Feeder", fOwner: "เจ้าของ", fCode: "CODE",
    fPhase: "ระบบเฟส", fVoltage: "แรงดัน",
    fMinKva: "kVA ต่ำสุด", fMaxKva: "kVA สูงสุด", fAll: "ทั้งหมด",
    capping500: "แสดง {n} รายการแรก",

    // ── Navigation panel ───────────────────────────────────
    navSystem: "ระบบนำทาง", originLabel: "จุดเริ่มต้น", destLabel: "ปลายทาง",
    currentPos: "ตำแหน่งปัจจุบัน", unknownPos: "ไม่ทราบตำแหน่ง — กด ลองอีกครั้ง",
    findingGPS: "กำลังค้นหาตำแหน่ง…", distanceLabel: "ระยะทาง",
    etaLabel: "เวลาโดยประมาณ (รถยนต์)",
    gpsOkMsg: "ได้รับตำแหน่ง GPS แล้ว — ระยะทางคำนวณจากตำแหน่งปัจจุบัน",
    gpsDeniedMsg: "ไม่สามารถรับ GPS ได้ — กรุณาอนุญาตการเข้าถึงตำแหน่ง",
    retryBtn: "ลองอีกครั้ง", updatePosBtn: "อัปเดตตำแหน่ง", googleMapsBtn: "Google Maps", appleMapsBtn: "Apple Maps",
    minutesUnit: "นาที", hoursUnit: "ชม.", kmUnit: "กม.",

    // ── Export dialog ──────────────────────────────────────
    confirmExportTitle: "ยืนยันการส่งออกข้อมูล",
    itemsToExport: "รายการที่จะส่งออก", exportAsCSV: "บันทึกเป็นไฟล์ CSV",
    exportCap500: "ผลลัพธ์ถูกจำกัดที่ 500 รายการ — พิมพ์คำค้นหาเพิ่มเพื่อลดจำนวน",

    // ── Profile view ───────────────────────────────────────
    myAccount: "บัญชีของฉัน", personalInfo: "ข้อมูลส่วนตัว",
    tabInfo: "ข้อมูลบัญชี", tabPassword: "รหัสผ่าน",
    tabActivity: "การใช้งาน", tabSearch: "การค้นหา",
    fFullName: "ชื่อ-นามสกุล", fUsername: "Username", fEmail: "อีเมล",
    fRole: "สิทธิ์การใช้งาน", fStatus: "สถานะบัญชี",
    fLastLogin: "เข้าสู่ระบบล่าสุด", f2FA: "2FA (TOTP)",
    statusActive: "✅ ใช้งานได้",
    changePwTitle: "เปลี่ยนรหัสผ่าน",
    changePwSubtitle: "รหัสผ่านใหม่ต้องผ่านเกณฑ์ความปลอดภัยทั้งหมด",
    currentPassword: "รหัสผ่านเดิม", currentPwPlaceholder: "กรอกรหัสผ่านเดิม",
    currentPwRequired: "กรุณากรอกรหัสผ่านเดิม",
    newPassword: "รหัสผ่านใหม่", confirmPassword: "ยืนยันรหัสผ่านใหม่",
    pwPlaceholder: "อย่างน้อย 8 ตัวอักษร", confirmPlaceholder: "กรอกรหัสผ่านอีกครั้ง",
    savePasswordBtn: "บันทึกรหัสผ่านใหม่", saving: "กำลังบันทึก…",
    pwSuccessMsg: "เปลี่ยนรหัสผ่านสำเร็จแล้ว",
    pwMismatch: "✕ รหัสผ่านไม่ตรงกัน", pwMatch: "✓ รหัสผ่านตรงกัน",
    pwCriteriaErr: "รหัสผ่านไม่ตรงตามเกณฑ์ความปลอดภัย",
    pwNotMatchErr: "รหัสผ่านและการยืนยันไม่ตรงกัน",
    pw8chars: "ขั้นต่ำ 8 ตัวอักษร", pwUpper: "ตัวพิมพ์ใหญ่ (A-Z)",
    pwLower: "ตัวพิมพ์เล็ก (a-z)", pwNumber: "ตัวเลข (0-9)",
    pwSpecial: "อักขระพิเศษ (!@#$...)",
    changePwConfirmMsg: "คุณต้องการบันทึกรหัสผ่านใหม่ใช่หรือไม่? รหัสผ่านเดิมจะถูกยกเลิกทันที",
    changePwConfirmBtn: "บันทึกรหัสผ่านใหม่",
    pwVeryWeak: "อ่อนมาก", pwWeak: "อ่อน", pwFair: "ปานกลาง",
    pwStrong: "แข็งแกร่ง", pwVeryStrong: "แข็งแกร่งมาก",
    actHistoryTitle: "ประวัติการใช้งาน",
    actHistorySubtitle: "Login · Logout · เปลี่ยนรหัสผ่าน · 2FA",
    noHistory: "ยังไม่มีประวัติ",
    searchHistoryTitle: "ประวัติการค้นหา",
    searchHistorySubtitle: "ค้นหา Meter · TR · ดูแผนที่",
    noSearchHistory: "ยังไม่มีประวัติการค้นหา",
    colTime: "เวลา", colUser: "ผู้ใช้", colAction: "การกระทำ",
    colDetail: "รายละเอียด", colDevice: "อุปกรณ์",
    colType: "ประเภท", colQuery: "คีย์ค้นหา",

    // ── Admin ──────────────────────────────────────────────
    adminEyebrow: "Admin", adminDefault: "จัดการระบบ",
    admDashboard: "Dashboard", admUsers: "ผู้ใช้งาน",
    admMeters: "PEA มิเตอร์", admTrs: "PEA หม้อแปลง",
    admMap: "แผนที่ภาพรวม",
    admImport: "นำเข้าข้อมูล", admAudit: "Audit Log", admSettings: "ตั้งค่า",
    admGuide: "คู่มือการใช้งาน", admMobGuide: "คู่มือ",
    admDev: "สำหรับนักพัฒนา", admMobDev: "Dev",
    admPowered: "ขับเคลื่อนโดย", admMobPowered: "Tech Stack",
    admSecurity: "ความปลอดภัย", admMobSecurity: "ความปลอดภัย",
    admMobMeters: "มิเตอร์", admMobTrs: "หม้อแปลง",
    admMobMap: "แผนที่",
    admMobImport: "นำเข้า", admMobAudit: "Audit",
    mapLoadingData: "กำลังโหลดข้อมูลแผนที่…", mapLoadFail: "โหลดข้อมูลไม่สำเร็จ",
    mapSampleNote: "* แสดงมิเตอร์ตัวอย่าง {n} จาก {total} รายการ — ซูมเข้าเพื่อดูรายละเอียด",
    corrReportBtn: "แจ้งแก้ไขพิกัด", corrReviewBtn: "คำขอแก้ไข",
    corrOldCoord: "พิกัดปัจจุบัน", corrNewCoord: "พิกัดใหม่ที่ถูกต้อง",
    corrNote: "หมายเหตุ (ระบุสาเหตุ)", corrDragHint: "ลากหมุดสีเขียว หรือพิมพ์พิกัดโดยตรง",
    corrSubmit: "ส่งคำขอแก้ไข", corrNoPending: "ไม่มีรายการรอการอนุมัติ",
    corrPending: "รออนุมัติ", corrApprove: "อนุมัติ", corrReject: "ปฏิเสธ",
    corrSubmittedBy: "ส่งโดย", corrSubmitOk: "ส่งคำขอแก้ไขพิกัดแล้ว — รอแอดมินอนุมัติ",
    corrApprovedMsg: "อนุมัติแก้ไขพิกัดแล้ว",
    dbMeters: "มิเตอร์ทั้งหมด", dbTrs: "หม้อแปลง ทั้งหมด",
    dbKva: "กำลัง (kVA)", dbUsers: "ผู้ใช้งาน",
    dbDist: "การกระจาย", dbByFeeder: "มิเตอร์ตาม Feeder",
    dbTop: "Top", dbNoFeeder: "ไม่มีข้อมูล Feeder", dbItems: "รายการ",
    dbByType: "สัดส่วนตามประเภท",
    dbPeaMeter: "PEA Meter", dbCustMeter: "Cust. Meter",
    dbPeaTr: "PEA TR", dbCustTr: "Cust. TR",
    dbRecentAct: "กิจกรรมล่าสุด", dbSystem: "ระบบ",
    dbNoActivity: "ไม่มีกิจกรรมล่าสุด",

    // ── Auth ───────────────────────────────────────────────
    authWelcome: "ยินดีต้อนรับกลับ",
    authLoginDesc: "กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ",
    authSignupTitle: "สร้างบัญชีใหม่",
    authSignupDesc: "กรอกข้อมูลเพื่อขออนุมัติเข้าใช้งาน",
    authTabLogin: "เข้าสู่ระบบ", authTabSignup: "สมัครสมาชิก",
    authEmail: "อีเมล", authPassword: "รหัสผ่าน",
    authForgotPw: "ลืมรหัสผ่าน?",
    authLoginBtn: "เข้าสู่ระบบ", authLoggingIn: "กำลังเข้าสู่ระบบ…",
    authFullName: "ชื่อ-นามสกุล", authUsernameLabel: "ชื่อผู้ใช้ (username)",
    authRegisterBtn: "ลงทะเบียน", authRegistering: "กำลังลงทะเบียน…",
    authConfirmPw: "ยืนยันรหัสผ่าน",
    authFillAll: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
    authPwCriteria: "รหัสผ่านไม่ตรงตามเกณฑ์ความปลอดภัย กรุณาตรวจสอบรายการด้านล่าง",
    authPwMismatch: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน",
    authResetTitle: "รีเซ็ตรหัสผ่าน",
    authResetDesc: "กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงค์รีเซ็ตให้",
    authSendReset: "ส่งลิงค์รีเซ็ต", authSending: "กำลังส่ง…",
    authBackToLogin: "กลับหน้าเข้าสู่ระบบ",
    authEmailSent: "ส่งอีเมลแล้ว!",
    authEmailSentDesc: "ลิงค์รีเซ็ตรหัสผ่านถูกส่งไปที่",
    authCheckInbox: "กรุณาตรวจสอบกล่องจดหมาย (รวมถึงโฟลเดอร์ Spam)",
    authRequestSent: "ส่งคำขอแล้ว",
    authPendingApproval: "รอการอนุมัติจากผู้ดูแลระบบ",
    authInvalidCreds: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    authBrandTag: "ระบบค้นหา · กฟอ.ฝาง",
    authBrandTitle1: "ค้นหา", authBrandTitle2: "มิเตอร์ & หม้อแปลง", authBrandTitle3: "ครบในที่เดียว",
    authBrandDesc: "ค้นหารหัสเครื่องวัด หรือรหัสหม้อแปลง\nดูแผนที่ — Cluster · Heatmap · นำทาง",
    authCopyright: "© 2026 ระบบสารสนเทศภูมิศาสตร์ · กฟอ.ฝาง",
  },

  en: {
    // ── Common ─────────────────────────────────────────────
    cancel: "Cancel", confirm: "Confirm", save: "Save",
    close: "Close", edit: "Edit", delete: "Delete",
    caution: "Caution", allUsers: "All users",

    // ── Navigation ─────────────────────────────────────────
    navSearch: "Search", navProfile: "My Account", navAdmin: "Admin", navGuide: "User Manual", navChangelog: "Updates",
    navPayment: "Payment",
    baseMapStreet: "Street", baseMapSatellite: "Satellite",

    // ── Admin payments tab ──────────────────────────────────
    admPayments: "Payments",

    // ── Topbar ─────────────────────────────────────────────
    todayLabel: "Today •", greeting: "Hello",
    refreshData: "Refresh data", refreshing: "Refreshing…",
    refreshDone: "✓ Updated", refreshError: "✕ Error",
    notifications: "Notifications", logout: "Log out",
    switchLang: "เปลี่ยนเป็นภาษาไทย",
    themeDark: "Dark mode", themeLight: "Light mode",
    mapStreet: "Street", mapSatellite: "Satellite",

    // ── Deploy status popup ────────────────────────────────
    deployChecking: "Checking…", deployCurrent: "Up to date", deployPending: "Update awaiting deploy",
    deployRunning: "Running on web", deployLatestGH: "Latest on GitHub",
    deployAwait: "Awaiting Deploy", deployRecheck: "Re-check", deployLoadNew: "Load New Version",
    deployNoVersion: "version.json not found", deployNoGH: "Cannot connect to GitHub API",
    deployHintPending: "GitHub Pages takes 1–3 min after push — press Re-check when done",
    deployHintSync: "Press Load New Version to get latest files from GitHub Pages (bypass cache)",
    deployLabel: "Deploy",
    deployStatusTitle: "Deployment Status",
    deployNoData: "No data found",
    deployFooterNote: "GitHub Pages takes 1–3 min after push · repo: menzkub/gis-mapping-system",

    // ── Changelog view ─────────────────────────────────────
    clTitle: "UX/UI Improvement History",
    clSubtitle: "Full development and improvement records — updated by Claude AI",
    clLastUpdate: "Last updated:",
    clVersions: "Versions",
    clNewFeatures: "New Features",
    clLatest: "Latest",
    clFooter: "This history is maintained by Claude AI — for issues or improvements, contact the system developer",
    catNew: "New", catFix: "Fix", catPerf: "Performance",
    devBy: "Developed by", devFooter: "Built for internal use — Provincial Electricity Authority (PEA)",

    // ── Notification panel ─────────────────────────────────
    pendingApproval: "accounts pending approval", recentActivity: "Recent Activity",
    noNotifications: "No notifications", andMore: "and", people: "more…",

    // ── Activity labels ────────────────────────────────────
    actLogin: "Login", actLogout: "Logout",
    actChangePassword: "Change Password", actSearchMeter: "Search Meter",
    actSearchTr: "Search TR", actViewMap: "View Map",
    actCreateUser: "Create User", actUpdateMeter: "Update Meter", actUpdateTr: "Update TR",

    // ── Logout dialog ──────────────────────────────────────
    logoutTitle: "Log out", logoutMessage: "Are you sure you want to log out?",
    logoutBtn: "Log out",

    // ── Search view ────────────────────────────────────────
    searchDataLabel: "Search",
    peaMeter: "PEA Meter", peaTr: "PEA Transformer",
    searchPeaMeter: "Search PEA Meter", searchPeaTr: "Search PEA TR",
    totalItems: "total items", foundItems: "items",
    searching: "Searching…", filterLabel: "Filter", clearFilter: "Clear filter",
    splitView: "Split", mapView: "Map", exportLabel: "Export",
    exportDisabled: "Data export is currently disabled — please contact an Admin if you need the data",
    phMeter: "Enter TAG, PEANO, ACCOUNTNUM, Feeder…",
    phTr: "Enter TAG, PEANO, Location, Feeder…",
    typeToSearch: "Type to search",
    searchFromMeter: "Search {n} meters · Enter TAG, PEANO, ACCOUNTNUM or Feeder",
    searchFromTr: "Search {n} transformers · Enter TAG, PEANO, Location or Feeder",
    useFilter: "Or use filters above to browse all records",
    notFound: "No results found",
    notFoundHint: "Try a partial code, or change / clear the filters",
    cappedNote: "Showing first {n} records — refine your search to narrow results",
    navigateBtn: "Navigate", copiedCoords: "Copied!",
    fFeeder: "Feeder", fOwner: "Owner", fCode: "Code",
    fPhase: "Phase", fVoltage: "Voltage",
    fMinKva: "Min kVA", fMaxKva: "Max kVA", fAll: "All",
    capping500: "Showing first {n} records",

    // ── Navigation panel ───────────────────────────────────
    navSystem: "Navigation", originLabel: "Starting Point", destLabel: "Destination",
    currentPos: "Current Location", unknownPos: "Location unknown — tap Retry",
    findingGPS: "Finding location…", distanceLabel: "Distance",
    etaLabel: "Est. Time (Driving)",
    gpsOkMsg: "GPS acquired — distance calculated from your position",
    gpsDeniedMsg: "GPS unavailable — please allow location access",
    retryBtn: "Retry", updatePosBtn: "Update Location", googleMapsBtn: "Google Maps", appleMapsBtn: "Apple Maps",
    minutesUnit: "min", hoursUnit: "hr", kmUnit: "km",

    // ── Export dialog ──────────────────────────────────────
    confirmExportTitle: "Confirm Export",
    itemsToExport: "Items to export", exportAsCSV: "Saved as CSV file",
    exportCap500: "Results capped at 500 — refine your search to reduce count",

    // ── Profile view ───────────────────────────────────────
    myAccount: "My Account", personalInfo: "Personal Info",
    tabInfo: "Account Info", tabPassword: "Password",
    tabActivity: "Activity", tabSearch: "Search History",
    fFullName: "Full Name", fUsername: "Username", fEmail: "Email",
    fRole: "Role", fStatus: "Account Status",
    fLastLogin: "Last Login", f2FA: "2FA (TOTP)",
    statusActive: "✅ Active",
    changePwTitle: "Change Password",
    changePwSubtitle: "New password must meet all security criteria",
    currentPassword: "Current Password", currentPwPlaceholder: "Enter current password",
    currentPwRequired: "Please enter your current password",
    newPassword: "New Password", confirmPassword: "Confirm New Password",
    pwPlaceholder: "At least 8 characters", confirmPlaceholder: "Re-enter new password",
    savePasswordBtn: "Save New Password", saving: "Saving…",
    pwSuccessMsg: "Password changed successfully",
    pwMismatch: "✕ Passwords do not match", pwMatch: "✓ Passwords match",
    pwCriteriaErr: "Password does not meet security criteria",
    pwNotMatchErr: "Password and confirmation do not match",
    pw8chars: "Minimum 8 characters", pwUpper: "Uppercase letter (A-Z)",
    pwLower: "Lowercase letter (a-z)", pwNumber: "Number (0-9)",
    pwSpecial: "Special character (!@#$...)",
    changePwConfirmMsg: "Are you sure you want to save the new password? Your current password will be revoked immediately.",
    changePwConfirmBtn: "Save New Password",
    pwVeryWeak: "Very Weak", pwWeak: "Weak", pwFair: "Fair",
    pwStrong: "Strong", pwVeryStrong: "Very Strong",
    actHistoryTitle: "Usage History",
    actHistorySubtitle: "Login · Logout · Password · 2FA",
    noHistory: "No history yet",
    searchHistoryTitle: "Search History",
    searchHistorySubtitle: "Meter · TR · Map searches",
    noSearchHistory: "No search history yet",
    colTime: "Time", colUser: "User", colAction: "Action",
    colDetail: "Detail", colDevice: "Device",
    colType: "Type", colQuery: "Search Query",

    // ── Admin ──────────────────────────────────────────────
    adminEyebrow: "Admin", adminDefault: "System Management",
    admDashboard: "Dashboard", admUsers: "Users",
    admMeters: "PEA Meters", admTrs: "PEA Transformers",
    admMap: "Overview Map",
    admImport: "Import Data", admAudit: "Audit Log", admSettings: "Settings",
    admGuide: "User Manual", admMobGuide: "Manual",
    admDev: "Developer Docs", admMobDev: "Dev",
    admPowered: "Powered By", admMobPowered: "Tech Stack",
    admSecurity: "Security", admMobSecurity: "Security",
    admMobMeters: "Meters", admMobTrs: "TRs",
    admMobMap: "Map",
    admMobImport: "Import", admMobAudit: "Audit",
    mapLoadingData: "Loading map data…", mapLoadFail: "Failed to load data",
    mapSampleNote: "* Showing {n} sample meters of {total} — zoom in for details",
    corrReportBtn: "Report Wrong Coordinates", corrReviewBtn: "Corrections",
    corrOldCoord: "Current Coordinates", corrNewCoord: "Corrected Coordinates",
    corrNote: "Note (describe the issue)", corrDragHint: "Drag green pin or type coordinates directly",
    corrSubmit: "Submit Correction", corrNoPending: "No pending corrections",
    corrPending: "Pending", corrApprove: "Approve", corrReject: "Reject",
    corrSubmittedBy: "Submitted by", corrSubmitOk: "Correction submitted — awaiting admin approval",
    corrApprovedMsg: "Correction approved",
    dbMeters: "Total Meters", dbTrs: "Total Transformers",
    dbKva: "Capacity (kVA)", dbUsers: "Users",
    dbDist: "Distribution", dbByFeeder: "Meters by Feeder",
    dbTop: "Top", dbNoFeeder: "No feeder data", dbItems: "items",
    dbByType: "Breakdown by Type",
    dbPeaMeter: "PEA Meter", dbCustMeter: "Cust. Meter",
    dbPeaTr: "PEA TR", dbCustTr: "Cust. TR",
    dbRecentAct: "Recent Activity", dbSystem: "System",
    dbNoActivity: "No recent activity",

    // ── Auth ───────────────────────────────────────────────
    authWelcome: "Welcome back",
    authLoginDesc: "Enter your email and password to sign in",
    authSignupTitle: "Create Account",
    authSignupDesc: "Fill in your details to request access",
    authTabLogin: "Sign In", authTabSignup: "Register",
    authEmail: "Email", authPassword: "Password",
    authForgotPw: "Forgot password?",
    authLoginBtn: "Sign In", authLoggingIn: "Signing in…",
    authFullName: "Full Name", authUsernameLabel: "Username",
    authRegisterBtn: "Register", authRegistering: "Registering…",
    authConfirmPw: "Confirm Password",
    authFillAll: "Please fill in all fields",
    authPwCriteria: "Password does not meet security criteria",
    authPwMismatch: "Password and confirmation do not match",
    authResetTitle: "Reset Password",
    authResetDesc: "Enter your registered email. We will send a reset link.",
    authSendReset: "Send Reset Link", authSending: "Sending…",
    authBackToLogin: "Back to Sign In",
    authEmailSent: "Email sent!",
    authEmailSentDesc: "Password reset link was sent to",
    authCheckInbox: "Please check your inbox (including Spam folder)",
    authRequestSent: "Request Submitted",
    authPendingApproval: "Awaiting administrator approval",
    authInvalidCreds: "Incorrect email or password",
    authBrandTag: "Search System · PEA Fang",
    authBrandTitle1: "Search", authBrandTitle2: "Meter & Transformer", authBrandTitle3: "All in one place",
    authBrandDesc: "Search meter or transformer codes\nMap view — Cluster · Heatmap · Navigate",
    authCopyright: "© 2026 GIS Information System · PEA Fang",
  },
};

function LanguageProvider({ children }) {
  const [lang, setLangRaw] = useStateLang(
    () => localStorage.getItem("pea_lang") || "th"
  );

  useEffectLang(() => {
    localStorage.setItem("pea_lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (v) => setLangRaw(typeof v === "function" ? v(lang) : v);
  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.th[key] ?? key;

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </LangCtx.Provider>
  );
}

Object.assign(window, { LanguageProvider, useLang });
