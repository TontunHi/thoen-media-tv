# 02: API Endpoints for Screen Playlist Schedules

**What to build:**
API Endpoints สำหรับดึงและบันทึกข้อมูล Playlist Layers ของ Screen รวมถึงการอัปเดต Screen API สำหรับ Player ให้คืนค่า Playlist ที่ผ่านการคำนวณ Priority ณ ปัจจุบัน

**Blocked by:**
- 01: Database Schema & Priority Resolution Engine

**Status:** completed

- [x] สร้าง API `GET /api/screens/[screenSlug]/schedules` คืนรายการ Schedules เรียงตาม Priority
- [x] สร้าง API `PUT /api/screens/[screenSlug]/schedules` สำหรับเพิ่ม/แก้ไข/ลบ/จัดเรียง Priority และช่วงเวลา
- [x] ปรับปรุง Screen API (`GET /api/screens/[screenSlug]`) ให้ประเมินและส่ง Playlist ที่ Active สูงสุด ณ ขณะนั้น
- [x] ส่ง Notification event ผ่าน `appEmitter` เมื่อมีการอัปเดตเลเยอร์
