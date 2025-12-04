# Design Document

## Overview

This design document outlines the complete migration of Respon Warga from Supabase to self-hosted PostgreSQL 15 at 192.168.18.27:5433. The migration focuses on removing all Supabase dependencies, ensuring code modularity (max 250 lines per file), implementing robust Role-Based Access Control (RBAC), and maintaining consistent authentication and authorization across all application layers.

**Current State Analysis:**
- The application has partial PostgreSQL infrastructure (`src/lib/db/pool.ts`, `src/lib/auth/`)
- Supabase is still actively used in middleware (`src/middleware.ts`)
- API routes still use Supabase clients (`src/lib/supabase/`)
- Environment configuration still references Supabase URLs and keys
- RBAC exists but is inconsistent across layers

**Migration Goals:**
1. Replace all Supabase clients with direct PostgreSQL connections
2. Update middleware to use PostgreSQL-based session validation
3. Implement consistent RBAC enforcement across all layers
4. Remove all Supabase dependencies from package.json
5. Update environment configuration to use PostgreSQL at 192.168.18.27:5433
6. Ensure all files are under 250 lines

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages &    │  │  Components  │  │   Contexts   │      │
│  │   Routes     │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP/Fetch
┌───────────────────────────┼─────────────────────────────────┐
│                           ▼                                 │
│                    API Routes Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Auth     │  │     Data     │  │   Business   │      │
│  │   Endpoints  │  │   Endpoints  │  │    Logic     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                           ▼                                 │
│                   Service Layer (lib/)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Auth     │  │   Database   │  │    Query     │      │
│  │   Helpers    │  │     Pool     │  │   Builder    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │ node-postgres (pg)
┌───────────────────────────┼─────────────────────────────────┐
│                           ▼                                 │
│              PostgreSQL 15 (192.168.18.27:5433)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  auth schema │  │public schema │  │   PostGIS    │      │
│  │   (users,    │  │  (profiles,  │  │  Extension   │      │
│  │   sessions)  │  │  responses)  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```


### Layer Responsibilities

**Frontend Layer:**
- React components for UI rendering
- Client-side state management (Zustand)
- HTTP requests to API routes
- No direct database access

**API Routes Layer:**
- Request validation and sanitization
- Session authentication via cookies
- Business logic orchestration
- Response formatting
- Error handling

**Service Layer:**
- Database connection pooling
- Authentication helpers (session, password, user)
- Query execution and transaction management
- Session context application
- Reusable business logic

**Database Layer:**
- PostgreSQL 15 with PostGIS extension
- Two schemas: `auth` (users, sessions) and `public` (application data)
- Row-level security policies
- Stored procedures for complex operations

## Components and Interfaces

### Database Connection Module

**Location:** `src/lib/db/pool.ts`

**Responsibilities:**
- Manage PostgreSQL connection pool
- Provide query execution interface
- Handle transactions
- Apply session context for RLS

**Key Functions:**
```typescript
export async function query<T>(text: string, params?: any[]): Promise<QueryResult<T>>
export async function withClient<T>(handler: (client: DbClient) => Promise<T>): Promise<T>
export async function withTransaction<T>(handler: (client: DbClient) => Promise<T>): Promise<T>
export async function applySessionContext(client: DbClient, context?: DbSessionContext): Promise<void>
```


### Authentication Module

**Location:** `src/lib/auth/`

**Sub-modules:**
- `session.ts` - Session management (create, revoke, validate)
- `user.ts` - User operations (find, create, verify credentials)
- `password.ts` - Password hashing and verification
- `types.ts` - TypeScript type definitions

**Key Interfaces:**
```typescript
interface AuthUser {
  id: string
  email: string
  role: string
  created_at: string
  profile: ProfileRecord | null
}

