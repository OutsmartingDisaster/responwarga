# System User Flows

This document outlines the overall user flows, the lifecycle of emergency reports and contributions, the responder assignment page, and the implementation plan.

**Overall Goal:** Facilitate efficient reporting of emergencies and coordination of contributions (assistance) involving the public, administrators, and organizational responders.

**Actors:**

*   **Public User:** Anyone needing to report an emergency or offer assistance.
*   **Admin / Co-Admin:** High-level system administrators (details of their specific operational role vs. Org Admin TBD, assumed primarily system/org management for now).
*   **Org Admin:** Administrator for a specific responder organization. Manages incoming reports/contributions and assigns tasks to their responders.
*   **Org Responder:** Member of a responder organization who executes assigned tasks in the field.

**User Flows Summary:**

**1. Public User Flow:**

*   **Reporting an Emergency:**
    1.  Accesses the public website/app.
    2.  Navigates to the "Lapor Darurat" (Report Emergency) form.
    3.  Fills in details: Name, Contact, Location (Map/Manual), Description, Assistance Type, Photo (Optional).
    4.  Submits the form.
    5.  *System Action:* Creates an `emergency_reports` record with `status: 'pending'`.
    6.  *User Feedback:* Sees a confirmation message.
*   **Offering a Contribution:**
    1.  Accesses the public website/app.
    2.  Navigates to the "Beri Bantuan" (Give Contribution) form.
    3.  Fills in details: Contribution Type, Email, Address (for pickup/location), Description, Photo (Optional).
    4.  Chooses whether to display contact details publicly. If not displayed, acknowledges help will be coordinated by responders.
    5.  Agrees to terms/declaration.
    6.  Submits the form.
    7.  *System Action:* Creates a `contributions` record with `status: 'pending_review'`.
    8.  *User Feedback:* Sees a confirmation message.

**2. Org Admin Flow:**

*   **Managing Emergency Reports:**
    1.  Logs into the Admin Dashboard.
    2.  Views the list/table of `emergency_reports` (likely filtered for their organization or showing all pending).
    3.  **Reviews `pending` reports:**
        *   If valid: Changes status to `'verified'`.
        *   If invalid: Changes status to `'rejected'`.
    4.  **Reviews `verified` reports:**
        *   Selects a report suitable for their organization.
        *   Assigns it to a specific `Org Responder` from their team (likely via a UI element triggering the `assign_emergency_report` RPC).
        *   *System Action:* Report `status` changes to `'ditugaskan'`, responder/org details are populated.
    5.  **Monitors assigned reports (`'ditugaskan'`, `'on progress'`)**: Tracks progress via status and `responder_status`.
    6.  **Initiates Cancellation:**
        *   Clicks "Cancel Report" for a report.
        *   Provides a reason in the modal.
        *   *System Action:* Calls `request_cancellation` RPC, report `status` changes to `'cancellation_pending'`.
    7.  **Reviews `cancellation_pending` reports (requested by self or responder):**
        *   If approves: Changes status to `'cancelled'`.
        *   If rejects: Changes status back to the previous state (e.g., `'ditugaskan'` - *exact logic TBD*).
*   **Managing Contributions:**
    1.  Logs into the Admin Dashboard.
    2.  Views the list/table of `contributions`.
    3.  **Reviews `pending_review` contributions:**
        *   If valid: Changes status to `'verified'`.
        *   If invalid: Changes status to `'rejected'`.
    4.  **Reviews `verified` contributions (where contact is *not* public):**
        *   Assigns an `Org Responder` to coordinate/pickup (via UI triggering `assign_contribution` RPC).
        *   *System Action:* Contribution `status` changes to `'assigned_for_pickup'`, responder details populated.
    5.  Monitors contribution progress (`'assigned_for_pickup'`, `'pickup_completed'`, etc.).

**3. Org Responder Flow:**

1.  Logs into their dedicated Responder view/page (e.g., `/responder/assignments`). This view is mobile-optimized.
2.  Sees a list/cards of **only** the tasks currently assigned to them:
    *   Emergency Reports with status `'ditugaskan'` (or related active states).
    *   Contributions with status `'assigned_for_pickup'`.
