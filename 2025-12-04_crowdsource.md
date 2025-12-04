# Crowdsourcing Feature Documentation

**Tanggal:** 4 Desember 2025  
**Status:** Planning  
**Versi:** 1.0

---

## 1. Overview

Fitur crowdsourcing memungkinkan warga untuk mengirimkan foto/video dokumentasi bencana yang sedang atau sudah terjadi. Data ini akan diverifikasi oleh admin dan ditampilkan di peta untuk membantu koordinasi respons bencana.

### Tujuan
- Mengumpulkan dokumentasi real-time dari lokasi bencana
- Memvalidasi laporan dengan geofencing
- Menyediakan data visual untuk tim responder
- Meningkatkan awareness publik tentang kondisi bencana

---

## 2. User Roles & Access

| Role | Akses |
|------|-------|
| `public` | Submit dokumentasi, lihat project aktif |
| `super_admin` | CRUD project, settings geofence, invite moderator, full access |
| `co_super_admin` | Verifikasi, lihat semua data, export |
| `moderator` | Verifikasi submissions (per project, di-invite) |
| `org_admin` | Lihat data di wilayah organisasinya |

### Moderator System
- **super_admin** dapat invite user untuk menjadi moderator per project
- Moderator di-invite via email, mendapat link untuk accept
- Permissions bisa di-customize: approve, reject, flag, export
- Moderator hanya bisa akses project yang di-assign

---

## 3. Database Schema

### Tabel: `crowdsource_projects`
```sql
CREATE TABLE crowdsource_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  disaster_type VARCHAR(50), -- flood, earthquake, fire, landslide, etc
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, closed, archived
  
  -- Location & Geofencing
  location_name VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius_km DECIMAL(5, 2) DEFAULT 5.0, -- radius dalam km
  geofence_polygon JSONB, -- untuk area tidak beraturan [{lat, lng}, ...]
  
  -- Settings
  allow_photo BOOLEAN DEFAULT true,
  allow_video BOOLEAN DEFAULT true,
  max_file_size_mb INT DEFAULT 10,
  require_location BOOLEAN DEFAULT true,
  auto_approve BOOLEAN DEFAULT false,
  
  -- Metadata
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabel: `crowdsource_submissions`
```sql
CREATE TABLE crowdsource_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  
  -- Submitter info (WAJIB)
  submitter_name VARCHAR(100) NOT NULL,
  submitter_email VARCHAR(255) NOT NULL,
  submitter_whatsapp VARCHAR(20) NOT NULL,
  
  -- Content
  media_type VARCHAR(10) NOT NULL, -- photo, video
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT NOT NULL, -- WAJIB, min 20 chars
  
  -- Location kejadian (dari minimap, bukan lokasi pengirim)
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL, -- reverse geocoded
  address_detail TEXT, -- RT/RW, patokan
  
  -- Verification
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, flagged
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Metadata
  device_info JSONB, -- browser, OS, etc
  submitted_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_media_type CHECK (media_type IN ('photo', 'video')),
  CONSTRAINT valid_caption_length CHECK (LENGTH(caption) >= 20)
);

CREATE INDEX idx_submissions_project ON crowdsource_submissions(project_id);
CREATE INDEX idx_submissions_status ON crowdsource_submissions(status);
CREATE INDEX idx_submissions_location ON crowdsource_submissions(latitude, longitude);
```

### Tabel: `crowdsource_moderators`
```sql
CREATE TABLE crowdsource_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  
  -- Permissions
  can_approve BOOLEAN DEFAULT true,
  can_reject BOOLEAN DEFAULT true,
  can_flag BOOLEAN DEFAULT true,
  can_export BOOLEAN DEFAULT false,
  
  -- Invitation
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, revoked
  
  UNIQUE(user_id, project_id)
);

