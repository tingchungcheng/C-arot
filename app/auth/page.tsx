import { redirect } from 'next/navigation';

/** Account UI lives under Settings; keep /auth as a compatibility alias for old links. */
export default function AuthRedirect() {
  redirect('/settings');
}

