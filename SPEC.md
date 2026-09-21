# Hospital TV Media Management System (Thoen Media TV) Spec

## Problem Statement

โรงพยาบาลเถินมีโทรทัศน์ติดตั้งอยู่ตามจุดบริการต่างๆ ทั่วโรงพยาบาล (เช่น แผนกผู้ป่วยนอก OPD, แผนกอุบัติเหตุ-ฉุกเฉิน ER, ห้องจ่ายยา, จุดประชาสัมพันธ์ และตึกอำนวยการ) แต่เดิมการเผยแพร่สื่อประชาสัมพันธ์ สาระความรู้สุขภาพ และประกาศของโรงพยาบาล ทำได้ยากและล่าช้า ต้องนำ Flash drive ไปเสียบตามทีวีทีละเครื่อง ไม่สามารถควบคุมจากจุดศูนย์กลางได้ ไม่สามารถตั้งเวลาแสดงผลอัตโนมัติตามช่วงเวลาเปิด-ปิดบริการ และไม่สามารถอัปเดตข้อมูลได้แบบทันทีทันใด (Real-time) นอกจากนี้ สื่อที่มีปริมาณมากยังขาดการจัดหมวดหมู่ที่เป็นระเบียบบนฮาร์ดดิสก์เซิร์ฟเวอร์

## Solution

ระบบเว็บแอปพลิเคชันภายใน (Internal Web Management System) แบบรวมศูนย์สำหรับผู้ดูแลระบบคนเดียว สามารถอัปโหลด จัดหมวดหมู่ในโฟลเดอร์จริงบนเซิร์ฟเวอร์ จัดทำ Playlist กำหนดระยะเวลาและตั้งช่วงเวลาแสดงผลล่วงหน้าแบบเจาะจงวันและเวลา และส่งสัญญาณแสดงผลไปยังจอทีวีแต่ละเครื่องผ่าน Custom URL Slug ที่ระบุตำแหน่งได้ชัดเจน พร้อมด้วยระบบ WebSockets (Socket.io) ที่ซิงค์เนื้อหาและการเปลี่ยนแปลงตารางเวลาลงบนหน้าจอทีวีทุกจุดได้แบบเรียลไทม์ทันทีโดยไม่ต้องมีเจ้าหน้าที่ไปกดรีเฟรชหน้าจอ

## User Stories

1. As a hospital PR administrator, I want to log in using a single administrative credential, so that I can securely manage hospital media displays without unauthorized access.
2. As a hospital PR administrator, I want to access dedicated functional pages (/upload, /playlist, /tv), so that I can quickly bookmark and navigate each management area.
3. As a hospital PR administrator, I want to create named folders with Thai language support, so that I can categorize media files into departments and topics.
4. As a hospital PR administrator, I want folder creation to create actual physical directories on disk, so that the underlying server filesystem is well-structured and manageable.
5. As a hospital PR administrator, I want to upload multiple images (JPG, PNG, GIF, WebP) and videos (MP4, WebM) via drag-and-drop or file picker, so that I can quickly import hospital media.
6. As a hospital PR administrator, I want uploaded files to be saved directly into the currently selected physical folder, so that media files are neatly organized on disk from the start.
7. As a hospital PR administrator, I want to move already-uploaded media files between folders, so that both the database record and the physical disk location update accordingly.
8. As a hospital PR administrator, I want to preview uploaded images and watch videos in full resolution, so that I can verify their visual quality before putting them on public screens.
9. As a hospital PR administrator, I want to rename and delete folders, so that physical directories and contained files are moved or removed safely.
10. As a hospital PR administrator, I want to delete unwanted media files, so that storage space is reclaimed from both database and physical filesystem.
11. As a hospital PR administrator, I want to create and name multiple playlists with descriptions, so that I can prepare specialized media sequences for different areas of the hospital.
12. As a hospital PR administrator, I want to add multiple media files into a playlist, so that they form a continuous playback loop.
13. As a hospital PR administrator, I want to adjust the playback duration in seconds for each image in a playlist, so that patients and visitors have sufficient time to read information.
14. As a hospital PR administrator, I want videos in a playlist to automatically play for their full natural duration, so that video clips are never cut off prematurely.
15. As a hospital PR administrator, I want to reorder items in a playlist up and down, so that media appears in the exact sequence intended.
16. As a hospital PR administrator, I want to temporarily enable or disable specific playlist items, so that I can pause a slide without deleting it.
17. As a hospital PR administrator, I want to schedule a specific start date and time for a playlist item, so that morning health announcements or event slides only begin appearing when relevant.
18. As a hospital PR administrator, I want to schedule a specific end date and time for a playlist item, so that expired vaccination campaigns or temporary service notices disappear automatically.
19. As a hospital PR administrator, I want clear visual status badges (Always Active, Currently Active by Schedule, Upcoming, Expired, Paused), so that I can audit the live status of all slides at a glance.
20. As a hospital PR administrator, I want to register physical TV screens with human-readable names and location notes, so that I can track where each screen is situated.
21. As a hospital PR administrator, I want to assign custom URL slugs to each TV (e.g., `/tv/opd-1`, `/tv/drug-1`, `/tv/emergency`), so that hospital smart TVs can be easily configured with clean, static URLs.
22. As a hospital PR administrator, I want to assign or swap playlists assigned to any TV, so that the screen content changes immediately without modifying physical TV hardware.
23. As a hospital PR administrator, I want to monitor the online/offline status of all TVs in real-time, so that I can immediately detect if a TV display is disconnected or powered off.
24. As a hospital PR administrator, I want a 1-click preview link to open any TV's display player in a new browser tab, so that I can view what patients are currently seeing.
25. As a hospital TV client display, I want to open `/tv/:slug` in fullscreen mode, so that media fills the screen without any web browser chrome, navigation bars, or cursor distraction.
26. As a hospital TV client display, I want an automatic continuous playback loop, so that the display runs unattended 24 hours a day without manual intervention.
27. As a hospital TV client display, I want to evaluate media schedules on a second-by-second basis, so that a scheduled slide appears the exact moment its start time arrives without needing a browser reload.
28. As a hospital TV client display, I want to remove expired slides from the loop dynamically, so that out-of-date slides never show on screens.
29. As a hospital TV client display, I want to receive real-time Socket.io events when playlists change, so that newly added media or changed order applies immediately.
30. As a hospital TV client display, I want periodic background sync and heartbeat pings, so that the TV stays registered as online and synchronizes even if a socket disconnects temporarily.
31. As a hospital TV client display, I want a semi-transparent hospital overlay badge and live clock, so that patients and staff can always check the current official time while watching informative media.
32. As a hospital TV client display, I want on-screen video mute/unmute and fullscreen toggles on mouse movement, so that technicians on-site can configure audio when setting up new displays.

