import { createContext, useContext } from 'react';

const defaultAuth = {
  role: 'viewer',
  username: '',
  displayName: '',
  isAdmin: false,
  canCreate: false,       // admin, editor, builder
  canManageContent: false, // admin, editor (edit anyone's content)
  showPublic: true,
  hasProgrammes: true,
};

const AuthContext = createContext(defaultAuth);

export function buildAuth(data) {
  const role = data.role || 'viewer';
  return {
    role,
    username: data.username || '',
    displayName: data.display_name || data.username || '',
    isAdmin: role === 'admin',
    canCreate: ['admin', 'editor', 'builder'].includes(role),
    canManageContent: ['admin', 'editor'].includes(role),
    showPublic: data.show_public !== false,
    hasProgrammes: data.has_programmes !== false,
  };
}

export function canEdit(auth, item) {
  if (!auth) return false;
  if (auth.canManageContent) return true;
  if (auth.role === 'builder' && item?.created_by === auth.username) return true;
  return false;
}

export const AuthProvider = AuthContext.Provider;
export function useAuth() { return useContext(AuthContext); }
