# ResponWarga - Frontend-Backend-Database Connection Map
**Date:** December 1, 2025

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│                    (Next.js 15 / React 19)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Components:                                                    │
│  ├─ admin/page.tsx                                             │
│  ├─ masuk/page.tsx (Login)                                     │
│  ├─ components/ContributionForm.tsx                            │
│  ├─ components/EmergencyReportForm.tsx                         │
│  ├─ components/MarqueeBanner.tsx                               │
│  └─ components/map/ContributionMarkers.tsx                     │
│                                                                 │
│  API Client Pattern:                                            │
│  fetch('/api/data', {                                          │
│    method: 'POST',                                             │
│    body: JSON.stringify({ action, table, filters })           │
│  })                                                             │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/HTTPS
                         │ fetch() / REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND LAYER                           │
│                    (Next.js API Routes)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  API Routes (/src/app/api/):                                   │
│  ├─ /auth/login          → User authentication                 │
│  ├─ /auth/logout         → Session termination                 │
│  ├─ /auth/register       → User registration                   │
│  ├─ /auth/session        → Session validation                  │
│  ├─ /data                → Generic CRUD operations             │
│  ├─ /admin/users         → User management                     │
│  ├─ /invite-member       → Team invitations                    │
│  └─ /uploads             → File upload handling                │
│                                                                 │
│  Middleware:                                                    │
│  ├─ getSessionFromCookies() → Extract user session            │
│  ├─ runQuery()              → Validate & route requests        │
│  └─ applySessionContext()   → Inject user context             │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ PostgreSQL Protocol
                         │ pg.Pool
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                          │
│                   (/src/lib/db/ & /server/)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Connection Pool (pool.ts):                                     │
│  ├─ getClient()          → Get connection from pool            │
│  ├─ withClient()         → Execute with auto-release           │
│  ├─ withTransaction()    → Execute in transaction              │
│  └─ applySessionContext()→ Set PostgreSQL session vars         │
│                                                                 │
│  Query Builders (server/):                                      │
│  ├─ runSelect()          → SELECT queries                      │
│  ├─ runInsert()          → INSERT queries                      │
│  ├─ runUpdate()          → UPDATE queries                      │
│  ├─ runDelete()          → DELETE queries                      │
│  └─ runRpc()             → Stored procedure calls              │
│                                                                 │
│  Security:                                                      │
│  ├─ ALLOWED_TABLES       → Table whitelist (20 tables)         │
│  ├─ ALLOWED_FUNCTIONS    → Function whitelist                  │
│  └─ Parameterized queries→ SQL injection protection            │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ TCP/IP (Port 54322)
                         │ SSL: Disabled (local dev)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                            │
