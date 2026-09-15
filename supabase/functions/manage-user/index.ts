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
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) throw new Error('Unauthorized');
    const { data: actor } = await admin.from('profiles').select('role,status').eq('id', userData.user.id).single();
    if (!actor || actor.role !== 'owner' || actor.status !== 'active') throw new Error('Owner access required');

    const body = await req.json();
    const { action, id } = body;

    if (action === 'create') {
      if (!body.phone || !body.password || !body.name) throw new Error('Name, phone and password are required');
      const { data, error } = await admin.auth.admin.createUser({ phone: body.phone, password: body.password, phone_confirm: true, user_metadata: { full_name: body.name, role: body.role || 'worker' } });
      if (error) throw error;
      await admin.from('profiles').upsert({ id: data.user.id, full_name: body.name, phone: body.phone, role: body.role || 'worker', status: body.status || 'active' });
      return Response.json({ success: true, data: { id: data.user.id, name: body.name, phone: body.phone, role: body.role || 'worker', status: body.status || 'active' } }, { headers: corsHeaders });
    }

    if (!id) throw new Error('User id is required');
    if (id === userData.user.id && (action === 'delete' || (action === 'update' && (body.status === 'inactive' || (body.role && body.role !== 'owner'))))) throw new Error('You cannot remove, deactivate or demote your own owner account');

    if (action === 'update') {
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.full_name = body.name;
      if (body.phone !== undefined) patch.phone = body.phone;
      if (body.role !== undefined) patch.role = body.role;
      if (body.status !== undefined) patch.status = body.status;
      const { data, error } = await admin.from('profiles').update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (body.phone) await admin.auth.admin.updateUserById(id, { phone: body.phone, phone_confirm: true });
      return Response.json({ success: true, data }, { headers: corsHeaders });
    }

    if (action === 'reset-password') {
      if (!body.password || body.password.length < 6) throw new Error('Password must be at least 6 characters');
      const { error } = await admin.auth.admin.updateUserById(id, { password: body.password });
      if (error) throw error;
      return Response.json({ success: true, message: 'Password reset successfully' }, { headers: corsHeaders });
    }

    if (action === 'delete') {
      const { data: target } = await admin.from('profiles').select('role,status').eq('id', id).single();
      if (target?.role === 'owner' && target?.status === 'active') {
        const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role','owner').eq('status','active');
        if ((count || 0) <= 1) throw new Error('Cannot delete the last active owner');
      }
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      return Response.json({ success: true, message: 'User deleted successfully' }, { headers: corsHeaders });
    }

    throw new Error('Unsupported action');
  } catch (error) {
    return Response.json({ success: false, message: error instanceof Error ? error.message : 'Request failed' }, { status: 400, headers: corsHeaders });
  }
});
