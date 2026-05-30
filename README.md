# PEA Meter & TR — ระบบสารสนเทศภูมิศาสตร์

ระบบค้นหาและจัดการข้อมูล **มิเตอร์ไฟฟ้า (PEA Meter)** และ **หม้อแปลงไฟฟ้า (PEA Transformer)** สำหรับการไฟฟ้าส่วนภูมิภาค พร้อมแผนที่แบบ Real-time, ระบบผู้ใช้งานหลายระดับ และ Audit Log

> **Live:** https://menzkub.github.io/gis-mapping-system/

---

## สารบัญ

- [ภาพรวมระบบ](#ภาพรวมระบบ)
- [ฟีเจอร์หลัก](#ฟีเจอร์หลัก)
- [Tech Stack](#tech-stack)
- [โครงสร้างไฟล์](#โครงสร้างไฟล์)
- [การติดตั้ง](#การติดตั้ง)
- [การ Deploy](#การ-deploy)
- [ฐานข้อมูล Supabase](#ฐานข้อมูล-supabase)

---

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────────┐
│  ผู้ใช้ทั่วไป (user)         Admin              │
│  ─────────────────────       ─────────────────  │
│  ค้นหา PEA มิเตอร์           จัดการผู้ใช้งาน    │
│  ค้นหา PEA หม้อแปลง          จัดการ Meter/TR   │
│  ดูแผนที่ + นำทาง GPS         นำเข้า CSV        │
│  โปรไฟล์ + เปลี่ยนรหัสผ่าน    Audit Log         │
│  ประวัติการใช้งาน             ตั้งค่าระบบ        │
└─────────────────────────────────────────────────┘
```

---

## ฟีเจอร์หลัก

### 🔐 ระบบ Authentication

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| สมัครสมาชิก | Email + Password พร้อม password strength meter |
| เข้าสู่ระบบ | Email + Password พร้อม Remember me |
| ลืมรหัสผ่าน | ส่ง reset link ทาง Email (Supabase Auth) |
| 2FA / MFA | TOTP (Google Authenticator, Authy) |
| Auto-logout | ออกอัตโนมัติหลังไม่ใช้งาน 30 นาที |
| สถานะบัญชี | `pending` → `active` → `banned` |

**บทบาทผู้ใช้งาน:**
- `user` — ค้นหา ดูแผนที่ จัดการโปรไฟล์ตัวเอง
- `admin` — ทุกอย่าง + จัดการข้อมูล + ตั้งค่าระบบ

---

### 🔍 ค้นหาข้อมูล (SearchView)

**PEA มิเตอร์** — ค้นหาจาก TAG, PEANO, ACCOUNTNUM, Feeder ID
- ตัวกรอง: Feeder, เจ้าของ (PEA/Customer), CODE

**PEA หม้อแปลง** — ค้นหาจาก TAG, PEANO, สถานที่, Feeder
- ตัวกรอง: Feeder, เจ้าของ, ระบบเฟส (1/3 Phase), แรงดัน (22/33 kV), kVA ต่ำสุด-สูงสุด

**ผลการค้นหา:**
- แสดงสูงสุด 500 รายการต่อครั้ง (server-side, debounce 450ms)
- Export CSV ได้ทันที
- บันทึก Audit Log อัตโนมัติทุกครั้งที่ค้นหา

---

### 🗺️ แผนที่ (MapView — Leaflet.js)

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| Tile Layers | Street, Dark, Satellite (toggle บน topbar) |
| Cluster | จัดกลุ่ม markers อัตโนมัติ (เปิด/ปิดได้) |
| Heatmap | แสดงความหนาแน่น (เปิด/ปิดได้) |
| Split View | ตาราง + แผนที่ side-by-side |
| Map-only / Table-only | สลับ View ได้ |
| คัดลอกพิกัด | Copy lat/lng ด้วยคลิกเดียว |

**ระบบนำทาง GPS:**
- รับตำแหน่งปัจจุบันจาก device
- คำนวณระยะทาง + เวลาโดยประมาณ (รถยนต์)
- เปิด Google Maps / Apple Maps พร้อม directions

---

### 👤 โปรไฟล์ผู้ใช้งาน (ProfileView)

**แท็บ "ข้อมูล"**
- ชื่อ, ชื่อผู้ใช้, Email, บทบาท, วันที่สมัคร

**แท็บ "รหัสผ่าน"**
- เปลี่ยนรหัสผ่านพร้อม strength meter (ตรวจ uppercase, lowercase, ตัวเลข, special char)
- เปิด/ปิด 2FA (TOTP)

**แท็บ "การใช้งาน"**
- ประวัติการเข้าสู่ระบบ, ออกจากระบบ, เปลี่ยนรหัสผ่าน, 2FA

**แท็บ "การค้นหา"**
- ประวัติการค้นหา Meter/TR พร้อม timestamp และ device info

> Mobile-friendly: tabs เลื่อนแนวนอน, ตารางเปลี่ยนเป็น card layout บนมือถือ

---

### ⚙️ Admin Panel

#### Dashboard
- **Stat Cards**: จำนวนมิเตอร์, หม้อแปลง, กำลังรวม (kVA), จำนวนผู้ใช้งาน
- **มิเตอร์ตาม Feeder**: bar chart Top 8 Feeders
- **เจ้าของอุปกรณ์**: Donut chart (PEA Meter / Customer Meter / PEA TR / Customer TR)
- **กิจกรรมล่าสุด**: Audit log 5 รายการล่าสุด
- Responsive: 2×2 stat grid บนมือถือ

#### จัดการผู้ใช้งาน
- อนุมัติ / ระงับ / ปลดระงับบัญชี
- เปลี่ยน Role (user ↔ admin)
- บังคับเปิด/ปิด 2FA รายบุคคล
- แก้ไขข้อมูลโปรไฟล์

#### จัดการ PEA มิเตอร์ / PEA หม้อแปลง
- ค้นหา + ดูรายการ (100 รายการแรก)
- เพิ่ม / แก้ไข / ลบ พร้อม Confirm dialog
- Export CSV

#### นำเข้าข้อมูล (Import CSV)
- รองรับ CSV UTF-8
- Upsert ตาม OBJECTID (ไม่ซ้ำ)
- Batch 500 rows ต่อรอบ
- Preview 10 แถวแรกก่อน Confirm

**หัวคอลัมน์ CSV ที่รองรับ:**
```
Meter:  OBJECTID,TAG,CODE,ROUTE,ACCOUNTNUM,PEANO,FEEDERID,OWNER,INSTALLATI,LATITUDE,LONGITUDE
TR:     OBJECTID,TAG,PHASE,VOLTAGE,PEANO_TR,INSTALL_PHASE,KVA,OWNER_TR,LOCATION,FEEDER1,LATITUDE,LONGITUDE,PEA_METER
```

#### Audit Log
- บันทึกทุก action: login, logout, ค้นหา, แก้ไข, ลบ, นำเข้า, เปลี่ยนรหัส, 2FA
- แสดง: ผู้ใช้, action, รายละเอียด, เวลา, device info

#### ตั้งค่าระบบ (Settings)

**Maintenance Mode:**
- เปิด/ปิดระบบด้วย Toggle switch
- ผู้ใช้ทั่วไปจะเห็นหน้า "ระบบปิดปรับปรุง" — Admin ยังเข้าใช้งานได้ปกติ

**ข้อความแจ้งผู้ใช้งาน:**
- แก้ไขข้อความที่แสดงบนหน้าปิดปรับปรุง (มีค่าเริ่มต้นให้)
- กำหนดวันที่/เวลาที่คาดว่าจะกลับมาให้บริการ (datetime picker)
- บันทึกลง Supabase `settings` table ทันที

---

### 🔔 การแจ้งเตือน (Topbar)

- **Bell icon** พร้อม badge นับจำนวน pending users (เฉพาะ Admin)
- Dropdown แสดง: รายชื่อผู้รออนุมัติ + กิจกรรมล่าสุด 7 รายการ
- **Refresh button** โหลด users/audit log/stats ใหม่โดยไม่ reload หน้า

---

### 📱 Mobile Design

- Topbar: ชื่อผู้ใช้ + ปุ่มออกจากระบบอยู่ขวา, greeting/map switcher ซ่อน
- Admin tabs: เลื่อนแนวนอนได้
- Dashboard: Stat cards 2×2, Feeder+Donut stack แนวตั้ง
- Search header: tabs เลื่อน, action buttons scrollable row
- Profile tabs: scroll แนวนอน, ตารางเปลี่ยนเป็น cards
- Import: drop zone ไม่ล้นจอ
- Meter/TR admin toolbar: wrap บนหน้าจอแคบ

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (CDN + Babel standalone — no build step) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (Email/Password + TOTP MFA) |
| Maps | Leaflet.js 1.9.4 |
| Fonts | IBM Plex Sans Thai, IBM Plex Mono |
| Hosting | GitHub Pages (static) |

> ไม่มี bundler, ไม่มี node_modules — แก้ไข `.jsx` แล้ว push ได้เลย

---

## โครงสร้างไฟล์

```
project/
├── index.html          ← entry point, โหลด CDN และ script ทั้งหมด
├── config.js           ← Supabase URL + anon key + row mappers
├── styles.css          ← global CSS (theme variables, components)
├── components.jsx      ← shared UI: Icon, StatCard, Modal, Toast, Confirm
├── MapView.jsx         ← Leaflet map + markers + heatmap + cluster
├── AuthScreen.jsx      ← login / signup / forgot password
├── SearchView.jsx      ← ค้นหา Meter/TR + filters + results + navigation
├── AdminPanel.jsx      ← dashboard, users, meters, TR, import, audit, settings
└── app.jsx             ← root App, routing, auth state, ProfileView, MaintenanceScreen

supabase/
├── schema.sql          ← tables + RLS policies + triggers (run once)
├── seed.sql            ← ข้อมูลตัวอย่าง Meter/TR
├── fix_rls.sql         ← แก้ไข RLS audit_log
└── SETUP.md            ← คู่มือติดตั้ง Supabase
```

---

## การติดตั้ง

### 1. สร้าง Supabase Project

1. ไปที่ https://supabase.com → **New project**
2. เลือก Region: **Singapore (ap-southeast-1)**
3. รอ ~2 นาที

### 2. รัน Schema

**Dashboard → SQL Editor** → วาง `supabase/schema.sql` → **Run**

สร้างตาราง: `profiles`, `meters`, `transformers`, `audit_log`, `settings`

### 3. เพิ่มข้อมูล Settings (Maintenance Mode)

```sql
INSERT INTO settings (key, value, updated_at, updated_by)
VALUES
  ('maintenance_mode',    'false', NOW(), 'system'),
  ('maintenance_message', 'ผู้ดูแลระบบกำลังดำเนินการปรับปรุงระบบ\nกรุณากลับมาใหม่ภายหลัง', NOW(), 'system'),
  ('maintenance_until',   '',      NOW(), 'system')
ON CONFLICT (key) DO NOTHING;
```

### 4. ตั้งค่า config.js

```js
// project/config.js
const SUPABASE_URL  = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON = "YOUR_ANON_KEY";
```

Dashboard → **Settings → API** → copy Project URL และ anon/public key

### 5. ปิด Email Confirmation (สำหรับระบบภายใน)

Dashboard → **Authentication → Email** → ปิด **Enable email confirmations**

### 6. สร้าง Admin คนแรก

1. เปิดแอปใน browser → **สมัครสมาชิก**
2. ไปที่ Supabase → **Table Editor → profiles**
3. แก้ row ของตัวเอง: `role = 'admin'`, `status = 'active'`
4. Reload แอป → เข้าสู่ระบบ

ผู้ใช้ที่สมัครใหม่ทุกคนจะมี `status = 'pending'` — Admin อนุมัติได้ที่ **Admin → ผู้ใช้งาน**

---

## การ Deploy

### GitHub Pages

```bash
git add .
git commit -m "update"
git push origin main
```

เปิด **Settings → Pages → Source: main branch / root (หรือ /project)**

### Local (ทดสอบ)

```bash
cd project
python3 -m http.server 8080
# เปิด http://localhost:8080
```

---

## ฐานข้อมูล Supabase

### Tables

| Table | คำอธิบาย |
|-------|---------|
| `profiles` | ข้อมูลผู้ใช้งาน (username, name, role, status, last_login) |
| `meters` | ข้อมูล PEA มิเตอร์ (TAG, CODE, ROUTE, PEANO, FEEDERID, OWNER, lat/lng) |
| `transformers` | ข้อมูล PEA หม้อแปลง (TAG, PHASE, VOLTAGE, KVA, OWNER_TR, LOCATION, FEEDER1, lat/lng) |
| `audit_log` | บันทึกการใช้งานทั้งหมด (user_id, action, target, detail, ip, at) |
| `settings` | ค่าตั้งค่าระบบ key-value (maintenance_mode, maintenance_message, maintenance_until) |

### Row Level Security (RLS)

- `profiles`: user อ่านได้เฉพาะตัวเอง, admin อ่าน/แก้ไขได้ทุก row
- `meters` / `transformers`: active user อ่านได้, admin เขียนได้
- `audit_log`: active user insert ได้, admin อ่านได้ทั้งหมด
- `settings`: ทุก active user อ่านได้, admin แก้ไขได้

### RPC Functions

| Function | คำอธิบาย |
|---------|---------|
| `get_feeders()` | ดึงรายชื่อ Feeder ที่ไม่ซ้ำ |
| `get_dashboard_stats()` | สถิติ meter_count, tr_count, total_kva, pea_meters, cust_meters, pea_tr, cust_tr, top_feeders |

---

## Environment

ไม่มี `.env` file — ใส่ key ใน `project/config.js` โดยตรง  
(ระบบใช้ `anon` key + RLS ในการควบคุมสิทธิ์ ไม่ได้ expose `service_role` key)
