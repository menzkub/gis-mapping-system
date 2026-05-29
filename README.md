[README(1).md](https://github.com/user-attachments/files/28375838/README.1.md)
# ระบบสารสนเทศภูมิศาสตร์ · กฟอ.ฝาง

> ระบบค้นหาและแสดงผลมิเตอร์ไฟฟ้า & หม้อแปลงบนแผนที่ สำหรับเจ้าหน้าที่การไฟฟ้าส่วนภูมิภาค

![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-222?logo=github)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase)
![Leaflet](https://img.shields.io/badge/Map-Leaflet%201.9-199900?logo=leaflet)

---

## ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 🔍 ค้นหาอย่างรวดเร็ว | ค้นหาด้วย TAG, PEANO, เลขบัญชี หรือ Feeder ได้ทันที |
| 🗺️ แผนที่หลายรูปแบบ | Satellite / Street / Dark Mode |
| 📍 Cluster Map | แสดงกลุ่มอุปกรณ์บนแผนที่ ดูภาพรวมพื้นที่ได้ง่าย |
| 🔥 Heatmap | แสดงความหนาแน่นของอุปกรณ์ในพื้นที่ |
| 🧭 นำทาง | เปิด Google Maps นำทางไปยังตำแหน่งอุปกรณ์ |
| 📋 คัดลอกพิกัด | คัดลอก Lat/Lng ด้วยคลิกเดียว |
| 🌙 Dark / Light Mode | ปรับธีมได้ตามความต้องการ |
| 📱 Responsive | รองรับ Desktop, Tablet และ Mobile |

---

## สิทธิ์การใช้งาน

| Role | สิทธิ์ |
|---|---|
| **User** | ค้นหา, ดูแผนที่, ดูข้อมูลส่วนตัว |
| **Admin** | ทุกอย่างของ User + จัดการผู้ใช้, CRUD ข้อมูล, Import CSV, Audit Log |

---

## เทคโนโลยีที่ใช้

```
Frontend   │ React 18 (CDN) + Babel (No build step)
Map        │ Leaflet 1.9.4 + Leaflet.heat + Leaflet.markercluster
Backend    │ Supabase (PostgreSQL + Auth + RLS)
Hosting    │ GitHub Pages (Static)
Auth       │ Supabase Auth (Email/Password)
```

---

## โครงสร้างไฟล์

```
├── index.html          # Entry point — โหลด CDN และไฟล์ทั้งหมด
├── config.js           # Supabase client + Row mappers
├── components.jsx      # Icon, Modal, Toast, StatCard, helpers
├── AuthScreen.jsx      # Login / Signup / Forgot Password
├── app.jsx             # Root App, Auth state, Sidebar, Inactivity timer
├── SearchView.jsx      # หน้าค้นหาหลัก (Map + Table + Split view)
├── MapView.jsx         # Leaflet map, Cluster, Heatmap, Popups
├── AdminPanel.jsx      # Dashboard, Users, Meters, TRs, Import, Audit
├── styles.css          # CSS + Dark mode + Responsive breakpoints
└── robots.txt          # noindex — ป้องกัน Search Engine crawl
```

---

## ฐานข้อมูล (Supabase)

```sql
profiles      -- ข้อมูลผู้ใช้งาน (id, username, name, role, status)
meters        -- ข้อมูลมิเตอร์ (tag, peano, feederid, lat, lng ...)
transformers  -- ข้อมูลหม้อแปลง (tag, peano_tr, kva, feeder1, lat, lng ...)
audit_log     -- บันทึกกิจกรรมทั้งหมด (action, username, detail, ip)
```

> ✅ Row Level Security (RLS) เปิดอยู่ครบทุกตาราง

---

## ความปลอดภัย

- 🔒 RLS ป้องกันการเข้าถึงข้อมูลโดยไม่ผ่าน Auth
- 🔐 Password ต้องผ่านเกณฑ์ความปลอดภัยสากล (8+ ตัว, ตัวใหญ่, ตัวเล็ก, ตัวเลข, อักขระพิเศษ)
- ⏱️ Auto-logout เมื่อไม่มีการใช้งาน 30 นาที
- 📋 Audit Log บันทึกทุกกิจกรรม (login, logout, เปลี่ยนรหัสผ่าน, ค้นหา)
- 🚫 robots.txt + noindex ป้องกัน Search Engine

---

## การ Deploy

1. แก้ไขไฟล์ใน repository
2. อัปโหลดขึ้น GitHub (Add file → Upload files)
3. GitHub Pages auto-deploy ภายใน 1-2 นาที

---

*พัฒนาโดยทีม IT · กฟอ.ฝาง · © 2026*
