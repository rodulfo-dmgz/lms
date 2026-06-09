import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  'https://rodulfo-dmgz.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_ROLES = ['stagiaire', 'formateur', 'formateur_editeur', 'admin', 'invite'];
const DEFAULT_RESET_PASSWORD = 'firstlogin#';

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Vérifier authentification
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) return json({ error: 'Non authentifié' }, 401);

    // Vérifier que l'appelant est admin
    const { data: callerProfile } = await supabase
        .from('lms_profiles').select('role').eq('id', caller.id).single();
    if (callerProfile?.role !== 'admin') return json({ error: 'Réservé aux administrateurs' }, 403);

    const body = await req.json();
    const { action } = body;

    // ── Action : réinitialiser le mot de passe ────────────────
    if (action === 'reset_password') {
        const { user_id } = body;
        if (!user_id) return json({ error: 'user_id requis' }, 400);

        const { error: authErr } = await supabase.auth.admin.updateUserById(user_id, {
            password: DEFAULT_RESET_PASSWORD,
        });
        if (authErr) return json({ error: authErr.message }, 400);

        await supabase.from('lms_profiles')
            .update({ first_login: true })
            .eq('id', user_id);

        return json({ success: true, mot_de_passe: DEFAULT_RESET_PASSWORD });
    }

    // ── Action : créer ou inscrire un utilisateur ─────────────
    const {
        email, password, nom, prenom, civilite,
        date_naissance, cohorte_id,
        role: rawRole,
        adresse, code_postal, ville, telephone,
    } = body;

    if (!email || !password || !nom || !prenom)
        return json({ error: 'Champs obligatoires manquants : email, password, nom, prenom' }, 400);

    const role = VALID_ROLES.includes(rawRole) ? rawRole : 'stagiaire';

    // ── Vérifier si l'email existe déjà ──────────────────────
    const { data: existingRows } = await supabase.rpc('find_auth_user_by_email', { p_email: email.toLowerCase() });
    const existingAuthUser = existingRows?.[0] ?? null;

    if (existingAuthUser) {
        // L'utilisateur existe déjà dans Auth → on l'inscrit seulement à la cohorte
        const existingId = existingAuthUser.user_id;

        if (cohorte_id) {
            // Retire l'ancienne appartenance si présente, inscrit dans la nouvelle
            await supabase.from('lms_cohorte_membres').delete().eq('profile_id', existingId);
            await supabase.from('lms_cohorte_membres').insert({ cohorte_id, profile_id: existingId });
        }

        return json({ success: true, enrolled_existing: true, userId: existingId });
    }

    // ── Créer le compte Auth ──────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
    });
    if (authError) return json({ error: authError.message }, 400);

    const userId = authData.user.id;

    // ── Créer le profil ───────────────────────────────────────
    const profilePayload: Record<string, unknown> = {
        id: userId, nom, prenom, email: email.trim().toLowerCase(),
        civilite: civilite || null,
        date_naissance: date_naissance || null,
        role, first_login: true,
    };
    if (adresse)     profilePayload.adresse     = adresse;
    if (code_postal) profilePayload.code_postal = code_postal;
    if (ville)       profilePayload.ville        = ville;
    if (telephone)   profilePayload.telephone    = telephone;

    const { error: profileError } = await supabase.from('lms_profiles').insert(profilePayload);
    if (profileError) return json({ error: profileError.message }, 400);

    // ── Rattacher à la cohorte ────────────────────────────────
    if (cohorte_id) {
        await supabase.from('lms_cohorte_membres').insert({ cohorte_id, profile_id: userId });
    }

    return json({ success: true, enrolled_existing: false, userId });
});

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