CREATE INDEX idx_moderators_project ON crowdsource_moderators(project_id);
CREATE INDEX idx_moderators_user ON crowdsource_moderators(user_id);
```

### Tabel: `crowdsource_moderator_invites`
```sql
CREATE TABLE crowdsource_moderator_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES crowdsource_projects(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  
  -- Permissions to grant
  can_approve BOOLEAN DEFAULT true,
  can_reject BOOLEAN DEFAULT true,
  can_flag BOOLEAN DEFAULT true,
  can_export BOOLEAN DEFAULT false,
  
  -- Invite details
  invite_token VARCHAR(64) UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  
  UNIQUE(project_id, email)
);
```

### Tabel: `crowdsource_settings`
```sql
CREATE TABLE crowdsource_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Default settings
INSERT INTO crowdsource_settings (key, value) VALUES
  ('default_geofence_radius_km', '5'),
  ('max_submissions_per_user', '10'),
  ('allowed_file_types', '["image/jpeg", "image/png", "video/mp4"]'),
  ('moderation_enabled', 'true');
```

---

## 4. Page Structure

### 4.1 Public Pages

#### `/crowdsourcing` - List Project Aktif
```
┌─────────────────────────────────────────────────┐
│  Header: "Bantu Dokumentasi Bencana"            │
│  Subtitle: "Kirim foto/video dari lokasi"       │
├─────────────────────────────────────────────────┤
│  [Search] [Filter: Tipe Bencana] [Filter: Lokasi]│
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐               │
│  │ 🌊 Banjir   │  │ 🔥 Kebakaran│               │
│  │ Jakarta     │  │ Bandung     │               │
│  │ 12 foto     │  │ 5 foto      │               │
│  │ [Lihat]     │  │ [Lihat]     │               │
│  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────┘
```

#### `/crowdsourcing/[projectId]` - Detail Project
```
┌─────────────────────────────────────────────────┐
│  ← Kembali                                      │
│  🌊 Banjir Jakarta Selatan                      │
│  Status: AKTIF | 24 dokumentasi terverifikasi   │
├─────────────────────────────────────────────────┤
│  Deskripsi:                                     │
│  Banjir akibat hujan deras sejak 3 Des 2025... │
│                                                 │
│  📍 Lokasi: Jakarta Selatan                     │
│  📅 Periode: 3 Des - 10 Des 2025               │
│  📷 Diterima: Foto & Video                      │
├─────────────────────────────────────────────────┤
│  [🗺️ Lihat Peta] [📤 Kirim Dokumentasi]        │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │         MAP VIEW                         │   │
│  │    (markers = dokumentasi terverifikasi) │   │
│  │         🔵 🔵    🔵                      │   │
│  │      🔵      🔵                          │   │
│  │   [Geofence boundary ditampilkan]        │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Dokumentasi Terbaru:                           │
│  [Grid foto/video thumbnails]                   │
└─────────────────────────────────────────────────┘
```

#### `/crowdsourcing/[projectId]/submit` - Form Submit
```
┌─────────────────────────────────────────────────┐
│  📤 Kirim Dokumentasi                           │
│  Project: Banjir Jakarta Selatan                │
├─────────────────────────────────────────────────┤
│  1️⃣ UPLOAD MEDIA                               │
│  Tipe Media:  ○ Foto  ○ Video                   │
│  ┌─────────────────────────────────────────┐   │
│  │  [Klik untuk upload atau ambil foto]    │   │
│  │         📷 / 🎥                          │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  2️⃣ LOKASI KEJADIAN *                          │
│  ┌─────────────────────────────────────────┐   │
│  │              MINIMAP                     │   │
│  │         (klik untuk pilih lokasi)       │   │
│  │              �                          │   │
│  │  [📍 Lokasi Saya] [🔍 Cari Alamat]      │   │
│  └─────────────────────────────────────────┘   │
│  Alamat: Jl. Sudirman No. 123, Kebayoran...    │
│  Koordinat: -6.2615, 106.8106                  │
│  Detail Alamat: [RT/RW, Patokan, dll_____]     │
├─────────────────────────────────────────────────┤
│  3️⃣ DESKRIPSI MEDIA *                          │
│  ┌─────────────────────────────────────────┐   │
│  │ Jelaskan kondisi yang terlihat di       │   │
│  │ foto/video ini...                       │   │
│  │                                          │   │
│  └─────────────────────────────────────────┘   │
│  Min 20 karakter                               │
├─────────────────────────────────────────────────┤
│  4️⃣ INFORMASI PENGIRIM *                       │
│  Nama Lengkap: [________________________]       │
│  Email:        [________________________]       │
│  WhatsApp:     [+62___________________]        │
│                                                 │
│  ⚠️ Data Anda hanya digunakan untuk verifikasi │
│     dan tidak akan dipublikasikan.             │
├─────────────────────────────────────────────────┤
│  [        📤 Kirim Dokumentasi        ]        │
└─────────────────────────────────────────────────┘
* = Wajib diisi
```

### 4.2 Admin Pages

#### `/super-admin/crowdsourcing` - Dashboard
- List semua project (draft, active, closed)
- Quick stats: total submissions, pending review
- Create new project button

#### `/super-admin/crowdsourcing/[projectId]` - Manage Project
- Edit project details
- Geofence settings (radius atau polygon)
- View all submissions
- Bulk approve/reject
- Export data
- Manage moderators

#### `/super-admin/crowdsourcing/[projectId]/moderators` - Kelola Moderator
```
┌─────────────────────────────────────────────────┐
│  👥 Kelola Moderator                            │
│  Project: Banjir Jakarta Selatan                │
├─────────────────────────────────────────────────┤
│  [+ Invite Moderator]                           │
├─────────────────────────────────────────────────┤
│  Moderator Aktif (3)                            │
│  ┌─────────────────────────────────────────┐   │
│  │ 👤 Budi Santoso                          │   │
│  │    budi@email.com | ✅ Approve ✅ Reject │   │
│  │    Bergabung: 3 Des 2025                 │   │
│  │    [Edit Permissions] [Revoke]           │   │
│  ├─────────────────────────────────────────┤   │
│  │ 👤 Siti Aminah                           │   │
│  │    siti@email.com | ✅ Approve ✅ Reject │   │
│  │    Bergabung: 2 Des 2025                 │   │
│  │    [Edit Permissions] [Revoke]           │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Undangan Pending (1)                           │
│  ┌─────────────────────────────────────────┐   │
│  │ 📧 andi@email.com                        │   │
│  │    Dikirim: 4 Des 2025 | Expires: 11 Des │   │
│  │    [Resend] [Cancel]                     │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### Invite Moderator Modal
```
┌─────────────────────────────────────────────────┐
│  📧 Invite Moderator                            │
├─────────────────────────────────────────────────┤
│  Email: [________________________]              │
│                                                 │
│  Permissions:                                   │
│  ☑ Approve submissions                         │
│  ☑ Reject submissions                          │
│  ☑ Flag submissions                            │
│  ☐ Export data                                 │
│                                                 │
│  [Cancel]              [Send Invitation]        │
└─────────────────────────────────────────────────┘
```

