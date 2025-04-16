# System Patterns

## Architecture
- **Next.js** app with **React** components
- **Supabase** as backend for:
  - Authentication
  - Database (PostgreSQL)
  - Storage (images, files)
- **Leaflet** for interactive maps
- **Tailwind CSS** for styling
- **Role-based access control** via Supabase policies

## Key Design Patterns
- **Role-based dashboards**: Admin, Responder, Org Admin, Member
- **Map-centric UI**: Map is the primary interface for viewing emergencies and contributions
- **Assignment workflow**:
  - Requests can be claimed by responders/orgs
  - Status updates propagate across dashboards
- **Verification workflow**:
  - Contributions can be verified by responders
  - Manual assignment to shelters (A, B, C)
- **Organization management**:
  - Org Admins manage their members
  - Members linked to organizations
- **Status synchronization**:
  - Status changes update the main map, admin, and responder dashboards in real-time or near real-time

## Component Relationships
- **Map Components**:
  - Show markers for emergencies and contributions
  - Reflect assignment status
- **Dashboards**:
  - Filtered views based on role
  - Share core data but with role-specific actions
- **Forms**:
  - Emergency and contribution submission
  - Verification and assignment actions
- **User & Org Profiles**:
  - Managed by key users/org admins
  - Linked to assignment workflows
