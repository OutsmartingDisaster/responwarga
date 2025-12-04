# Organization Features Implementation Plan
**Date:** December 1, 2025, 19:28  
**Features:** Logo Upload, Settings, Team Management

## Overview

Add organization admin capabilities:
1. Upload/change organization logo
2. Organization settings management
3. Team member management (CRUD)
4. View team activity logs

## Database Changes

### 1. Update `organizations` table
```sql
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### 2. Create `team_activity_logs` table
```sql
CREATE TABLE IF NOT EXISTS team_activity_logs (
  id SERIAL PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_activity_org ON team_activity_logs(organization_id);
CREATE INDEX idx_team_activity_user ON team_activity_logs(user_id);
```

## Backend Implementation

### 1. API Routes

#### `/api/organization/settings` (POST/GET)
- Get organization settings
- Update organization settings
- Upload logo

#### `/api/organization/team` (GET/POST/PUT/DELETE)
- List team members
- Add team member
- Update team member
- Remove team member

#### `/api/organization/activity` (GET)
- Get team activity logs

### 2. Database Functions
- `log_team_activity()` - Log team actions
- `update_organization_settings()` - Update settings with validation

## Frontend Implementation

### 1. Organization Settings Page
**Route:** `/responder/[slug]/settings`

**Components:**
- Logo upload section
- Organization info form
- Settings form (notifications, preferences)

### 2. Team Management Page
**Route:** `/responder/[slug]/team`

**Components:**
- Team member list table
- Add member modal
- Edit member modal
- Delete confirmation
- Activity log viewer

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── organization/
│   │       ├── settings/
│   │       │   └── route.ts          # Settings API
│   │       ├── team/
│   │       │   └── route.ts          # Team CRUD API
│   │       └── activity/
│   │           └── route.ts          # Activity logs API
│   └── responder/
│       └── [slug]/
│           ├── settings/
│           │   └── page.tsx          # Settings UI
│           └── team/
│               └── page.tsx          # Team management UI
└── lib/
    └── organization/
        ├── settings.ts               # Settings helpers
        └── team.ts                   # Team helpers
```

## Implementation Steps

### Phase 1: Database (5 min)
1. ✅ Create migration script
2. ✅ Add columns to organizations
3. ✅ Create team_activity_logs table
4. ✅ Update ALLOWED_TABLES

### Phase 2: Backend API (15 min)
1. ✅ Create settings API route
2. ✅ Create team management API route
3. ✅ Create activity logs API route
4. ✅ Add logo upload handling

### Phase 3: Frontend (20 min)
1. ✅ Create settings page
2. ✅ Create team management page
3. ✅ Add logo upload component
4. ✅ Add team member forms
5. ✅ Add activity log viewer

### Phase 4: Testing (5 min)
1. ✅ Test logo upload
2. ✅ Test settings update
3. ✅ Test team CRUD operations
4. ✅ Test activity logging

## Data Flow

### Logo Upload Flow
```
Frontend (Settings Page)
  ↓ File upload
API (/api/uploads)
  ↓ Save to /public/uploads/logos/
API (/api/organization/settings)
  ↓ Update logo_url
Database (organizations table)
```

### Team Management Flow
```
Frontend (Team Page)
  ↓ Add/Edit/Delete action
API (/api/organization/team)
  ↓ Validate permissions
  ↓ Update profiles table
  ↓ Log activity
Database (profiles + team_activity_logs)
```

## Security

### Permissions
- Only `org_admin` can:
  - Upload logo
  - Change settings
  - Add/remove team members
  - View activity logs

### Validation
- Logo: Max 2MB, PNG/JPG only
- Settings: JSON schema validation
- Team: Email validation, role validation

## Settings Schema

```typescript
interface OrganizationSettings {
  notifications: {
    email: boolean;
    sms: boolean;
  };
  preferences: {
    timezone: string;
    language: string;
  };
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
  };
}
```

## Team Activity Types

```typescript
type ActivityAction = 
  | 'member_added'
  | 'member_removed'
  | 'member_updated'
  | 'role_changed'
  | 'settings_updated'
  | 'logo_updated';
```

---

**Estimated Time:** 45 minutes  
**Priority:** High  
**Dependencies:** None
