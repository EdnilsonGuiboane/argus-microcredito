import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      tenantId,
      fullName,
      email,
      password,
      phone,
      role,
      createdBy,
    } = body;

    if (!tenantId || !fullName || !email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios em falta.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authUser = authData.user;
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível criar o utilizador no Auth.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: profileError } = await admin.from('users').insert({
      id: authUser.id,
      tenant_id: tenantId,
      full_name: fullName,
      email,
      phone: phone || null,
      is_active: true,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.id);

      return new Response(
        JSON.stringify({ error: profileError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: roleError } = await admin.from('user_role_assignments').insert({
      tenant_id: tenantId,
      user_id: authUser.id,
      role,
      granted_by: createdBy || null,
    });

    if (roleError) {
      await admin.from('users').delete().eq('id', authUser.id);
      await admin.auth.admin.deleteUser(authUser.id);

      return new Response(
        JSON.stringify({ error: roleError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authUser.id,
          email,
          fullName,
          role,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});