#### `/super-admin/crowdsourcing/[projectId]/submissions` - Moderation
```
┌─────────────────────────────────────────────────┐
│  Moderasi Dokumentasi                           │
│  Filter: [Pending ▼] [Hari ini ▼]              │
├─────────────────────────────────────────────────┤
│  ┌──────┐ Foto dari: Anonim                    │
│  │ IMG  │ 📍 -6.2615, 106.8106                 │
│  │      │ 🕐 5 menit lalu                       │
│  └──────┘ "Banjir setinggi 50cm di jalan..."   │
│           [✅ Approve] [❌ Reject] [🚩 Flag]   │
├─────────────────────────────────────────────────┤
│  ┌──────┐ Video dari: Budi                     │
│  │ VID  │ 📍 -6.2620, 106.8110                 │
│  │      │ 🕐 10 menit lalu                      │
│  └──────┘ "Evakuasi warga..."                  │
│           [✅ Approve] [❌ Reject] [🚩 Flag]   │
└─────────────────────────────────────────────────┘
```

---

## 5. Geotagging Media (Lokasi Kejadian)

### 5.1 Konsep
Berbeda dengan geofencing lokasi pengirim, sistem ini menggunakan **geotagging pada media** - pengirim menandai lokasi kejadian di peta, bukan lokasi mereka saat mengirim.

