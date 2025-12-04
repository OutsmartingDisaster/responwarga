import { NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

export async function POST(request: Request) {
  const { invitee_email, organization_id } = await request.json();

  if (!invitee_email || !organization_id) {
    return NextResponse.json({ error: 'Email and organization ID are required.' }, { status: 400 });
  }

  try {
    // 1. Get current user making the request using session from cookies
    const user = await getSessionFromCookies();
    if (!user) {
      console.error('API Route: User not authenticated');
      return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }

    // 2. Verify Inviter Role (using PostgreSQL for DB access)
    const { rows: profileData } = await query<{ role: string; organization_id: string }>(
      'SELECT role, organization_id FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileData.length === 0) {
       console.error('API Route: Inviter profile not found');
       return NextResponse.json({ error: 'Could not verify inviter permissions.' }, { status: 403 });
    }

    const profile = profileData[0];

    // 3. Check if the inviter is an org_admin of the target organization
    if (profile.role !== 'org_admin' || profile.organization_id !== organization_id) {
       console.warn('API Route: Permission denied:', { inviterId: user.id, inviterRole: profile.role, inviterOrg: profile.organization_id, targetOrg: organization_id });
       return NextResponse.json({ error: 'Permission denied to invite members to this organization.' }, { status: 403 });
    }

    // 4. Create invitation in database
    const roleToAssign = 'org_responder'; // Hardcode the role

    // Check if user already exists
    const { rows: existingUser } = await query<{ id: string }>(
      'SELECT id FROM auth.users WHERE email = $1',
      [invitee_email]
    );

    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'User is already registered. They cannot be invited again.' }, { status: 400 });
    }

    // Check if invitation already exists
    const { rows: existingInvitation } = await query<{ id: string }>(
      'SELECT id FROM auth.invitations WHERE email = $1 AND organization_id = $2 AND status = $3',
      [invitee_email, organization_id, 'pending']
    );

    if (existingInvitation.length > 0) {
      return NextResponse.json({ error: 'An invitation already exists for this user and organization.' }, { status: 400 });
    }

    // Create invitation in database
    await query(
      'INSERT INTO auth.invitations (email, organization_id, role_to_assign, invited_by, status) VALUES ($1, $2, $3, $4, $5)',
      [invitee_email, organization_id, roleToAssign, user.id, 'pending']
    );

    console.log('API Route: Invitation created successfully for:', invitee_email);
    return NextResponse.json({ message: `Invitation sent successfully to ${invitee_email}.` });

  } catch (error: any) {
    console.error('API Route: Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}