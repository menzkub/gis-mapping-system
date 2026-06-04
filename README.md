<div align="center">

<img src="logo.svg" width="80" alt="PEA GIS Logo" />

# PEA Meter & Transformer — GIS Mapping System

ระบบสารสนเทศภูมิศาสตร์สำหรับการไฟฟ้าส่วนภูมิภาค สาขาฝาง จังหวัดเชียงใหม่  
จัดการข้อมูล **มิเตอร์ไฟฟ้า** และ **หม้อแปลงไฟฟ้า** พร้อมแผนที่ Real-time

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-menzkub.github.io-8b3fc4?style=for-the-badge)](https://menzkub.github.io/gis-mapping-system/)
[![Version](https://img.shields.io/badge/Version-v3.7-6b2c91?style=for-the-badge)](https://menzkub.github.io/gis-mapping-system/)
[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-222?style=for-the-badge&logo=github)](https://github.com/menzkub/gis-mapping-system)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com)

</div>

---

## ภาพรวมระบบ

```
┌──────────────────────────────────────────────────────────────────┐
│                  GIS Meter & Transformer System                  │
├─────────────────────────┬────────────────────────────────────────┤
│   👤 ผู้ใช้ทั่วไป        │   🛡️ Admin                             │
│  ──────────────────     │  ─────────────────────────────────     │
│  ค้นหา Meter / TR       │  Dashboard + Donut + KVA Stats         │
│  ดูแผนที่ + นำทาง GPS   │  Privacy Consent Dashboard             │
│  ถ่ายภาพ + GPS Geotag   │  แผนที่ภาพรวม (55,000+ จุด)           │
│  Export CSV / Excel / PDF│  จัดการผู้ใช้ / Meter / TR            │
│  PDF รายบุคคล           │  Import CSV, Audit Log                 │
│  แจ้งแก้ไขพิกัด         │  อนุมัติคำขอแก้ไขพิกัด                │
│  รับ Push Notification  │  Maintenance Mode, Dev Guide           │
│  โปรไฟล์ + 2FA          │  ตั้งค่า Privacy Policy               │
│  รับทราบ Privacy Policy │  สถาปัตยกรรมระบบ (Architecture)       │
│  **Remember Me**        │                                        │
│  **Face ID / Fingerprint│                                        │
└─────────────────────────┴────────────────────────────────────────┘
```

---

## ✨ ฟีเจอร์หลัก

<details>
<summary><b>🔐 Authentication & Security</b></summary>

| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| สมัครสมาชิก | Email + Password พร้อม Password Strength Meter |
| เข้าสู่ระบบ | Email หรือ Username + Password |
| ลืมรหัสผ่าน | Reset link ทาง Email (Supabase Auth) |
| **Remember Me** | จำ session ข้ามการปิด browser — ถ้าปิดใช้งาน session จะหมดเมื่อปิด tab |
| **Face ID / ลายนิ้วมือ** | WebAuthn platform authenticator — iOS Face ID, Android fingerprint, Windows Hello |
| **2FA / MFA** | TOTP — Google Authenticator, Authy + รหัสสำรอง 12 หลัก |
| 2FA paste iOS | รองรับ paste OTP จาก iMessage / SMS บน iOS Safari |
| Auto-logout | ออกอัตโนมัติหลังไม่ใช้งาน 30 นาที |
| สถานะบัญชี | `pending` → `active` → `banned` |
| **Privacy Policy** | Modal เต็มจอ — ต้องเลื่อนอ่านครบก่อนกด "รับทราบ" ทุก role รวม Admin |

**วิธีใช้ Biometric Login:**
1. Login ด้วย Password ครั้งแรก
2. แบนเนอร์ "เปิดใช้ Face ID / ลายนิ้วมือ?" โผล่ขึ้นหลัง login
3. กด "เปิดใช้งาน" → ยืนยันด้วย biometric ของอุปกรณ์
4. ครั้งถัดไป: กดปุ่ม 🔐 บนหน้า Login ได้เลย
5. จัดการได้ที่: **ตั้งค่า → บัญชีของฉัน → Face ID / ลายนิ้วมือ**

**Role:** `user` — ค้นหา + แผนที่ | `admin` — จัดการข้อมูล + ตั้งค่าระบบ

</details>

<details>
<summary><b>🔍 ค้นหาข้อมูล</b></summary>

- **PEA มิเตอร์** — ค้นหาจาก TAG, PEANO, AccountNum, Feeder ID  
  ตัวกรอง: Feeder, เจ้าของ (PEA / Customer), CODE
- **PEA หม้อแปลง** — ค้นหาจาก TAG, PEANO, สถานที่, Feeder  
  ตัวกรอง: Feeder, เจ้าของ, ระบบเฟส, แรงดัน (22/33 kV), kVA range
- Server-side search, debounce 450ms, แสดงสูงสุด 500 รายการ
- **IndexedDB Offline Cache** — ผลค้นหาเก็บไว้ 24 ชม. ใช้ได้แม้ไม่มีอินเทอร์เน็ต
- **Search History** — จำ keyword ล่าสุด 6 รายการ
- **ประวัติการแก้ไข** — กดปุ่ม "ประวัติ" บนการ์ดผลลัพธ์เพื่อดู audit log รายอุปกรณ์

</details>

<details>
<summary><b>📤 Export ข้อมูล</b></summary>

| รูปแบบ | รายละเอียด |
|-------|-----------|
| **CSV** | Export ผลค้นหาทั้งหมดเป็น `.csv` |
| **Excel (.xlsx)** | Export เป็น spreadsheet พร้อม header row |
| **PDF (Bulk)** | Export ทุกรายการเป็นตาราง A4 Landscape |
| **PDF รายบุคคล** | กดปุ่ม PDF บนการ์ดผลลัพธ์ — ใบสรุปข้อมูล A4 Portrait |

> ทุก Export มี Dialog ยืนยันก่อนดาวน์โหลด · รองรับทั้งหน้าค้นหา + Admin Panel

</details>

<details>
<summary><b>📷 ภาพถ่าย Meter & Transformer</b></summary>

| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| ถ่ายหรือเลือกภาพ | กด "ถ่ายรูป / เลือกภาพ" เปิดกล้องหรือ Gallery |
| **GPS Geotag อัตโนมัติ** | ประทับ `GPS: lat, lng` ที่มุมล่างขวาของภาพก่อนบันทึก |
| GPS Status Badge | แสดง `📍 กำลังรับ GPS…` / `📍 GPS แนบแล้ว` / `📍 ไม่ได้รับ GPS` |
| ประมวลผลอัตโนมัติ | ลดขนาดสูงสุด 900px · ลด quality ถ้า storage เต็ม |
| เก็บในอุปกรณ์ | `localStorage` key: `pea_photos_{meter/tr}_{OBJECTID}` |
| สถิติใน Dashboard | จำนวนภาพ + พื้นที่ใช้ (อัปเดต realtime) |

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
| แจ้งแก้ไขพิกัด | popup แสดง PEANO พร้อมขอแก้ไขพิกัด GPS |

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
- **Donut chart** — สัดส่วน PEA / Customer Meter + TR (interactive hover/tap)
- **Feeder chart** — Top Feeders (มิเตอร์ต่อ Feeder) + ชิปกรอง Feeder
- **Privacy Consent Card** — จำนวนผู้รับทราบ/ยังไม่รับทราบ + progress bar + รายชื่อ
- **DB Usage card** — ขนาดข้อมูลแต่ละตาราง + สถิติรูปภาพ (localStorage อุปกรณ์ปัจจุบัน)

</details>

<details>
<summary><b>🔔 Web Push Notification</b></summary>

- เปิดรับ notification ได้ใน Settings (User & Admin)
- Admin broadcast ได้จาก Admin Panel → Settings
- รองรับ background push ผ่าน Service Worker (PWA)
- ใช้ VAPID key + Supabase Edge Function (Deno)

</details>

<details>
<summary><b>⚙️ Admin Tools</b></summary>

| เครื่องมือ | รายละเอียด |
|-----------|-----------|
| **Hamburger Drawer** | Navigation มือถือ — ☰ slide-in drawer 15 เมนู 3 หมวด (หลัก / เครื่องมือ / ตั้งค่า) |
| จัดการผู้ใช้ | อนุมัติ / ระงับ / เปลี่ยน Role / บังคับ 2FA |
| Import CSV | Batch 500 rows, Preview 10 แถวก่อน Confirm |
| Audit Log | ทุก action + กรอง + Export CSV/Excel |
| Security Score | คะแนนความปลอดภัย (0–100) + ตรวจจับกิจกรรมต้องสงสัย |
| Maintenance Mode | เปิด/ปิด + ข้อความ + วันที่กลับมา |
| Privacy Policy Editor | แก้ไขเนื้อหา + บันทึกลง settings table |
| Changelog ⚡ | Timeline ทุก version + Deploy Status dot |
| Dev Guide | เอกสาร Architecture + Code examples + Export PDF |
| **สถาปัตยกรรมระบบ** | แผนภาพ Navigation Flow + File Map + Data Flow พร้อม animation |

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
| **Auth** | Supabase Auth + WebAuthn | Email/Password · TOTP MFA · Face ID/Fingerprint |
| **Maps** | Leaflet.js 1.9.4 | CDN |
| **Push** | Web Push API + VAPID | Supabase Edge Function (Deno) |
| **Photos** | Canvas API + localStorage | GPS Geotag watermark |
| **Export** | XLSX.js + html2pdf.js | CSV · Excel · PDF |
| **Offline** | IndexedDB (PeaDB) + Service Worker | Cache-first, TTL 24h |
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
├── lang.jsx                ← i18n ไทย / อังกฤษ (ครอบคลุม 200+ keys)
├── components.jsx          ← Icon, StatCard, Modal, Toast, Confirm, PeaSelect, PeaDB
├── MapView.jsx             ← Leaflet map, cluster, heatmap, GPS
├── AuthScreen.jsx          ← Login (+ Face ID button), Signup, Forgot password
├── SearchView.jsx          ← ค้นหา + NavigationPanel + แผนที่ + PhotoModal + PDF export
├── AdminPanel.jsx          ← Dashboard, Users, Map, Import, Audit, Settings, Architecture
├── app.jsx                 ← App root, routing, auth, ProfileView (+ biometric settings),
│                              ChangelogView, PrivacyConsentModal, Remember Me logic
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
| `password_history` | ประวัติการเปลี่ยนรหัสผ่าน |

### RPC Functions

| Function | Returns |
|---------|---------|
| `get_feeders()` | รายชื่อ Feeder ที่ไม่ซ้ำ |
| `get_dashboard_stats()` | meter_count, tr_count, total_kva, pea_kva, cust_kva, pea_tr, cust_tr, top_feeders |

### Local Storage Keys

| Key | เนื้อหา |
|-----|--------|
| `pea_photos_{meter\|tr}_{OBJECTID}` | ภาพถ่าย (base64 JPEG array) |
| `pea_rm` | Remember Me preference (`"1"` / `"0"`) |
| `pea_bio_cred` | WebAuthn credential ID (base64) |
| `pea_bio_session` | Supabase access + refresh tokens สำหรับ biometric |
| `pea_theme` | `"light"` / `"dark"` |
| `pea_base` | `"satellite"` / `"street"` |

---

## 🔄 Changelog

| Version | วันที่ | เนื้อหา |
|---------|-------|--------|
| **v3.7** | 4 มิ.ย. 2569 | **Hamburger Drawer** มือถือ, Face ID status card ใน Dashboard, แก้ TH/EN toggle บัง title |
| v3.6 | 4 มิ.ย. 2569 | GPS Geotag อัตโนมัติบนภาพ, Bulk PDF export, Remember Me, **Face ID / ลายนิ้วมือ (WebAuthn)**, Architecture tab |
| v3.5 | 4 มิ.ย. 2569 | IndexedDB offline cache, ประวัติการแก้ไขรายอุปกรณ์, PDF รายบุคคล, Touch target 44px, iOS auto-zoom fix |
| v3.4 | 4 มิ.ย. 2569 | Export Excel (.xlsx), Dark mode อัตโนมัติ, Offline banner, Dashboard Feeder filter |
| v3.3 | 3 มิ.ย. 2569 | Privacy Consent modal, Consent Dashboard, สถิติรูปภาพ, UTC→Thai time, 2FA iOS paste fix |
| v3.2 | 2 มิ.ย. 2569 | UX Overhaul: Skeleton loading, Donut interactive, Column sort, Search history |
| v3.1 | 2 มิ.ย. 2569 | FitText, KVA split, iOS zoom fix, Map full height |
| v3.0 | 1 มิ.ย. 2569 | แจ้งแก้ไขพิกัด, Security score, PWA, Web Push, Admin overview map |
| v2.9 | 31 พ.ค. 2569 | 2FA QR Canvas, bilingual 2FA, iPad layout fixes |
| v2.0 | 1 เม.ย. 2569 | เปิดตัว |

---

## 📦 Deploy

```bash
git add .
git commit -m "feat: ..."
git push origin main
# รอ ~30 วินาที → GitHub Pages อัปเดตอัตโนมัติ
```

**bump service-worker.js** ทุกครั้งที่ deploy:
```js
const CACHE = "gis-meter-vXX"; // เพิ่มเลขทุกครั้ง
```

---

## 🔧 แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|------|--------|
| `last_login` แสดง "—" | รัน `supabase/fix_last_login.sql` ใน SQL Editor |
| Privacy Consent ไม่บันทึก | รัน `supabase/add_privacy_consent.sql` + `fix_last_login.sql` |
| ภาพถ่ายหายหลัง reload | Storage เต็ม — กด "ลบภาพเก่า" ในโมดัลภาพ แล้วถ่ายใหม่ |
| Face ID "Session หมดอายุ" | ออกจากระบบแล้วยังใช้ biometric ได้ *(แก้แล้วใน v3.6)* |
| PDF ออกมาหน้าว่างขาว | อัปเดตเป็น v3.6+ *(แก้ html2canvas off-screen rendering แล้ว)* |
| 2FA paste ไม่ได้บน iOS | อัปเดตเป็น v3.3+ (มี `onPaste` handler แล้ว) |

---

<div align="center">

**🔒 Security Note**

ระบบใช้ `anon key` + PostgreSQL **Row Level Security (RLS)**  
`service_role key` ไม่ถูก expose ฝั่ง client เด็ดขาด  
Biometric ใช้ **WebAuthn** — private key อยู่ใน Secure Enclave ของอุปกรณ์เท่านั้น

**v3.7** · พัฒนาโดย กฟภ. สาขาฝาง จ.เชียงใหม่

</div>
