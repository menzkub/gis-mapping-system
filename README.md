# ระบบสารสนเทศภูมิศาสตร์ — PEA Meter & Transformer

ระบบค้นหาและจัดการข้อมูล **มิเตอร์ไฟฟ้า** และ **หม้อแปลงไฟฟ้า** สำหรับการไฟฟ้าส่วนภูมิภาค  
พร้อมแผนที่ Real-time, ระบบผู้ใช้งานหลายระดับ, Audit Log และ Admin Panel ครบวงจร

**Live:** https://menzkub.github.io/gis-mapping-system/

---

## สารบัญ

- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [ฟีเจอร์หลัก](#ฟีเจอร์หลัก)
- [Tech Stack](#tech-stack)
- [โครงสร้างไฟล์](#โครงสร้างไฟล์)
- [การติดตั้ง](#การติดตั้ง)
- [ฐานข้อมูล Supabase](#ฐานข้อมูล-supabase)
- [การ Deploy](#การ-deploy)

---

## ภาพรวมระบบ

```
┌──────────────────────────────────────────────────────┐
│  ผู้ใช้ทั่วไป (user)            Admin                │
│  ──────────────────────         ──────────────────── │
│  ค้นหา Meter / Transformer      จัดการผู้ใช้งาน     │
│  ดูแผนที่ + นำทาง GPS           เพิ่ม / แก้ไข / ลบ │
│  Export ผลการค้นหา (CSV)        Import CSV           │
│  โปรไฟล์ + เปลี่ยนรหัสผ่าน     Audit Log            │
│  ประวัติการใช้งาน               ตั้งค่า Maintenance  │
└──────────────────────────────────────────────────────┘
```

---

## ฟีเจอร์หลัก

### 🔐 Authentication

| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| สมัครสมาชิก | Email + Password พร้อม password strength meter |
| เข้าสู่ระบบ | Email + Password พร้อม Remember me |
| ลืมรหัสผ่าน | ส่ง reset link ทาง Email (Supabase Auth) |
| 2FA / MFA | TOTP (Google Authenticator, Authy) |
| Auto-logout | ออกอัตโนมัติหลังไม่ใช้งาน 30 นาที |
| สถานะบัญชี | `pending` → `active` → `banned` |

**Role:**
- `user` — ค้นหา ดูแผนที่ จัดการโปรไฟล์ตัวเอง
- `admin` — ทุกอย่าง + จัดการข้อมูล + ตั้งค่าระบบ

---

### 🔍 ค้นหาข้อมูล

**PEA มิเตอร์** — ค้นหาจาก TAG, PEANO, ACCOUNTNUM, Feeder ID  
ตัวกรอง: Feeder, เจ้าของ (PEA / Customer), CODE

**PEA หม้อแปลง** — ค้นหาจาก TAG, PEANO, สถานที่, Feeder  
ตัวกรอง: Feeder, เจ้าของ, ระบบเฟส, แรงดัน (22/33 kV), kVA ต่ำสุด-สูงสุด

- แสดงสูงสุด 500 รายการต่อครั้ง (server-side, debounce 450ms)
- บันทึก Audit Log ทุกครั้งที่ค้นหา
- **Export CSV** — แสดง Dialog พร้อมจำนวนรายการและชื่อไฟล์ก่อนดาวน์โหลด

---

### 🗺️ แผนที่ (Leaflet.js)

| ฟีเจอร์ | รายละเอียด |
|--------|-----------|
| Tile Layers | Street, Satellite (toggle บน topbar) |
| Cluster | จัดกลุ่ม markers อัตโนมัติ (เปิด/ปิดได้) |
| Heatmap | แสดงความหนาแน่น (เปิด/ปิดได้) |
| Split View | ตาราง + แผนที่ side-by-side |
| คัดลอกพิกัด | Copy lat/lng ด้วยคลิกเดียว |

**นำทาง GPS:**
- รับตำแหน่งปัจจุบันจาก device
- คำนวณระยะทาง + เวลาโดยประมาณ (รถยนต์)
- เปิด Google Maps / Apple Maps พร้อม directions

---

### 👤 โปรไฟล์ผู้ใช้งาน

| แท็บ | เนื้อหา |
|-----|--------|
| ข้อมูล | ชื่อ, ชื่อผู้ใช้, Email, บทบาท, วันที่สมัคร |
| รหัสผ่าน | เปลี่ยนรหัสผ่าน + strength meter, เปิด/ปิด 2FA |
| การใช้งาน | ประวัติ login/logout, เปลี่ยนรหัส, 2FA |
| การค้นหา | ประวัติค้นหา Meter/TR พร้อม timestamp และ device info |

---

### ⚙️ Admin Panel

#### Dashboard
- **Stat Cards** — จำนวนมิเตอร์, หม้อแปลง, กำลังรวม (kVA), ผู้ใช้งาน
- **Bar chart** — Top 8 Feeders (จำนวนมิเตอร์ต่อ Feeder)
- **Donut chart** — สัดส่วน PEA / Customer (Meter + TR)
- **กิจกรรมล่าสุด** — Audit log 5 รายการล่าสุด

#### จัดการผู้ใช้งาน
- อนุมัติ / ระงับ / ปลดระงับบัญชี
- เปลี่ยน Role (user ↔ admin)
- บังคับเปิด/ปิด 2FA รายบุคคล

#### จัดการ Meter / Transformer
- ค้นหา + รายการ (100 รายการแรก)
- เพิ่ม / แก้ไข / ลบ พร้อม Confirm dialog
- **Export CSV** — แสดง Dialog พร้อมจำนวนรายการก่อนดาวน์โหลด

#### นำเข้าข้อมูล (Import CSV)
- รองรับ CSV UTF-8, Upsert ตาม OBJECTID
- Batch 500 rows ต่อรอบ, Preview 10 แถวแรกก่อน Confirm

```
Meter:  OBJECTID, TAG, CODE, ROUTE, ACCOUNTNUM, PEANO, FEEDERID, OWNER, INSTALLATI, LATITUDE, LONGITUDE
TR:     OBJECTID, TAG, PHASE, VOLTAGE, PEANO_TR, INSTALL_PHASE, KVA, OWNER_TR, LOCATION, FEEDER1, LATITUDE, LONGITUDE, PEA_METER
```

#### Audit Log
- บันทึกทุก action: login, logout, ค้นหา, แก้ไข, ลบ, นำเข้า, เปลี่ยนรหัส, 2FA
- กรองตาม user, action, ช่วงวันที่
- **Export CSV** — แสดง Dialog พร้อมจำนวน log ก่อนดาวน์โหลด

#### ตั้งค่าระบบ
- **Maintenance Mode** — เปิด/ปิดระบบด้วย toggle (Admin เข้าได้ปกติ)
- **ข้อความแจ้งผู้ใช้** — แก้ไขข้อความบนหน้าปิดปรับปรุง
- **วันเวลาที่กลับมา** — datetime picker บันทึกลง Supabase ทันที

---

### 🌗 UI / UX

- **Dark / Light Mode** — สลับโหมดได้จากปุ่มบน topbar (จำค่าไว้ใน localStorage)
- **2 ภาษา** — ไทย / English (สลับได้จาก topbar)
- **Responsive** — รองรับมือถือทุกจุด (topbar, admin tabs, dashboard, profile)
- **Export Dialog** — ทุกปุ่ม Export แสดง Dialog พร้อมจำนวนรายการและชื่อไฟล์ก่อนดาวน์โหลด
- **Toast notifications** — แจ้งผลทุก action
- **Confirm dialog** — ป้องกันการลบข้อมูลโดยไม่ตั้งใจ

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Babel Standalone (ไม่มี build step) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (Email/Password + TOTP MFA) |
| Maps | Leaflet.js 1.9.4 |
| Fonts | IBM Plex Sans Thai, IBM Plex Mono |
| Hosting | GitHub Pages |

> ไม่มี bundler ไม่มี node_modules — แก้ไขไฟล์แล้ว `git push` ได้เลย

---

## โครงสร้างไฟล์

```
gis-mapping-system/
├── index.html          ← entry point, โหลด CDN และ script ทั้งหมด
├── config.js           ← Supabase URL + anon key + row mappers
├── styles.css          ← CSS global (theme variables, dark/light mode, components)
├── lang.jsx            ← i18n: ข้อความภาษาไทย / อังกฤษ
├── components.jsx      ← shared UI: Icon, StatCard, Modal, Toast, ConfirmDialog
├── MapView.jsx         ← Leaflet map, markers, heatmap, cluster, GPS
├── AuthScreen.jsx      ← Login, Signup, Forgot password
├── SearchView.jsx      ← ค้นหา Meter/TR, filters, export dialog
├── AdminPanel.jsx      ← dashboard, users, meters, TR, import, audit, settings
├── app.jsx             ← root App, routing, auth state, ProfileView, theme
├── data.js             ← static data helpers
├── logo.svg
├── robots.txt
│
└── supabase/
    ├── schema.sql      ← tables + RLS policies + triggers
    ├── seed.sql        ← ข้อมูลตัวอย่าง Meter/TR
    ├── fix_rls.sql
    ├── fix_rls_v2.sql
    ├── fix_rls_v3.sql
    ├── server_search.sql
    └── SETUP.md        ← คู่มือติดตั้ง Supabase
```

---

## การติดตั้ง

### 1. สร้าง Supabase Project

1. ไปที่ https://supabase.com → **New project**
2. เลือก Region: **Southeast Asia (Singapore)**
3. รอ ~2 นาที

### 2. รัน Schema

**SQL Editor** → วาง `supabase/schema.sql` → **Run**

สร้างตาราง: `profiles`, `meters`, `transformers`, `audit_log`, `settings`

### 3. เพิ่มข้อมูล Settings เริ่มต้น

```sql
INSERT INTO settings (key, value, updated_at, updated_by) VALUES
  ('maintenance_mode',    'false', NOW(), 'system'),
  ('maintenance_message', 'ผู้ดูแลระบบกำลังดำเนินการปรับปรุงระบบ', NOW(), 'system'),
  ('maintenance_until',   '', NOW(), 'system')
ON CONFLICT (key) DO NOTHING;
```

### 4. ตั้งค่า config.js

```js
const SUPABASE_URL  = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON = "YOUR_ANON_KEY";
```

**Dashboard → Settings → API** → copy **Project URL** และ **anon/public key**

### 5. ปิด Email Confirmation

**Authentication → Email** → ปิด **Enable email confirmations**

### 6. สร้าง Admin คนแรก

1. เปิดแอป → **สมัครสมาชิก**
2. Supabase → **Table Editor → profiles** → แก้ row ของตัวเอง:
   ```
   role   = admin
   status = active
   ```
3. Reload แอป → เข้าสู่ระบบ

ผู้ใช้ที่สมัครใหม่จะมี `status = pending` — Admin อนุมัติได้ที่ **Admin → ผู้ใช้งาน**

---

## ฐานข้อมูล Supabase

### Tables

| Table | คำอธิบาย |
|-------|---------|
| `profiles` | ข้อมูลผู้ใช้งาน (username, name, role, status, last_login) |
| `meters` | PEA มิเตอร์ (TAG, CODE, ROUTE, PEANO, FEEDERID, OWNER, lat/lng) |
| `transformers` | PEA หม้อแปลง (TAG, PHASE, VOLTAGE, KVA, OWNER_TR, LOCATION, FEEDER1, lat/lng) |
| `audit_log` | บันทึกทุก action (user_id, action, target, detail, ip, at) |
| `settings` | ค่าตั้งค่าระบบ key-value |

### Row Level Security (RLS)

| Table | user | admin |
|-------|------|-------|
| `profiles` | อ่านได้เฉพาะตัวเอง | อ่าน/แก้ไขได้ทุก row |
| `meters` / `transformers` | อ่านได้ (active) | อ่าน/เขียน/ลบ |
| `audit_log` | insert ได้ | อ่านได้ทั้งหมด |
| `settings` | อ่านได้ | อ่าน/แก้ไข |

### RPC Functions

| Function | คำอธิบาย |
|---------|---------|
| `get_feeders()` | ดึงรายชื่อ Feeder ที่ไม่ซ้ำ |
| `get_dashboard_stats()` | สถิติ: meter_count, tr_count, total_kva, top_feeders |

---

## การ Deploy

### GitHub Pages

```bash
git add .
git commit -m "update"
git push origin main
```

**Settings → Pages → Source:** `main` branch, root folder (`/`)

### ทดสอบ Local

```bash
python3 -m http.server 8080
# เปิด http://localhost:8080
```

---

> **หมายเหตุความปลอดภัย:** ระบบใช้ `anon key` + RLS ในการควบคุมสิทธิ์  
> ไม่มีการ expose `service_role key` ฝั่ง client
