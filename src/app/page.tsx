import { redirect } from 'next/navigation';

export default function Home() {
  // Auth is stubbed for now. Future: if `getToken()` is null, redirect to '/login'.
  redirect('/room');
}
