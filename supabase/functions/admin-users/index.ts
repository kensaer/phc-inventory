// Phase 1C: admin-users Edge Function
//
// Handles all admin-only user management operations that require the
// service-role key. Never ship the service-role key to browsers — this
// function is the server-side gate.
//
// DEPLOY:
//   Option A (dashboard): Supabase dashboard → Edge Functions → New function
//     - Name: admin-users
//     - Paste this file's contents, click Deploy
//   Option B (CLI):
//     - Install: npm i -g supabase
//     - Login:   supabase login
//     - Link:    supabase link --project-ref ijfcdmlsgbhhcmserikf
//     - Deploy:  supabase functions deploy admin-users
//
// Actions the client can invoke via body.action:
//   - "invite"      : { email, full_name, role, redirectTo }
//                     → { ok, user_id, action_link }
//   - "resend_link" : { email, redirectTo }
//                     → { ok, action_link }
//   - "update_role" : { user_id, role }
//   - "remove"      : { user_id }
//
// Auth model:
//   1. Every request must include the caller's JWT (Authorization header).
//      Supabase's functions.invoke() attaches this automatically.
//   2. The function loads the caller's profile row and verifies role === 'admin'.
//   3. Only after that does it use the service-role key to perform the action.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_ROLES = [
  "admin",
  "manager",
  "phc_team_lead",
  "phc_tech",
  "gtc_team_lead",
  "gtc_tech",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Client that reads the caller's identity from the JWT
    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await authedClient.auth.getUser();
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    // 2. Load caller's profile and verify admin
    const { data: caller, error: callerErr } = await authedClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (callerErr) return json({ error: callerErr.message }, 500);
    if (!caller || caller.role !== "admin") {
      return json({ error: "Admin role required" }, 403);
    }

    // 3. Service-role client for the actual admin work
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const action = body?.action;

    if (action === "invite") {
      const { email, full_name, role, redirectTo } = body;
      if (!email || !full_name || !role) {
        return json({ error: "Missing email, full_name, or role" }, 400);
      }
      if (!VALID_ROLES.includes(role)) {
        return json({ error: `Invalid role: ${role}` }, 400);
      }

      // Create the auth user directly — does NOT send email.
      // email_confirm: true marks the address verified so the magic link
      // we generate below signs them in without a confirmation step.
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name },
        });
      if (createErr) return json({ error: createErr.message }, 400);

      // Create the matching profile row
      const { error: profErr } = await admin.from("profiles").insert({
        id: created.user.id,
        email,
        full_name,
        role,
        invited_by: user.id,
      });
      if (profErr) {
        // Roll back the auth user so state stays consistent
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: profErr.message }, 400);
      }

      // Generate a one-time sign-in link. Also does NOT send email — the
      // admin will copy this link and share it manually.
      const { data: linkData, error: linkErr } =
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: redirectTo || undefined },
        });
      if (linkErr) return json({ error: linkErr.message }, 400);

      return json({
        ok: true,
        user_id: created.user.id,
        action_link: linkData.properties.action_link,
      });
    }

    if (action === "resend_link") {
      const { email, redirectTo } = body;
      if (!email) return json({ error: "Missing email" }, 400);

      const { data: linkData, error: linkErr } =
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: redirectTo || undefined },
        });
      if (linkErr) return json({ error: linkErr.message }, 400);

      return json({
        ok: true,
        action_link: linkData.properties.action_link,
      });
    }

    if (action === "update_role") {
      const { user_id, role } = body;
      if (!user_id || !role) {
        return json({ error: "Missing user_id or role" }, 400);
      }
      if (!VALID_ROLES.includes(role)) {
        return json({ error: `Invalid role: ${role}` }, 400);
      }
      if (user_id === user.id) {
        return json({ error: "You cannot change your own role" }, 400);
      }

      const { error } = await admin
        .from("profiles")
        .update({ role })
        .eq("id", user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "remove") {
      const { user_id } = body;
      if (!user_id) return json({ error: "Missing user_id" }, 400);
      if (user_id === user.id) {
        return json({ error: "You cannot remove yourself" }, 400);
      }

      // Deleting from auth.users cascades to public.profiles via the FK
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
