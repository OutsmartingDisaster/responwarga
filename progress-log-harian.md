# Log Harian UI/UX & Feature Improvement Progress

## Plan & Task Checklist

- [x] 1. Page Layout & Structure
    - [x] Section Cards for each log section (Check-in, Inventory, Activity, Delivery)
    - [x] Sticky Date Picker
    - [x] Consistent Spacing
    - [x] Responsive Design
- [x] 2. Visual Hierarchy
    - [x] Larger, bolder section headings
    - [x] Highlight today in date selector
    - [x] Status badges for logs
- [x] 3. Interaction & Feedback
    - [x] Loading skeletons
    - [x] Inline editing for log fields
    - [x] Success/Error toast notifications
- [x] 4. Navigation & Usability
    - [x] Tabs or accordions for log sections
    - [x] Quick Add buttons in each section
    - [x] Filter/Search within logs
- [x] 5. Accessibility
    - [x] Keyboard navigation
    - [x] Color contrast improvements
    - [x] ARIA labels for interactive elements
- [ ] Feature Suggestions
    - [ ] Photo attachments for logs/entries
    - [ ] Location tagging for logs/activities
    - [ ] Commenting/notes for logs/sub-entries
    - [ ] Export/Print logs
    - [ ] Notifications for new/updated logs
    - [ ] Role-based permissions for editing/deleting
    - [ ] Summary & analytics dashboard
    - [ ] Integration with emergency reports

### General
- [ ] Refactor shared types (OrgMember, DisasterResponse, etc.) into separate files.
- [x] Fix duplicate key errors in sidebar navigation.
- [x] **Check slug consistencies** -> Fixed: Updated incorrect slug, enforced auto-generation in onboarding/profile.

---

## Upcoming Major Refactor: Single Log Focus with Date Switcher

- Refactor the UI to only show one log at a time, with date navigation (date picker and Previous/Next arrows).
- Add logic to check if a log exists for the selected date.
- If no log exists:
  - If the user is an org_admin, show a prominent "Check-in & Create Log" button at the top.
  - After check-in, the log is created and the rest of the UI appears.
  - For non-admins, show a message: "No log for this date. Please contact your admin to check in."
- Add a Save button for the daily log (at the bottom or sticky at the bottom of the screen).
- Use Supabase for all log creation and updates.
- Add toasts for feedback (success/error).
- Disable editing of log details until the log is created (after check-in).
- Make the check-in button visually prominent (primary color, large, at the top).
- Optionally, auto-focus the date picker for quick navigation.

---

## Progress Log

- **[Initial]** Created progress documentation and checklist based on user requirements.
- **[Daily Log]** Section Cards -> Replaced by Tabs.
- **[Daily Log]** Sticky Date Picker implemented.
- **[Daily Log]** Consistent Spacing improved.
- **[Daily Log]** Responsive Design enhanced.
- **[Daily Log]** Visual Hierarchy improvements (headings, date, badges).
- **[Daily Log]** Loading Skeletons added.
- **[Daily Log]** Inline Editing & Toasts for specific fields.
- **[Daily Log]** Tabs for Sections implemented.
- **[Daily Log]** Quick Add Buttons added (placeholder).
- **[Daily Log]** Filter/Search implemented.
- **[Daily Log]** Accessibility improvements (ARIA, contrast, keyboard nav).
- **[Navbar]** Fixed duplicate key errors in sidebar navigation (`response_management`, removed `daily_log`).
- **[Disaster Response]** Implemented creation form (`DisasterResponseDashboard.tsx`).
- **[Disaster Response]** Resolved multiple DB schema mismatches for `disaster_responses` (disaster_types, location, start_date) and `team_assignments` (added `disaster_response_id`, `member_id`, removed redundant columns) via migrations. Added `latitude`, `longitude`, `parsed_address` columns to `disaster_responses`.
- **[Disaster Response]** Integrated Leaflet map with address search (forward geocoding), marker placement (click/drag), coordinate storage, and address display (reverse geocoding). Map now appears only after search/click.
- **[Disaster Response]** Implemented fetching and displaying the list of active responses.
- **[Disaster Response]** Added interactive list items (clickable area) and placeholder Edit/Delete buttons to the active response list. Installed `react-hot-toast`.
- **[Routing/Slug]** Fixed incorrect organization slug (`uid`) causing redirect issues. Updated DB via migration.
- **[Routing/Slug]** Removed manual slug input from Organization Onboarding and Profile forms, enforcing auto-generation from name and uniqueness checks.
- **[SSR Fix]** Resolved `window is not defined` errors by dynamically importing Leaflet map components (`MapContainer`, `TileLayer`, `Marker`, `useMapEvents` wrapper) in `DisasterResponseDashboard.tsx` and the main dashboard page (`page.tsx`).
- **[Dashboard]** Corrected `fetchMembers` function in dashboard page (`page.tsx`) to query `profiles` table instead of `members`.
- **[Dashboard]** Added Logout button to the sidebar.
- **[Disaster Response]** Created Response Detail page (`/responses/[responseId]/page.tsx`) structure and implemented data fetching (Response info, Assigned Members) with org ownership verification.
- **[Disaster Response]** Connected 'View Details' action on the response list to navigate to the Response Detail page.

