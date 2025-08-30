
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { validateAccess } from '@/ai/flows/validate-access-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldX } from 'lucide-react';

export default function ViewFilePage({ params }) {
  const { fileId } = params;
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Verifying your access...');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // If not logged in, redirect to login page with a return URL
        const returnUrl = encodeURIComponent(window.location.pathname);
        router.push(`/login?returnTo=${returnUrl}`);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user && fileId) {
      const checkAccess = async () => {
        try {
          const idToken = await user.getIdToken();
          const result = await validateAccess({
            fileId,
            userEmail: user.email,
            idToken,
          });

          if (result.granted && result.viewLink) {
            setStatus('success');
            setMessage('Access granted! Redirecting to your file...');
            // Redirect the user to the actual file link
            window.location.href = result.viewLink;
          } else {
            setStatus('error');
            setMessage(result.message);
          }
        } catch (error) {
          console.error("Access validation error:", error);
          setStatus('error');
          setMessage(error.message || 'An unexpected error occurred while verifying your access.');
        }
      };
      checkAccess();
    }
  }, [user, fileId]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
             {status === 'error' ? <ShieldX className="h-8 w-8 text-destructive" /> : <Loader2 className="h-8 w-8 text-primary animate-spin" />}
             <span>
                {status === 'loading' && 'Verifying Access'}
                {status === 'success' && 'Access Granted'}
                {status === 'error' && 'Access Denied'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">{message}</p>
          {status === 'error' && (
             <button onClick={() => router.push('/dashboard')} className="mt-4 text-primary underline">
                Go to Dashboard
            </button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
