# Map Marker Logic Documentation

This document explains how map markers (for Emergency Reports and Contributions) are fetched, processed, and displayed on the main map.

## Goal

To display relevant emergency reports and contributions as interactive markers on a Leaflet map, allowing users to filter them and view details.

## Core Components Involved

1.  **`src/app/page.tsx`** (or other top-level page component):
    *   Responsible for fetching the raw data for *all* marker types (e.g., `emergency_reports`, `contributions`) from Supabase.
    *   Manages state for fetched data, filters, loading, and errors.
    *   Renders the main `Map` component, passing down the fetched data and filter settings as props.
    *   Contains the filter UI controls (dropdowns).

2.  **`src/app/components/Map.tsx`**:
    *   A wrapper component that dynamically imports `MapLeaflet` to avoid SSR issues.
    *   Primarily responsible for passing props down from the page to `MapLeaflet`.
    *   Accepts `emergencyReportsData`, `contributionsData` (and potentially others) props.

3.  **`src/app/components/MapLeaflet.tsx`**:
    *   The main Leaflet map container (`<MapContainer>`).
    *   Receives fetched data arrays (e.g., `emergencyReportsData`) and filter settings as props.
    *   Conditionally renders specific marker components (`EmergencyMarkers`, `ContributionMarkers`) based on the `filterType` prop (`all`, `emergency`, `contribution`).
    *   Passes the relevant data array and specific type filters (e.g., `emergencyType`, `contributionType`) to the marker components.

4.  **`src/app/components/map/EmergencyMarkers.tsx`**:
    *   Receives the `reportsData` prop (array of emergency reports).
    *   Uses `useEffect` to format the raw `reportsData` into an array of `EmergencyMarker` objects (defined in `./types`).
    *   Applies filtering based on the `filterType` prop (e.g., `emergencyType`) passed from `MapLeaflet`.
    *   Maps over the filtered/formatted marker array.
    *   For each marker, determines the icon (from `MarkerIcons`), calculates the position (using `MarkerUtils.getOffsetPosition` for overlaps), and renders a React Leaflet `<Marker>`. 
    *   Includes fallback logic to display test markers if `reportsData` is empty/null.

5.  **`src/app/components/map/ContributionMarkers.tsx`**:
    *   Similar structure to `EmergencyMarkers.tsx`.
    *   Receives contribution data via props.
    *   Formats data into `ContributionMarker` objects.
    *   Applies filtering based on `contributionType` prop.
    *   Renders contribution markers with appropriate icons and popups.

6.  **`src/app/components/map/MarkerUtils.ts`**:
    *   Contains utility functions, notably `getOffsetPosition`, which slightly adjusts coordinates for markers at the exact same location to prevent them from perfectly overlapping.
    *   Tracks counts of markers at each coordinate to calculate offsets.

7.  **`src/app/components/map/MarkerIcons.tsx`**:
    *   Defines the Leaflet `L.Icon` objects used for different marker types (e.g., different icons for evacuation, medical aid, shelter contribution).

8.  **`src/app/components/map/MarkerPopup.tsx`**:
    *   A component responsible for rendering the content displayed inside the popup when a marker is clicked.
    *   Receives marker data as a prop and formats it for display.

9.  **`src/app/components/map/types.ts`** (or `.tsx`):
    *   Defines TypeScript interfaces/types for the structured marker data (e.g., `EmergencyMarker`, `ContributionMarker`).

## Data Flow Summary

1.  `page.tsx`: Fetches `emergency_reports` & `contributions` -> Sets state (`emergencyReports`, `contributionsData`).
2.  `page.tsx`: Renders `<Map emergencyReportsData={emergencyReports} contributionsData={...} />`.
3.  `Map.tsx`: Renders `<MapLeaflet emergencyReportsData={props.emergencyReportsData} contributionsData={...} />`.
4.  `MapLeaflet.tsx`: Based on `filterType`, renders `<EmergencyMarkers reportsData={props.emergencyReportsData} filterType={props.emergencyType} />` and/or `<ContributionMarkers contributionsData={props.contributionsData} filterType={props.contributionType} />`.
5.  `EmergencyMarkers.tsx`: Receives `reportsData` -> Formats into `EmergencyMarker[]` -> Filters based on `filterType` -> Maps over array -> Renders `<Marker>` with icon and `<Popup>` containing `<MarkerPopup>`. (Similar flow for `ContributionMarkers`).

## How to Modify or Extend

*   **Change Data Fetching (e.g., add filters, change table):**
    *   Modify the `useEffect` hook and Supabase query within `src/app/page.tsx`.
    *   Ensure any new data fields needed for display are included in the `select()` clause.
*   **Add a New Type of Marker (e.g., "Safe Zones"):**
    1.  Fetch the data for safe zones in `src/app/page.tsx` and store it in a new state variable (e.g., `safeZonesData`).
    2.  Add a corresponding prop (e.g., `safeZonesData`) to `MapProps` (`Map.tsx`) and `MapLeafletProps` (`MapLeaflet.tsx`). Pass the data down.
    3.  Create a new marker component: `src/app/components/map/SafeZoneMarkers.tsx`, modeling it after `EmergencyMarkers.tsx`.
    4.  Define a new marker type in `src/app/components/map/types.ts` (e.g., `SafeZoneMarker`).
    5.  Update `SafeZoneMarkers.tsx` to format the received data into `SafeZoneMarker[]`.
    6.  Add a new icon for safe zones in `src/app/components/map/MarkerIcons.tsx`.
    7.  In `MapLeaflet.tsx`, add logic to render `<SafeZoneMarkers safeZonesData={props.safeZonesData} />` (potentially based on a new `filterType` option).
    8.  Update `MarkerPopup.tsx` or create a specific popup component if needed.
    9.  Add a new filter option to the UI in `page.tsx` if desired.
*   **Change Marker Icons:**
    *   Modify the icon definitions in `src/app/components/map/MarkerIcons.tsx`.
    *   Adjust the logic for selecting icons within `EmergencyMarkers.tsx` or `ContributionMarkers.tsx` if needed.
*   **Change Popup Content/Layout:**
    *   Modify the `src/app/components/map/MarkerPopup.tsx` component.
*   **Change Filtering Logic:**
    *   Update the filtering applied within the `useEffect` or rendering logic of `EmergencyMarkers.tsx` / `ContributionMarkers.tsx` based on the `filterType` prop (e.g., `emergencyType`, `contributionType`).
    *   Update the filter dropdown options and state management in `src/app/page.tsx`.
*   **Change Overlap Handling:**
    *   Modify the `getOffsetPosition` logic in `src/app/components/map/MarkerUtils.ts`. 