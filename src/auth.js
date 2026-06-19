import { supabase } from './supabase';

// Returns the current Supabase session, or null
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Send a magic link to the given email. The user is redirected back to this app
// when they click the link. Make sure `window.location.origin` is in the
// Supabase project's Redirect URL allowlist (Auth → URL Configuration).
export async function signInWithMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Loads the profile row for the currently signed-in user, or null if there is
// no signed-in user or the user has no profile row yet.
export async function getProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();
  return data;
}

// Subscribe to auth state changes. Callback receives the new session or null.
// Returns an unsubscribe function.
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