### 5.2 Form Lokasi Kejadian
```
┌─────────────────────────────────────────────────┐
│  📍 Lokasi Kejadian                             │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │              MINIMAP                     │   │
│  │    (klik atau drag marker)              │   │
│  │                                          │   │
│  │              📍                          │   │
│  │         [Marker draggable]              │   │
│  │                                          │   │
│  │  [📍 Gunakan Lokasi Saya] [🔍 Cari]     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Alamat: Jl. Sudirman No. 123, Kebayoran...    │
│  Koordinat: -6.2615, 106.8106                  │
│                                                 │
│  Detail Alamat (opsional):                      │
│  [RT/RW, Patokan, dll________________]         │
└─────────────────────────────────────────────────┘
```

### 5.3 Validation Flow
```
1. User upload foto/video
   ↓
2. User pilih lokasi kejadian di minimap:
   - Klik di peta, ATAU
   - Gunakan lokasi saya (GPS), ATAU
   - Cari alamat
   ↓
3. Sistem reverse geocode → tampilkan alamat
   ↓
4. Validate lokasi dalam area project (geofence):
   - Jika radius: check distance dari pusat bencana
   - Jika polygon: check point-in-polygon
   ↓
5. Jika DALAM area → submit allowed
   Jika LUAR area → warning "Lokasi di luar area bencana"
```

### 5.4 Super Admin Geofence Settings
```
┌─────────────────────────────────────────────────┐
│  Pengaturan Area Bencana                        │
├─────────────────────────────────────────────────┤
│  Metode: ○ Radius  ○ Polygon                    │
│                                                 │
│  [Jika Radius]                                  │
│  Titik Pusat: [-6.2615] [106.8106] [📍 Pilih]  │
│  Radius: [5] km                                 │
│                                                 │
│  [Jika Polygon]                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         MAP (draw polygon)              │   │
│  │    Klik untuk menambah titik            │   │
│  │         ●───────●                       │   │
│  │        /         \                      │   │
│  │       ●───────────●                     │   │
│  └─────────────────────────────────────────┘   │
│  Titik: 4 | [Reset] [Simpan]                   │
└─────────────────────────────────────────────────┘
```

### 5.5 Geofence Utilities
```typescript
// Radius-based check
function isWithinRadius(
  mediaLat: number, mediaLng: number,
  centerLat: number, centerLng: number,
  radiusKm: number
): boolean {
  const R = 6371;
  const dLat = (centerLat - mediaLat) * Math.PI / 180;
  const dLng = (centerLng - mediaLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(mediaLat * Math.PI / 180) * Math.cos(centerLat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c <= radiusKm;
}

// Polygon-based check
function isPointInPolygon(
  point: {lat: number, lng: number},
  polygon: {lat: number, lng: number}[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    if (((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}
```

---

## 6. API Endpoints

### Public
```
GET  /api/crowdsourcing/projects          - List active projects
GET  /api/crowdsourcing/projects/:id      - Project detail
GET  /api/crowdsourcing/projects/:id/submissions - Approved submissions
POST /api/crowdsourcing/projects/:id/submit      - Submit documentation
POST /api/crowdsourcing/validate-location        - Check if within geofence
```

### Admin (super_admin, co_super_admin)
```
POST   /api/crowdsourcing/projects        - Create project
PUT    /api/crowdsourcing/projects/:id    - Update project
DELETE /api/crowdsourcing/projects/:id    - Delete project
GET    /api/crowdsourcing/projects/:id/all-submissions - All submissions
PUT    /api/crowdsourcing/submissions/:id/verify       - Approve/reject
GET    /api/crowdsourcing/export/:projectId            - Export data
```

### Moderator Management (super_admin only)
```
GET    /api/crowdsourcing/projects/:id/moderators      - List moderators
POST   /api/crowdsourcing/projects/:id/moderators/invite - Invite moderator
PUT    /api/crowdsourcing/moderators/:id               - Update permissions
DELETE /api/crowdsourcing/moderators/:id               - Revoke access
POST   /api/crowdsourcing/invites/:token/accept        - Accept invitation
```

