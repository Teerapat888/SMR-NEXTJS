# Smart ER - Hospital Queue Management System

ระบบจัดการคิวและเตียงผู้ป่วยห้องฉุกเฉิน (Emergency Room) สำหรับใช้งานในวง LAN ภายในโรงพยาบาล

## Features

- **Patient Registration** - ลงทะเบียนผู้ป่วย สร้าง HN อัตโนมัติ พร้อม Barcode (CODE128)
- **Bed Management** - จัดการเตียง 38 เตียง (หลัก 1-28, ชั่วคราว 29-38)
- **ESI Triage** - ประเมินระดับความเร่งด่วน 5 ระดับ พร้อมสีแสดงผล
- **Queue System** - ระบบเรียกคิวพร้อมเสียง TTS
- **PWA Support** - ติดตั้งเป็นแอพบน Tablet แต่ละเตียง เปิดตรงไปที่เตียงนั้นๆ
- **Theme System** - 6 ธีมสีให้เลือก
- **Role-based Access** - admin / nurse / triage
- **Offline Ready** - ฟอนต์และไฟล์ทั้งหมดอยู่ใน Local ไม่ต้องใช้อินเทอร์เน็ต

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS v4
- **Backend**: Next.js App Router API Routes
- **Database**: MySQL (mysql2/promise)
- **Auth**: NextAuth.js v5 (JWT)
- **Font**: Sarabun (self-hosted)

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL Server (e.g. XAMPP)

### Installation

1. Clone repository
   ```bash
   git clone https://github.com/Teerapat888/SMR-NEXTJS.git
   cd SMR-NEXTJS
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Setup database
   ```bash
   mysql -u root < smart_tech_setup.sql
   ```

4. Create `.env` file
   ```env
   DATABASE_URL="mysql://root:@127.0.0.1:3306/smart-tech"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

5. Run development server
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Default Users

| Username | Password | Role   |
|----------|----------|--------|
| admin    | 1234     | admin  |
| nurse1   | 1234     | nurse  |
| triage1  | 1234     | triage |

## Project Structure

```
src/
├── app/
│   ├── api/            # API Routes
│   ├── bed/            # Bed management pages
│   ├── dashboard/      # Dashboard
│   ├── login/          # Login page
│   ├── queue/          # Queue management
│   ├── register/       # Patient registration
│   ├── settings/       # System settings
│   └── view/           # Queue display view
├── components/         # Shared components
├── lib/                # Database, auth, helpers
└── types/              # TypeScript type definitions
```