---

---

**Next Steps:**

- [ ] **Implement Response Detail Page (`/responder/[slug]/dashboard/responses/[responseId]/page.tsx`)**
    - [ ] **Fetch Data:**
        - [ ] Get `slug` and `responseId` from params.
        - [ ] Fetch `disaster_response` data using `responseId`.
        - [ ] **Verify Ownership:** Ensure fetched response's `organization_id` matches the org derived from `slug` (or rely on RLS).
        - [ ] Fetch `team_assignments` using `responseId`.
        - [ ] Fetch `profiles` for assigned `member_id`s.
        - [ ] Fetch related logs (Check-in, Activity, Inventory, Delivery) filtered by `disaster_response_id` (Requires adding `disaster_response_id` to those log tables if not already present).
        - [ ] Handle loading and error states.
    - [ ] **Display Data:**
        - [ ] Show basic response info (name, type, dates, status).
        - [ ] Display location info (description, parsed address, map with marker).
        - [ ] Display list of assigned members.
        - [ ] Display fetched logs (perhaps in tabs or sections).
        - [ ] Add "Kembali ke Dasbor" link (using the `slug`).
    - [ ] **Connect Navigation:**
        - [ ] Update `handleViewDetails` in `DisasterResponseDashboard.tsx` to use `router.push` to navigate to the detail page `/responder/${slug}/dashboard/responses/${responseId}`.

- [x] **Implement Edit Response Functionality**
    - [x] **Create Edit UI:**
        - [x] Decide on UI (separate page `/responder/[slug]/dashboard/responses/[responseId]/edit` or modal).
        - [x] Create the form component (`page.tsx` created).
        - [x] Pre-fill form with data fetched for the specific `responseId`.
        - [ ] Include map for potentially editing location.
    - [x] **Implement Update Logic:**
        - [x] Create `handleUpdateResponse` function.
        - [x] Verify user permission for the org (`slug`).
        - [x] Call Supabase `.update()` for `disaster_responses` table, matching `id`.
        - [ ] Handle updates to assigned members (fetch current, compare with form, insert/delete assignments).
        - [x] Add success/error feedback (toasts).
        - [x] Redirect or close modal on success.
    - [x] **Connect Edit Button:**
        - [x] Update `handleEditResponse` in `DisasterResponseDashboard.tsx` (and potentially on detail page) to navigate/open the edit UI.

- [x] **Implement Archive/Delete Response Functionality**
    - [ ] **Decide Strategy:** Choose between "Archive" (set `status` to `'archived'`) or hard "Delete". (Archive is often safer).
    - [x] **Implement Confirmation:** Add a confirmation modal/dialog before proceeding.
    - [x] **Implement Backend Logic:**
        - [ ] Verify user permission for the org (`slug`).
        - [ ] **(Archive):** Create `handleArchiveResponse` function to call Supabase `.update()` setting `status` to `'archived'`, matching `id` and `organization_id`.
        - [x] **(Delete):** Create `handleDeleteResponse` function to call Supabase `.delete()`, matching `id` and `organization_id`. Handle potential cascade issues or related data cleanup if necessary.
    - [x] **Update UI:**
        - [x] Refetch active/archived lists after action.
        - [x] Add success/error feedback (toasts).
    - [x] **Connect Button:**
        - [x] Update `handleDeleteResponse` placeholder in `DisasterResponseDashboard.tsx` (and potentially detail page) to trigger confirmation and chosen logic.

- [ ] **Implement Display for Archived Responses**
    - [ ] **Add UI Section:** Create a new section/tab on `