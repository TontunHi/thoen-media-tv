# Spec: Modern Clean & Premium UX/UI Redesign

## Problem Statement

ระบบ Admin Dashboard ปัจจุบันของ Thoen Media TV มีการใช้งานที่ทำงานได้ถูกต้องครบถ้วน แต่รูปแบบ UI และ UX ยังเป็นสไตล์เบื้องต้น (Basic utility form & table):
- ขอบมนเล็กและเงาแข็ง (Box shadow แบบมาตรฐาน)
- ขาดมิติความลึก (Depth), Micro-interactions, Badges และ Hierarchy ของข้อความ
- หน้ารายการ Screens, Playlists และ Media Card ยังขาดลูกเล่นที่ช่วยให้การบริหารจัดการหน้าจอทีวีดูโมเดิร์น สวยงาม พรีเมียม ใช้งานสะดวก คล้ายกับ Modern Digital Signage SaaS ระดับสากล

## Solution

ยกเครื่องการออกแบบ UX/UI ใหม่ทั้งระบบในสไตล์ **"Modern Clean & Premium"**:
1. **Design System & Shell (Layout & Navigation):**
   - ออกแบบ Sidebar ใหม่ให้มีความโปร่งตา ขอบมน `rounded-2xl`, Active link แบบ Subtle Gradient + Soft Glow, ไอคอนคมชัด
   - Header พร้อม Breadcrumbs, Quick Status Indicator, และ Profile/Logout ที่หรูหรา
2. **Dashboard Overview:**
   - Stat Cards ใหม่ที่มี Gradient accent เบาๆ, Micro-badge, ไอคอนสวยงามพร้อม Hover micro-interaction
   - ส่วน Quick Actions และ Recent Activity/Screen Status Overview ที่ชัดเจน เข้าถึงง่าย
3. **Screen Management & Layers UI:**
   - Card แสดงรายการหน้าจอพร้อมสถานะ Online/Offline แบบ Glowing Live Dot
   - หน้าตั้งค่า Screen และ Multi-Playlist Layers ที่จัดระเบียบตาราง ลำดับความสำคัญ และ Date/Time Pickers ให้ดูคลีน มินิมอล มีมิติ สวยงาม
4. **Playlist Editor:**
   - การจัดเรียงลำดับสื่อ (Drag & Drop / Reorder) มีการ์ดพรีวิวรูปภาพขนาดใหญ่ขึ้น ข้อมูลระยะเวลาชัดเจน ปรับแต่งได้ง่าย
5. **Media Library:**
   - แกลเลอรีสื่อที่รองรับ Folder Navigation สไตล์ Finder/Drive, Grid cards ขอบมน นุ่มนวล พรีวิวภาพและวิดีโอได้อย่างรวดเร็ว

---

## User Stories

1. As an admin, I want a modern, cohesive navigation sidebar and header, so that I can easily move between screens, playlists, and media with visual delight.
2. As an admin, I want key dashboard statistics with clear visual indicators, so that I can immediately grasp the health and online status of all TV displays.
3. As an admin, I want screen management cards to display live online status with subtle glow and clear details, so that I can monitor my displays effectively.
4. As an admin, I want the multi-playlist layers and scheduling interface to look organized, clean, and intuitive, so that I can schedule campaigns without confusion.
5. As an admin, I want the media library and folder tabs to feel fluid and responsive, with crisp thumbnails and simple drag-to-upload or move-folder interactions.
6. As an admin, I want smooth transitions, hover effects, and modern feedback alerts, so that the application feels like a high-end enterprise software.

---

## Implementation Decisions

1. **Design Language:**
   - Primary Palette: Modern Indigo / Slate Blue with Emerald accent for live online states.
   - Backgrounds: Subtle slate-gray backdrop (`bg-slate-50/60`), white surface cards with soft ambient shadows (`shadow-sm hover:shadow-md transition-all`), and rounded corners (`rounded-2xl`, `rounded-xl`).
   - Typography: Clean hierarchy, subtle muted secondary text (`text-slate-500`), bold headers.

2. **Component Upgrades:**
   - `AdminLayout`: Clean backdrop, modern sidebar with subtle active pills, glassmorphism mobile drawer.
   - `AdminDashboardPage`: Refined metrics cards with icons inside soft-tinted backgrounds, cleaner quick actions with interactive hover states.
   - `ScreensPage` & `EditScreenPage`: Modern grid/card view, live online badge with ping effect, polished playlist priority layer stack.
   - `PlaylistsPage` & `EditPlaylistPage`: Clean media list with duration pills and instant visual feedback.
   - `MediaPage`: Modern tabbed folder bar, rounded media cards with hover overlay controls and badge metadata.

---

## Testing Decisions

- ตรวจสอบความถูกต้องของ Responsive Layout ทั้งบน Desktop และ Mobile Drawer
- ตรวจสอบว่า Functionality เดิมทั้งหมดยังคงทำงานได้อย่างสมบูรณ์ (การบันทึก, อัปโหลด, Drag-and-drop, ลบ, จัดลำดับ, ตรวจสอบเวลา)
- รัน TypeScript type-checking (`tsc --noEmit`) ให้ผ่านสมบูรณ์ 100%

---

## Out of Scope

- การเปลี่ยนเอนจินของฐานข้อมูลหรือโครงสร้าง API
- การแก้ไขหน้าเครื่องเล่นทีวีปลายทาง (`TVPlayer.tsx`) นอกเหนือจากความสวยงามพื้นฐาน เนื่องจากหน้านั้นต้องเน้น Fullscreen สำหรับจอแสดงผลอยู่แล้ว