3.  **Interacting with an Assigned Emergency Report:**
    *   Views report details (Submitter, Description, Type).
    *   Clicks the address/location -> Opens Google Maps for navigation.
    *   Clicks "Diterima" -> Updates `responder_status`.
    *   Clicks "Sedang Berjalan" -> Updates `responder_status`.
    *   Clicks "Selesai" -> Updates `responder_status`. (*System may automatically update main report status to `'completed'`*).
    *   Clicks "Batal" -> Opens cancellation modal -> Enters reason -> Submits.
    *   *System Action:* Calls `request_cancellation` RPC, report `status` changes to `'cancellation_pending'`.
4.  **Interacting with an Assigned Contribution:**
    *   Views contribution details (Type, Description, Pickup Location).
    *   Clicks the pickup address -> Opens Google Maps for navigation.
    *   Coordinates pickup with the contributor (if necessary, contact info might be available only to responder/admin).
    *   Clicks "Confirm Pickup" -> Calls `confirm_contribution_pickup` RPC.
    *   *System Action:* Contribution `status` changes to `'pickup_completed'`.
    *   (May have further actions like "Start Distribution", "Complete Distribution" depending on detailed requirements).

**4. Admin / Co-Admin Flow:**

*   Logs into the main system Admin Dashboard.
*   Performs high-level administrative tasks:
    *   Managing organizations (creating, updating, disabling).
    *   Managing Org Admin accounts.
    *   Potentially viewing system-wide reports/analytics.
*   *(Assumption)* Generally does *not* perform the day-to-day operational tasks of reviewing/assigning reports/contributions unless stepping in for an Org Admin or handling system-level issues.

---

## Emergency Report Status Flow

This document outlines the lifecycle of an emergency report and the process for cancellation.

The `status` field of an emergency report progresses through the following states:

