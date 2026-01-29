import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { filemakerApi } from '@/lib/filemaker-api';
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL, getStorage } from 'firebase/storage';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { auth, db, storage, firebaseConfig } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import availableWorks from '@/data/available_works.json';

// Initialize a secondary Firebase instance for background operations (like loading public-facing artwork)
let bgApp: any;
let bgAuth: any = null;
let bgStorage: any = null;

try {
  bgApp = !getApps().find(app => app.name === 'ImageLoader')
    ? initializeApp(firebaseConfig, 'ImageLoader')
    : getApp('ImageLoader');

  bgAuth = getAuth(bgApp);
  bgStorage = getStorage(bgApp);
} catch (e) {
  console.error('❌ Firebase: Failed to initialize ImageLoader bgApp', e);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Artwork display state
  const [randomArtwork, setRandomArtwork] = useState<any>(null);
  const [isLoadingArtwork, setIsLoadingArtwork] = useState(true);
  const [artworkError, setArtworkError] = useState('');

  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [is2FAStep, setIs2FAStep] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const fetchRandomArtwork = async () => {
    try {
      setIsLoadingArtwork(true);
      setArtworkError('');

      if (availableWorks.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableWorks.length);
        const workId = String((availableWorks[randomIndex] as any).id);

        const { artworks } = await filemakerApi.getArtworks({ ids: [workId] }, 1);

        if (artworks && artworks.length > 0) {
          const artwork = artworks[0] as any;

          // Simple storage resolution
          if (artwork.image_location) {
            const rawPath = artwork.image_location.replace(/\\/g, '/');
            const parts = rawPath.split('/');
            const filename = parts.pop()!;

            // Backup internal URL in case we need to clear it on error
            const internalFmUrl = artwork.image_url;
            artwork.image_url = null; // Clear by default, only set if resolved

            const folderBase = parts.join('/');

            // Paths to try in order: Original case, then lowercase
            const pathsToTry = [
              `${folderBase}/large/${filename}`,
              `${folderBase.toLowerCase()}/large/${filename}`
            ];

            if (!folderBase) {
              pathsToTry.push(`others/large/${filename}`);
            }

            let resolvedUrl = null;
            // Prefer main storage as it's guaranteed to be authenticated by AuthContext
            const targetStorage = storage || bgStorage;

            if (targetStorage) {
              for (const finalPath of pathsToTry) {
                try {
                  const imageRef = ref(targetStorage, finalPath);
                  resolvedUrl = await getDownloadURL(imageRef);
                  if (resolvedUrl) break;
                } catch (e: any) {
                  // Try next path
                }
              }
            }

            artwork.image_url = resolvedUrl;
          }
          setRandomArtwork(artwork);
        } else {
          setArtworkError('No artwork found.');
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch random artwork', err);
      setArtworkError(err.message || 'Failed to load artwork');
    } finally {
      setIsLoadingArtwork(false);
    }
  };

  // Fetch a random artwork on mount
  useEffect(() => {
    // Only fetch if we have a user (anonymous or otherwise)
    if (auth.currentUser) {
      fetchRandomArtwork();
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          fetchRandomArtwork();
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Ensure all previous context state is cleared before starting a new login
    // but ONLY if we aren't in the 2FA step already
    if (!is2FAStep) {
      await logout({ silent: true });
    }

    if (is2FAStep) {
      if (!twoFactorCode || twoFactorCode.length !== 6) {
        setError('Please enter a valid 6-digit code');
        return;
      }
      setIsLoading(true);
      try {
        const result = await filemakerApi.verify2FA(email, twoFactorCode);
        await finalizeLogin();
      } catch (err: any) {
        console.error('2FA Error:', err);
        setError(`Failed to verify code: ${err.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      if (!auth) {
        setError('Firebase authentication is not configured correctly.');
        setIsLoading(false);
        return;
      }
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Admin check - needs 2FA
      if (user.email && user.email.toLowerCase() === 'yotamfr@gmail.com') {
        setIs2FAStep(true);
        setIsLoading(false);
        return;
      }

      try {
        const fmLoginResult = await filemakerApi.login(email, password);
        console.log('[Login] FileMaker API result:', {
          success: fmLoginResult.success,
          galleryName: fmLoginResult.galleryName,
          galleryId: fmLoginResult.galleryId
        });

        if (fmLoginResult.success) {
          await finalizeLogin(user, fmLoginResult.galleryId, fmLoginResult.galleryName);
        } else {
          console.warn('Gallery session sync failed:', fmLoginResult.error);
          await finalizeLogin(user);
        }
      } catch (fmErr: any) {
        console.error('Sync error:', fmErr);
        await finalizeLogin(user);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(`Failed to sign in: ${err.code || err.message || 'Unknown error'}.`);
      }
      setIsLoading(false);
    }
  };

  const finalizeLogin = async (firebaseUser?: any, targetGalleryId?: string, targetGalleryName?: string) => {
    const user = firebaseUser || auth?.currentUser;
    if (!user) throw new Error("No authenticated user found");

    let galleryName = targetGalleryName || 'Gallery User';
    let galleryId = targetGalleryId || 'unknown';

    if ((!targetGalleryId || targetGalleryName === 'Gallery User') && db) {
      // Fallback: Try to find a gallery associated with this user's UID
      try {
        console.log('[Login] Attempting identity fallback via Firestore for UID:', user.uid);
        const galleriesRef = collection(db, 'galleries');

        // Check both common variations of the UID field name 
        // AND handle potential case where field is called User_uID
        const queries = [
          query(galleriesRef, where('User_uid', '==', user.uid)),
          query(galleriesRef, where('User_uID', '==', user.uid))
        ];

        const results = await Promise.all(queries.map(q => getDocs(q)));
        const firstMatch = results.find(snap => !snap.empty);

        if (firstMatch) {
          const galleryDoc = firstMatch.docs[0];
          const galleryData = galleryDoc.data();
          console.log('[Login] Fallback match found:', galleryData.GalleryName);

          if (!targetGalleryId || targetGalleryId === 'unknown') galleryId = galleryDoc.id;
          if (galleryData.GalleryName && galleryData.GalleryName !== 'Gallery User') {
            galleryName = galleryData.GalleryName;
          }
        } else {
          console.log('[Login] No fallback match found in Firestore.');
          if (user.email === 'yotamfr@gmail.com') {
            galleryName = 'Studio Admin';
            galleryId = 'admin';
          }
        }
      } catch (err) {
        console.error('Error looking up gallery identity:', err);
      }
    }

    // Force refresh token to get updated custom claims if any
    const token = await user.getIdToken(true);

    login(galleryId, galleryName, token);
    toast.success(`Welcome back, ${galleryName}!`);
    navigate('/search');
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* Left Side - Artwork Exhibit (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 text-white overflow-hidden border-r border-border/10">
        {isLoadingArtwork ? (
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-white/20" />
            <p className="text-zinc-500 text-xs tracking-widest uppercase animate-pulse">Loading Artwork...</p>
          </div>
        ) : randomArtwork && randomArtwork.image_url ? (
          <>
            <div className="absolute inset-0">
              <div
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
                style={{
                  backgroundImage: `url("${randomArtwork.image_url}")`,
                  opacity: 1
                }}
              />
              {/* Dark gradient overlay always present for caption readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            </div>
            <div className="relative z-10 mt-auto p-12 max-w-2xl">
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-white mb-2">
                    {randomArtwork.work_name || 'Untitled'}
                  </h2>
                  <div className="h-0.5 w-12 bg-primary/60 rounded-full mb-4" />
                </div>
                <div className="space-y-1 text-zinc-300 font-light text-lg">
                  {randomArtwork.indd_caption_line_1 && <p className="font-medium text-white/90">{randomArtwork.indd_caption_line_1}</p>}
                  {randomArtwork.indd_caption_line_2 && <p>{randomArtwork.indd_caption_line_2}</p>}
                  {randomArtwork.indd_caption_line_3 && <p className="italic">{randomArtwork.indd_caption_line_3}</p>}

                  {!randomArtwork.indd_caption_line_1 && (
                    <>
                      <p>{randomArtwork.creation_year}</p>
                      <p>{randomArtwork.materials}</p>
                      <p>{randomArtwork.dimensions}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 flex-col gap-6 p-12 text-center">
            <p className="z-10 text-zinc-500 font-light tracking-widest uppercase text-sm">Sigalit Landau Studio</p>
            {artworkError && (
              <div className="z-10 max-w-md">
                <p className="text-red-400/80 text-sm mb-2">Unable to load artwork preview</p>
                <p className="text-zinc-600 text-xs font-mono break-all">{artworkError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative bg-secondary/20">
        <div className="w-full max-w-[440px] flex flex-col items-center">
          <div className="w-full flex flex-col items-center lg:items-start mb-10 space-y-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xl shadow-sm">
              SL
            </div>
            <div className="text-center lg:text-left space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Sigalit Landau Studio</h1>
              <p className="text-base text-muted-foreground">Gallery Access Dashboard</p>
            </div>
          </div>

          <Card className="w-full shadow-sm border-border/50 bg-background mb-8">
            <CardHeader className="pt-8 pb-2 px-8">
              <CardTitle className="text-2xl font-semibold">
                {is2FAStep ? 'Two-Factor Authentication' : 'Sign In'}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-1">
                {is2FAStep ? 'Enter the code from your authenticator app' : 'Enter your gallery credentials to continue'}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 pt-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="py-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm ml-2">{error}</AlertDescription>
                  </Alert>
                )}

                {!is2FAStep ? (
                  <>
                    <div className="space-y-2.5">
                      <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="gallery@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="h-11 bg-background"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="password" title="password" className="text-sm font-semibold">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="h-11 bg-background"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="2fa" className="text-sm font-medium">Verification Code</Label>
                      <Input
                        id="2fa"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="123456"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="h-12 text-2xl text-center tracking-widest font-mono"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {is2FAStep ? 'Verify Code' : 'Sign In'}
                </Button>

                {is2FAStep && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-10 text-muted-foreground"
                    onClick={() => {
                      setIs2FAStep(false);
                      setTwoFactorCode('');
                      setError('');
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          <footer className="w-full text-center lg:text-left space-y-4">
            <p className="text-muted-foreground text-base">For access inquiries, please contact the studio.</p>
            <div className="flex justify-center lg:justify-start">
              <a href="https://sigalitlandau.com" target="_blank" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-base border-b border-transparent hover:border-muted-foreground pb-0.5">
                sigalitlandau.com <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="pt-8 text-muted-foreground/60 text-sm">
              © {new Date().getFullYear()} Sigalit Landau Studio
            </div>
          </footer>
        </div>
      </div>
    </div >
  );
}
