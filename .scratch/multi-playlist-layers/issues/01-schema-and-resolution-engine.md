# 01: Database Schema & Priority Resolution Engine

**What to build:**
ขยาย Prisma Schema เพื่อรองรับ Multi-Playlist Layers พร้อม Priority และ Schedule วันเวลาเริ่มต้น-สิ้นสุด และสร้าง Core Resolver Function สำหรับคัดเลือก Playlist ที่ Active และมี Priority สูงสุด ณ เวลาที่กำหนด พร้อม Unit Tests

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] เพิ่มโมเดล `ScreenPlaylistSchedule` ใน `prisma/schema.prisma` พร้อมความสัมพันธ์กับ `Screen` และ `Playlist`
- [x] รัน migration หรือ generate Prisma client สำเร็จ
- [x] สร้าง Resolver function `resolveActiveSchedule(schedules, currentTime)` ที่เลือก Playlist ลำดับ 1 ที่เวลาปัจจุบันอยู่ในช่วง active
- [x] หากช่วงเวลาเป็น null/empty ให้ถือว่า active ตลอดเวลา
- [x] ทดสอบกรณี Priority สูงกว่าแย่งเล่นทันที, กรณีหมดเวลา, และกรณียังไม่ถึงเวลา
