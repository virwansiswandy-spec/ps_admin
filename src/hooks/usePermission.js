import { useAuth } from '../context/AuthContext';
import { canEditOrDelete, showPermissionDeniedAlert } from '../utils/permissions';

/**
 * Reusable Custom Hook to check permissions in React components.
 * 
 * Returns:
 * - canEditOrDelete(item): boolean
 * - user: current logged-in user
 * - isSuperAdmin: boolean
 * - showPermissionDeniedAlert: alert helper
 */
export const usePermission = () => {
  const { user, isSuperAdmin } = useAuth();

  const checkCanEditOrDelete = (item) => {
    return canEditOrDelete(item, user, isSuperAdmin);
  };

  return {
    user,
    isSuperAdmin,
    canEditOrDelete: checkCanEditOrDelete,
    showPermissionDeniedAlert
  };
};

export default usePermission;
