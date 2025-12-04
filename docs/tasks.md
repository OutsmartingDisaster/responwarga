# Implementation Plan

- [x] 1. Environment and Database Setup



  - Update environment configuration to use PostgreSQL at 192.168.18.27:5433
  - Remove Supabase environment variables
  - Verify database connection and extensions
  - _Requirements: 7.1, 9.1, 9.2, 9.3_

- [x] 2. Create RBAC Helper Module



  - Create `src/lib/auth/rbac.ts` with permission definitions
  - Implement `hasPermission` function
  - Implement `isOrgMember` function
  - Implement `requireRole` helper
  - Implement `requireOrgAccess` helper
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2.1 Write property test for RBAC permissions


  - **Property 10: Role names are consistent across layers**
  - **Property 12: RBAC enforcement is uniform**
  - **Validates: Requirements 4.1, 4.3**

- [x] 3. Rewrite Middleware for PostgreSQL



  - Replace Supabase session validation with PostgreSQL
  - Implement route protection logic
  - Add organization membership verification
  - Remove in-memory caching (use database only)
  - Ensure file is under 250 lines
  - _Requirements: 3.2, 4.3, 2.1_

- [x] 3.1 Write property test for middleware session validation


  - **Property 6: Session validation queries database**
  - **Validates: Requirements 3.2**

- [x] 4. Remove Supabase Dependencies


  - Delete `src/lib/supabase/` directory
  - Delete `src/lib/supabaseUtils.ts`
  - Remove `@supabase/supabase-js` from package.json
  - Remove `@supabase/ssr` from package.json
  - Run `npm install` to update lock file

  - _Requirements: 1.1, 1.2, 1.3_

- [x] 4.1 Write property test for Supabase removal


  - **Property 1: No Supabase imports in production code**
  - **Validates: Requirements 1.1**

- [x] 5. Refactor Large Files for Modularity


  - Analyze all source files for line count
  - Identify files exceeding 250 lines
  - Refactor `src/lib/server/runQuery.ts` into modules
  - Refactor `src/middleware.ts` if needed
  - Refactor any API routes exceeding 250 lines
  - _Requirements: 2.1, 2.4_

- [x] 5.1 Extract query builders from runQuery


  - Create `src/lib/server/queryBuilder.ts`
  - Move SELECT, INSERT, UPDATE, DELETE builders
  - Export builder functions
  - _Requirements: 2.1, 2.3_

- [x] 5.2 Extract filter builders from runQuery


  - Create `src/lib/server/filterBuilder.ts`
  - Move buildWhere function
  - Move filter operator logic
  - Export filter functions
  - _Requirements: 2.1, 2.3_

- [x] 5.3 Extract RPC handler from runQuery


  - Create `src/lib/server/rpcHandler.ts`
  - Move runRpc function
  - Move ALLOWED_FUNCTIONS whitelist
  - Export RPC functions
  - _Requirements: 2.1, 2.3_

- [x] 5.4 Update runQuery to use extracted modules


  - Import from queryBuilder, filterBuilder, rpcHandler
  - Verify all functionality preserved
  - Ensure main file is under 250 lines
  - _Requirements: 2.1, 2.4_

- [x] 5.5 Write property test for refactoring preservation


  - **Property 3: Refactoring preserves functionality**
  - **Validates: Requirements 2.4**

- [x] 6. Rewrite Admin API Routes


  - Update `src/app/api/admin/users/route.ts` to use PostgreSQL
  - Replace Supabase admin client with direct queries
  - Implement RBAC checks using new helper
  - Add proper error handling
  - Ensure file is under 250 lines
  - _Requirements: 5.1, 5.2, 5.4, 4.3_

- [x] 6.1 Write property test for admin RBAC


  - **Property 26: RBAC enforces permissions correctly**
  - **Validates: Requirements 10.4**


- [x] 7. Update Data API Route
  - Verify `src/app/api/data/route.ts` uses PostgreSQL
  - Add RBAC checks for table operations
  - Implement permission validation
  - Test with different user roles
  - _Requirements: 5.1, 5.2, 4.3_

- [x] 7.1 Write property test for data API RBAC
  - **Property 14: API routes use database pool**
  - **Property 24: CRUD operations work for all entities**
  - **Validates: Requirements 5.1, 10.2**

- [x] 8. Update Authentication API Routes
  - Verify login route uses PostgreSQL
  - Verify logout route uses PostgreSQL
  - Verify register route uses PostgreSQL
  - Verify session route uses PostgreSQL
  - Ensure consistent error handling
  - _Requirements: 3.1, 3.4, 5.4, 8.4_

- [x] 8.1 Write property test for authentication flows
  - **Property 5: Session creation stores token**
  - **Property 8: Logout revokes session**
  - **Property 9: Expired sessions are rejected**
  - **Validates: Requirements 3.1, 3.4, 3.5**

- [x] 9. Update Frontend Components
  - Search for any Supabase client usage in components
  - Replace with API route calls
  - Ensure all data fetching uses fetch/API routes
  - Add proper error handling
  - Add loading states
  - _Requirements: 6.1, 6.3, 6.4_

- [x] 9.1 Write property test for frontend API usage
  - **Property 17: Frontend uses API routes for data**
  - **Property 19: Authenticated requests include cookies**
  - **Validates: Requirements 6.1, 6.3**

- [x] 10. Checkpoint - Verify Core Functionality
  - Ensure all tests pass, ask the user if questions arise.


- [x] 11. Implement Consistent Error Handling
  - Review all API routes for error handling
  - Ensure no sensitive data in error responses
  - Implement consistent error format
  - Add detailed server-side logging
  - _Requirements: 5.4, 10.5_

- [x] 11.1 Write property test for error handling
  - **Property 16: API errors return appropriate status codes**
  - **Property 27: Errors don't expose sensitive information**
  - **Validates: Requirements 5.4, 10.5**

- [x] 12. Implement Query Parameterization Validation
  - Audit all database queries
  - Verify parameterized queries everywhere
  - Add validation for identifier sanitization
  - Test SQL injection prevention
  - _Requirements: 5.2_

- [x] 12.1 Write property test for query parameterization
  - **Property 15: Queries use parameterization**
  - **Validates: Requirements 5.2**

- [x] 13. Implement Role Consistency Validation
  - Create script to check role names across codebase
  - Verify database schema role names
  - Verify TypeScript type role names
  - Verify API route role checks
  - Verify frontend role checks
  - _Requirements: 4.1, 4.2_

- [x] 13.1 Write property test for role consistency
  - **Property 11: Role queries are consistent**
  - **Property 13: User profiles include both roles**
  - **Validates: Requirements 4.2, 4.4**

- [x] 14. Implement Session Management Tests
  - Test session creation
  - Test session validation
  - Test session expiration
  - Test session revocation
  - Test concurrent sessions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 14.1 Write property test for session validation
  - **Property 7: Session validation returns complete user data**
  - **Validates: Requirements 3.3**


- [x] 15. Implement API Response Format Validation
  - Review all API routes for response format
  - Ensure consistent JSON structure
  - Add response type definitions
  - Test response format consistencywait. supabase needs to be fully remove, we have switch to postgres, check 