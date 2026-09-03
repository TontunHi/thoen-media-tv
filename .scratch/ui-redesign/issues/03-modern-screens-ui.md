# 03: Modern Screen Management & Layer Scheduling UI

**What to build:**
ปรับปรุงหน้าจอแสดงรายการ Screens ([app/(admin)/admin/screens/page.tsx](file:///c:/Users/Tontun/Documents/thoen-media-tv/app/(admin)/admin/screens/page.tsx)) และหน้าตั้งค่า/จัดลำดับ Layer ([app/(admin)/admin/screens/[id]/page.tsx](file:///c:/Users/Tontun/Documents/thoen-media-tv/app/(admin)/admin/screens/[id]/page.tsx)) ให้ดูโมเดิร์น สวยงาม สบายตา จัดวางการตั้งค่าและตารางเลเยอร์อย่างเป็นระเบียบ

**Blocked by:**
- 01: Modern Admin Layout & Navigation Shell

**Status:** completed

- [x] หน้า Screens list: ออกแบบ Card รายการจอทีวีใหม่ แสดงสถานะ Online สีเขียวเรืองแสง (Ping indicator), URL chip, และปุ่ม Action สวยงาม
- [x] หน้าแก้ไข Screen: ปรับแต่ง Form inputs ขอบมน `rounded-xl`, Focus ring นุ่มนวล
- [x] ส่วน Playlist Layers & Schedule: ตกแต่ง Card แต่ละ Priority ให้มีมิติ, แสดง Badge "Active บนจอ" แบบชัดเจน พร้อมตัวเลือกวันเวลาที่สะอาดตา
