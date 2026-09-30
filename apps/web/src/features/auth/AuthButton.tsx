import { LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';
import { signOut, useSession } from '../../lib/auth-client';
import { AuthModal } from './AuthModal';

export function AuthButton() {
  const { data: session, isPending } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) {
    return (
      <div className="w-20 h-8 rounded-lg bg-surface-accent animate-pulse border border-surface-border" />
    );
  }

  if (session?.user) {
    const displayName = session.user.name || session.user.email?.split('@')[0] || 'Player';

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-accent border border-surface-border text-xs text-white">
          <div className="w-5 h-5 rounded-full bg-board-dark flex items-center justify-center text-[10px] font-bold text-white uppercase">
            {displayName[0]}
          </div>
          <span className="font-medium max-w-[100px] truncate">{displayName}</span>
        </div>

        <button
          type="button"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try {
              await signOut();
            } finally {
              setSigningOut(false);
            }
          }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-accent border border-transparent hover:border-surface-border transition-colors"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-accent hover:bg-surface-border border border-surface-border text-white flex items-center gap-1.5 transition-all shadow-sm"
      >
        <LogIn className="w-3.5 h-3.5 text-board-light" />
        <span>Sign In</span>
      </button>

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