### Moderator Access
```
GET    /api/crowdsourcing/my-projects                  - Projects I moderate
GET    /api/crowdsourcing/projects/:id/submissions     - Submissions (if moderator)
PUT    /api/crowdsourcing/submissions/:id/verify       - Approve/reject (if permitted)
```

---

## 7. Form Fields Detail

### Submit Form
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `media` | File | ✅ | Max 10MB, jpg/png/mp4 |
| `media_type` | Select | ✅ | photo/video |
| `latitude` | Number | ✅ | Dari minimap/GPS |
| `longitude` | Number | ✅ | Dari minimap/GPS |
| `address` | Text | ✅ | Auto reverse geocode |
| `address_detail` | Text | ❌ | RT/RW, patokan |
| `caption` | Textarea | ✅ | Min 20, Max 500 chars |
| `submitter_name` | Text | ✅ | Max 100 chars |
| `submitter_email` | Email | ✅ | Valid email format |
| `submitter_whatsapp` | Tel | ✅ | Valid WA format (+62...) |

### Project Form (Admin)
| Field | Type | Required |
|-------|------|----------|
| `title` | Text | ✅ |
| `description` | Textarea | ❌ |
| `disaster_type` | Select | ✅ |
| `location_name` | Text | ✅ |
| `latitude` | Number | ✅ |
| `longitude` | Number | ✅ |
| `geofence_radius_km` | Number | ✅ (if radius mode) |
| `geofence_polygon` | JSON | ✅ (if polygon mode) |
| `start_date` | DateTime | ❌ |
| `end_date` | DateTime | ❌ |
| `allow_photo` | Toggle | ✅ |
| `allow_video` | Toggle | ✅ |
| `max_file_size_mb` | Number | ✅ |
| `require_location` | Toggle | ✅ |
| `auto_approve` | Toggle | ✅ |

---

## 8. Additional Features

### 8.1 Notifikasi
- Push notification ke admin saat ada submission baru
- Email digest harian untuk pending submissions

### 8.2 Analytics
- Total submissions per project
- Heatmap lokasi submissions
- Trend waktu (kapan paling banyak submit)
- Device breakdown (mobile vs desktop)

### 8.3 Media Processing
- Auto-compress gambar (max 1920px)
- Generate thumbnail untuk video
- Extract EXIF data (waktu asli foto)
- Strip sensitive metadata

### 8.4 Anti-Spam
- Rate limiting per IP/device
- Captcha untuk submission
- Duplicate detection (hash gambar)
- Block list untuk abusers

### 8.5 Integration
- Link ke disaster_responses (operasi respon)
- Share ke social media
- Embed widget untuk website lain

---

## 9. Access Control Matrix

| Action | public | moderator | org_admin | co_super_admin | super_admin |
|--------|--------|-----------|-----------|----------------|-------------|
| View active projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit documentation | ✅ | ✅ | ✅ | ✅ | ✅ |
| View approved submissions | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all submissions | ❌ | ✅* | ❌ | ✅ | ✅ |
| Verify submissions | ❌ | ✅* | ❌ | ✅ | ✅ |
| Create project | ❌ | ❌ | ❌ | ❌ | ✅ |
| Edit project | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete project | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage geofence | ❌ | ❌ | ❌ | ❌ | ✅ |
| Invite moderators | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage moderators | ❌ | ❌ | ❌ | ❌ | ✅ |
| Export data | ❌ | ✅* | ❌ | ✅ | ✅ |
| View analytics | ❌ | ❌ | ❌ | ✅ | ✅ |

*\* = Hanya untuk project yang di-assign dan sesuai permissions*

---

## 10. Implementation Priority

### Phase 1 (MVP)
1. Database schema
2. `/crowdsourcing` - list page
3. `/crowdsourcing/[id]` - detail + map
4. `/crowdsourcing/[id]/submit` - form dengan geofencing radius
5. `/super-admin/crowdsourcing` - basic CRUD
6. Basic moderation (approve/reject)

### Phase 2
1. Polygon geofencing
2. Video support
3. Analytics dashboard
4. Export functionality

