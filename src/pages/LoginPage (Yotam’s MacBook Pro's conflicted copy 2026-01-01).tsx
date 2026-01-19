import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Mail, ExternalLink, AlertCircle, FlaskConical, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { filemakerApi, Artwork } from '@/lib/filemaker-api';
// Use dynamic import for large JSON or just direct if it's not too huge (50KB is fine)
import availableWorks from '@/data/available_works.json';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Artwork display state
  const [randomArtwork, setRandomArtwork] = useState<Artwork | null>(null);
  const [isLoadingArtwork, setIsLoadingArtwork] = useState(true);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Fetch a random artwork on mount
  useEffect(() => {
    async function fetchRandomArtwork() {
      try {
        setIsLoadingArtwork(true);
        if (availableWorks.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableWorks.length);
          const workId = String(availableWorks[randomIndex].id);

          // Use getArtworks with ids filter as it's more reliable/tested than getArtwork singular
          const { artworks } = await filemakerApi.getArtworks({ ids: [workId] }, 1);

          if (artworks && artworks.length > 0) {
            const artwork = artworks[0];
            console.log('🎨 Login Page - Random Artwork:', artwork);
            console.log('🖼️  Login Page - Image URL (pic field):', artwork.image_url);
            setRandomArtwork(artwork);
          } else {
            console.warn('No artwork found for ID:', workId);
          }
        }
      } catch (err) {
        console.error('Failed to fetch random artwork for login page', err);
      } finally {
        setIsLoadingArtwork(false);
      }
    }

    fetchRandomArtwork();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/search');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Artwork Exhibit (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900 text-white overflow-hidden">
        {isLoadingArtwork ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/20" />
          </div>
        ) : randomArtwork && randomArtwork.image_url ? (
          <>
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
              style={{ backgroundImage: `url("${randomArtwork.image_url}")` }}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            {/* Content at Bottom */}
            <div className="relative z-10 mt-auto p-12 max-w-2xl">
              <div className="space-y-4 animate-fade-in-up">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-white mb-2">
                    {randomArtwork.work_name || 'Untitled'}
                  </h2>
                  <div className="h-1 w-12 bg-primary/60 rounded-full mb-4" />
                </div>

                <div className="space-y-1 text-zinc-300 font-light text-lg">
                  {/* Prioritize indd caption lines if available, else construct */}
                  {randomArtwork.indd_caption_line_1 && <p>{randomArtwork.indd_caption_line_1}</p>}
                  {randomArtwork.indd_caption_line_2 && <p>{randomArtwork.indd_caption_line_2}</p>}
                  {randomArtwork.indd_caption_line_3 && <p>{randomArtwork.indd_caption_line_3}</p>}

                  {/* Fallback construction if no caption lines */}
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
          // Fallback if no artwork loads
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'url(https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=1920&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <p className="z-10 text-zinc-500 font-light">Sigalit Landau Studio</p>
          </div>
        )}
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-[400px] space-y-8 animate-slide-up">

          {/* Mobile Header (visible only on small screens) */}
          <div className="text-center space-y-2 lg:text-left lg:self-start mb-8">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xl mx-auto lg:mx-0">
              SL
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Sigalit Landau Studio</h1>
            <p className="text-sm text-muted-foreground">Gallery Access Portal</p>
          </div>

          <Card className="border-none shadow-none lg:border lg:shadow-sm">
            <CardHeader className="text-center lg:text-left px-0 lg:px-6">
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Enter your gallery credentials to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 lg:px-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="animate-fade-in">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="gallery@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground lg:text-left">
            <p>For access inquiries, please contact the studio.</p>
            <div className="mt-4 flex justify-center lg:justify-start gap-4">
              <Link to="/api-test" className="flex items-center gap-1 hover:text-foreground">
                <FlaskConical className="h-3 w-3" /> API Test
              </Link>
              <a href="https://sigalitlandau.com" target="_blank" className="flex items-center gap-1 hover:text-foreground">
                sigalitlandau.com <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <footer className="absolute bottom-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sigalit Landau Studio
        </footer>
      </div>
    </div>
  );
}
