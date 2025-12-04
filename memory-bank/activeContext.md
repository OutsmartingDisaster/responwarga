# Active Context

## Current Focus
- Responder Dashboard now includes:
  - Sidebar navigation (Emergency, Contribution tabs)
  - Default map view
  - Ability for responders to claim/respond to emergencies and contributions
  - Verification workflow for contributions
  - Manual assignment of contributions to shelters (A, B, C)
  - Status updates reflecting assignment (e.g., "Assigned to [responder/org]")
  - **Org_admin can now act as dispatcher:** assign team members to emergency reports and contributions via the AssignmentManager page (UI in Bahasa Indonesia, under [slug])
  - **Activity logging refactored:** Modal-based form for logging responder activities, with disaster response–oriented fields (status, tindakan, catatan, waktu, linkage to Laporan Darurat)
  - **Status values standardized:** menunggu, diproses, selesai, dibatalkan (across admin, responder, and public map)
  - **Assignment uniqueness enforced:** Only one responder per org per report/contribution (DB constraint and UI)
  - **Assignment actions logged:** All assignment actions (assign, status change, completion, cancellation) are logged with time, notes, and by whom
- Synchronize status updates across:
  - **Main Map**
  - **Admin Dashboard**
  - **Responder Dashboard**
- User and organization profiles:
  - Key users/org admins can manage their members
  - Members are assigned to organizations
- New role: **`org_admin`** for organization management, with dispatcher privileges

## Recent Changes
- Memory Bank initialized with project scope and context
- Admin dashboard and map already implemented
- Emergency and contribution forms exist
- **AssignmentManager page implemented under [slug]/dashboard/AssignmentManager.tsx**
  - UI in Bahasa Indonesia
  - org_admin can assign team members to reports/contributions
  - Access control: only org_admin of the organization can access
  - Assignment status and notes supported
  - DB uniqueness constraint ensures only one responder per org per report/contribution
- **ActivityLogTable refactored:** Floating modal, disaster response–oriented fields, linkage to emergency reports, status logging
- **Status value standardization:** All status fields now use menunggu, diproses, selesai, dibatalkan

## Next Steps
- QA and user testing of dispatcher/assignment workflow
- Implement responder-side status update (e.g., responder can mark as "Diterima", "Sedang Berjalan", "Selesai")
- Further sync status updates across dashboards and map (real-time or near real-time)
- Extend assignment/dispatcher logic to contributions (if not yet complete)
- Continue improving organization management features as needed
- Ensure public map marker modal displays assignment status in the required format
