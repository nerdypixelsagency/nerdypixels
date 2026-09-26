# Restore super-admin access

## Confirmed issue
The account `fegokendigital@gmail.com` exists and its email is verified, but it has no entry in the admin roles table. The current page attempts to claim the role silently and ignores any claim error, so it falls through to “No admin access.”

## Changes
1. Add a database migration that safely grants `super_admin` to the existing verified owner account.
2. Add an automatic database trigger for this exact email so the role is restored when the owner signs up or confirms their email, without granting privileges to any other account.
3. Keep roles in the dedicated roles table and retain server-side authorization checks.
4. Update the admin role lookup to surface claim failures instead of silently showing a misleading access message.
5. Improve the no-access message so verified non-admin users receive accurate guidance.

## Verification
- Confirm the owner has exactly one `super_admin` role.
- Sign in as the owner and verify `/admin` opens the dashboard.
- Confirm the payment LIVE/TEST switch appears for the owner.
- Confirm an ordinary signed-in user still cannot access admin data or controls.
