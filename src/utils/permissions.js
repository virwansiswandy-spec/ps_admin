import { showError } from './swal';

/**
 * Utility to check whether the currently logged in user can edit or delete a specific item.
 * 
 * Rules:
 * 1. super_admin: Can edit and delete EVERYTHING.
 * 2. regular admin:
 *    - Can edit and delete ONLY items created by themselves.
 *    - Matches item creator fields (created_by_id, user_id, uploaded_by_id, created_by_user, created_by, etc.)
 *      against logged-in user fields (id, email, username, full_name, name).
 *    - If an item was NOT created by the current admin, returns false (Read-Only).
 * 
 * @param {Object} item - The data item/record to check
 * @param {Object} user - The currently logged-in user object from AuthContext
 * @param {boolean} isSuperAdmin - Boolean flag indicating if user is super_admin
 * @returns {boolean} true if user can edit/delete, false otherwise
 */
export const canEditOrDelete = (item, user, isSuperAdmin = false) => {
  // 1. Super admin can do everything
  if (isSuperAdmin || user?.role === 'super_admin') {
    return true;
  }

  // 2. Role admin is allowed to edit composite items & recipes
  if (user?.role === 'admin' && (item?.is_composite || item?.parentObj?.is_composite || item?.compositions || item?.parent_item_id)) {
    return true;
  }

  // 3. If no user or no item, deny access
  if (!user || !item) {
    return false;
  }

  // Current user identifiers
  const currentUserId = user.id !== undefined && user.id !== null ? String(user.id) : (user.user_id ? String(user.user_id) : null);
  const currentEmail = user.email ? String(user.email).toLowerCase().trim() : null;
  const currentUsername = user.username ? String(user.username).toLowerCase().trim() : null;
  const currentFullName = user.full_name ? String(user.full_name).toLowerCase().trim() : (user.name ? String(user.name).toLowerCase().trim() : null);

  // Check ID matching
  const itemCreatorId = 
    item.created_by_id ?? 
    item.created_by_user_id ?? 
    item.user_id ?? 
    item.uploaded_by_id ?? 
    item.author_id ?? 
    item.creator_id ?? 
    item.admin_id ?? 
    item.kasir_id ?? 
    item.cashier_id ?? 
    item.created_by_user?.id ?? 
    item.created_by?.id ?? 
    item.user?.id ?? 
    item.creator?.id ?? 
    item.uploaded_by?.id;

  if (currentUserId && itemCreatorId !== undefined && itemCreatorId !== null) {
    if (String(itemCreatorId) === currentUserId) {
      return true;
    }
  }

  // Check object/string matching
  const stringsToCheck = [];

  const extractStringOrObject = (val) => {
    if (!val) return false;
    if (typeof val === 'string' && val.trim()) {
      stringsToCheck.push(val.toLowerCase().trim());
    } else if (typeof val === 'object' && val !== null) {
      if (val.id !== undefined && val.id !== null && currentUserId && String(val.id) === currentUserId) {
        return true;
      }
      if (val.email) stringsToCheck.push(String(val.email).toLowerCase().trim());
      if (val.username) stringsToCheck.push(String(val.username).toLowerCase().trim());
      if (val.full_name) stringsToCheck.push(String(val.full_name).toLowerCase().trim());
      if (val.name) stringsToCheck.push(String(val.name).toLowerCase().trim());
    }
    return false;
  };

  if (
    extractStringOrObject(item.created_by) ||
    extractStringOrObject(item.created_by_user) ||
    extractStringOrObject(item.user) ||
    extractStringOrObject(item.creator) ||
    extractStringOrObject(item.uploaded_by) ||
    extractStringOrObject(item.kasir) ||
    extractStringOrObject(item.cashier) ||
    extractStringOrObject(item.assigned_to) ||
    extractStringOrObject(item.operator) ||
    extractStringOrObject(item.handler) ||
    extractStringOrObject(item.processed_by)
  ) {
    return true;
  }

  if (Array.isArray(item.assigned_admins)) {
    for (const admin of item.assigned_admins) {
      if (extractStringOrObject(admin)) return true;
    }
  }

  if (item.created_by_name && extractStringOrObject(item.created_by_name)) {
    return true;
  }

  // String comparison
  for (const str of stringsToCheck) {
    if (currentEmail && str === currentEmail) return true;
    if (currentUsername && str === currentUsername) return true;
    if (currentFullName && str === currentFullName) return true;
  }

  return false;
};

/**
 * Display a sweetalert error warning when permission is denied.
 */
export const showPermissionDeniedAlert = (actionName = 'mengubah / menghapus') => {
  showError(
    'Akses Ditolak!',
    `Anda tidak memiliki izin untuk ${actionName} data ini. Hanya pembuat data atau Super Admin yang memiliki hak akses ini.`
  );
};