### Phase 3
1. Push notifications
2. Anti-spam measures
3. Social sharing
4. Widget embed

---

## 11. File Structure

```
src/
├── app/
│   ├── crowdsourcing/
│   │   ├── page.tsx                    # List projects
│   │   ├── invite/
│   │   │   └── [token]/
│   │   │       └── page.tsx            # Accept moderator invite
│   │   └── [projectId]/
│   │       ├── page.tsx                # Project detail + map
│   │       └── submit/
│   │           └── page.tsx            # Submit form
│   ├── super-admin/
│   │   └── crowdsourcing/
│   │       ├── page.tsx                # Admin dashboard
│   │       ├── new/
│   │       │   └── page.tsx            # Create project
│   │       └── [projectId]/
│   │           ├── page.tsx            # Edit project
│   │           ├── submissions/
│   │           │   └── page.tsx        # Moderation
│   │           └── moderators/
│   │               └── page.tsx        # Manage moderators
│   ├── moderator/
│   │   └── crowdsourcing/
│   │       ├── page.tsx                # My projects (moderator view)
│   │       └── [projectId]/
│   │           └── page.tsx            # Moderate submissions
│   └── api/
│       └── crowdsourcing/
│           ├── projects/
│           │   ├── route.ts            # GET list, POST create
│           │   └── [id]/
│           │       ├── route.ts        # GET, PUT, DELETE
│           │       ├── submit/
│           │       │   └── route.ts    # POST submission
│           │       ├── submissions/
│           │       │   └── route.ts    # GET submissions
│           │       └── moderators/
│           │           ├── route.ts    # GET moderators
│           │           └── invite/
│           │               └── route.ts # POST invite
│           ├── moderators/
│           │   └── [id]/
│           │       └── route.ts        # PUT, DELETE moderator
│           ├── invites/
│           │   └── [token]/
│           │       └── accept/
│           │           └── route.ts    # POST accept invite
│           ├── submissions/
│           │   └── [id]/
│           │       └── verify/
│           │           └── route.ts    # PUT verify
│           ├── my-projects/
│           │   └── route.ts            # GET my moderated projects
│           └── validate-location/
│               └── route.ts            # POST check geofence
├── components/
│   └── crowdsourcing/
│       ├── ProjectCard.tsx
│       ├── SubmissionForm.tsx
│       ├── LocationPicker.tsx          # Minimap + address
│       ├── GeofenceMap.tsx
│       ├── SubmissionGallery.tsx
│       ├── ModerationCard.tsx
│       ├── ModeratorList.tsx
│       └── InviteModeratorModal.tsx
└── lib/
    └── crowdsourcing/
        ├── geofence.ts                 # Geofencing utilities
        ├── media.ts                    # Media processing
        └── types.ts                    # TypeScript types
```

---

## 12. Security Considerations

1. **File Upload**
   - Validate file type server-side
   - Scan for malware
   - Store di isolated bucket

2. **Location Spoofing**
   - Check location accuracy (reject jika > 100m)
   - Cross-check dengan IP geolocation
   - Rate limit per device

3. **Privacy**
   - Strip EXIF sebelum public display
   - Encrypt submitter data
   - GDPR compliance untuk data deletion

4. **Moderation**
   - AI-assisted content moderation (optional)
   - Report mechanism untuk inappropriate content
   - Audit log untuk semua actions

---

## 13. TODO List

### Phase 1: Database & Core API
- [x] Create migration: `crowdsource_projects` table ✅
- [x] Create migration: `crowdsource_submissions` table ✅
- [x] Create migration: `crowdsource_moderators` table ✅
- [x] Create migration: `crowdsource_moderator_invites` table ✅
- [x] Create migration: `crowdsource_settings` table ✅
- [x] API: `GET /api/crowdsourcing/projects` - list active projects ✅
- [x] API: `GET /api/crowdsourcing/projects/:id` - project detail ✅
- [x] API: `POST /api/crowdsourcing/projects/:id/submit` - submit documentation ✅
- [x] API: `POST /api/crowdsourcing/validate-location` - check geofence ✅
- [x] API: `POST /api/crowdsourcing/projects` - create project ✅
- [x] API: `PUT /api/crowdsourcing/projects/:id` - update project ✅
- [x] API: `DELETE /api/crowdsourcing/projects/:id` - delete project ✅
- [x] API: `GET /api/crowdsourcing/projects/:id/submissions` - list submissions ✅
- [x] Lib: `geofence.ts` - geofencing utilities ✅
- [x] Lib: `types.ts` - TypeScript types ✅

