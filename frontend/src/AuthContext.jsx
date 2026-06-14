import { createContext, useContext } from 'react';

const AuthContext = createContext({ isAdmin: false });

export const AuthProvider = AuthContext.Provider;
export function useAuth() { return useContext(AuthContext); }