│                   PostgreSQL 15.15 (Local)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Database: responwarga_prod                                     │
│  User: postgres                                                 │
│  Tables: 34 total                                               │
│                                                                 │
│  Core Tables (Exposed via API):                                 │
│  ├─ organizations        → Organization profiles               │
│  ├─ profiles             → User profiles                        │
│  ├─ disaster_responses   → Disaster response events            │
│  ├─ emergency_reports    → Emergency reports from public       │
│  ├─ contributions        → Public contributions                │
│  ├─ team_assignments     → Team member assignments             │
│  ├─ daily_logs           → Daily operational logs              │
│  ├─ activity_logs        → Activity tracking                   │
│  ├─ assignments          → Task assignments                    │
│  ├─ shared_reports       → Shared report data                  │
│  ├─ banners              → Banner content                      │
│  ├─ banner_settings      → Banner configuration                │
│  ├─ contents             → CMS content                         │
│  ├─ about_content        → About page content                  │
│  ├─ user_policies        → User policy agreements              │
│  └─ shifts               → Shift scheduling                    │
│                                                                 │
│  Unexposed Tables (Not in ALLOWED_TABLES):                     │
│  ├─ admin_users          → Admin user management               │
│  ├─ audit_logs           → Audit trail                         │
│  ├─ permissions          → Permission definitions              │
│  ├─ roles                → Role definitions                    │
│  ├─ user_roles           → User-role mappings                  │
│  ├─ role_permissions     → Role-permission mappings            │
│  ├─ responder_locations  → Real-time location tracking         │
│  ├─ offline_sync_queue   → Offline sync queue                  │
│  ├─ tasks                → Task management                     │
│  ├─ task_notes           → Task annotations                    │
│  ├─ task_photos          → Task images                         │
│  ├─ water_gates          → Water infrastructure               │
│  ├─ water_levels         → Water level monitoring             │
│  ├─ weather_data         → Weather records                     │
│  └─ weather_stations     → Weather station data                │
│                                                                 │
│  Missing Tables (Referenced but don't exist):                  │
│  ├─ contributions_public → Should be VIEW on contributions     │
│  ├─ delivery_logs        → Delivery tracking                   │
│  ├─ inventory_logs       → Inventory management                │
│  └─ responder_logs       → Responder activity logs             │
│                                                                 │
│  Session Context Variables:                                     │
│  ├─ app.current_user_id  → Set by applySessionContext()       │
│  └─ app.current_user_role→ Set by applySessionContext()       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Submit credentials
     ▼
┌─────────────────────┐
│ /api/auth/login     │
└────┬────────────────┘
     │ 2. Validate credentials
     ▼
┌─────────────────────┐
│ PostgreSQL          │
│ SELECT * FROM       │
│ profiles WHERE...   │
└────┬────────────────┘
     │ 3. User found
     ▼
┌─────────────────────┐
│ Create Session      │
│ Set Cookie          │
└────┬────────────────┘
     │ 4. Return session
     ▼
┌─────────────────────┐
│ Frontend stores     │
│ session cookie      │
└─────────────────────┘
```

## Data Query Flow

```
┌──────────────────┐
│ Component        │
│ (e.g., admin)    │
└────┬─────────────┘
     │ fetch('/api/data', {
     │   action: 'select',
     │   table: 'organizations'
     │ })
     ▼
┌──────────────────┐
│ /api/data        │
│ Route Handler    │
└────┬─────────────┘
     │ 1. Extract session from cookies
     ▼
┌──────────────────┐
│ getSessionFrom   │
│ Cookies()        │
└────┬─────────────┘
     │ 2. Pass to runQuery()
     ▼
┌──────────────────┐
│ runQuery()       │
│ - Validate table │
│ - Check ALLOWED  │
└────┬─────────────┘
     │ 3. Get DB client
     ▼
┌──────────────────┐
│ withClient()     │
│ pool.connect()   │
└────┬─────────────┘
     │ 4. Set session context
     ▼
┌──────────────────┐
│ applySession     │
│ Context()        │
│ SET app.user_id  │
└────┬─────────────┘
     │ 5. Execute query
     ▼
┌──────────────────┐
│ runSelect()      │
│ Build SQL        │
└────┬─────────────┘
     │ 6. Execute on DB
     ▼
┌──────────────────┐
│ PostgreSQL       │
│ Execute query    │
└────┬─────────────┘
     │ 7. Return results
     ▼
┌──────────────────┐
│ Component        │
│ Render data      │
└──────────────────┘
```

## File Upload Flow

```
┌──────────────────┐
│ Form Component   │
│ (File input)     │
└────┬─────────────┘
     │ FormData with file
     ▼
┌──────────────────┐
│ /api/uploads     │
│ POST handler     │
└────┬─────────────┘
     │ 1. Validate file
     │ 2. Generate filename
     ▼
┌──────────────────┐
│ File System      │
│ public/uploads/  │
└────┬─────────────┘
     │ 3. Return URL
     ▼
┌──────────────────┐
│ Component        │
│ Store URL in DB  │
└──────────────────┘
```

## Database Schema Relationships

```
organizations (1) ──────┬─── (N) profiles
                        │
                        ├─── (N) disaster_responses
                        │
                        └─── (N) team_assignments

profiles (1) ───────────┬─── (N) emergency_reports
                        │
                        ├─── (N) contributions
                        │
                        ├─── (N) team_assignments
                        │
                        └─── (N) daily_logs

disaster_responses (1) ─┬─── (N) emergency_reports
                        │
                        ├─── (N) team_assignments
                        │
                        └─── (N) activity_logs

emergency_reports (1) ──┴─── (N) shared_reports
```

## Connection Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend → Backend | ✅ Working | fetch() API calls functional |
| Backend → Database | ✅ Working | pg.Pool connection established |
| Session Management | ✅ Working | Cookie-based sessions |
| Authentication | ✅ Working | Login/logout functional |
| File Uploads | ✅ Working | Saves to public/uploads/ |
| Table Whitelist | ⚠️ Incomplete | 4 missing, 15 unexposed |
| Migration System | ❌ Not Setup | Directory missing |
| Schema Documentation | ❌ Missing | No ER diagram |

## Security Measures

1. **Table Whitelist**: Only 20 tables exposed via API
2. **Parameterized Queries**: SQL injection protection
3. **Session Context**: User ID/role injected into DB session
4. **Connection Pooling**: Prevents connection exhaustion
5. **Transaction Support**: ACID compliance for critical operations

## Known Issues

1. **Schema Mismatch**: 4 tables referenced but don't exist
2. **Unexposed Tables**: 15 tables in DB but not accessible via API
3. **No Migration System**: Schema changes done ad-hoc
4. **Missing Views**: `contributions_public` should be a view
5. **Legacy Tables**: Weather/water monitoring tables unused

## Recommendations

1. Create `supabase/migrations/` directory
2. Generate initial schema migration
3. Sync ALLOWED_TABLES with actual schema
4. Create missing tables or remove references
5. Document all table relationships
6. Consider exposing admin/audit tables with proper RBAC
7. Create database views for complex queries

---

**Generated:** December 1, 2025  
**Database:** responwarga_prod (PostgreSQL 15.15)  
**Connection:** localhost:54322  
**Tables:** 34 (20 exposed, 14 unexposed)
