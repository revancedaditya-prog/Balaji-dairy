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
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');
    if (!name || !/^\+?[1-9]\d{9,14}$/.test(phone) || password.length < 6) {
      throw new Error('Valid name, phone and password (minimum 6 characters) are required');
    }

    const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const { data, error } = await admin.auth.admin.createUser({
      phone: normalizedPhone,
      password,
      phone_confirm: true,
      user_metadata: { full_name: name, role: 'owner' },
    });
    if (error) throw error;

    await admin.from('profiles').upsert({
      id: data.user.id,
      full_name: name,
      phone: normalizedPhone,
      role: 'owner',
      status: 'active',
    });

    return Response.json({ success: true, message: 'Owner account created. You can now sign in.' }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, message: error instanceof Error ? error.message : 'Setup failed' }, { status: 400, headers: corsHeaders });
  }
});
