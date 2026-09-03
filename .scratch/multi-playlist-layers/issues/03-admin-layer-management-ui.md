# 03: Admin UI for Managing Playlist Layers and Schedules

**What to build:**
ส่วนต่อประสานผู้ใช้ (Admin UI) ในหน้าจอตั้งค่า Screen สำหรับเพิ่ม Playlist หลายรายการ, จัดเรียงลำดับความสำคัญ (Priority: บนลงล่าง), กำหนด Start/End Date Time และแสดงสถานะ Active ณ ปัจจุบัน

**Blocked by:**
- 02: API Endpoints for Screen Playlist Schedules

**Status:** completed

- [x] เพิ่ม UI ส่วนจัดการ "Playlist Layers & Schedule (ลำดับความสำคัญ)" ในหน้าตั้งค่า Screen
- [x] รองรับการเพิ่ม Playlist เข้าสู่ Layer และลบออก
- [x] รองรับการสลับ/จัดเรียงลำดับ Priority (เลื่อนขึ้น/ลง เพื่อปรับ Priority บนลงล่าง)
- [x] มีช่อง `datetime-local` กำหนดวันเวลาเริ่มและสิ้นสุด (หรือเว้นว่างไว้เป็น Always Active)
- [x] มี Indicator แสดงสถานะแบบเรียลไทม์ว่า Layer ไหนกำลัง "Active (กำลังเล่นบนจอ)"
