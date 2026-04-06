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

    setLoading(true);
    const { data, error } = await supabase
      .from('user_permissions_view')
      .select('role_name, permission_string')
      .eq('conference_id', confId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching RBAC permissions:', error);
      setLoading(false);
      return;
    }

    // Dedup permission strings & role names
    const permsSet = new Set();
    const rolesSet = new Set();
    
    (data || []).forEach(row => {
      if (row.permission_string) permsSet.add(row.permission_string);
      if (row.role_name) rolesSet.add(row.role_name);
    });

    setPermissions(Array.from(permsSet));
    setRoles(Array.from(rolesSet));
    setLoading(false);
  }, [confId, userId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, roles, loading, refresh: fetchPermissions };
};
