import { getAuthProvider } from '@/providers/auth/index.js';

// authService — thin façade over whatever AuthProvider is active.
// Logic/hooks call this; they never import a provider directly.
const auth = () => getAuthProvider();

export const authService = {
  signIn: (identifier, password) => auth().signIn(identifier, password),
  signOut: () => auth().signOut(),
  getSession: () => auth().getSession(),
  requestPasswordReset: (identifier) => auth().requestPasswordReset(identifier),
  changePassword: (userId, newPassword) => auth().changePassword(userId, newPassword),
};

export default authService;