### Phase 2: Public Pages
- [x] Page: `/crowdsourcing` - list active projects ✅
- [x] Component: `ProjectCard.tsx` ✅
- [x] Page: `/crowdsourcing/[projectId]` - project detail + map ✅
- [x] Component: `SubmissionGallery.tsx` - approved submissions grid ✅
- [x] Page: `/crowdsourcing/[projectId]/submit` - submit form ✅
- [x] Component: `LocationPicker.tsx` - minimap + address picker ✅
- [x] Component: `SubmissionForm.tsx` - integrated in submit page ✅

### Phase 3: Super Admin - Project Management
- [x] Page: `/super-admin/crowdsourcing` - dashboard ✅
- [x] Page: `/super-admin/crowdsourcing/new` - create project ✅
- [x] API: `POST /api/crowdsourcing/projects` - create project ✅ (Phase 1)
- [x] Page: `/super-admin/crowdsourcing/[projectId]` - edit project ✅
- [x] API: `PUT /api/crowdsourcing/projects/:id` - update project ✅ (Phase 1)
- [x] API: `DELETE /api/crowdsourcing/projects/:id` - delete project ✅ (Phase 1)
- [ ] Component: `GeofenceMap.tsx` - draw radius/polygon (deferred)

### Phase 4: Moderation
- [x] Page: `/super-admin/crowdsourcing/[projectId]/submissions` - moderation ✅
- [x] API: `GET /api/crowdsourcing/projects/:id/all-submissions` - all submissions ✅
- [x] API: `PUT /api/crowdsourcing/submissions/:id/verify` - approve/reject ✅
- [x] Component: `ModerationCard.tsx` - integrated in submissions page ✅

### Phase 5: Moderator System
- [x] Page: `/super-admin/crowdsourcing/[projectId]/moderators` - manage moderators ✅
- [x] API: `GET /api/crowdsourcing/projects/:id/moderators` - list moderators ✅
- [x] API: `POST /api/crowdsourcing/projects/:id/moderators/invite` - invite ✅
- [x] API: `PUT /api/crowdsourcing/moderators/:id` - update permissions ✅
- [x] API: `DELETE /api/crowdsourcing/moderators/:id` - revoke ✅
- [x] Component: `ModeratorList.tsx` - integrated in moderators page ✅
- [x] Component: `InviteModeratorModal.tsx` - integrated in moderators page ✅
- [x] Page: `/crowdsourcing/invite/[token]` - accept invitation ✅
- [x] API: `POST /api/crowdsourcing/invites/:token/accept` - accept invite ✅
- [x] Page: `/moderator/crowdsourcing` - moderator dashboard ✅
- [x] Page: `/moderator/crowdsourcing/[projectId]` - moderate submissions ✅
- [x] API: `GET /api/crowdsourcing/my-projects` - my moderated projects ✅

### Phase 6: Export & Analytics
- [x] API: `GET /api/crowdsourcing/export/:projectId` - export CSV/JSON ✅
- [x] API: `GET /api/crowdsourcing/analytics/:projectId` - analytics data ✅
- [x] Analytics dashboard for super_admin/co_super_admin ✅
- [x] Heatmap data (visualization placeholder) ✅

### Phase 7: Enhancements
- [x] Video thumbnail generation (placeholder, requires ffmpeg) ✅
- [x] Image compression utility (`media.ts`) ✅
- [x] Rate limiting per IP/device (`ratelimit.ts`) ✅
- [ ] Duplicate detection (deferred)
- [ ] Email notifications for new submissions (deferred)
- [ ] WhatsApp notification integration (deferred)

---

*Dokumen ini akan diupdate seiring development.*
