import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../Supabase/supabaseclient';

export const usePermissions = (confId, userId) => {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles]           = useState([]);
  const [loading, setLoading]       = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!confId || !userId) {
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    // 1. Fetch RBAC permissions from view
    const { data: rbacData, error: rbacError } = await supabase
      .from('user_permissions_view')
      .select('role_name, permission_string')
      .eq('conference_id', confId)
      .eq('user_id', userId);

    if (rbacError) {
      console.error('Error fetching RBAC permissions:', rbacError);
      setLoading(false);
      return;
    }

    // 2. Fail-safe: Check if user is a Team Head in conference_teams
    // (In case the role mapping hasn't been synced to the RBAC view yet)
    const { data: headData } = await supabase
      .from('conference_teams')
      .select('id, name')
      .eq('conference_id', confId)
      .eq('head_id', userId);

    // Dedup permission strings & role names
    const permsSet = new Set();
    const rolesSet = new Set();
    
    (rbacData || []).forEach(row => {
      if (row.permission_string) permsSet.add(row.permission_string);
      if (row.role_name) rolesSet.add(row.role_name);
    });

    if (headData && headData.length > 0) {
      rolesSet.add('team_head');
      // Grant base management permissions if they are a head
      ['view_dashboard', 'view_teams', 'view_tasks', 'manage_tasks', 'view_members', 'view_notifications'].forEach(p => permsSet.add(p));
      
      // Auto-assign specific role if team name matches a head role
      headData.forEach(team => {
        if (team.name.includes('Reviewing Team')) rolesSet.add('technical_head');
        if (team.name.includes('Logistics')) rolesSet.add('logistics_head');
        if (team.name.includes('Outreach')) rolesSet.add('outreach_head');
        if (team.name.includes('Event Management')) rolesSet.add('event_head');
        if (team.name.includes('Organizing Team')) rolesSet.add('organizer_head');
      });
    }

    setPermissions(Array.from(permsSet));
    setRoles(Array.from(rolesSet));
    setLoading(false);
  }, [confId, userId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, roles, loading, refresh: fetchPermissions };
};
