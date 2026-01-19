import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { GallerySession } from '@/types/gallery';
import { auth, db } from '@/lib/firebase';
import { signInAnonymously as firebaseSignInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { filemakerApi } from '@/lib/filemaker-api';
import { toast } from 'sonner';

interface AuthContextType {
  session: GallerySession | null;
  currentUser: User | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (gallery_id: string, galleryName: string, token: string) => void;
  logout: (options?: { silent?: boolean }) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'gallery_session';
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<GallerySession | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt) parsed.expiresAt = new Date(parsed.expiresAt);
        if (parsed.expiresAt > new Date()) return parsed;
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      console.error('Failed to restore session', e);
      localStorage.removeItem(SESSION_KEY);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const identityCheckRef = useRef<string | null>(null);

  // Sync session gallery_id to FileMakerAPI client
  useEffect(() => {
    filemakerApi.setGalleryId(session?.gallery_id || null);
  }, [session?.gallery_id]);

  // Firebase Auth Listener
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsLoading(false);

      if (!user) {
        try {
          await firebaseSignInAnonymously(auth);
          console.log('✅ Firebase: App authenticated anonymously');
        } catch (err) {
          console.error('❌ Firebase: Anonymous Auth failed', err);
        }
      } else {
        if (session?.gallery_id && identityCheckRef.current !== session.gallery_id) {
          identityCheckRef.current = session.gallery_id;
          const galleryDocRef = doc(db, 'galleries', session.gallery_id);
          const galleryDoc = await getDoc(galleryDocRef);

          if (!galleryDoc.exists() || galleryDoc.data()?.User_uid !== user.uid) {
            // Prevent syncing if we have a default/placeholder name
            if (session.galleryName === 'Gallery User' || session.galleryName === 'User' || !session.galleryName) {
              console.warn('⚠️ Auth: Skipping Firestore identity sync due to placeholder name:', session.galleryName);
            } else {
              console.log('🛠️ Auth: Syncing gallery identity to Firestore (galleries collection)...');
              await updateDoc(galleryDocRef, {
                User_uid: user.uid,
                Username: user.email || user.uid,
                GalleryName: session.galleryName, // Ensure we preserve the name
                lastSynced: new Date()
              }).catch(async (err) => {
                // If update fails (e.g. doc doesn't exist yet), try set with merge
                console.warn('⚠️ Auth: updateDoc failed, attempting setDoc...', err.message);
                await setDoc(galleryDocRef, {
                  gallery_id: session.gallery_id,
                  GalleryName: session.galleryName,
                  User_uid: user.uid,
                  Username: user.email || user.uid,
                  lastSynced: new Date()
                }, { merge: true });
              });
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [session?.gallery_id]);

  const login = async (gallery_id: string, galleryName: string, token: string) => {
    const newSession: GallerySession = {
      gallery_id,
      galleryName,
      token,
      expiresAt: new Date(Date.now() + SESSION_DURATION),
    };
    setSession(newSession);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  };

  const logout = async (options?: { silent?: boolean }) => {
    if (!options?.silent) console.log('Door Auth: Initiating logout...');

    setSession(null);
    setCurrentUser(null);
    identityCheckRef.current = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('quick_collection');

    try {
      if (auth) {
        await auth.signOut();
        console.log('✅ Firebase: Signed out');
        await firebaseSignInAnonymously(auth);
      }
    } catch (err) {
      console.error('❌ Auth: Logout errors', err);
    }

    if (!options?.silent) toast.info('Signed out successfully');
  };

  const isAdmin = currentUser?.email === 'yotamfr@gmail.com';

  return (
    <AuthContext.Provider
      value={{
        session,
        currentUser,
        firebaseUser: currentUser,
        isLoading,
        isAdmin,
        login,
        logout,
        isAuthenticated: !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
