# Tech Context

## Frameworks & Libraries
- **Next.js** (React framework) with **TypeScript**
- **Supabase** for:
  - Authentication (role-based access)
  - PostgreSQL database
  - Storage (images, files)
- **Leaflet** for interactive maps
- **Tailwind CSS** for styling
- **Supabase client libraries** for API calls

## Development Setup
- Node.js (version specified in `.nvmrc`)
- Package management via `npm`
- ESLint and Prettier for code linting and formatting
- Project structured under `src/app/` with components, pages, and shared modules
- Supabase migrations managed via SQL files in `supabase/migrations/`

## Technical Constraints
- Role management handled via Supabase policies and user metadata
- Real-time updates depend on Supabase subscriptions or polling
- Map rendering and marker updates via Leaflet
- Manual shelter assignment requires UI and DB support
- Organization management requires additional schema and UI components

## Dependencies
- `next`, `react`, `react-dom`
- `@supabase/supabase-js`
- `leaflet`
- `tailwindcss`
- `eslint`, `prettier`
- Other typical Next.js/React tooling
