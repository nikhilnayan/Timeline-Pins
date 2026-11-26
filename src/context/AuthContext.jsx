import { createContext, useContext, useEffect, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase.js';

const AuthContext = createContext(null);
const REDIRECT_FLAG = 'tp_redirect_pending';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      return undefined;
    }

    let mounted = true;
    let authChecked = false;
    let redirectChecked = false;

    const finishLoadingIfReady = () => {
      if (mounted && authChecked && redirectChecked) {
        setAuthLoading(false);
      }
    };

    getRedirectResult(auth)
      .then((result) => {
        if (!mounted) return;
        const hadPending = sessionStorage.getItem(REDIRECT_FLAG) === '1';
        sessionStorage.removeItem(REDIRECT_FLAG);

        if (result?.user) {
          setUser(result.user);
        } else if (hadPending && !auth.currentUser) {
          setAuthError(
            'Could not complete Google sign-in after redirect. Check that your site domain is added to Firebase Authorized Domains and your OAuth Redirect URI includes /__/auth/handler.'
          );
        }
      })
      .catch((err) => {
        sessionStorage.removeItem(REDIRECT_FLAG);
        if (mounted && err?.code && err.code !== 'auth/popup-closed-by-user') {
          setAuthError(err.message || 'Sign-in redirect failed. Please try again.');
        }
      })
      .finally(() => {
        redirectChecked = true;
        finishLoadingIfReady();
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!mounted) return;
      if (firebaseUser) {
        sessionStorage.removeItem(REDIRECT_FLAG);
      }
      setUser(firebaseUser);
      setSigningIn(false);
      authChecked = true;
      finishLoadingIfReady();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setAuthError('Firebase is not configured yet. Add your VITE_FIREBASE_* keys to .env.');
      return;
    }
    if (signingIn) return;
    setAuthError(null);
    setSigningIn(true);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          sessionStorage.setItem(REDIRECT_FLAG, '1');
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          sessionStorage.removeItem(REDIRECT_FLAG);
          setAuthError(
            redirectErr?.message || 'Sign-in redirect failed. Please allow popups and try again.'
          );
        }
      } else if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request'
      ) {
        setAuthError(err?.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const logout = async () => {
    if (!auth) {
      setUser(null);
      return;
    }
    sessionStorage.removeItem(REDIRECT_FLAG);
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        signingIn,
        authError,
        isFirebaseConfigured,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
