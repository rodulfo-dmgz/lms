/**
 * guide.js — Compagnon pédagogique immersif
 *
 * 3 rôles :
 * 1. FAQ contextuelle — full-text search sur kpi_knowledge_base (Supabase)
 * 2. Indices progressifs — 3 niveaux par activité (scripts embarqués)
 * 3. Narrateur — messages de bienvenue, félicitations, encouragements
 */

import { supabase } from './kpi-auth.js?v=4';
import { store } from './kpi-store.js?v=4';

// État interne du guide
const _guide = {
  indiceLevel:   {},   // { activite_id: 1|2|3 } — niveau d'indice utilisé
  searchHistory: [],   // historique des questions posées
  initialized:   false,
};

// ── API publique ────────────────────────────────────────────────────

export const Guide = {

  /**
   * Initialise le guide avec le profil utilisateur
   */
  init(profile, kpiProfile) {
    _guide.profile    = profile;
    _guide.kpiProfile = kpiProfile;
    _guide.initialized = true;

    const prenom = profile?.prenom || 'vous';
    const niveau = kpiProfile?.niveau_slug || 'neophyte';

    store.addGuideMessage(
      _welcomeMessage(prenom, niveau),
      'guide'
    );
  },

  /**
   * Recherche dans la base de connaissances (full-text Supabase)
   * @param {string} query - Question libre
   */
  async search(query) {
    if (!query?.trim()) return;

    const cleanQuery = query.trim();
    store.addGuideMessage(`🔍 Recherche : "${cleanQuery}"...`, 'user');

    // Préparer la requête tsquery (supprimer les caractères spéciaux)
    const tsQuery = cleanQuery
      .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .join(' & ');

    if (!tsQuery) {
      store.addGuideMessage("Hmm, je n'ai pas compris. Essayez une question plus précise.", 'guide');
      return;
    }

    const { data, error } = await supabase
      .from('kpi_knowledge_base')
      .select('question, reponse, tags, niveaux_cibles')
      .eq('is_active', true)
      .textSearch('search_vector', tsQuery, { config: 'french' })
      .limit(3);

    if (error || !data?.length) {
      // Fallback : recherche ILIKE si full-text ne trouve rien
      const { data: fallback } = await supabase
        .from('kpi_knowledge_base')
        .select('question, reponse')
        .eq('is_active', true)
        .ilike('question', `%${cleanQuery.split(' ')[0]}%`)
        .limit(2);

      if (!fallback?.length) {
        store.addGuideMessage(
          `Je n'ai pas de réponse précise à "${cleanQuery}". Essayez avec d'autres mots-clés, ou consultez votre formateur.`,
          'guide'
        );
        return;
      }

      data?.push(...(fallback || []));
    }

    _guide.searchHistory.push(cleanQuery);

    const best = data[0];
    store.addGuideMessage(`**${best.question}**\n\n${best.reponse}`, 'guide');

    if (data.length > 1) {
      const aussi = data.slice(1).map(d => `• ${d.question}`).join('\n');
      store.addGuideMessage(`Sujets liés :\n${aussi}`, 'guide-hint');
    }
  },

  /**
   * Donne l'indice suivant pour l'activité courante
   * @param {object} activite - La kpi_activite en cours
   */
  giveIndice(activite) {
    if (!activite?.indices?.length) {
      store.addGuideMessage("Pas d'indice disponible pour cette activité. Faites confiance à votre instinct !", 'guide');
      return;
    }

    const currentLevel = _guide.indiceLevel[activite.id] || 0;
    const nextLevel    = Math.min(currentLevel + 1, activite.indices.length);

    if (currentLevel >= activite.indices.length) {
      store.addGuideMessage(
        "Vous avez utilisé tous les indices disponibles. Il est temps d'essayer par vous-même !",
        'guide-warn'
      );
      return;
    }

    const indice = activite.indices[currentLevel]; // {niveau, texte}
    _guide.indiceLevel[activite.id] = nextLevel;

    const remaining = activite.indices.length - nextLevel;
    store.addGuideMessage(
      `💡 **Indice ${nextLevel}/${activite.indices.length}**\n\n${indice.texte}` +
      (remaining > 0 ? `\n\n_(${remaining} indice(s) encore disponible(s))_` : '\n\n_Dernier indice — vous pouvez y arriver !_'),
      'guide-indice'
    );
  },

  /**
   * Message de félicitation après une activité réussie
   */
  celebrate(score, seuilReussite = 60) {
    const messages = score >= 90
      ? ["🏆 Excellent ! Score parfait — vous maîtrisez ce sujet !", "🌟 Magnifique ! Vous avez tout juste.", "🎯 Score parfait ! Passez au niveau supérieur."]
      : score >= seuilReussite
      ? ["✅ Bien joué ! Vous avez validé cette activité.", "👏 Bravo ! Continuez sur cette lancée.", "🎉 Activité validée ! Vous progressez bien."]
      : ["💪 Pas tout à fait... mais vous y êtes presque !", "🔁 Encore un effort — relisez les indices et réessayez.", "📖 Relire la leçon peut aider. Vous pouvez réessayer."];

    const msg = messages[Math.floor(Math.random() * messages.length)];
    store.addGuideMessage(msg + `\n\nScore : **${Math.round(score)}%**`, score >= seuilReussite ? 'guide-success' : 'guide-warn');
  },

  /**
   * Message contextuel quand on entre dans une activité
   */
  introduceActivite(activite) {
    const kpiProfile = store.getKpiProfile();
    const niveauSlug = kpiProfile?.niveau_slug;

    let intro = `**${activite.titre}**\n\n${activite.description || ''}`;

    // Adaptation selon le niveau
    if (niveauSlug === 'eillettrisme' || niveauSlug === 'neophyte') {
      intro += '\n\n_Prenez votre temps. Si vous êtes bloqué(e), cliquez sur 💡 pour un indice._';
    } else if (niveauSlug === 'avance' || niveauSlug === 'expert') {
      intro += '\n\n_Mode autonome activé. Les indices sont disponibles si besoin._';
    }

    store.addGuideMessage(intro, 'guide');
  },

  /**
   * Réinitialise les indices pour une activité (si l'utilisateur recommence)
   */
  resetIndices(activiteId) {
    delete _guide.indiceLevel[activiteId];
  },

  /**
   * Ouvrir / fermer le guide
   */
  toggle() {
    store.set('guideVisible', !store.get('guideVisible'));
  },

  open()  { store.set('guideVisible', true); },
  close() { store.set('guideVisible', false); },
};

// ── Messages de bienvenue par niveau ───────────────────────────────

function _welcomeMessage(prenom, niveau) {
  const messages = {
    eillettrisme:  `Bonjour ${prenom} ! 👋 Je suis votre guide. Je suis là pour vous aider à chaque étape. N'hésitez jamais à me poser une question !`,
    neophyte:      `Bonjour ${prenom} ! Je suis votre guide KPI. Posez-moi vos questions à tout moment — je suis là pour donner du sens à tout ça.`,
    debutant:      `Salut ${prenom} ! Prêt(e) à explorer les KPI ? Je serai là si vous avez besoin d'un coup de pouce.`,
    intermediaire: `Bonjour ${prenom}. Le guide est actif. Utilisez-moi pour les définitions, les formules ou les indices d'activité.`,
    avance:        `${prenom}, le guide est disponible. Consultez-le pour les références métier ou les bonnes pratiques avancées.`,
    expert:        `${prenom}, guide en mode pair. Je suis là pour les questions pointues et les cas limites.`,
  };
  return messages[niveau] || messages.neophyte;
}
