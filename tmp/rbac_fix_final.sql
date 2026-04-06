-- 1. Grant Select on the View to authenticated users
GRANT SELECT ON public.user_permissions_view TO authenticated;
GRANT SELECT ON public.user_permissions_view TO anon;

-- 2. Redefine the add_conference_organizer RPC to be more robust
-- This function ensures the conference creator is added to both the legacy 
-- conference_user table AND the new RBAC mapping table.

CREATE OR REPLACE FUNCTION public.add_conference_organizer(p_conference_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with postgres permissions to bypass RLS
AS $$
DECLARE
    v_head_id uuid;
    v_conf_user_id uuid;
    v_user_email text;
    v_user_name text;
BEGIN
    -- 1. Get the conference head (creator)
    SELECT conference_head_id INTO v_head_id
    FROM public.conference
    WHERE conference_id = p_conference_id;

    IF v_head_id IS NULL THEN
        RAISE EXCEPTION 'Conference head not found for ID %', p_conference_id;
    END IF;

    -- 2. Get user details from the auth/users or public.users table
    -- Adjust if your user info is elsewhere. Assuming public.users for now.
    SELECT email, full_name INTO v_user_email, v_user_name
    FROM public.users
    WHERE user_id = v_head_id;

    -- 3. Upsert into legacy conference_user table
    INSERT INTO public.conference_user (conference_id, user_id, email, full_name, role)
    VALUES (p_conference_id, v_head_id, COALESCE(v_user_email, ''), COALESCE(v_user_name, 'Organizer'), 'organizer')
    ON CONFLICT (conference_id, user_id) 
    DO UPDATE SET role = 'organizer'
    RETURNING id INTO v_conf_user_id;

    -- 4. Upsert into new RBAC mapping table
    INSERT INTO public.conference_user_roles_mapping (conference_user_id, role_name)
    VALUES (v_conf_user_id, 'organizer')
    ON CONFLICT (conference_user_id, role_name) DO NOTHING;

END;
$$;

-- 3. Backfill existing conferences
-- For every conference, ensure the head_id has an 'organizer' role in the mapping table.

DO $$
DECLARE
    r RECORD;
    v_cu_id uuid;
BEGIN
    FOR r IN SELECT conference_id, conference_head_id FROM public.conference WHERE conference_head_id IS NOT NULL LOOP
        
        -- Ensure conference_user exists
        INSERT INTO public.conference_user (conference_id, user_id, role, full_name, email)
        SELECT r.conference_id, r.conference_head_id, 'organizer', u.full_name, u.email
        FROM public.users u WHERE u.user_id = r.conference_head_id
        ON CONFLICT (conference_id, user_id) DO UPDATE SET role = 'organizer'
        RETURNING id INTO v_cu_id;

        -- Ensure mapping exists
        IF v_cu_id IS NOT NULL THEN
            INSERT INTO public.conference_user_roles_mapping (conference_user_id, role_name)
            VALUES (v_cu_id, 'organizer')
            ON CONFLICT DO NOTHING;
        END IF;

    END LOOP;
END $$;