## Implementation Decisions

- **Single Express + Socket.io Server Architecture**: Express handles REST APIs, static file delivery, and WebSocket connection handling on a unified port (`3000`), proxying Vite during development (`5173`) and serving production assets from `dist/`.
- **Direct Physical Directory Mapping**: Folders are mirrored 1:1 on the filesystem under `uploads/<folder_name>/`. Uploads to a folder place files into that directory; moving files across folders executes `fs.renameSync` and updates `file_path` in `media_files`.
- **Explicit MySQL UTF-8 (TIS-620 Server Compatibility)**: The MySQL server defaults to `tis620`. The application enforces `charset: 'utf8mb4'`, `dateStrings: true`, and executes `SET NAMES 'utf8mb4'` on every pooled connection, preventing character corruption in Thai text.
- **Client-Side Second-by-Second Dynamic Schedule Filtering**: The public TV endpoint returns all active playlist items with their literal `start_time` and `end_time` strings (`YYYY-MM-DD HH:mm:ss`). The TV player evaluates `isItemActiveNow` against a local 1-second clock tick. This guarantees zero-reload transitions when a scheduled time arrives.
- **Dedicated Route Hierarchy**: Admin UI uses React Router with explicit browser paths (`/upload`, `/playlist`, `/tv`) wrapped in an authenticated layout, while `/tv/:slug` remains an unauthenticated, full-bleed signage canvas.
- **Single-User Authentication**: Auth relies on a single seeded administrator in `users` with bcrypt-hashed passwords and JSON Web Tokens stored in `localStorage`. Registration endpoints are strictly disabled.

## Testing Decisions

- **Behavioral End-to-End Seams**:
  - API Seam: REST endpoints tested using HTTP requests verifying status codes, headers, and JSON payloads (Auth, Folders, Media upload/move, Playlists reorder/schedule, TV slugs).
  - Database Seam: Verification of table schemas, UTF-8 Thai text preservation, and `dateStrings` correctness across connections.
  - Filesystem Seam: Direct assertion of directory existence (`fs.existsSync`) upon folder creation, rename, file move, and folder deletion.
  - Real-time Seam: Socket event emission verification when modifying playlists and observing client response.
  - Schedule Clock Seam: Verification that passing time boundaries (`start_time`, `end_time`) accurately transitions TV player state from waiting screen to active media loop.

## Out of Scope

- Multi-tenant or role-based user management (system is strictly designed for a single admin).
- Direct on-server video transcoding/compression (MP4 and WebM formats must be prepared prior to upload).
- Complex multi-zone split screen layouts (e.g. 3-way split with RSS tickers and live queue numbers).
- Third-party cloud storage integration (files reside on the local hospital server storage).

## Further Notes

- Production deployment can run as a background service via PM2 or Windows Task Scheduler using `npm start`.
- Hospital TVs with built-in Android / Smart TV browsers can be configured with Kiosk mode or auto-launch URL pointing to `http://<server-ip>:3000/tv/<slug>`.
