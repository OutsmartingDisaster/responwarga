# Requirements Document

## Introduction

This document outlines the requirements for migrating the Respon Warga application from Supabase to a self-hosted PostgreSQL 15 database. The migration must ensure complete removal of Supabase dependencies while maintaining all existing functionality, with particular focus on authentication consistency and code modularity.

## Glossary

- **System**: The Respon Warga web application
- **PostgreSQL Server**: Self-hosted PostgreSQL 15 database at 192.168.18.27:5433
- **Auth Module**: Authentication and session management components
- **Supabase Client**: Legacy Supabase JavaScript client library
- **Database Pool**: PostgreSQL connection pool using node-postgres (pg)
- **User Role**: Authorization level (public, org_responder, org_admin, co_admin)
- **Profile Record**: User profile data linked to authentication user
- **Session Token**: Cryptographic token for user session management
- **API Route**: Next.js API endpoint handler
- **Frontend Component**: React component in the application UI
- **Code Module**: A single file containing no more than 250 lines of code

## Requirements

### Requirement 1

**User Story:** As a developer, I want to completely remove all Supabase dependencies from the codebase, so that the application relies solely on PostgreSQL for data persistence.

#### Acceptance Criteria

1. WHEN the codebase is scanned for Supabase imports THEN the System SHALL return zero occurrences of `@supabase/supabase-js` imports in production code
2. WHEN the package.json is examined THEN the System SHALL not list `@supabase/supabase-js` as a dependency
3. WHEN environment variables are checked THEN the System SHALL not require SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY variables
4. WHEN the application starts THEN the System SHALL connect successfully to PostgreSQL Server without attempting Supabase connections
5. WHERE Supabase compatibility layers exist THEN the System SHALL replace them with direct PostgreSQL implementations

### Requirement 2

**User Story:** As a developer, I want all code files to be modular and maintainable, so that no single file exceeds 250 lines of code.

#### Acceptance Criteria

1. WHEN any source file is analyzed THEN the System SHALL contain no more than 250 lines of code per file
2. WHERE a file exceeds 250 lines THEN the System SHALL refactor it into smaller, logically separated modules
3. WHEN modules are created THEN the System SHALL maintain clear separation of concerns
4. WHEN refactoring occurs THEN the System SHALL preserve all existing functionality
5. WHEN imports are updated THEN the System SHALL use relative paths for local modules

### Requirement 3

**User Story:** As a user, I want authentication to work consistently across the application, so that I can log in and access features based on my role.

#### Acceptance Criteria

1. WHEN a user submits valid credentials THEN the Auth Module SHALL create a session token and store it in the database
2. WHEN a user makes an authenticated request THEN the Auth Module SHALL validate the session token against PostgreSQL Server
3. WHEN a session token is validated THEN the Auth Module SHALL return the user object with profile and role information
4. WHEN a user logs out THEN the Auth Module SHALL revoke the session token in the database
5. WHEN a session expires THEN the Auth Module SHALL reject requests with expired tokens

### Requirement 4

**User Story:** As a developer, I want user roles to be consistent between frontend, backend, and database, so that authorization works correctly throughout the application.

#### Acceptance Criteria

1. WHEN user roles are defined THEN the System SHALL use identical role names in database schema, API routes, and frontend components
2. WHEN a user's role is checked THEN the System SHALL query the same role field from the database consistently
3. WHEN role-based access control is applied THEN the System SHALL enforce permissions uniformly across all layers
4. WHEN a user profile is loaded THEN the System SHALL include both user-level role and profile-level role with clear distinction
5. WHERE role conflicts exist THEN the System SHALL document and resolve the authoritative role source

### Requirement 5

**User Story:** As a developer, I want all API routes to use PostgreSQL directly, so that data operations are consistent and performant.

#### Acceptance Criteria

1. WHEN an API route handles a request THEN the System SHALL use the Database Pool for all database operations
2. WHEN database queries are executed THEN the System SHALL use parameterized queries to prevent SQL injection
3. WHEN transactions are required THEN the System SHALL use the withTransaction helper from the Database Pool
4. WHEN errors occur THEN the System SHALL return appropriate HTTP status codes and error messages
5. WHEN session context is needed THEN the System SHALL apply user context using applySessionContext helper

### Requirement 6

**User Story:** As a developer, I want frontend components to communicate with the backend through well-defined API routes, so that data flow is clear and maintainable.

#### Acceptance Criteria

1. WHEN a Frontend Component needs data THEN the System SHALL make HTTP requests to API Routes
2. WHEN API Routes return data THEN the System SHALL use consistent JSON response formats
3. WHEN authentication is required THEN the System SHALL include session cookies automatically in requests
4. WHEN errors occur THEN the System SHALL display user-friendly error messages in the UI
5. WHERE direct database access exists in components THEN the System SHALL refactor to use API Routes

### Requirement 7

**User Story:** As a developer, I want database connection configuration to be centralized, so that connection settings are managed in one place.

#### Acceptance Criteria

1. WHEN the application starts THEN the System SHALL read DATABASE_URL from environment variables
2. WHEN the Database Pool is initialized THEN the System SHALL configure connection limits and timeouts
3. WHEN SSL is required THEN the System SHALL enable SSL based on DB_SSL environment variable
4. WHEN connection errors occur THEN the System SHALL log detailed error messages for debugging
5. WHEN the application shuts down THEN the System SHALL gracefully close all database connections

### Requirement 8

**User Story:** As a developer, I want authentication helpers to be reusable across the application, so that auth logic is not duplicated.

#### Acceptance Criteria

1. WHEN session management is needed THEN the System SHALL provide createSession, revokeSession, and getSessionFromCookies functions
2. WHEN password operations are needed THEN the System SHALL provide hashPassword and verifyPassword functions
3. WHEN user operations are needed THEN the System SHALL provide findUserByEmail, findUserById, and createUserAccount functions
4. WHEN these helpers are used THEN the System SHALL maintain consistent error handling patterns
5. WHERE auth logic is duplicated THEN the System SHALL consolidate it into shared helper functions

### Requirement 9

**User Story:** As a system administrator, I want the application to connect to the PostgreSQL Server at 192.168.18.27:5433, so that it uses the production database infrastructure.

#### Acceptance Criteria

1. WHEN DATABASE_URL is configured THEN the System SHALL connect to host 192.168.18.27 on port 5433
2. WHEN the connection is established THEN the System SHALL verify PostgreSQL version is 15 or higher
3. WHEN required extensions are needed THEN the System SHALL verify PostGIS and pgvector are available
4. WHEN connection pooling is configured THEN the System SHALL respect DB_POOL_MIN and DB_POOL_MAX settings
5. WHEN network issues occur THEN the System SHALL implement retry logic with exponential backoff

### Requirement 10

**User Story:** As a developer, I want comprehensive testing of the migration, so that I can verify all functionality works correctly with PostgreSQL.

#### Acceptance Criteria

1. WHEN authentication flows are tested THEN the System SHALL successfully log in, maintain sessions, and log out users
2. WHEN API routes are tested THEN the System SHALL correctly handle CRUD operations for all entities
3. WHEN frontend components are tested THEN the System SHALL display data correctly and handle user interactions
4. WHEN role-based access is tested THEN the System SHALL enforce permissions correctly for each role
5. WHEN error scenarios are tested THEN the System SHALL handle failures gracefully without exposing sensitive information
