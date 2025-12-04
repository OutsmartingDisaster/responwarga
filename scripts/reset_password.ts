import { query } from '../src/lib/db/pool';
import { hashPassword } from '../src/lib/auth/password';

async function resetPassword() {
    const email = 'org_admin@example.com';
    const password = 'password123';

    try {
        console.log(`Resetting password for ${email}...`);
        const hashedPassword = await hashPassword(password);

        const result = await query(
            'UPDATE auth.users SET password_hash = $1 WHERE email = $2 RETURNING id',
            [hashedPassword, email]
        );

        if (result.rowCount === 0) {
            console.log(`User ${email} not found.`);
        } else {
            console.log(`Password for ${email} updated successfully.`);
        }
    } catch (error) {
        console.error('Error updating password:', error);
    }
}

resetPassword();