1.  **`pending`**: Initial state when a report is first submitted by a user. Awaiting review by an admin.
2.  **`verified`**: Admin has reviewed the report and confirmed its legitimacy. It's ready for assignment.
3.  **`ditugaskan`**: An admin or a responder has assigned the report to a specific responder/organization. The `org_responder_id`, `responder_id`, `org_responder_name`, and `responder_name` fields should be populated (via the `assign_emergency_report` RPC).
4.  **`on progress`**: The assigned responder has acknowledged the report (`responder_status` = `'diterima'`) and is actively working on it (`responder_status` = `'sedang_berjalan'`). *(Note: This status represents the responder's progress. The main report `status` might remain `'ditugaskan'` while `responder_status` changes, or this `on progress` status could be used instead. Needs clarification based on desired system behavior).*
5.  **`completed`**: The responder has marked the task as `selesai`. The emergency has been addressed.
6.  **`cancelled`**: The report has been formally cancelled after a cancellation request was approved. No further action is taken.
7.  **`rejected`**: An admin reviewed the initial `pending` report and deemed it invalid or inappropriate.
8.  **`cancellation_pending`**: An admin (or potentially a responder later) has requested cancellation, providing a reason. Awaiting final confirmation/action by an admin.

## Cancellation Flow (Admin Initiated)

This flow describes how an administrator (`org_admin`) requests the cancellation of a report:

1.  **Initiation:** An `org_admin` clicks a "Cancel Report" button (or similar UI element) associated with a specific report. This action is typically available for reports in states like `verified`, `ditugaskan`, or potentially `on progress`.
2.  **Reason Input:** A modal or form appears, prompting the admin to provide a mandatory reason for the cancellation request.
3.  **Submission:** The admin submits the form with the reason.
4.  **RPC Call:** The frontend application calls the `request_cancellation(p_report_id, p_reason)` Supabase RPC function, passing the report's ID and the provided reason.
5.  **Backend Update:**
    *   The `request_cancellation` function executes.
    *   It potentially verifies if the calling user has the necessary admin privileges.
    *   It updates the corresponding row in the `emergency_reports` table:
        *   Sets `status` to `'cancellation_pending'`.
        *   Sets `cancellation_reason` to the `p_reason` argument.
        *   Sets `cancellation_requester_id` to the `auth.uid()` of the calling admin.
        *   Sets `cancellation_requested_at` to the current timestamp (`now()`).
6.  **Frontend Update:** The frontend receives confirmation of the successful RPC call. It should update the UI to reflect the new `'cancellation_pending'` status, potentially by refreshing the data or updating the local state optimistically. The reason input modal is closed.
7.  **Admin Review:** Reports with the status `'cancellation_pending'` should be clearly visible in the admin dashboard (e.g., through filtering or specific styling). An admin needs to review these pending requests and the associated reasons.
8.  **Final Action:** The reviewing admin takes final action on the pending request, typically using the status update mechanism (e.g., the status dropdown):
    *   **Approve:** Change the status from `'cancellation_pending'` to `'cancelled'`.
    *   **Reject:** Change the status from `'cancellation_pending'` back to its previous state (e.g., `'verified'`, `'ditugaskan'`). *(Note: The exact behavior on rejection needs confirmation. Should it revert, or go to a different state?)*

This flow ensures that cancellations are logged with a reason and require explicit admin approval before being finalized.

---

## Contribution Flow (Public Submission)

This section outlines the lifecycle of a contribution submitted via the public "Beri Bantuan" form.

**Assumptions:**
*   Contributions are stored in a separate `contributions` table.
*   The form includes a checkbox allowing the contributor to display their contact publicly or have it coordinated by responders.

**Contribution Status Flow (Example):**

*(Needs refinement based on requirements)*

1.  **`pending_review`**: Initial state after public submission. Awaiting admin review.
2.  **`verified`**: Admin reviewed and confirmed the contribution's validity.
    *   If contact **is public**: May transition directly to a `publicly_listed` status or similar. No responder assignment needed for pickup.
    *   If contact **is not public**: Proceeds to assignment for coordination.
3.  **`awaiting_assignment`**: (Only if contact is not public) Verified and ready for an admin to assign a responder for pickup/coordination.
4.  **`assigned_for_pickup`**: (Only if contact is not public) Admin assigned an `org_responder` to coordinate/pick up the contribution. Requires `responder_id`, `org_responder_id`, etc. fields.
5.  **`pickup_completed`**: (Only if contact is not public) Responder confirmed pickup.
6.  **`distribution_pending`**: Contribution is available for distribution (either picked up or publicly listed). Maybe linked to an `emergency_report` or area need.
7.  **`completed`**: Contribution has been successfully distributed or utilized.
8.  **`rejected`**: Admin reviewed and deemed the contribution invalid/inappropriate.

**Coordination Flow (When Contact is NOT Public):**

1.  **Submission:** User submits the "Beri Bantuan" form, leaving "Display contact" unchecked.
2.  **DB Record:** A new record is created in the `contributions` table with status `pending_review`.
3.  **Admin Review:** `org_admin` reviews the pending contribution.
4.  **Verification/Rejection:** Admin sets status to `verified` or `rejected`.
5.  **Assignment (if verified):** Admin assigns an `org_responder` to the contribution (e.g., via an `assign_contribution(contribution_id, responder_id, org_id)` RPC). Status changes to `assigned_for_pickup`.
6.  **Responder Action:** Assigned `org_responder` coordinates and picks up the contribution, then updates the status (e.g., via `confirm_contribution_pickup(contribution_id)` RPC) to `pickup_completed`.
7.  **Distribution:** Further steps involve matching the contribution to needs and marking it as `completed` (details TBD).

---

## Responder Assignment Page

This section describes the dedicated page for `org_responder` users to view and manage their assigned tasks.

**User Flow:**

1.  **Login:** The user logs in with their `org_responder` account.
2.  **Navigation:** The responder navigates to their assignments page (e.g., via a sidebar link labeled "My Tasks" or "Assignments"). The suggested route is `/responder/assignments`.
3.  **View:** The page loads, displaying only the Emergency Reports and Contributions currently assigned specifically to them.
4.  **Interaction:**
    *   The responder reviews the details of each assigned task (report description, contribution type, location, etc.).
    *   They click/tap on addresses to open them in Google Maps for navigation.
    *   They use the action buttons on each task card to update its status (e.g., `Diterima`, `Sedang Berjalan`, `Selesai`, `Batal` for reports; `Confirm Pickup` for contributions).
    *   The page ideally updates in real-time or provides a manual refresh option if other tasks are assigned while they are viewing.

**Page Details:**

*   **Route:** `/responder/assignments`
*   **Access Control:** Restricted to users with the `org_responder` role.
*   **Layout:** Mobile-first, responsive design. Likely using a card-based layout for assignments rather than wide tables.
*   **Sections/Tabs (Optional):** May have separate sections or tabs for "Assigned Emergency Reports" and "Assigned Contributions".
*   **Data Fetching:** Fetches data from `emergency_reports` (where `responder_id` matches current user) and `contributions` (where `assigned_responder_id` matches current user) for relevant active statuses.
*   **Components:**
    *   `AssignedReportCard`: Displays key report details (Type, Submitter, Description, Location). Includes a prominent, clickable Google Maps link for the address/coordinates. Contains action buttons (`Diterima`, `Sedang Berjalan`, `Selesai`, `Batal`). **The `Batal` button triggers the cancellation request modal, requiring a reason and calling the `request_cancellation` RPC.**
    *   `AssignedContributionCard`: Displays key contribution details (Type, Description, Pickup Location). Includes a prominent, clickable Google Maps link for the pickup address. Contains action buttons (`Confirm Pickup`, potentially others like `Unable to Complete`).
*   **Real-time (Optional but Recommended):** Utilizes Supabase Realtime subscriptions to keep the assignment list up-to-date.

**Implementation Status:**

Refer to the following tasks in the main Implementation Plan:

*   **Phase 2:** All items under "Frontend (Responder Dashboard/View)".
*   **Phase 2:** The logic for the `Batal` button defined above needs implementation (item 1.d below).
*   **Phase 1:** Refinement of the `request_cancellation` RPC might be needed to handle calls from responders (item 3.b below).
*   **Phase 3:** Real-time updates, UI state management, error handling, and testing are all relevant.

---

## Implementation Plan

This section outlines the steps to implement the defined status and cancellation flows consistently across the application.

**Phase 1: Core Setup & Admin Cancellation (Emergency Reports)**

1.  **Database Schema:**
    *   [ ] Verify `emergency_reports` table includes `org_responder_id` (UUID), `responder_id` (UUID), `org_responder_name` (TEXT), `responder_name` (TEXT).
    *   [X] Add `cancellation_reason` (TEXT), `cancellation_requester_id` (UUID, FK to `auth.users`), `cancellation_requested_at` (TIMESTAMPTZ) to `emergency_reports`. (Migration `add_cancellation_fields_to_emergency_reports` applied).
2.  **Types Definition:**
    *   [ ] Define `EmergencyReportStatus` union type centrally (e.g., `src/types/report.ts` or within `EmergencyReportsTable.tsx` if simpler) including all statuses: `pending`, `verified`, `ditugaskan`, `on progress`, `completed`, `cancelled`, `rejected`, `cancellation_pending`.
    *   [ ] Update `EmergencyReport` interface to use `EmergencyReportStatus` type and include all necessary fields (`org_responder_id`, `responder_id`, `org_responder_name`, `responder_name`, `cancellation_reason`, etc.).
3.  **Backend RPC Functions:**
    *   [X] Create/Verify `assign_emergency_report(report_id, p_org_responder_id, p_responder_id)` RPC function. (Migration `create_assign_emergency_report_function` applied).
        *   [ ] *Refinement:* Ensure it correctly fetches/updates `org_responder_name` and `responder_name` based on actual schema (`organizations` table, `auth.users` metadata).
    *   [X] Create/Verify `request_cancellation(p_report_id, p_reason)` RPC function. (Migration `create_request_cancellation_function` applied).
        *   [ ] *Refinement:* Review/modify role check. Function should allow calls from the assigned `responder_id` for the report **OR** an authorized admin role.
    *   [ ] Review `updateStatus` function in `EmergencyReportsTable.tsx` - determine if a generic RPC `update_report_status(report_id, status)` is needed for simple admin transitions (e.g., pending -> verified, verified -> rejected, cancellation_pending -> cancelled/previous).
4.  **Frontend (`EmergencyReportsTable.tsx` - Admin View `responderView=false`):**
    *   [ ] Use the central `EmergencyReportStatus` type for state and props.
    *   [ ] Update status dropdown options to include all defined statuses.
    *   [ ] Implement `CancellationModal` component (UI).
    *   [ ] Add "Cancel Report" button.
    *   [ ] Implement `openCancellationModal`, `closeCancellationModal`, `handleCancellationSubmit` functions.
    *   [ ] Connect `handleCancellationSubmit` to `request_cancellation` RPC.
    *   [ ] Implement UI display for `cancellation_pending` status (e.g., specific color, maybe show reason on hover/details).
    *   [ ] Ensure status dropdown allows final cancellation approval (`cancellation_pending` -> `cancelled`) or rejection (`cancellation_pending` -> previous state - *needs clarification*).
    *   [ ] Implement UI display for `ditugaskan` showing "Ditugaskan ke \[responder] dari \[org]".

**Phase 1.5: Core Setup (Contributions)**

1.  **Database Schema:**
    *   [ ] Define and create `contributions` table schema (including fields for type, description, address, photo_url, contributor_email, status, public_contact_flag, assigned_responder_id, etc.).
2.  **Types Definition:**
    *   [ ] Define `ContributionStatus` union type.
    *   [ ] Define `Contribution` interface.
3.  **Backend RPC Functions:**
    *   [ ] Create `submit_contribution(...)` RPC (called by public form).
    *   [ ] Create `verify_contribution(contribution_id)` RPC (Admin).
    *   [ ] Create `assign_contribution(contribution_id, responder_id, org_id)` RPC (Admin).
    *   [ ] Create `confirm_contribution_pickup(contribution_id)` RPC (Responder).
    *   [ ] Create `complete_contribution(contribution_id)` RPC (Admin/Responder?).
    *   [ ] Create `reject_contribution(contribution_id)` RPC (Admin).
4.  **Frontend (Admin Dashboard):**
    *   [ ] Create a new table/view component to display contributions.
    *   [ ] Implement UI for admins to review (`pending_review`), verify/reject, and assign contributions.

**Phase 2: Responder Integration (Emergency Reports & Contributions)**

1.  **Frontend (`EmergencyReportsTable.tsx` - Responder View `responderView=true`):**
    *   [ ] Use the central `EmergencyReportStatus` type.
    *   [ ] Modify "Assign to me" button's `onClick` handler. *(Decision: Remove this button from responder view as only Admins assign).*
    *   [ ] Implement UI display for `ditugaskan` showing "Ditugaskan ke \[responder] dari \[org]".
    *   [X] Modify "Batal" button (Emergency Reports):
        *   [X] Decision: Trigger full cancellation flow (modal + `request_cancellation` RPC).
        *   [ ] Update button's `onClick` to use `openCancellationModal` (which needs to be available/imported).
    *   [ ] Review interaction between `responder_status` (`diterima`, `sedang_berjalan`, `selesai`) and the main `status` (`ditugaskan`, `on progress`, `completed`). Decide if `on progress` main status is needed or if `responder_status` is sufficient detail when main status is `ditugaskan`. *(Note: `responder_status = 'batal'` is now handled by the main cancellation flow).*
2.  **Frontend (Responder Dashboard/View - `/responder/assignments`):**
    *   [ ] Create page file and route.
    *   [ ] Implement role check for `org_responder`.
    *   [ ] Create `fetchMyAssignedReports` and `fetchMyAssignedContributions` functions.
    *   [ ] Develop `AssignedReportCard` component:
        *   [ ] Display data.
        *   [ ] Implement Google Maps link.
        *   [ ] Implement `Diterima`, `Sedang Berjalan`, `Selesai` buttons (calling `updateResponderStatus` or similar RPC).
        *   [ ] Implement `Batal` button (calling `openCancellationModal`).
    *   [ ] Develop `AssignedContributionCard` component:
        *   [ ] Display data.
        *   [ ] Implement Google Maps link.
        *   [ ] Implement `Confirm Pickup` button (calling `confirm_contribution_pickup` RPC).
    *   [ ] Implement `CancellationModal` component (or import if shared) for use by the `Batal` button.
    *   [ ] Connect modal submit to `request_cancellation` RPC.

**Phase 3: Conflict Prevention & Refinements**

1.  **UI State Management:**
    *   [ ] Disable actions based on current status (e.g., cannot assign if already assigned, cannot cancel if completed). Applicable to both reports and contributions.
    *   [ ] Ensure UI elements are only visible/enabled for the correct roles (Admin vs. Responder).
2.  **Real-time Updates:**
    *   [ ] Implement Supabase Realtime subscriptions on `emergency_reports` and `contributions` tables.
3.  **Error Handling:**
    *   [ ] Robustly handle errors from RPC calls and display user-friendly messages.
4.  **Testing:**
    *   [ ] Test all status transitions for both entity types and roles.
    *   [ ] Test cancellation/rejection flows.
    *   [ ] Test assignment flows.
    *   [ ] Test concurrent access scenarios (if possible) or rely on Realtime updates.

