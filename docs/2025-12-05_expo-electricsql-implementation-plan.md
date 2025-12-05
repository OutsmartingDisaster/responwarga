# Expo + ElectricSQL Implementation Plan for Respon Warga

## Executive Summary

Convert the responder web app to an **Expo React Native** mobile app with **ElectricSQL** for offline-first data sync. Enable **org_admin** to design custom survey forms that sync to responder devices.

---

## Current Codebase Analysis

### Existing Schema (Relevant Tables)

| Table | Purpose |
|-------|---------|
| `organizations` | Org metadata, settings |
| `profiles` | User profiles linked to org |
| `response_operations` | Active disaster operations |
| `response_team_members` | Team membership per operation |
| `field_reports` | Responder field submissions (aid_delivery, field_condition, incident) |
| `crowdsource_projects` | Crowdsource campaigns |
| `crowdsource_form_fields` | Dynamic form fields per project |
| `crowdsource_submissions` | Public submissions with `form_data` JSONB |
| `daily_logs` | Responder activity logs (already has `sync_status`, `local_id`) |
| `offline_sync_queue` | Existing sync queue table |

### Existing Features to Leverage

1. **Form field system** already exists in `crowdsource_form_fields` with types: text, textarea, number, select, checkbox, radio, date, time, email, phone, url, address, photo, video, media
2. **Sync queue table** (`offline_sync_queue`) already designed for offline operations
3. **Field reports** structure can be extended for custom forms
4. **Daily logs** already have `sync_status` and `local_id` columns

---

## Phase 1: Schema Extensions

### New Tables Required

```sql
-- Survey forms designed by org_admin
CREATE TABLE survey_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    operation_id UUID REFERENCES response_operations(id), -- optional, can be org-wide
    name VARCHAR(255) NOT NULL,
    description TEXT,
    form_schema JSONB NOT NULL, -- JSON schema for form structure
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ
);

-- Form fields (reuse crowdsource_form_fields pattern)
CREATE TABLE survey_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES survey_forms(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN (
        'text', 'textarea', 'number', 'select', 'checkbox', 'radio',
        'date', 'time', 'datetime', 'email', 'phone', 'url',
        'photo', 'video', 'media', 'signature', 'geolocation', 'barcode'
    )),
    placeholder VARCHAR(255),
    helper_text VARCHAR(500),
    options JSONB, -- for select/radio/checkbox
    default_value TEXT,
    is_required BOOLEAN DEFAULT false,
    validation_rules JSONB, -- {min, max, pattern, etc}
    conditional_logic JSONB, -- show/hide based on other fields
    display_order INTEGER DEFAULT 0,
    section_name VARCHAR(100), -- group fields into sections
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Form assignments to responders/teams
CREATE TABLE survey_form_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES survey_forms(id),
    assigned_to_user_id UUID REFERENCES auth.users(id),
    assigned_to_team_id UUID, -- future: team assignments
    operation_id UUID REFERENCES response_operations(id),
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    due_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Survey responses (offline-first)
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id VARCHAR(100) NOT NULL, -- client-generated UUID for dedup
    form_id UUID NOT NULL REFERENCES survey_forms(id),
    form_version INTEGER NOT NULL,
    responder_id UUID NOT NULL REFERENCES auth.users(id),
    operation_id UUID REFERENCES response_operations(id),
    response_data JSONB NOT NULL, -- field values
    media_urls JSONB DEFAULT '[]', -- uploaded media references
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    location_accuracy NUMERIC(8,2),
    device_info JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(local_id) -- prevent duplicate submissions
);

-- Sitrep (Situation Report) aggregation
CREATE TABLE sitreps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    operation_id UUID REFERENCES response_operations(id),
    title VARCHAR(255) NOT NULL,
    report_date DATE NOT NULL,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    summary TEXT,
    statistics JSONB, -- aggregated stats
    field_report_ids UUID[], -- referenced field reports
    survey_response_ids UUID[], -- referenced survey responses
    generated_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sync metadata for ElectricSQL
CREATE TABLE sync_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    device_id VARCHAR(100) NOT NULL,
    last_sync_at TIMESTAMPTZ,
    forms_version INTEGER DEFAULT 0,
    sync_token TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, device_id)
);
```

