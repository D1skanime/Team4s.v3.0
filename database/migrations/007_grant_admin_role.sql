-- Migration: 007_grant_admin_role
-- Zweck: Grant admin role to user_id = 1 (first registered user)

-- Grant admin role to user 1 (if user exists)
INSERT INTO user_roles (user_id, role_id, granted_at, granted_by)
SELECT 1, r.id, NOW(), NULL
FROM roles r
WHERE r.name = 'admin'
  AND EXISTS (SELECT 1 FROM users WHERE id = 1)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Also grant registered role to user 1
INSERT INTO user_roles (user_id, role_id, granted_at, granted_by)
SELECT 1, r.id, NOW(), NULL
FROM roles r
WHERE r.name = 'registered'
  AND EXISTS (SELECT 1 FROM users WHERE id = 1)
ON CONFLICT (user_id, role_id) DO NOTHING;
