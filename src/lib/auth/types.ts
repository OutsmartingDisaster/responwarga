export interface ProfileRecord {
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

export interface AuthUser {
  id: string
  email: string
  role: string
  created_at: string
  profile?: ProfileRecord | null
}

export interface SessionRecord {
  id: string
  user_id: string
  expires_at: Date
}
