"use client";
import React, { useState, useEffect } from 'react';
import AccessDashboard from '../../components/access-dashboard';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);


  return (
    <main className="min-h-screen">
      <AccessDashboard user={user} />
    </main>
  );
}
