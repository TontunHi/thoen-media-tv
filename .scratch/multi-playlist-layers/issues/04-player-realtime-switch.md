# 04: Player Client Instant Switch & Real-time Schedule Evaluation

**What to build:**
กลไกในหน้า Player Client สำหรับตรวจสอบเงื่อนไขเวลาของ Playlist Layers อย่างสม่ำเสมอ และทำการสลับทันที (Instant Switch) ไปยัง Playlist ใหม่เมื่อถึงเวลาที่ Priority ชั้นสูงกว่า Active ขึ้นมา

**Blocked by:**
- 02: API Endpoints for Screen Playlist Schedules

**Status:** completed

- [x] เพิ่ม Interval ทุก 15 วินาทีใน [TVPlayer.tsx](file:///c:/Users/Tontun/Documents/thoen-media-tv/components/tv/TVPlayer.tsx) เพื่อตรวจสอบ schedule อัตโนมัติ
- [x] รองรับ Instant Switch ทันทีที่ Playlist active มีการเปลี่ยน layer (รีเซ็ตเล่นสื่อตัวแรกของ Playlist ใหม่ทันที)
- [x] รองรับ SSE Event (`SCREEN_RELOAD`, `PLAYLIST_UPDATED`) เมื่อแอดมินบันทึกการเปลี่ยนแปลง
- [x] เล่นวนซ้ำเฉพาะ Playlist ที่ Active อยู่รายการเดียว ไม่มีการวนข้ามไป Playlist ถัดไป
