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

function formatAuthError(err) {
  const code = err?.code || '';
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the Google sign-in popup. Please allow popups for this site in your browser address bar, then click Continue with Google again.';
  }
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return `Domain "${host}" is not authorized in Firebase. Add it under Firebase Console > Authentication > Settings > Authorized domains.`;
  }
  return err?.message || 'Sign-in failed. Please try again.';
}

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
            'Redirect sign-in was blocked by browser third-party cookie/storage settings. Please allow popups for this site and use Continue with Google.'
          );
        }
      })
      .catch((err) => {
        sessionStorage.removeItem(REDIRECT_FLAG);
        if (mounted && err?.code && err.code !== 'auth/popup-closed-by-user') {
          setAuthError(formatAuthError(err));
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

    // Trigger signInWithPopup immediately inside the synchronous click gesture
    const popupPromise = signInWithPopup(auth, googleProvider);
    setAuthError(null);
    setSigningIn(true);

    try {
      await popupPromise;
    } catch (err) {
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request'
      ) {
        setAuthError(formatAuthError(err));
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithGoogleRedirect = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setAuthError('Firebase is not configured yet. Add your VITE_FIREBASE_* keys to .env.');
      return;
    }
    if (signingIn) return;
    setAuthError(null);
    setSigningIn(true);
    try {
      sessionStorage.setItem(REDIRECT_FLAG, '1');
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      sessionStorage.removeItem(REDIRECT_FLAG);
      setAuthError(formatAuthError(err));
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
        signInWithGoogleRedirect,
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
