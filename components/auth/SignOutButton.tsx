// =============================================================================
// components/auth/SignOutButton.tsx — Client-side sign out
// =============================================================================
'use client';

import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/');
  };

  return (
    <button
      onClick={handleSignOut}
      className="font-mono text-xs text-[#525252] underline hover:text-[#0A0A0A] cursor-pointer"
    >
      Sign out
    </button>
  );
}