---

## Phase 2: ElectricSQL Setup

### Server-Side Configuration

1. **Install Electric Sync Service**
   ```bash
   docker run -e DATABASE_URL=postgres://... electricsql/electric
   ```

2. **Define Sync Shapes** (what data syncs to devices)
   ```typescript
   // shapes.ts - ElectricSQL shape definitions
   export const responderShapes = {
     // Forms assigned to this user's org
     survey_forms: {
       where: `organization_id = $user_org_id AND status = 'published'`,
       include: ['survey_form_fields']
     },
     // User's own responses (for offline editing)
     survey_responses: {
       where: `responder_id = $user_id`,
     },
     // Operations user is part of
     response_operations: {
       where: `id IN (SELECT response_operation_id FROM response_team_members WHERE user_id = $user_id)`
     },
     // User's assignments
     survey_form_assignments: {
       where: `assigned_to_user_id = $user_id AND status = 'active'`
     }
   };
   ```

3. **Sync Endpoints** (add to existing API)
   - `GET /api/sync/shapes` - Return shape definitions for device
   - `POST /api/sync/push` - Receive offline changes
   - `GET /api/sync/pull` - Send server changes

---

## Phase 3: Expo Mobile App Structure

### Project Setup

```bash
npx create-expo-app responwarga-mobile --template blank-typescript
cd responwarga-mobile
npx expo install expo-sqlite electric-sql
npx expo install expo-camera expo-location expo-file-system
npx expo install @react-navigation/native @react-navigation/bottom-tabs
```

### App Structure

```
responwarga-mobile/
├── app/                      # Expo Router
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (main)/
│   │   ├── dashboard.tsx
│   │   ├── forms/
│   │   │   ├── index.tsx     # Form list
│   │   │   └── [id].tsx      # Form submission
│   │   ├── responses/
│   │   │   └── index.tsx     # My submissions
│   │   ├── operations/
│   │   │   └── index.tsx
│   │   └── settings.tsx
│   └── _layout.tsx
├── components/
│   ├── forms/
│   │   ├── DynamicFormRenderer.tsx
│   │   ├── fields/
│   │   │   ├── TextField.tsx
│   │   │   ├── PhotoField.tsx
│   │   │   ├── LocationField.tsx
│   │   │   └── ...
│   │   └── FormPreview.tsx
│   └── sync/
│       ├── SyncIndicator.tsx
│       └── OfflineBanner.tsx
├── lib/
│   ├── db/
│   │   ├── electric.ts       # ElectricSQL client
│   │   ├── schema.ts         # Local SQLite schema
│   │   └── migrations.ts
│   ├── sync/
│   │   ├── syncManager.ts
│   │   └── conflictResolver.ts
│   └── auth/
│       └── session.ts
└── stores/
    ├── authStore.ts
    ├── formStore.ts
    └── syncStore.ts
```

### Core Sync Logic

