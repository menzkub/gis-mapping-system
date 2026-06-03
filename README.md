<div align="center">

<img src="logo.svg" width="80" alt="PEA GIS Logo" />

# PEA Meter & Transformer — GIS Mapping System

ระบบสารสนเทศภูมิศาสตร์สำหรับการไฟฟ้าส่วนภูมิภาค สาขาฝาง จังหวัดเชียงใหม่  
จัดการข้อมูล **มิเตอร์ไฟฟ้า** และ **หม้อแปลงไฟฟ้า** พร้อมแผนที่ Real-time

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-menzkub.github.io-8b3fc4?style=for-the-badge)](https://menzkub.github.io/gis-mapping-system/)
[![Version](https://img.shields.io/badge/Version-v3.3-059669?style=for-the-badge)](https://menzkub.github.io/gis-mapping-system/)
[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-222?style=for-the-badge&logo=github)](https://github.com/menzkub/gis-mapping-system)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com)

</div>

---

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────────────┐
│               GIS Meter & Transformer System                │
├────────────────────────┬────────────────────────────────────┤
│   👤 ผู้ใช้ทั่วไป       │   🛡️ Admin                         │
│  ─────────────────     │  ──────────────────────────────    │
│  ค้นหา Meter / TR      │  Dashboard + Donut + KVA Stats     │
│  ดูแผนที่ + นำทาง GPS  │  Privacy Consent Dashboard         │
│  ถ่ายภาพ Meter / TR    │  แผนที่ภาพรวม (55,000+ จุด)       │
│  Export CSV            │  จัดการผู้ใช้ / Meter / TR         │
│  แจ้งแก้ไขพิกัด        │  Import CSV, Audit Log             │
│  รับ Push Notification │  อนุมัติคำขอแก้ไขพิกัด             │
│  โปรไฟล์ + 2FA         │  Maintenance Mode, Dev Guide       │
│  รับทราบ Privacy Policy│  ตั้งค่า Privacy Policy            │
└────────────────────────┴────────────────────────────────────┘
```

---

## ✨ ฟีเจอร์หลัก

<details>
<summary><b>🔐 Authentication & Security</b></summary>

| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| สมัครสมาชิก | Email + Password พร้อม Password Strength Meter |
| เข้าสู่ระบบ | Email + Password พร้อม Remember me |
| ลืมรหัสผ่าน | Reset link ทาง Email (Supabase Auth) |
| **2FA / MFA** | TOTP — Google Authenticator, Authy + รหัสสำรอง 12 หลัก |
| 2FA paste iOS | รองรับ paste OTP จาก iMessage / SMS บน iOS Safari (`onPaste` + `type="tel"`) |
| Auto-logout | ออกอัตโนมัติหลังไม่ใช้งาน 30 นาที |
| สถานะบัญชี | `pending` → `active` → `banned` |
| **Privacy Policy** | Modal เต็มจอ — ต้องเลื่อนอ่านครบก่อนกด "รับทราบ" ทุก role รวม Admin |

**Role:** `user` — ค้นหา + แผนที่ | `admin` — จัดการข้อมูล + ตั้งค่าระบบ

</details>

<details>
<summary><b>🔍 ค้นหาข้อมูล</b></summary>

- **PEA มิเตอร์** — ค้นหาจาก TAG, PEANO, AccountNum, Feeder ID  
  ตัวกรอง: Feeder, เจ้าของ (PEA / Customer), CODE
- **PEA หม้อแปลง** — ค้นหาจาก TAG, PEANO, สถานที่, Feeder  
  ตัวกรอง: Feeder, เจ้าของ, ระบบเฟส, แรงดัน (22/33 kV), kVA range
- Server-side search, debounce 450ms, แสดงสูงสุด 500 รายการ
- **ถ่ายภาพ Meter / TR** — บันทึกลง localStorage พร้อม timestamp เวลาไทย
- **Export CSV** พร้อม Dialog ยืนยันก่อนดาวน์โหลด
- Search History — จำ keyword ล่าสุด 6 รายการ

</details>

<details>
<summary><b>📷 ภาพถ่าย Meter & Transformer</b></summary>

| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| ถ่ายหรือเลือกภาพ | กด "ถ่ายรูป / เลือกภาพ" เปิดกล้องหรือ Gallery |
| ประมวลผลอัตโนมัติ | ลดขนาดสูงสุด 900px · ลด quality อัตโนมัติถ้า storage เต็ม (0.72→0.55→0.40) |
| เก็บในอุปกรณ์ | `localStorage` key: `pea_photos_{meter/tr}_{OBJECTID}` |
| แจ้งเตือน storage เต็ม | แสดง toast error ถ้าบันทึกไม่ได้ (QuotaExceededError) |
| ลบภาพ | บันทึก audit log ลง Supabase (fallback localStorage) |
| สถิติใน Dashboard | จำนวนภาพมิเตอร์ / หม้อแปลง + พื้นที่ใช้ (อัปเดต realtime) |

> **หมายเหตุ:** ภาพเก็บใน localStorage ของอุปกรณ์แต่ละเครื่อง ไม่ซิงค์ข้ามอุปกรณ์

</details>

<details>
<summary><b>🗺️ แผนที่ (Leaflet.js)</b></summary>

**แผนที่ค้นหา (SearchView)**
| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| Tile Layers | Street / Satellite |
| Cluster | จัดกลุ่ม markers อัตโนมัติ |
| Heatmap | แสดงความหนาแน่น |
| Split View | ตาราง + แผนที่ side-by-side เต็มความสูง |
| แจ้งแก้ไขพิกัด | popup header แสดง "PEA Meter: {PEANO}" / "PEA TR: {PEANO_TR}" |

**แผนที่ภาพรวม Admin**
| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| Meter + TR | แสดงพร้อมกัน toggle แยกได้ |
| Cluster | คลิก zoom เข้ากลุ่ม แล้วคลิก marker รายตัวได้ |
| Viewport loading | zoom ≥ 14 โหลดเฉพาะพื้นที่ที่มองเห็น |
| GPS Pin | ปุ่ม style Google Maps + fly-to + popup |
| ค้นหา | PEANO / TAG / AccountNum |

**นำทาง GPS**
- คำนวณระยะทาง + เวลา (รถยนต์ **40 กม./ชม.**)
- เปิด Google Maps / Apple Maps พร้อม directions

</details>

<details>
<summary><b>📊 Dashboard (Admin)</b></summary>

- **Stat Cards** — มิเตอร์, หม้อแปลง, KVA รวม (แยก PEA / Customer)
  - `FitText` — ตัวเลขปรับขนาดอัตโนมัติ
- **Donut chart** — สัดส่วน PEA / Customer Meter + TR (interactive hover/tap)
- **Feeder chart** — Top Feeders (มิเตอร์ต่อ Feeder)
- **Privacy Consent Card** — จำนวนผู้รับทราบ/ยังไม่รับทราบ + progress bar + รายชื่อ
- **DB Usage card** — ขนาดข้อมูลแต่ละตาราง + สถิติรูปภาพ (localStorage อุปกรณ์ปัจจุบัน)

</details>

<details>
<summary><b>🔔 Web Push Notification</b></summary>

- เปิดรับ notification ได้ใน Settings
- Admin broadcast ได้จาก Admin Panel
- รองรับ background push ผ่าน Service Worker (PWA)
- ใช้ VAPID key + Supabase Edge Function (Deno)

</details>

<details>
<summary><b>⚙️ Admin Tools</b></summary>

| เครื่องมือ | รายละเอียด |
|-----------|-----------|
| จัดการผู้ใช้ | อนุมัติ / ระงับ / เปลี่ยน Role / บังคับ 2FA — auto-refresh ทุกครั้งที่เปิดแท็บ |
| Import CSV | Batch 500 rows, Preview 10 แถวก่อน Confirm |
| Audit Log | ทุก action + กรอง + Export CSV |
| Maintenance Mode | เปิด/ปิด + ข้อความ + วันที่กลับมา |
| Privacy Policy Editor | แก้ไขเนื้อหา + บันทึกลง settings table |
| Changelog ⚡ | Timeline ทุก version + Deploy Status dot |
| Dev Guide | เอกสาร Architecture + Code examples + Export PDF |

</details>

<details>
<summary><b>🔏 Privacy Policy Consent</b></summary>

| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| Modal บังหน้าจอ | z-index 9999 — ไม่สามารถปิดได้จนกว่าจะรับทราบ |
| Scroll-to-bottom | ต้องเลื่อนอ่านครบก่อนปุ่ม "รับทราบ" จะกดได้ |
| ครอบคลุมทุก role | ผู้ใช้ทั่วไป + Admin ทุกคนต้องรับทราบ |
| อัปเดตอัตโนมัติ | ถ้า policy ถูกอัปเดตหลังจากที่ผู้ใช้รับทราบ → ต้องรับทราบใหม่ |
| บันทึก timestamp | `profiles.privacy_accepted_at TIMESTAMPTZ` |
| Dashboard สถิติ | Admin เห็นว่าใครรับทราบแล้ว / ยังไม่ได้ |

**ต้องรัน SQL:**
```bash
# Supabase SQL Editor
supabase/add_privacy_consent.sql
```

</details>

---

## 🕐 เวลาทั้งหมดเป็นเวลาไทย (UTC+7)

ระบบแปลง timestamp ทุกจุดจาก UTC → เวลาไทย (UTC+7) ด้วยฟังก์ชัน `utcToThai()`:
- Audit Log (`at` field)
- เข้าสู่ระบบล่าสุด (`last_login`)
- วันที่รับทราบ Privacy Policy
- การแจ้งเตือน (`created_at`)

---

## 🛠️ Tech Stack

| Layer | Technology | หมายเหตุ |
|-------|-----------|---------|
| **Frontend** | React 18 + Babel Standalone | ไม่มี build step |
| **Database** | Supabase (PostgreSQL + RLS) | Free tier |
| **Auth** | Supabase Auth | Email/Password + TOTP MFA |
| **Maps** | Leaflet.js 1.9.4 | CDN |
| **Push** | Web Push API + VAPID | Supabase Edge Function (Deno) |
| **Photos** | Canvas API + localStorage | ไม่ใช้ Supabase Storage |
| **Fonts** | Plus Jakarta Sans, Noto Sans Thai, IBM Plex Mono | Google Fonts |
| **Hosting** | GitHub Pages | Static, ไม่มี server |

> ⚡ ไม่มี bundler · ไม่มี `node_modules` · แก้ไขไฟล์แล้ว `git push` ได้เลย

---

## 📁 โครงสร้างไฟล์

```
gis-mapping-system/
├── index.html              ← entry point, โหลด CDN ตามลำดับ
├── config.js               ← Supabase URL + anon key + mappers + VAPID_PUBLIC_KEY + utcToThai()
├── styles.css              ← CSS variables, dark/light theme, responsive components
├── lang.jsx                ← i18n ไทย / อังกฤษ
├── components.jsx          ← Icon, StatCard, FitText, Modal, Toast, Confirm, PeaSelect
├── MapView.jsx             ← Leaflet map, cluster, heatmap, GPS
├── AuthScreen.jsx          ← Login, Signup, Forgot password
├── SearchView.jsx          ← ค้นหา + NavigationPanel + แผนที่ + PhotoModal
├── AdminPanel.jsx          ← Dashboard, Users, Map, Import, Audit, Settings, DevGuide
├── app.jsx                 ← App root, routing, auth, ProfileView, ChangelogView, PrivacyConsentModal
├── service-worker.js       ← Offline cache (cache-first) + Web Push handler
├── manifest.json           ← PWA manifest
├── version.json            ← Commit hash สำหรับ Deploy Status dot
└── supabase/
    ├── schema.sql                  ← Tables + RLS + Triggers
    ├── server_search.sql           ← RPC: get_feeders, get_dashboard_stats
    ├── add_privacy_consent.sql     ← เพิ่ม privacy_accepted_at column
    ├── fix_last_login.sql          ← RLS policy สำหรับ last_login update
    ├── fix_rls_v3.sql              ← RLS policies ทั้งหมด (ล่าสุด)
    └── functions/
        └── push-notify/
            └── index.ts            ← Deno Edge Function: Web Push broadcast
```

---

## 🚀 การติดตั้ง

### 1. สร้าง Supabase Project

1. [supabase.com](https://supabase.com) → **New project**
2. Region: **Southeast Asia (Singapore)**

### 2. รัน Schema & RPC

```sql
-- SQL Editor → schema.sql → Run
-- SQL Editor → server_search.sql → Run
-- SQL Editor → add_privacy_consent.sql → Run  (Privacy Policy feature)
-- SQL Editor → fix_rls_v3.sql → Run           (RLS policies ล่าสุด)
```

### 3. Settings เริ่มต้น

```sql
INSERT INTO settings (key, value, updated_at, updated_by) VALUES
  ('maintenance_mode',    'false', NOW(), 'system'),
  ('maintenance_message', 'ปิดปรับปรุงชั่วคราว', NOW(), 'system'),
  ('maintenance_until',   '', NOW(), 'system'),
  ('privacy_policy',      '[]', NOW(), 'system')
ON CONFLICT (key) DO NOTHING;
```

### 4. config.js

```js
const SUPABASE_URL      = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON     = "YOUR_ANON_KEY";
const VAPID_PUBLIC_KEY  = "YOUR_VAPID_PUBLIC_KEY";
```

### 5. สร้าง Admin คนแรก

1. สมัครสมาชิกในแอป
2. Supabase → **Table Editor → profiles** → แก้ `role = admin`, `status = active`
3. รัน `fix_last_login.sql` เพื่อให้ `last_login` บันทึกได้
4. Reload แอป

---

## 🗄️ ฐานข้อมูล

### Tables

| Table | คำอธิบาย |
|-------|---------|
| `profiles` | ผู้ใช้งาน (role, status, last_login, require_2fa, **privacy_accepted_at**) |
| `meters` | มิเตอร์ (TAG, PEANO, ACCOUNTNUM, FEEDERID, OWNER, lat/lng) |
| `transformers` | หม้อแปลง (KVA, OWNER_TR, PHASE, VOLTAGE, FEEDER1, lat/lng) |
| `audit_log` | บันทึกทุก action |
| `settings` | ค่าตั้งค่าระบบ key-value (รวม `privacy_policy`) |
| `coordinate_corrections` | คำขอแก้ไขพิกัด GPS (pending/approved/rejected) |
| `mfa_backup_codes` | รหัสสำรอง 2FA (hashed) |
| `push_subscriptions` | Web Push endpoints |
| `notifications` | การแจ้งเตือนในแอป |

### RPC Functions

| Function | Returns |
|---------|---------|
| `get_feeders()` | รายชื่อ Feeder ที่ไม่ซ้ำ |
| `get_dashboard_stats()` | meter_count, tr_count, total_kva, pea_kva, cust_kva, pea_tr, cust_tr, top_feeders |

### Photo Storage

ภาพถ่ายเก็บใน **localStorage** ของอุปกรณ์แต่ละเครื่อง:
```
localStorage key: pea_photos_{meter|tr}_{OBJECTID}
value: JSON array ของ { id, dataUrl (base64 JPEG), at, addedBy }
```
> ไม่ใช้ Supabase Storage — ไม่นับ quota — แต่ไม่ซิงค์ข้ามอุปกรณ์

---

## 🔄 Changelog

| Version | วันที่ | เนื้อหา |
|---------|-------|--------|
| **v3.3** | 3 มิ.ย. 2569 | Privacy Consent modal, Consent Dashboard, photo save error handling, UTC→Thai time fix, modal maxHeight fix, 2FA iOS paste fix |
| v3.2 | 2 มิ.ย. 2569 | UX Overhaul: Skeleton loading, donut interactive, column sort, search history |
| v3.1 | 2 มิ.ย. 2569 | FitText, KVA split, mobile tab group |
| v3.0 | 1 มิ.ย. 2569 | Security & Map: Deploy status dot, Changelog view |
| v2.9 | 31 พ.ค. 2569 | 2FA & UI improvements |
| v2.0 | 1 เม.ย. 2569 | เปิดตัว |

---

## 📦 Deploy

```bash
git add .
git commit -m "feat: ..."
git push origin main
# รอ ~30 วินาที → GitHub Pages อัปเดตอัตโนมัติ
```

**อัปเดต version.json** หลังทุก push:
```json
{ "commit": "abc1234def", "shortCommit": "abc1234", "message": "feat: ...", "date": "2026-06-03" }
```

**Service Worker** — bump version ทุกครั้งที่ deploy:
```js
// service-worker.js
const CACHE = "gis-meter-v14";  // เพิ่มเลขทุกครั้ง
```

---

## 🔧 แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|------|--------|
| `last_login` แสดง "—" | รัน `supabase/fix_last_login.sql` ใน SQL Editor |
| Privacy Consent ไม่บันทึก | รัน `supabase/add_privacy_consent.sql` + `fix_last_login.sql` |
| ภาพถ่ายหายหลัง reload | Storage เต็ม — กด "ลบภาพเก่า" ในโมดัลภาพ แล้วถ่ายใหม่ |
| Dashboard ภาพ 0 รูป | กด Refresh ใน Database Usage card |
| 2FA paste ไม่ได้บน iOS | อัปเดตเป็น v3.3+ (มี `onPaste` handler แล้ว) |
| Modal ถูกตัด | อัปเดตเป็น v3.3+ (แก้ `maxHeight` แล้ว) |

---

<div align="center">

**🔒 Security Note**

ระบบใช้ `anon key` + PostgreSQL **Row Level Security (RLS)**  
`service_role key` ไม่ถูก expose ฝั่ง client เด็ดขาด

**v3.3** · พัฒนาโดย กฟภ. สาขาฝาง จ.เชียงใหม่

</div>
