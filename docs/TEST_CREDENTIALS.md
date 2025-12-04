# Test Credentials

The following users have been created for testing purposes. All users have the password `password123`.

## Access
- **Login Page:** [http://localhost:3535/masuk](http://localhost:3535/masuk)


## System Admin
- **Email:** `admin@example.com`
- **Password:** `password123`
- **Role:** `admin`
- **Permissions:** All permissions

## Organization Admin
- **Email:** `org_admin@example.com`
- **Password:** `password123`
- **Role:** `org_admin`
- **Organization:** BPBD DKI Jakarta
- **Permissions:** Manage organization, reports, teams, logs

## Organization Responder
- **Email:** `responder@example.com`
- **Password:** `password123`
- **Role:** `org_responder`
- **Organization:** BPBD DKI Jakarta
- **Permissions:** Read org, manage reports, read teams, logs

## Public User
- **Email:** `public@example.com`
- **Password:** `password123`
- **Role:** `public`
- **Permissions:** Create reports, create contributions

## Database Connection
The users are created in the following database:
- **Host:** 192.168.18.27
- **Port:** 5433
- **Database:** responwarga_prod
- **Schema:** auth.users (users), public.profiles (profiles)
