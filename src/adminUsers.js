import { supabase } from './supabase';

// Thin wrapper around the admin-users Edge Function.
// Every call routes through the Edge Function so the service-role key never
// leaves the server. The client only ever has the anon key + user JWT.

async function callAdmin(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body,
  });
  if (error) {
    // FunctionsHttpError exposes the raw Response on error.context; the actual
    // JSON message from our function lives in its body. supabase-js's default
    // error.message is just "non-2xx status", which isn't useful on its own.
    let msg = error.message || 'Request failed';
    try {
      if (error.context && typeof error.context.json === 'function') {
        const parsed = await error.context.json();
        if (parsed?.error) msg = parsed.error;
      }
    } catch { /* keep default msg */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function inviteUser({ email, full_name, role }) {
  return callAdmin({
    action: 'invite',
    email,
    full_name,
    role,
    redirectTo: window.location.origin,
  });
}

// Generate a fresh sign-in link for an existing user (e.g. someone got
// logged out on a new device). Returns { ok, action_link } — the admin
// copies the link and shares it manually.
export function resendSignInLink({ email }) {
  return callAdmin({
    action: 'resend_link',
    email,
    redirectTo: window.location.origin,
  });
}

export function updateUserRole({ user_id, role }) {
  return callAdmin({ action: 'update_role', user_id, role });
}

export function removeUser({ user_id }) {
  return callAdmin({ action: 'remove', user_id });
}

// Read-only — no Edge Function needed. The existing RLS policy from Phase 1A
// lets any authenticated user SELECT profiles.
export async function listProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}