```typescript
// lib/db/electric.ts
import { electrify } from 'electric-sql/expo';
import { schema } from './schema';

export async function initElectric(token: string) {
  const electric = await electrify({
    url: process.env.EXPO_PUBLIC_ELECTRIC_URL,
    token,
    schema,
  });
  
  // Subscribe to shapes
  await electric.sync.subscribe('survey_forms');
  await electric.sync.subscribe('survey_form_fields');
  await electric.sync.subscribe('survey_form_assignments');
  
  return electric;
}

// lib/sync/syncManager.ts
export class SyncManager {
  private electric: Electric;
  private isOnline: boolean = false;

  async submitResponse(response: SurveyResponse) {
    // Always save locally first
    await this.electric.db.survey_responses.create({
      data: {
        ...response,
        local_id: response.local_id || generateUUID(),
        sync_status: 'pending',
      }
    });

    // Try immediate sync if online
    if (this.isOnline) {
      await this.syncPendingResponses();
    }
  }

  async syncPendingResponses() {
    const pending = await this.electric.db.survey_responses.findMany({
      where: { sync_status: 'pending' }
    });

    for (const response of pending) {
      try {
        await this.electric.db.survey_responses.update({
          where: { id: response.id },
          data: { sync_status: 'syncing' }
        });
        
        // Electric handles actual sync
        await this.electric.sync.push();
        
        await this.electric.db.survey_responses.update({
          where: { id: response.id },
          data: { sync_status: 'synced', synced_at: new Date() }
        });
      } catch (error) {
        await this.electric.db.survey_responses.update({
          where: { id: response.id },
          data: { sync_status: 'failed' }
        });
      }
    }
  }
}
```

---

## Phase 4: Org Admin Form Designer (Web)

### New Components for Admin Dashboard

```
src/app/[organization]/admin/dashboard/components/
├── FormsTab.tsx              # List/manage survey forms
├── FormDesigner/
│   ├── FormDesigner.tsx      # Main designer component
│   ├── FieldPalette.tsx      # Draggable field types
│   ├── FieldEditor.tsx       # Configure selected field
│   ├── FormPreview.tsx       # Live preview
│   └── PublishModal.tsx      # Publish workflow
```

### Form Designer Features

1. **Drag-and-drop field palette**
   - Text, Number, Select, Checkbox, Radio
   - Date, Time, DateTime
   - Photo, Video, Media capture
   - GPS Location (auto-capture)
   - Signature pad
   - Barcode/QR scanner

2. **Field configuration**
   - Label, placeholder, helper text
   - Required/optional
   - Validation rules (min/max, pattern)
   - Conditional visibility

3. **Form sections**
   - Group related fields
   - Collapsible sections

4. **Publishing workflow**
   - Draft → Preview → Publish
   - Version tracking
   - Notify assigned responders

---

## Phase 5: Sitrep Generation

### Sitrep Data Sources

1. **Field Reports** (`field_reports` table)
   - Aid deliveries
   - Field conditions
   - Incidents

2. **Survey Responses** (`survey_responses` table)
   - Custom form submissions

3. **Aggregated Statistics**
   ```typescript
   interface SitrepStats {
     period: { start: Date; end: Date };
     fieldReports: {
       total: number;
       byCategory: Record<string, number>;
       bySeverity: Record<string, number>;
     };
     surveyResponses: {
       total: number;
       byForm: Record<string, number>;
     };
     responders: {
       active: number;
       onDuty: number;
     };
     coverage: {
       locations: GeoJSON;
       affectedCount: number;
     };
   }
   ```

### Sitrep UI Components

```
src/app/[organization]/admin/dashboard/components/
├── SitrepTab.tsx             # List sitreps
├── SitrepGenerator/
│   ├── SitrepGenerator.tsx   # Create new sitrep
│   ├── DateRangePicker.tsx
│   ├── DataSelector.tsx      # Select reports to include
│   ├── StatsPreview.tsx
│   └── SitrepExport.tsx      # PDF/Excel export
```

---

## Phase 6: Sync Flow Diagram

