# Spec: Multi-Playlist Layer & Priority Scheduling System

## Problem Statement

เดิมทีวีหรือหน้าจอ (Screen) 1 จอสามารถกำหนดผูกติดได้เพียง Playlist เดียว (`screen.playlistId`) ทำให้ไม่สามารถตั้งเวลาล่วงหน้า หรือจัดลำดับความสำคัญ (Priority Layer) ของ Playlist หลากหลายชุดได้ เช่น ในกรณีที่ต้องการให้แสดง Playlist กิจกรรมพิเศษในระหว่างวันที่ 25/09/2026 - 30/09/2026 และเมื่อยังไม่ถึงเวลา หรือเมื่อหมดเวลา ให้สลับกลับไปเล่น Playlist ปกติหรือ Playlist สำรองอันดับถัดไปโดยอัตโนมัติ

## Solution

เพิ่มระบบ **Multi-Playlist Layers with Priority & Schedule** ให้กับ Screen:
1. แต่ละ Screen สามารถกำหนดรายการ Playlist ได้หลายชุด โดยจัดเรียงเป็นชั้นลำดับความสำคัญ (Layer/Priority จากบนลงล่าง: อันดับ 1 มี Priority สูงสุด)
2. แต่ละ Playlist Layer สามารถระบุช่วงวันเวลาเริ่มต้น (`startDate` / `startTime`) และสิ้นสุด (`endDate` / `endTime`) ได้ (หากไม่ระบุถือว่า Active ตลอดเวลา ทำหน้าที่เป็น Default/Fallback Layer)
3. ระบบจะเลือก Playlist ที่ **Active อยู่ ณ เวลาปัจจุบัน และมี Priority สูงสุด** เพียง 1 รายการเพื่อนำไปเล่นวนลูปบนจอ โดยไม่มีการวนไปเล่น Playlist ถัดไปปะปนกัน
4. หน้าจอเครื่องเล่น (Player) จะมีกลไกตรวจสอบเวลาแบบ Real-time / Polling เพื่อทำการสลับ (Instant Switch) ไปยัง Playlist ที่มี Priority สูงกว่าทันทีเมื่อถึงกำหนดเวลา

---

## User Stories

1. As a system admin, I want to assign multiple playlists to a single screen, so that I can organize content layers without replacing previous setups.
2. As a system admin, I want to define the priority order (top to bottom) of assigned playlists, so that high-priority playlists take precedence when active.
3. As a system admin, I want to set a start date/time and end date/time for each playlist layer, so that campaign/event media displays automatically during that specific period.
4. As a system admin, I want to omit the start/end schedule for a playlist layer, so that it can serve as a persistent fallback/base playlist whenever no scheduled playlist is active.
5. As a system admin, I want to reorder the playlist priority via an intuitive drag-and-drop or re-ranking UI in the screen management dashboard.
6. As a TV screen player, I want to periodically evaluate active schedules, so that I switch instantly to a higher-priority playlist the moment its schedule begins.
7. As a TV screen player, I want to continuously loop only the single highest-priority active playlist, so that content from lower-priority layers is not mixed in.
8. As a system admin, I want backwards compatibility with existing single-playlist setups, so that screens with an existing `playlistId` continue functioning without regression.

---

## Implementation Decisions

1. **Data Model (`ScreenPlaylistSchedule`):**
   - เพิ่มโมเดลเชื่อมโยงความสัมพันธ์ระหว่าง `Screen` และ `Playlist`:
     - `id`: String (Primary Key)
     - `screenId`: String (Foreign key to `Screen`, cascade delete)
     - `playlistId`: String (Foreign key to `Playlist`, cascade delete)
     - `priority`: Int (1 = สูงสุด, 2, 3...)
     - `startDate`: DateTime? (Nullable)
     - `endDate`: DateTime? (Nullable)
     - `startTime`: String? (Nullable, รูปแบบ "HH:mm")
     - `endTime`: String? (Nullable, รูปแบบ "HH:mm")
     - `isActive`: Boolean (Default true)
   - คงฟิลด์ `Screen.playlistId` ไว้เพื่อเป็น legacy fallback

2. **Resolution Engine (Priority Resolution Algorithm):**
   - ฟังก์ชันคัดกรอง Playlist ที่ Active ณ เวลา $T$:
     - ตรวจสอบ `isActive == true`
     - ตรวจสอบช่วงวันเวลา (`startDate`, `endDate`, `startTime`, `endTime`) หากไม่ได้ระบุถือว่า Active ตลอดเวลา
     - เรียงลำดับตาม `priority ASC` (น้อยไปมาก = สำคัญมากไปน้อย)
     - เลือก Playlist แรกสุดที่เงื่อนไขถูกต้อง
     - หากไม่มีรายการใด Active ให้ใช้ `Screen.playlistId` เป็นตัวสำรอง

3. **API Contracts:**
   - `GET /api/screens/[id]/schedules`: ดึงรายการ Scheduled Playlists เรียงตามลำดับ Priority
   - `POST /api/screens/[id]/schedules`: เพิ่มหรืออัปเดต Scheduled Playlists ทั้งหมดของ Screen
   - `GET /api/player/[screenKey]`: ปรับให้คืนค่า Playlist ที่ผ่านการประเมิน Priority แล้ว พร้อมข้อมูล Next Check Interval หรือ Schedule metadata

4. **Player Client Behavior:**
   - หน้าจอเครื่องเล่น (Player) ตรวจสอบเวลาแบบ Real-time ทุก 15-30 วินาที
   - หากตรวจพบว่า Playlist ที่มี Priority สูงกว่าเริ่ม Active หรือ Playlist เดิมหมดอายุ ให้รีเฟรชหรือเปลี่ยน Playlist ทันที (Instant Switch)

---

## Testing Decisions

1. **Unit Testing:**
   - Resolution Algorithm: ทดสอบ Priority 1 ชนะ Priority 2 เมื่อ Active พร้อมกัน
   - Boundary Check: ทดสอบเวลาก่อนเริ่ม, ระหว่างช่วงเวลา, และหลังสิ้นสุด
   - Nullable Schedule: ทดสอบ Playlist ที่ไม่ใส่วันเวลาให้แสดงเมื่อไม่มี Playlist อื่นที่ Active
2. **Integration / E2E:**
   - ทดสอบ API การสร้าง/แก้ไข Layers และการตอบกลับของ Player endpoint

---

## Out of Scope

- การเล่นสลับแบบผสมสื่อจากหลาย Playlist พร้อมกัน (ยังคงเล่นทีละ 1 Playlist)
- การแบ่งหลายจอ (Screen Zones / Multi-window)
