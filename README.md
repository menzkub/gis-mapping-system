<div align="center">

<img src="logo.svg" width="80" alt="PEA GIS Logo" />

# PEA Meter & Transformer — GIS Mapping System

ระบบสารสนเทศภูมิศาสตร์สำหรับการไฟฟ้าส่วนภูมิภาค  
จัดการข้อมูล **มิเตอร์ไฟฟ้า** และ **หม้อแปลงไฟฟ้า** พร้อมแผนที่ Real-time

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-menzkub.github.io-8b3fc4?style=for-the-badge)](https://menzkub.github.io/gis-mapping-system/)
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
│  ดูแผนที่ + นำทาง GPS  │  แผนที่ภาพรวม (55,000+ จุด)       │
│  Export CSV            │  จัดการผู้ใช้ / Meter / TR         │
│  แจ้งแก้ไขพิกัด        │  Import CSV, Audit Log             │
│  รับ Push Notification │  อนุมัติคำขอแก้ไขพิกัด             │
│  โปรไฟล์ + 2FA         │  Maintenance Mode, Dev Guide       │
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
| หน้า 2FA | Dark theme เสมอ, ตัวเลข OTP ขนาดใหญ่ |
| Auto-logout | ออกอัตโนมัติหลังไม่ใช้งาน 30 นาที |
| สถานะบัญชี | `pending` → `active` → `banned` |

**Role:** `user` — ค้นหา + แผนที่ | `admin` — จัดการข้อมูล + ตั้งค่าระบบ

</details>

<details>
<summary><b>🔍 ค้นหาข้อมูล</b></summary>

- **PEA มิเตอร์** — ค้นหาจาก TAG, PEANO, AccountNum, Feeder ID  
  ตัวกรอง: Feeder, เจ้าของ (PEA / Customer), CODE
- **PEA หม้อแปลง** — ค้นหาจาก TAG, PEANO, สถานที่, Feeder  
  ตัวกรอง: Feeder, เจ้าของ, ระบบเฟส, แรงดัน (22/33 kV), kVA range
- Server-side search, debounce 450ms, แสดงสูงสุด 500 รายการ
- **Export CSV** พร้อม Dialog ยืนยันก่อนดาวน์โหลด

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
| แจ้งแก้ไขพิกัด | ส่งคำขอแก้ไข GPS พร้อมหมายเหตุ |

**แผนที่ภาพรวม Admin**
| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| Meter + TR | แสดงพร้อมกัน toggle แยกได้ |
| Cluster | **คลิก zoom เข้ากลุ่ม** แล้วคลิก marker รายตัวได้ |
| Viewport loading | zoom ≥ 14 โหลดเฉพาะพื้นที่ที่มองเห็น |
| GPS Pin | ปุ่ม style Google Maps + fly-to + popup |
| ค้นหา | PEANO / TAG / AccountNum (คีย์บอร์ดตัวเลข) |
| คำขอแก้ไข | ดู/อนุมัติ/ปฏิเสธ side panel |

**นำทาง GPS**
- คำนวณระยะทาง + เวลา (รถยนต์ **40 กม./ชม.**)
- เปิด Google Maps / Apple Maps พร้อม directions

</details>

<details>
<summary><b>📊 Dashboard (Admin)</b></summary>

- **Stat Cards** — มิเตอร์, หม้อแปลง, KVA รวม (แยก PEA / Customer)
  - `FitText` — ตัวเลขปรับขนาดอัตโนมัติ ไม่ว่าจะมีกี่หลัก
- **Donut chart** — สัดส่วน PEA / Customer Meter + TR
  - มือถือ: donut ซ้าย + legend ขวา (balanced layout)
  - iPad/Desktop: side-by-side พร้อม progress bar
- **Feeder chart** — Top Feeders (มิเตอร์ต่อ Feeder)
- **DB Usage card** — ขนาดข้อมูลแต่ละตาราง

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
| จัดการผู้ใช้ | อนุมัติ / ระงับ / เปลี่ยน Role / บังคับ 2FA |
| Import CSV | Batch 500 rows, Preview 10 แถวก่อน Confirm |
| Audit Log | ทุก action + กรอง + Export CSV |
| Maintenance Mode | เปิด/ปิด + ข้อความ + วันที่กลับมา |
| Changelog ⚡ | Timeline ทุก version + Deploy Status dot |
| Dev Guide | เอกสาร Architecture + Code examples + Export PDF |

</details>

---

## 🛠️ Tech Stack

| Layer | Technology | หมายเหตุ |
|-------|-----------|---------|
| **Frontend** | React 18 + Babel Standalone | ไม่มี build step |
| **Database** | Supabase (PostgreSQL + RLS) | Free tier |
| **Auth** | Supabase Auth | Email/Password + TOTP MFA |
| **Maps** | Leaflet.js 1.9.4 | CDN |
| **Push** | Web Push API + VAPID | Supabase Edge Function (Deno) |
| **Fonts** | IBM Plex Sans Thai, IBM Plex Mono | Google Fonts |
| **Hosting** | GitHub Pages | Static, ไม่มี server |

> ⚡ ไม่มี bundler · ไม่มี `node_modules` · แก้ไขไฟล์แล้ว `git push` ได้เลย

---

## 📁 โครงสร้างไฟล์

```
gis-mapping-system/
├── index.html              ← entry point, โหลด CDN ตามลำดับ
├── config.js               ← Supabase URL + anon key + mappers + VAPID_PUBLIC_KEY
├── styles.css              ← CSS variables, dark/light theme, components
├── lang.jsx                ← i18n ไทย / อังกฤษ
├── components.jsx          ← Icon, StatCard, FitText, Modal, Toast, Confirm
├── MapView.jsx             ← Leaflet map, cluster, heatmap, GPS
├── AuthScreen.jsx          ← Login, Signup, Forgot password
├── SearchView.jsx          ← ค้นหา + NavigationPanel + แผนที่
├── AdminPanel.jsx          ← Dashboard, Users, Map, Import, Audit, Settings, DevGuide
├── app.jsx                 ← App root, routing, auth, ProfileView, ChangelogView
├── service-worker.js       ← Offline cache (cache-first) + Web Push handler
├── manifest.json           ← PWA manifest
├── version.json            ← Commit hash สำหรับ Deploy Status dot
└── supabase/
    ├── schema.sql          ← Tables + RLS + Triggers
    ├── server_search.sql   ← RPC: get_feeders, get_dashboard_stats
    └── functions/
        └── push-notify/
            └── index.ts    ← Deno Edge Function: Web Push broadcast
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
```

### 3. Settings เริ่มต้น

```sql
INSERT INTO settings (key, value, updated_at, updated_by) VALUES
  ('maintenance_mode',    'false', NOW(), 'system'),
  ('maintenance_message', 'ปิดปรับปรุงชั่วคราว', NOW(), 'system'),
  ('maintenance_until',   '', NOW(), 'system')
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
3. Reload แอป

---

## 🗄️ ฐานข้อมูล

### Tables

| Table | คำอธิบาย |
|-------|---------|
| `profiles` | ผู้ใช้งาน (role, status, last_login, require_2fa) |
| `meters` | มิเตอร์ (TAG, PEANO, ACCOUNTNUM, FEEDERID, OWNER, lat/lng) |
| `transformers` | หม้อแปลง (KVA, OWNER_TR, PHASE, VOLTAGE, FEEDER1, lat/lng) |
| `audit_log` | บันทึกทุก action |
| `settings` | ค่าตั้งค่าระบบ key-value |
| `coordinate_corrections` | คำขอแก้ไขพิกัด GPS (pending/approved/rejected) |
| `mfa_backup_codes` | รหัสสำรอง 2FA (hashed) |
| `push_subscriptions` | Web Push endpoints |

### RPC Functions

| Function | Returns |
|---------|---------|
| `get_feeders()` | รายชื่อ Feeder ที่ไม่ซ้ำ |
| `get_dashboard_stats()` | meter_count, tr_count, total_kva, **pea_kva**, **cust_kva**, pea_tr, cust_tr, top_feeders |

---

## 📦 Deploy

```bash
git add .
git commit -m "feat: ..."
git push origin main
# รอ ~30 วินาที → GitHub Pages อัปเดตอัตโนมัติ
```

**Service Worker** — bump version ทุกครั้งที่ deploy:

```js
// service-worker.js
const CACHE = "gis-meter-v14";  // เพิ่มเลขทุกครั้ง
```

---

<div align="center">

**🔒 Security Note**

ระบบใช้ `anon key` + PostgreSQL **Row Level Security (RLS)**  
`service_role key` ไม่ถูก expose ฝั่ง client เด็ดขาด

</div>
