# Thoen Media TV

ระบบบริหารจัดการสื่อโทรทัศน์โรงพยาบาลเถิน จ.ลำปาง (Hospital Digital Signage Management System)

---

## ฟีเจอร์หลัก (Features)

- **คลังจัดการสื่อ (Media Assets)**: อัปโหลดรูปภาพ (JPG, PNG, GIF, WebP) และวิดีโอ (MP4, WebM) โดยจัดเก็บลงโฟลเดอร์จริงบนฮาร์ดดิสก์เซิร์ฟเวอร์
- **จัดสรร Playlist & Storyboard**: จัดเรียงลำดับสื่อแบบลากวาง (Drag & Drop) กำหนดเวลาแสดงผล และตั้งช่วงเวลาเริ่มต้น-สิ้นสุดอัตโนมัติ
- **จัดการจอทีวี (TV Displays)**: ผูก Playlist เข้ากับจอทีวีผ่าน Custom URL Slug เช่น `/tv/opd-1`, `/tv/drug-1`
- **ระบบเล่นวนลูปอัตโนมัติ (TV Player)**: เล่นแบบ Fullscreen ตลอด 24 ชม. ไม่สะดุดเมื่อมีสื่อรายการเดียว วิดีโอเล่นตามความยาวจริง และสลับคิวสื่อใหม่ทันทีเมื่อถึงเวลาที่กำหนด
- **ซิงค์แบบเรียลไทม์ (Socket.io)**: สั่งเปลี่ยนสื่อและอัปเดตสถานะจอออนไลน์ทันทีโดยไม่ต้องไปกดรีเฟรชที่เครื่องทีวี

---

## การติดตั้งและการเริ่มใช้งาน (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables)
คัดลอกไฟล์ `.env.example` ไปเป็น `.env` และกำหนดค่าฐานข้อมูล MySQL:
```bash
cp .env.example .env
```

### 3. เริ่มต้นรันเซิร์ฟเวอร์
- **Development (Backend + Frontend Hot-Reload):**
  ```bash
  npm run dev
  ```
- **Production Build:**
  ```bash
  npm run build
  npm start
  ```
- **เข้าใช้งานระบบ:**
  - ฝั่งผู้ดูแลระบบ: `http://localhost:3000/`
  - ฝั่งหน้าจอทีวี: `http://localhost:3000/tv/<slug>`