```
┌─────────────────┐                    ┌─────────────────┐
│   Expo App      │                    │   Web Server    │
│   (Responder)   │                    │   (Next.js)     │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │  1. Login (JWT)                      │
         │─────────────────────────────────────>│
         │                                      │
         │  2. Get sync shapes                  │
         │<─────────────────────────────────────│
         │                                      │
         │  3. Initial sync (forms, assignments)│
         │<═══════════════════════════════════>│ (ElectricSQL)
         │                                      │
         │  4. Work offline                     │
         │  ┌──────────────────┐                │
         │  │ Submit responses │                │
         │  │ (local SQLite)   │                │
         │  └──────────────────┘                │
         │                                      │
         │  5. Reconnect                        │
         │─────────────────────────────────────>│
         │                                      │
         │  6. Push pending responses           │
         │═══════════════════════════════════>│ (ElectricSQL)
         │                                      │
         │  7. Pull new forms/updates           │
         │<═══════════════════════════════════│ (ElectricSQL)
         │                                      │
```

---

## Phase 7: Implementation Steps

### Step 1: Database Migration (Week 1)
- [ ] Create new tables (`survey_forms`, `survey_form_fields`, etc.)
- [ ] Add indexes for sync queries
- [ ] Migrate existing `crowdsource_form_fields` pattern

### Step 2: ElectricSQL Server Setup (Week 1-2)
- [ ] Deploy Electric sync service
- [ ] Configure shape definitions
- [ ] Set up auth integration

### Step 3: Web Form Designer (Week 2-3)
- [ ] Build `FormsTab` component
- [ ] Implement drag-drop `FormDesigner`
- [ ] Add field configuration UI
- [ ] Implement publish workflow

### Step 4: Expo App Foundation (Week 3-4)
- [ ] Initialize Expo project
- [ ] Set up navigation structure
- [ ] Implement auth flow
- [ ] Configure ElectricSQL client

### Step 5: Dynamic Form Renderer (Week 4-5)
- [ ] Build `DynamicFormRenderer` component
- [ ] Implement all field types
- [ ] Add validation logic
- [ ] Handle media capture

### Step 6: Offline Sync (Week 5-6)
- [ ] Implement `SyncManager`
- [ ] Add network detection
- [ ] Build sync queue UI
- [ ] Handle conflicts

### Step 7: Sitrep Module (Week 6-7)
- [ ] Build sitrep generator UI
- [ ] Implement data aggregation
- [ ] Add export functionality

### Step 8: Testing & Polish (Week 7-8)
- [ ] End-to-end sync testing
- [ ] Offline scenario testing
- [ ] Performance optimization
- [ ] UI/UX refinement

---

## Technical Considerations

### Conflict Resolution Strategy
- **Last-write-wins** for simple fields
- **Merge** for array fields (photos)
- **Server-wins** for form schema changes
- **Client-wins** for draft responses

### Media Handling
1. Capture media locally (expo-camera, expo-image-picker)
2. Store in local file system
3. Upload to server when online
4. Replace local path with server URL in response

### Battery & Data Optimization
- Batch sync operations
- Compress media before upload
- Delta sync for large datasets
- Background sync with expo-background-fetch

---

## API Endpoints (New)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/survey-forms` | List forms for org |
| POST | `/api/survey-forms` | Create new form |
| PUT | `/api/survey-forms/[id]` | Update form |
| POST | `/api/survey-forms/[id]/publish` | Publish form |
| GET | `/api/survey-forms/[id]/fields` | Get form fields |
| POST | `/api/survey-responses` | Submit response |
| GET | `/api/survey-responses` | List responses |
| GET | `/api/sitreps` | List sitreps |
| POST | `/api/sitreps/generate` | Generate sitrep |
| GET | `/api/sync/shapes` | Get sync shapes |

---

## Visualization in Org Admin

### Dashboard Additions

1. **Forms Overview Card**
   - Total forms created
   - Active/Draft/Archived count
   - Recent submissions

2. **Response Map**
   - Plot survey responses on map
   - Filter by form, date, responder

3. **Response Analytics**
   - Submissions over time chart
   - Breakdown by form type
   - Responder activity

4. **Sitrep Timeline**
   - Historical sitreps
   - Quick generation button
   - Export options

---

## Next Steps

1. Review and approve this plan
2. Create database migration script
3. Set up ElectricSQL development environment
4. Begin form designer implementation

