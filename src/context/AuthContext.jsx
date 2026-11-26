import { createContext, useContext, useMemo, useState } from 'react';
import {
  ClerkProvider,
  HandleSSOCallback,
  useClerk,
  useSignIn,
  useUser,
} from '@clerk/react';

const AuthContext = createContext(null);

const CLERK_PUBLISHABLE_KEY = (() => {
  const raw = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!raw || String(raw).includes('your-key') || String(raw).includes('...')) {
    return '';
  }
  return String(raw).trim();
})();

export const isClerkConfigured = Boolean(CLERK_PUBLISHABLE_KEY);

function ClerkAuthBridge({ children }) {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { signOut } = useClerk();
  const { signIn, errors, fetchStatus } = useSignIn();

  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState(null);

  const isSsoCallback =
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/sso-callback');

  const user = useMemo(() => {
    if (!clerkUser) return null;
    const email = clerkUser.primaryEmailAddress?.emailAddress || null;
    return {
      uid: clerkUser.id,
      email,
      displayName: clerkUser.fullName || clerkUser.firstName || email || 'Explorer',
      photoURL: clerkUser.imageUrl || null,
    };
  }, [clerkUser]);

  const signInWithGoogle = async () => {
    if (!signIn || signingIn || fetchStatus === 'fetching') return;
    setAuthError(null);
    setSigningIn(true);
    try {
      const { error } = await signIn.sso({
        strategy: 'oauth_google',
        redirectUrl: '/',
        redirectCallbackUrl: '/sso-callback',
      });
      if (error) {
        setSigningIn(false);
        setAuthError(
          error.longMessage ||
            error.message ||
            'Google sign-in failed. Make sure Google is enabled in your Clerk Dashboard.'
        );
      }
    } catch (err) {
      setSigningIn(false);
      setAuthError(
        err?.errors?.[0]?.longMessage ||
          err?.message ||
          'Google sign-in failed. Make sure Google is enabled in your Clerk Dashboard.'
      );
    }
  };

  const logout = async () => {
    setAuthError(null);
    await signOut({ redirectUrl: '/' });
  };

  if (isSsoCallback) {
    const goHome = () => {
      window.location.replace('/');
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment-50 dark:bg-moss-900">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-9 w-9 animate-pulse rounded-md border border-brass-500/40 bg-moss-900/20 dark:bg-parchment-200/20" />
          <p className="font-mono text-xs uppercase tracking-widest text-moss-700 dark:text-parchment-300">
            Completing Google Sign-In...
          </p>
        </div>
        <HandleSSOCallback
          navigateToApp={({ decorateUrl }) => {
            window.location.replace(decorateUrl('/'));
          }}
          navigateToSignIn={goHome}
          navigateToSignUp={goHome}
        />
      </div>
    );
  }

  const resolvedError =
    authError || errors?.global?.[0]?.longMessage || errors?.global?.[0]?.message || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading: !userLoaded,
        signingIn: signingIn || fetchStatus === 'fetching',
        authError: resolvedError,
        isClerkConfigured: true,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }) {
  const [unconfiguredError, setUnconfiguredError] = useState(null);

  if (!isClerkConfigured) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          authLoading: false,
          signingIn: false,
          authError: unconfiguredError,
          isClerkConfigured: false,
          signInWithGoogle: () =>
            setUnconfiguredError(
              'Clerk is not configured yet. Add VITE_CLERK_PUBLISHABLE_KEY to .env and Vercel Environment Variables.'
            ),
          logout: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
