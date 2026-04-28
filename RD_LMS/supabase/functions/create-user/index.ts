import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  'https://VOTRE_ORG.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Vérifier que l'appelant est authentifié
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Vérifier que l'appelant est admin
    const { data: callerProfile } = await supabase
        .from('lms_profiles').select('role').eq('id', caller.id).single();
    if (callerProfile?.role !== 'admin') return new Response(
        JSON.stringify({ error: 'Réservé aux administrateurs' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    const { email, password, nom, prenom, civilite, date_naissance, cohorte_id } = await req.json();

    if (!email || !password || !nom || !prenom) return new Response(
        JSON.stringify({ error: 'Champs obligatoires manquants : email, password, nom, prenom' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Créer le compte auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true
    });
    if (authError) return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Créer le profil
    const { error: profileError } = await supabase.from('lms_profiles').insert({
        id: authData.user.id, nom, prenom, civilite, date_naissance,
        role: 'stagiaire', first_login: true
    });
    if (profileError) return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Rattacher à la cohorte
    if (cohorte_id) {
        await supabase.from('lms_cohorte_membres')
            .insert({ cohorte_id, profile_id: authData.user.id });
    }

    return new Response(
        JSON.stringify({ success: true, userId: authData.user.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
});
