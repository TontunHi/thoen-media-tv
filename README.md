# 📺 Thoen Media TV (Digital Signage Management System)

ระบบจัดการป้ายดิจิทัลและสื่อประชาสัมพันธ์บนจอทีวี (Digital Signage) แบบ Real-time พัฒนาด้วย Next.js, React, Tailwind CSS และ SQLite (Prisma ORM)

---

## 📖 คู่มือการติดตั้งและใช้งาน (Installation & Setup)

ดูคู่มือการติดตั้งแบบละเอียดได้ในไฟล์ [INSTALLATION_GUIDE.txt](INSTALLATION_GUIDE.txt) หรือปฏิบัติตามขั้นตอนด้านล่าง:

### 1. ความต้องการของระบบ (Prerequisites)
- **Node.js**: v20.x หรือ v22.x LTS ขึ้นไป
- **Git**

### 2. ขั้นตอนการติดตั้ง (Installation)

```bash
# 1. Clone โปรเจกต์
git clone https://github.com/TontunHi/thoen-media-tv.git
cd thoen-media-tv

# 2. ติดตั้ง Dependencies
npm install

# 3. เตรียมไฟล์ Environment
cp .env.example .env

# 4. สร้าง Database และข้อมูลเริ่มต้น
npx prisma db push
npx tsx prisma/seed.ts
```

* บัญชีผู้ดูแลเริ่มต้น:
  - **Username**: `admin`
  - **Password**: `admin123`

---

### 3. การรันระบบ (Running)

#### พัฒนาและทดสอบ (Development)
```bash
npm run dev
```
เปิดใช้งานผ่านเบราว์เซอร์ที่: `http://localhost:3000`

#### ใช้งานจริง (Production)
```bash
npm run build
npm start
# หรือรันผ่าน PM2
pm2 start ecosystem.config.js
```
