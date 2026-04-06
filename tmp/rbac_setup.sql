-- 1. Create Roles Table (if not exists)
CREATE TABLE IF NOT EXISTS public.roles (
  role_name text NOT NULL,
  description text,
  CONSTRAINT roles_pkey PRIMARY KEY (role_name)
);

-- 2. Create Permissions Table (if not exists)
CREATE TABLE IF NOT EXISTS public.permissions (
  permission_string text NOT NULL,
  description text,
  CONSTRAINT permissions_pkey PRIMARY KEY (permission_string)
);

-- 3. Create Role Permissions Mapping (with Cascade)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  permission_string text NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT role_permissions_role_fkey FOREIGN KEY (role_name) REFERENCES public.roles(role_name) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_fkey FOREIGN KEY (permission_string) REFERENCES public.permissions(permission_string) ON DELETE CASCADE,
  CONSTRAINT unique_role_permission UNIQUE (role_name, permission_string)
);

-- 4. Create the User-Role Bridge Mapping
CREATE TABLE IF NOT EXISTS public.conference_user_roles_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conference_user_id uuid NOT NULL,
  role_name text NOT NULL,
  CONSTRAINT conference_user_roles_mapping_pkey PRIMARY KEY (id),
  CONSTRAINT conference_user_roles_mapping_user_fkey FOREIGN KEY (conference_user_id) REFERENCES public.conference_user(id) ON DELETE CASCADE,
  CONSTRAINT conference_user_roles_mapping_role_fkey FOREIGN KEY (role_name) REFERENCES public.roles(role_name) ON DELETE CASCADE,
  CONSTRAINT unique_user_role_conference UNIQUE (conference_user_id, role_name)
);

-- 5. Create the Unified Permissions View
CREATE OR REPLACE VIEW public.user_permissions_view AS
WITH all_user_roles AS (
    -- Primary role from conference_user
    SELECT conference_id, user_id, role AS role_name
    FROM public.conference_user
    UNION
    -- Extra roles from the new mapping table
    SELECT cu.conference_id, cu.user_id, curm.role_name
    FROM public.conference_user cu
    JOIN public.conference_user_roles_mapping curm ON cu.id = curm.conference_user_id
)
SELECT aur.conference_id, aur.user_id, aur.role_name, rp.permission_string
FROM all_user_roles aur
JOIN public.role_permissions rp ON aur.role_name = rp.role_name;

-- 6. Populate Base Roles (using member instead of participant)
INSERT INTO public.roles (role_name, description) VALUES
  ('organizer', 'Super admin acting as the overarching conference head'),
  ('member', 'General member accessing basic conference tools'),
  ('presenter', 'Speaker displaying their active presentation slots'),
  ('reviewer', 'Subject expert handling paper evaluations'),
  ('logistics_head', 'Manager for event timelines and team task assignments'),
  ('event_head', 'Manager for real-time monitoring and operational tasks'),
  ('programming_head', 'Manager for paper submissions and reviewer assignment'),
  ('outreach_head', 'Manager for speaker invitations and promotions'),
  ('feedback_head', 'Manager for feedback collection and certificates')
ON CONFLICT (role_name) DO NOTHING;

-- 7. Populate Granular Permissions
INSERT INTO public.permissions (permission_string, description) VALUES
  ('view_dashboard', 'Can view basic dashboard overview'), -- New
  ('view_papers', 'Can view submitted papers'), -- New
  ('manage_papers', 'Can accept/reject papers'), -- New
  ('view_members', 'Can view conference members'), -- New
  ('manage_members', 'Can add/remove members'), -- New
  ('view_attendees', 'Can view conference attendees'), -- New
  ('manage_attendees', 'Can remove attendees'), -- New
  ('view_teams', 'Can view team lists'), -- New
  ('manage_teams', 'Can create/edit teams'), -- New
  ('view_tasks', 'Can view tasks'), -- New
  ('manage_tasks', 'Can create/edit/delete tasks'), -- New
  ('view_notifications', 'Can view announcements'), -- New
  ('send_notifications', 'Can send global notifications'), -- New
  ('view_emails', 'Can view email dashboard'), -- New
  ('send_emails', 'Can send bulk emails'), -- New
  ('find_speakers', 'Can search for expert speakers (AI)'), -- New
  ('allocate_papers', 'Can run AI-powered paper allocation'), -- New
  ('view_feedback', 'Can view user feedback'), -- New
  ('manage_feedback', 'Can manage feedback forms'), -- New
  ('delete_conference', 'Can permanently delete a conference') -- New
ON CONFLICT (permission_string) DO NOTHING;

-- 8. Map Organizer Permissions (Full Access)
INSERT INTO public.role_permissions (role_name, permission_string)
SELECT 'organizer', permission_string FROM public.permissions
ON CONFLICT DO NOTHING;

-- 9. Map Member Permissions (Standard Member)
INSERT INTO public.role_permissions (role_name, permission_string)
VALUES
  ('member', 'view_dashboard'),
  ('member', 'view_teams'),
  ('member', 'view_tasks'),
  ('member', 'view_notifications')
ON CONFLICT DO NOTHING;

-- 10. Map Logistics Head Permissions
INSERT INTO public.role_permissions (role_name, permission_string)
VALUES
  ('logistics_head', 'view_dashboard'),
  ('logistics_head', 'view_teams'),
  ('logistics_head', 'manage_teams'),
  ('logistics_head', 'view_tasks'),
  ('logistics_head', 'manage_tasks'),
  ('logistics_head', 'view_notifications')
ON CONFLICT DO NOTHING;

-- 11. Map Programming Head Permissions
INSERT INTO public.role_permissions (role_name, permission_string)
VALUES
  ('programming_head', 'view_dashboard'),
  ('programming_head', 'view_papers'),
  ('programming_head', 'manage_papers'),
  ('programming_head', 'allocate_papers'),
  ('programming_head', 'view_members')
ON CONFLICT DO NOTHING;
