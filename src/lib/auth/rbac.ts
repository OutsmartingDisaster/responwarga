interface PermissionMatrix {
  [role: string]: string[];
}

const PERMISSIONS: PermissionMatrix = {
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
};

interface AuthUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  profile: ProfileRecord | null;
}

interface ProfileRecord {
  id: string;
  user_id: string;
  name: string | null;
  username: string | null;
  role: string;
  organization_id: string | null;
  organization: string | null;
  phone: string | null;
  status: string | null;
}

export function hasPermission(userRole: string, requiredPermission: string): boolean {
  const userPermissions = PERMISSIONS[userRole];
  if (!userPermissions) {
    return false;
  }
  
  // Check for wildcard permission
  if (userPermissions.includes('*')) {
    return true;
  }
  
  // Check for exact permission match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  
  // Check for wildcard permissions in the same category (e.g., 'org:*' for 'org:read')
  const [category, action] = requiredPermission.split(':');
  if (action && userPermissions.includes(`${category}:*`)) {
    return true;
  }
  
  return false;
}

export async function isOrgMember(userId: string, orgId: string): Promise<boolean> {
  // This function would check if a user is a member of a specific organization
  // by querying the database to see if the user's profile has the matching organization_id
  const { query } = await import('../db/pool');
  
  try {
    const result = await query<{ user_id: string }>(
      'SELECT user_id FROM profiles WHERE user_id = $1 AND organization_id = $2',
      [userId, orgId]
    );
    
    return result.rowCount !== 0 && result.rows.length > 0;
  } catch (error) {
    console.error('Error checking organization membership:', error);
    return false;
  }
}

export function requireRole(allowedRoles: string[]) {
  return (user: AuthUser | null): boolean => {
    if (!user) {
      return false;
    }
    
    return allowedRoles.includes(user.role);
  };
}

export async function requireOrgAccess(orgSlug: string) {
  return async (user: AuthUser | null): Promise<boolean> => {
    if (!user || !user.profile) {
      return false;
    }
    
    try {
      // Import dynamically to avoid circular dependencies
      const { withClient } = await import('../db/pool');
      
      // Get organization ID by slug
      const orgResult = await withClient(async (client) => {
        return client.query<{ id: string }>(
          'SELECT id FROM organizations WHERE slug = $1',
          [orgSlug]
        );
      });
      
      if (orgResult.rowCount === 0) {
        return false;
      }
      
      const orgId = orgResult.rows[0].id;
      
      // Check if user is member of the organization
      return await isOrgMember(user.id, orgId);
    } catch (error) {
      console.error('Error checking organization access:', error);
      return false;
    }
  };
}

export function getUserRole(user: AuthUser | null): string {
  if (!user) {
    return 'public';
  }
  
  // Return the profile role if it exists, otherwise the base role
  return user.profile?.role || user.role;
}