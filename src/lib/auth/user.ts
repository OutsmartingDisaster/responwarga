import { query } from '@/lib/db/pool'
import { hashPassword, verifyPassword as verify } from '@/lib/auth/password'
import type { AuthUser, ProfileRecord } from '@/lib/auth/types'

interface UserRow {
  id: string
  email: string
  user_role: string
  password_hash: string
  created_at: string
  profile_id: string | null
  profile_name: string | null
  profile_role: string | null
  profile_username: string | null
  profile_org_id: string | null
  profile_org_name: string | null
  profile_phone: string | null
  profile_status: string | null
}

function mapRow(row: UserRow): { user: AuthUser; password_hash: string } {
  const profile: ProfileRecord | null = row.profile_id
    ? {
      id: row.profile_id,
      user_id: row.id,
      name: row.profile_name,
      username: row.profile_username,
      role: row.profile_role || 'responder',
      organization_id: row.profile_org_id,
      organization: row.profile_org_name,
      phone: row.profile_phone,
      status: row.profile_status,
    }
    : null

  return {
    password_hash: row.password_hash,
    user: {
      id: row.id,
      email: row.email,
      role: row.user_role,
      created_at: row.created_at,
      profile,
    },
  }
}

const BASE_SELECT = `
  SELECT u.id,
         u.email,
         u.role         AS user_role,
         u.password_hash,
         u.created_at,
         p.id           AS profile_id,
         p.name         AS profile_name,
         p.role         AS profile_role,
         p.username     AS profile_username,
         p.organization_id AS profile_org_id,
         p.organization    AS profile_org_name,
         p.phone        AS profile_phone,
         p.status       AS profile_status
    FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
`

export async function findUserByEmail(email: string) {
  const { rows } = await query<UserRow>(`${BASE_SELECT} WHERE LOWER(u.email) = LOWER($1) LIMIT 1`, [email])
  if (!rows.length) {
    return null
  }
  return mapRow(rows[0])
}

export async function findUserById(id: string) {
  const { rows } = await query<UserRow>(`${BASE_SELECT} WHERE u.id = $1 LIMIT 1`, [id])
  if (!rows.length) {
    return null
  }
  return mapRow(rows[0])
}

export async function createUserAccount(options: {
  email: string
  password: string
  role?: string
  name?: string
  organization_id?: string | null
}) {
  const passwordHash = await hashPassword(options.password)
  const role = options.role || 'responder'

  const { rows } = await query<{ id: string; email: string; role: string; created_at: string }>(
    `INSERT INTO auth.users (email, password_hash, role)
     VALUES (LOWER($1), $2, $3)
     RETURNING id, email, role, created_at`,
    [options.email, passwordHash, role]
  )

  const userRow = rows[0]

  await query(
    `INSERT INTO profiles (user_id, name, role, organization_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, organization_id = EXCLUDED.organization_id`,
    [userRow.id, options.name ?? null, role, options.organization_id ?? null]
  )

  const user = await findUserById(userRow.id)
  return user?.user ?? {
    id: userRow.id,
    email: userRow.email,
    role: userRow.role,
    created_at: userRow.created_at,
    profile: null,
  }
}

export async function verifyCredentials(email: string, password: string) {
  const record = await findUserByEmail(email)
  if (!record) {
    return null
  }
  const isValid = await verify(password, record.password_hash)
  if (!isValid) {
    return null
  }
  return record.user
}
