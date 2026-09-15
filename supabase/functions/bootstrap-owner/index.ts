import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true });
    if ((count || 0) > 0) {
      return Response.json({ success: false, message: 'Initial owner setup is already complete' }, { status: 409, headers: corsHeaders });
    }

    const body = await req.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      throw new Error('Valid name, email and password (minimum 6 characters) are required');
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: 'owner' },
    });
    if (error) throw error;

    await admin.from('profiles').upsert({
      id: data.user.id,
      full_name: name,
      role: 'owner',
      status: 'active',
    });

    return Response.json({ success: true, message: 'Owner account created. You can now sign in with email.' }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, message: error instanceof Error ? error.message : 'Setup failed' }, { status: 400, headers: corsHeaders });
  }
});