interface ProfileRecord {
  id: string
  user_id: string
  name: string | null
  username: string | null
  role: string
  organization_id: string | null
  organization: string | null
  phone: string | null
  status: string | null
}
```

**Session Management:**
```typescript
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }>
export async function revokeSession(token: string): Promise<void>
export async function getSessionFromCookies(cookieSource?: CookieReader): Promise<AuthUser | null>
export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void
export function clearSessionCookie(response: NextResponse): void
```


### Query Execution Module

**Location:** `src/lib/server/runQuery.ts`

**Responsibilities:**
- Execute CRUD operations on allowed tables
- Execute allowed stored procedures (RPC)
- Apply filters, ordering, and pagination
- Enforce table and function whitelists

**Supported Operations:**
- `select` - Query data with filters and ordering
- `insert` - Insert single or multiple rows
- `update` - Update rows matching filters
- `delete` - Delete rows matching filters
- `rpc` - Execute whitelisted stored procedures

**Security Features:**
- Table whitelist enforcement
- Function whitelist enforcement
- SQL injection prevention via parameterized queries
- Identifier sanitization

### API Routes

**Authentication Routes:**
- `POST /api/auth/login` - User login with credentials (public)
- `POST /api/auth/logout` - User logout and session revocation (authenticated)
- `POST /api/auth/register` - New user registration (public)
- `GET /api/auth/session` - Get current session user (public)

**Data Routes:**
- `POST /api/data` - Generic data operations (CRUD + RPC) (role-based)

**Admin Routes:**
- `GET /api/admin/users` - List all users (admin only)
- `POST /api/admin/users` - Create new user (admin only)
- `PUT /api/admin/users` - Update user (admin only)
- `DELETE /api/admin/users` - Delete user (admin only)

**Other Routes:**
- `POST /api/uploads` - File upload handling (authenticated)
- `POST /api/invite-member` - Organization member invitation (org_admin only)

### RBAC Helper Module

**Location:** `src/lib/auth/rbac.ts`

**Responsibilities:**
- Define role permissions
- Check if user has permission for action
- Validate organization membership
- Provide middleware helpers for route protection

**Key Functions:**
```typescript
export function hasPermission(userRole: string, requiredPermission: string): boolean
export function isOrgMember(userId: string, orgId: string): Promise<boolean>
export function requireRole(allowedRoles: string[]): (user: AuthUser | null) => boolean
export function requireOrgAccess(orgSlug: string): (user: AuthUser | null) => Promise<boolean>
```

**Permission Matrix:**
```typescript
const PERMISSIONS = {
  'admin': ['*'], // All permissions
  'org_admin': [
    'org:read', 'org:write', 'org:delete',
    'response:read', 'response:write', 'response:delete',
    'report:read', 'report:write', 'report:assign',
    'team:read', 'team:write', 'team:delete',
    'log:read', 'log:write'
  ],
  'org_responder': [
    'org:read',
    'response:read',
    'report:read', 'report:write',
    'team:read',
    'log:read', 'log:write'
  ],
  'public': [
    'report:create',
    'contribution:create'
  ]
}
```


## Data Models

### Database Schema

**auth.users**
```sql
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'responder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**auth.sessions**
```sql
CREATE TABLE auth.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**public.profiles**
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  username TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'responder',
  organization_id UUID REFERENCES public.organizations(id),
  organization TEXT,
  phone TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Role Hierarchy and RBAC

The system uses a unified role system with clear hierarchy and permissions:

**Role Definitions:**

1. **admin** - System administrator
   - Full system access
   - User management capabilities
   - Organization management
   - System configuration
   - Access to `/mohonijin/dashboard`

2. **org_admin** - Organization administrator
   - Full access to their organization's data
   - Team member management
   - Disaster response management
   - Report management
   - Access to `/responder/[slug]/dashboard`

3. **org_responder** - Field responder
   - Read access to organization data
   - Create and update reports
   - View assignments
   - Limited write access
   - Access to `/responder/[slug]/dashboard`

4. **public** - Unauthenticated user
   - View public data only
   - Submit emergency reports
   - Submit contributions
   - No dashboard access

**Role Storage:**
- Primary role stored in `auth.users.role`
- Profile role stored in `public.profiles.role` (must match auth.users.role)
- Organization membership stored in `public.profiles.organization_id`

**RBAC Enforcement Points:**

1. **Middleware Layer** (`src/middleware.ts`):
   - Validates session from PostgreSQL
   - Checks role for route access
   - Verifies organization membership for org-specific routes
   - Redirects unauthorized users

2. **API Route Layer** (all `/api/*` routes):
   - Validates session token
   - Checks role permissions for operation
   - Applies RLS context to database queries
   - Returns 403 for insufficient permissions

3. **Database Layer** (PostgreSQL RLS):
   - Row-level security policies based on role
   - Session context variables (`app.current_user_id`, `app.current_user_role`)
   - Automatic filtering of unauthorized data

4. **Frontend Layer** (React components):
   - Conditional rendering based on role
   - Hide/disable actions user cannot perform
   - Display appropriate error messages


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: No Supabase imports in production code

*For any* TypeScript or JavaScript source file in the production codebase (excluding node_modules, test files, and documentation), the file should contain zero imports of `@supabase/supabase-js` or `@supabase/ssr`.

**Validates: Requirements 1.1**

### Property 2: File size modularity

*For any* source file in `src/` directory (excluding generated files and node_modules), the file should contain no more than 250 lines of code.

**Validates: Requirements 2.1**

### Property 3: Refactoring preserves functionality

*For any* refactored module, all existing unit tests and integration tests should continue to pass with identical results before and after refactoring.

**Validates: Requirements 2.4**

### Property 4: Local module imports use relative paths

*For any* import statement in source files that references a local module (not from node_modules), the import path should be relative (starting with `./`, `../`, or `@/`).

**Validates: Requirements 2.5**

### Property 5: Session creation stores token

*For any* valid user ID, calling createSession should result in a new session record in the auth.sessions table with a hashed token and future expiration date.

**Validates: Requirements 3.1**


### Property 6: Session validation queries database

*For any* authenticated HTTP request with a valid session cookie, the authentication middleware should query the PostgreSQL database to validate the session token.

**Validates: Requirements 3.2**

### Property 7: Session validation returns complete user data

*For any* valid session token, the getSessionFromCookies function should return an AuthUser object containing id, email, role, created_at, and profile (if exists).

**Validates: Requirements 3.3**

### Property 8: Logout revokes session

*For any* valid session token, calling revokeSession should set the revoked_at timestamp in the database, making the session invalid for future requests.

**Validates: Requirements 3.4**

### Property 9: Expired sessions are rejected

*For any* session token with expires_at in the past, authentication requests should be rejected and return null user.

**Validates: Requirements 3.5**

### Property 10: Role names are consistent across layers

*For any* role name used in the system, the exact same string should appear in database schema, TypeScript types, API route checks, and frontend components.

**Validates: Requirements 4.1**

### Property 11: Role queries are consistent

*For any* user authentication or authorization check, the system should query the same role field (auth.users.role) from the database.

**Validates: Requirements 4.2**

### Property 12: RBAC enforcement is uniform

*For any* protected resource and role combination, the permission check should return the same result whether performed in API routes, middleware, or database RLS policies.

**Validates: Requirements 4.3**


### Property 13: User profiles include both roles

*For any* user with an associated profile, the AuthUser object should include both user.role (from auth.users) and user.profile.role (from profiles table) as distinct fields.

**Validates: Requirements 4.4**

### Property 14: API routes use database pool

*For any* API route that performs database operations, all queries should be executed through the pool.query() or withClient() functions from `@/lib/db/pool`.

**Validates: Requirements 5.1**

### Property 15: Queries use parameterization

*For any* SQL query executed in the application, user-provided values should be passed as parameterized arguments, never concatenated into the SQL string.

**Validates: Requirements 5.2**

### Property 16: API errors return appropriate status codes

*For any* error condition in API routes (validation error, auth error, database error), the response should include an appropriate HTTP status code (400, 401, 403, 404, 500) and error message.

**Validates: Requirements 5.4**

### Property 17: Frontend uses API routes for data

*For any* data operation in frontend components (CRUD operations), the component should make HTTP requests to API routes rather than direct database calls.

**Validates: Requirements 6.1**

### Property 18: API responses have consistent format

*For any* API route response, the JSON structure should follow the pattern `{ data: T | null, error: { message: string } | null }` or `{ data: { user: AuthUser | null }, error: { message: string } | null }` for auth endpoints.

**Validates: Requirements 6.2**


### Property 19: Authenticated requests include cookies

*For any* HTTP request from frontend to authenticated API routes, the request should automatically include credentials (cookies) via `credentials: 'include'` or Next.js automatic cookie forwarding.

**Validates: Requirements 6.3**

### Property 20: UI displays user-friendly errors

*For any* error response from API routes, the frontend should display a user-friendly error message (not raw error objects or stack traces) to the user.

**Validates: Requirements 6.4**

### Property 21: Connection errors are logged

*For any* database connection error, the system should log detailed error information including error message, stack trace, and connection parameters (excluding sensitive credentials).

**Validates: Requirements 7.4**

### Property 22: Auth helpers have consistent error handling

*For any* error thrown by authentication helper functions (createSession, hashPassword, findUserByEmail, etc.), the error should be caught and handled consistently, returning null or throwing a descriptive error.

**Validates: Requirements 8.4**

### Property 23: Network errors trigger retry logic

*For any* network-related database error (connection timeout, connection refused), the system should implement retry logic with exponential backoff before failing permanently.

**Validates: Requirements 9.5**

### Property 24: CRUD operations work for all entities

*For any* database table in the ALLOWED_TABLES whitelist, the runQuery function should successfully execute select, insert, update, and delete operations with appropriate filters.

**Validates: Requirements 10.2**


### Property 25: Frontend components display data correctly

*For any* frontend component that fetches and displays data, the component should correctly render the data received from API routes and handle loading and error states.

**Validates: Requirements 10.3**

### Property 26: RBAC enforces permissions correctly

*For any* role and protected resource combination, the system should consistently allow or deny access based on the role's permissions across all layers (frontend, API, database).

**Validates: Requirements 10.4**

### Property 27: Errors don't expose sensitive information

*For any* error response sent to clients, the response should not include sensitive information such as database connection strings, internal file paths, or password hashes.

**Validates: Requirements 10.5**

## Error Handling

### Error Categories

**1. Authentication Errors**
- Invalid credentials: Return 401 with "Invalid email or password"
- Expired session: Return 401 with "Session expired"
- Missing session: Return 401 with "Authentication required"
- Invalid token format: Return 401 with "Invalid session token"

**2. Authorization Errors**
- Insufficient permissions: Return 403 with "Insufficient permissions"
- Resource not owned: Return 403 with "Access denied"

**3. Validation Errors**
- Missing required fields: Return 400 with specific field names
- Invalid data format: Return 400 with format requirements
- Constraint violations: Return 400 with constraint details

**4. Database Errors**
- Connection errors: Log full details, return 500 with "Database connection failed"
- Query errors: Log query and params, return 500 with "Database operation failed"
- Transaction errors: Rollback and return 500 with "Transaction failed"

**5. Not Found Errors**
- Resource not found: Return 404 with "Resource not found"
- Route not found: Return 404 with "Endpoint not found"


### Error Handling Patterns

**API Route Pattern:**
```typescript
export async function POST(request: NextRequest) {
  try {
    // Validation
    const body = await request.json()
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    // Business logic
    const result = await someOperation(body)
    
    // Success response
    return NextResponse.json({ data: result })
  } catch (error: any) {
    // Log full error for debugging
    console.error('[route-name] operation failed', error)
    
    // Return safe error to client
    return NextResponse.json(
      { error: 'Operation failed.' },
      { status: 500 }
    )
  }
}
```

**Database Operation Pattern:**
```typescript
export async function someOperation(params: any) {
  try {
    const result = await query('SELECT * FROM table WHERE id = $1', [params.id])
    return result.rows
  } catch (error: any) {
    console.error('[someOperation] database error', error)
    throw new Error('Database operation failed')
  }
}
```

**Frontend Error Handling Pattern:**
```typescript
async function fetchData() {
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    
    if (result.error) {
      toast.error(result.error.message || 'Operation failed')
      return null
    }
    
    return result.data
  } catch (error) {
    toast.error('Network error. Please try again.')
    return null
  }
}
```


## Testing Strategy

### Dual Testing Approach

The migration will employ both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests:**
- Verify specific examples and edge cases
- Test integration points between components
- Validate error handling for known scenarios
- Test authentication flows with specific credentials
- Verify database operations with known data

**Property-Based Tests:**
- Verify universal properties across all inputs
- Test authentication with randomly generated users
- Validate query building with random filters
- Test session management with random tokens
- Verify role consistency across random role assignments

Together, unit tests catch concrete bugs while property tests verify general correctness.

### Property-Based Testing Configuration

**Library:** fast-check (for TypeScript/JavaScript)

**Configuration:**
- Minimum 100 iterations per property test
- Seed-based reproducibility for failed tests
- Shrinking enabled to find minimal failing cases

**Test Tagging Format:**
Each property-based test must include a comment tag:
```typescript
// Feature: supabase-to-postgresql-migration, Property 1: No Supabase imports in production code
```

### Unit Testing Strategy

**Authentication Tests:**
- Test login with valid credentials
- Test login with invalid credentials
- Test session creation and validation
- Test session expiration
- Test logout and session revocation
- Test password hashing and verification

**Database Tests:**
- Test connection pool initialization
- Test query execution with parameters
- Test transaction commit and rollback
- Test session context application
- Test error handling for connection failures

**API Route Tests:**
- Test each endpoint with valid inputs
- Test each endpoint with invalid inputs
- Test authentication middleware
- Test error responses
- Test response format consistency


**Frontend Tests:**
- Test component rendering with mock data
- Test user interactions (clicks, form submissions)
- Test error state display
- Test loading state display
- Test API integration with mock responses

### Integration Testing

**End-to-End Flows:**
1. User registration → profile creation → login → authenticated request
2. Login → create disaster response → assign team → add logs → logout
3. Admin login → user management → role assignment → permission verification
4. Public access → emergency report → contribution → share report

**Database Integration:**
- Test RLS policies with different user roles
- Test stored procedures (RPC functions)
- Test PostGIS spatial queries
- Test transaction isolation

### Test Coverage Goals

**Code Coverage:**
- Minimum 80% line coverage for business logic
- 100% coverage for authentication and authorization code
- 100% coverage for database query builders

**Property Coverage:**
- All 27 correctness properties must have corresponding property-based tests
- Each property test must run minimum 100 iterations
- All property tests must pass before deployment

### Testing Tools

**Unit Testing:**
- Jest or Vitest for test runner
- React Testing Library for component tests
- Supertest for API route testing

**Property-Based Testing:**
- fast-check for property generation and testing
- Custom generators for domain objects (users, sessions, roles)

**Integration Testing:**
- Playwright or Cypress for E2E tests
- Docker Compose for test database setup
- Test fixtures for known data scenarios


## Migration Strategy

### Middleware Redesign

**Current Middleware Issues:**
- Uses Supabase client for session validation
- Caches session data in memory (edge-incompatible long-term)
- Inconsistent role checking logic
- Complex nested conditionals

**New Middleware Design:**

**Location:** `src/middleware.ts`

**Flow:**
```
1. Extract session cookie
2. Validate session against PostgreSQL
3. Check route requirements
4. Verify role permissions
5. Verify organization membership (if needed)
6. Allow or redirect
```

**Implementation:**
```typescript
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  // Skip static assets and API routes
  if (shouldSkip(pathname)) {
    return NextResponse.next()
  }
  
  // Get session from cookie
  const user = await getSessionFromCookies(req.cookies)
  
  // Route-specific checks
  if (pathname.startsWith('/mohonijin/dashboard')) {
    return requireAdmin(user, req)
  }
  
  if (pathname.startsWith('/responder/')) {
    const slug = extractSlug(pathname)
    return requireOrgMember(user, slug, req)
  }
  
  // Public routes
  return NextResponse.next()
}
```

### Phase 1: Audit and Cleanup (Remove Supabase Dependencies)

**Objectives:**
- Remove all Supabase client libraries and imports
- Remove Supabase compatibility layers
- Remove Supabase environment variables
- Update package.json dependencies
- Rewrite middleware to use PostgreSQL

**Files to Remove:**
- `src/lib/supabaseUtils.ts`
- `src/lib/supabase/admin.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/compat.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/supabase/server.ts`
- Entire `src/lib/supabase/` directory

**Files to Rewrite:**
- `src/middleware.ts` - Replace Supabase with PostgreSQL session validation
- `src/app/api/admin/users/route.ts` - Replace Supabase admin client
- Any other API routes using Supabase

**Files to Update:**
- Remove `@supabase/supabase-js` and `@supabase/ssr` from package.json
- Update `.env.local` to use DATABASE_URL instead of SUPABASE_*
- Update `.env.example` with PostgreSQL configuration
- Update any imports that reference supabase files

### Phase 2: Code Refactoring (Ensure Modularity)

**Objectives:**
- Identify files exceeding 250 lines
- Refactor large files into smaller modules
- Maintain clear separation of concerns
- Update imports to use relative paths

**Refactoring Targets:**
- `src/lib/server/runQuery.ts` (currently ~300 lines)
- Any API routes exceeding 250 lines
- Any components exceeding 250 lines

**Refactoring Approach:**
- Extract query builders into separate files
- Extract filter builders into separate files
- Extract validation logic into separate files
- Extract business logic into service modules


### Phase 3: Authentication Consistency

**Objectives:**
- Verify auth flows work end-to-end
- Ensure role consistency across all layers
- Test session management thoroughly
- Validate error handling

**Verification Steps:**
1. Test login flow with various credentials
2. Test session validation in middleware
3. Test role-based access control
4. Test session expiration handling
5. Test logout and session revocation

**Role Consistency Checks:**
- Verify role names in database schema
- Verify role names in TypeScript types
- Verify role names in API route checks
- Verify role names in frontend components
- Verify role names in RLS policies

### Phase 4: Frontend-Backend Integration

**Objectives:**
- Ensure all frontend components use API routes
- Verify consistent response formats
- Test error handling in UI
- Validate loading states

**Integration Points:**
- Authentication (login, logout, session)
- User management (create, update, delete)
- Disaster responses (CRUD operations)
- Emergency reports (CRUD operations)
- Team assignments (CRUD operations)
- Daily logs (CRUD operations)

### Phase 5: Testing and Validation

**Objectives:**
- Write unit tests for all modules
- Write property-based tests for all properties
- Run integration tests
- Perform manual QA testing

**Test Execution:**
1. Run unit tests: `npm test`
2. Run property tests: `npm run test:properties`
3. Run integration tests: `npm run test:integration`
4. Run E2E tests: `npm run test:e2e`
5. Manual testing of critical flows


### Phase 6: Deployment and Monitoring

**Objectives:**
- Deploy to production environment
- Monitor for errors and performance issues
- Validate database connections
- Verify all features work in production

**Deployment Checklist:**
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] Monitoring and logging enabled
- [ ] Backup strategy in place
- [ ] Rollback plan documented

**Monitoring:**
- Database connection pool metrics
- API response times
- Error rates by endpoint
- Authentication success/failure rates
- Session creation and expiration rates

## Environment Configuration

### Required Environment Variables

**Production (.env.local):**
```bash
# Database Configuration
DATABASE_URL="postgresql://responwarga_user:PASSWORD@192.168.18.27:5433/responwarga_prod?sslmode=require"
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=20

# Session Configuration
SESSION_SECRET="your-secure-random-secret-key-here"
SESSION_COOKIE_NAME="rw_session"
SESSION_MAX_AGE_DAYS=7

# Application Configuration
NEXT_PUBLIC_ASSET_PREFIX=""
NODE_ENV="production"

# File Upload Configuration
FILE_UPLOAD_DIR="public/uploads"
PUBLIC_UPLOAD_BASE="/uploads"

# Map Configuration (if needed)
NEXT_PUBLIC_STADIA_API_KEY="your-stadia-api-key"
```

**Development (.env.local):**
```bash
# Database Configuration
DATABASE_URL="postgresql://responwarga:responwarga@192.168.18.27:5433/responwarga_dev"
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# Session Configuration
SESSION_SECRET="dev-secret-change-in-production"
SESSION_COOKIE_NAME="rw_session"
SESSION_MAX_AGE_DAYS=7

# Application Configuration
NEXT_PUBLIC_ASSET_PREFIX=""
NODE_ENV="development"

# File Upload Configuration
FILE_UPLOAD_DIR="public/uploads"
PUBLIC_UPLOAD_BASE="/uploads"
```

**Variables to Remove:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Security Considerations

### Authentication Security

**Password Security:**
- Use bcrypt with 12 rounds for password hashing
- Never log or expose password hashes
- Enforce minimum password requirements
- Implement rate limiting on login attempts

**Session Security:**
- Use cryptographically secure random tokens (48 bytes)
- Hash tokens before storing in database
- Set appropriate session expiration (7 days default)
- Use httpOnly, secure, and sameSite cookie flags
- Implement session revocation on logout

**Token Security:**
- Never expose raw session tokens in logs
- Use HTTPS in production for cookie transmission
- Implement CSRF protection for state-changing operations

### Database Security

**Connection Security:**
- Use SSL/TLS for database connections in production
- Store connection strings in environment variables
- Never commit credentials to version control
- Use connection pooling to prevent connection exhaustion

**Query Security:**
- Always use parameterized queries
- Validate and sanitize all user inputs
- Implement table and function whitelists
- Use Row Level Security (RLS) policies

**Access Control:**
- Implement principle of least privilege
- Use separate database users for different services
- Audit database access logs regularly
- Implement rate limiting on API endpoints


### API Security

**Input Validation:**
- Validate all request bodies against schemas
- Sanitize user inputs before processing
- Reject requests with invalid content types
- Implement request size limits

**Error Handling:**
- Never expose stack traces to clients
- Never expose database error details to clients
- Log full error details server-side only
- Return generic error messages to clients

**Rate Limiting:**
- Implement rate limiting on authentication endpoints
- Implement rate limiting on data modification endpoints
- Use IP-based and user-based rate limiting
- Return 429 status code when rate limit exceeded

## Performance Considerations

### Database Performance

**Connection Pooling:**
- Configure appropriate pool size (min: 2, max: 20)
- Set idle timeout to prevent stale connections
- Monitor pool utilization metrics
- Implement connection retry logic

**Query Optimization:**
- Use indexes on frequently queried columns
- Avoid N+1 query problems
- Use EXPLAIN ANALYZE for slow queries
- Implement query result caching where appropriate

**Transaction Management:**
- Keep transactions as short as possible
- Use appropriate isolation levels
- Implement deadlock detection and retry
- Monitor transaction duration metrics

### API Performance

**Response Optimization:**
- Implement pagination for large result sets
- Use field selection to reduce payload size
- Compress responses with gzip
- Cache frequently accessed data

**Request Optimization:**
- Validate requests early to fail fast
- Use async/await for concurrent operations
- Implement request timeouts
- Monitor API response times


## Rollback Plan

### Rollback Triggers

Rollback should be initiated if:
- Critical authentication failures occur
- Database connection failures exceed threshold
- Data corruption is detected
- Performance degradation exceeds acceptable limits
- Security vulnerabilities are discovered

### Rollback Procedure

**Step 1: Stop New Deployments**
- Halt any in-progress deployments
- Notify team of rollback decision
- Document reason for rollback

**Step 2: Restore Previous Version**
- Deploy previous stable version
- Verify deployment success
- Test critical functionality

**Step 3: Database Rollback (if needed)**
- Restore database from backup
- Verify data integrity
- Test database connections

**Step 4: Verification**
- Test authentication flows
- Test critical user journeys
- Monitor error rates
- Verify performance metrics

**Step 5: Post-Rollback Analysis**
- Analyze root cause of failure
- Document lessons learned
- Plan remediation steps
- Schedule retry deployment

### Rollback Testing

Before production deployment:
- Test rollback procedure in staging
- Verify backup restoration works
- Document rollback time estimates
- Train team on rollback procedure

## Maintenance and Monitoring

### Ongoing Maintenance

**Database Maintenance:**
- Regular VACUUM and ANALYZE operations
- Index maintenance and optimization
- Connection pool monitoring
- Query performance analysis

**Code Maintenance:**
- Regular dependency updates
- Security patch application
- Code quality reviews
- Technical debt reduction

**Documentation Maintenance:**
- Keep API documentation current
- Update deployment procedures
- Document configuration changes
- Maintain runbooks for common issues

### Monitoring Metrics

**Application Metrics:**
- Request rate by endpoint
- Response time percentiles (p50, p95, p99)
- Error rate by endpoint and error type
- Active user sessions

**Database Metrics:**
- Connection pool utilization
- Query execution time
- Transaction duration
- Deadlock frequency
- Cache hit ratio

**Infrastructure Metrics:**
- CPU and memory utilization
- Network throughput
- Disk I/O
- Database replication lag (if applicable)

### Alerting

**Critical Alerts:**
- Database connection failures
- Authentication system failures
- Error rate exceeds threshold
- Response time exceeds threshold

**Warning Alerts:**
- Connection pool near capacity
- Disk space low
- Memory usage high
- Unusual traffic patterns

