/**
 * kpi-app.js — Orchestrateur principal de la SPA KPI
 *
 * Routing hash :
 * #/ ou #/map        → Carte des missions
 * #/diagnostic       → Quiz de positionnement
 * #/activite/:id     → Activité en cours
 * #/session/:id      → Rejoindre une session live
 * #/formateur        → Console formateur
 * #/profil           → Mon profil KPI
 */

import { requireAuth, onAuthStateChange, supabase } from './kpi-auth.js';
import { store } from './kpi-store.js';
import { Guide } from './guide.js';
import { MODALITES } from './kpi-config.js';
import { joinSessionRealtime, leaveSession, changeModalite, sendBroadcast, setActiviteCourante } from './kpi-realtime.js';

// ── Boot ────────────────────────────────────────────────────────────

async function boot() {
  // Auth
  const auth = await requireAuth();
  if (!auth) return;

  const { profile, kpiProfile } = auth;
  store.set('profile', profile);
  store.set('kpiProfile', kpiProfile);

  // Charger les données de référence
  await _loadReferenceData();

  // Initialiser le guide
  Guide.init(profile, { ...kpiProfile, niveau_slug: _getNiveauSlug(kpiProfile?.niveau_id) });

  // Écouter auth
  onAuthStateChange(() => {});

  // Monter l'UI principale
  _mountApp();

  // Router initial
  _route(window.location.hash || '#/map');
  window.addEventListener('hashchange', () => _route(window.location.hash));
}

async function _loadReferenceData() {
  const [{ data: niveaux }, { data: sequences }] = await Promise.all([
    supabase.from('kpi_niveaux').select('*').order('ordre'),
    supabase.from('kpi_sequences').select(`
      *, kpi_seances (
        *, kpi_activites (*)
      )
    `).eq('is_active', true).order('ordre'),
  ]);

  store.set('niveaux', niveaux || []);
  store.set('sequences', sequences || []);

  // Charger la progression de l'utilisateur
  const profile = store.getProfile();
  if (profile) {
    const { data: progress } = await supabase
      .from('kpi_activite_progress')
      .select('*')
      .eq('profile_id', profile.id);

    const progressMap = {};
    (progress || []).forEach(p => { progressMap[p.activite_id] = p; });
    store.set('progression', progressMap);
  }
}

function _getNiveauSlug(niveauId) {
  if (!niveauId) return 'neophyte';
  const n = store.get('niveaux').find(n => n.id === niveauId);
  return n?.slug || 'neophyte';
}

// ── Mount UI principale ─────────────────────────────────────────────

function _mountApp() {
  const app = document.getElementById('kpi-app');
  const profile = store.getProfile();

  app.innerHTML = `
    <!-- Barre de navigation -->
    <header class="kpi-header" id="kpi-header">
      <div class="kpi-header__brand">
        <span class="kpi-header__logo">📊</span>
        <span class="kpi-header__title">KPI Lab</span>
        <span class="kpi-badge-modalite" id="badge-modalite"></span>
      </div>
      <nav class="kpi-header__nav">
        <a href="#/map"       class="kpi-nav-link" data-route="map">Missions</a>
        ${store.isFormateur() ? `<a href="#/formateur" class="kpi-nav-link" data-route="formateur">Console</a>` : ''}
        <a href="#/profil"    class="kpi-nav-link" data-route="profil">Profil</a>
      </nav>
      <div class="kpi-header__actions">
        <button class="kpi-btn kpi-btn--ghost kpi-btn--sm" id="btn-guide-toggle" title="Guide pédagogique">
          <span>💡</span>
        </button>
        <div class="kpi-avatar" title="${profile.prenom} ${profile.nom}">
          ${(profile.prenom[0] + profile.nom[0]).toUpperCase()}
        </div>
      </div>
    </header>

    <!-- Zone de notifications -->
    <div class="kpi-notifications" id="kpi-notifications"></div>

    <!-- Contenu principal -->
    <main class="kpi-main" id="kpi-main">
      <div class="kpi-loading">
        <div class="kpi-spinner"></div>
        <p>Chargement…</p>
      </div>
    </main>

    <!-- Guide pédagogique (panneau latéral) -->
    <aside class="kpi-guide-panel" id="kpi-guide-panel" aria-hidden="true">
      <div class="kpi-guide-panel__header">
        <span class="kpi-guide-panel__icon">💡</span>
        <span class="kpi-guide-panel__title">Guide pédagogique</span>
        <button class="kpi-btn kpi-btn--ghost kpi-btn--sm" id="btn-guide-close">✕</button>
      </div>
      <div class="kpi-guide-messages" id="kpi-guide-messages"></div>
      <form class="kpi-guide-input" id="kpi-guide-form">
        <input type="text" class="kpi-input" id="kpi-guide-query"
               placeholder="Posez une question…" autocomplete="off">
        <button type="submit" class="kpi-btn kpi-btn--primary kpi-btn--sm">Envoyer</button>
      </form>
    </aside>

    <!-- Overlay attention formateur -->
    <div class="kpi-attention-overlay" id="kpi-attention-overlay" hidden>
      <div class="kpi-attention-card">
        <span class="kpi-attention-icon">⚡</span>
        <p>Attention demandée par le formateur</p>
      </div>
    </div>
  `;

  // Events
  document.getElementById('btn-guide-toggle').addEventListener('click', () => Guide.toggle());
  document.getElementById('btn-guide-close').addEventListener('click', () => Guide.close());

  document.getElementById('kpi-guide-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = document.getElementById('kpi-guide-query').value.trim();
    if (!q) return;
    document.getElementById('kpi-guide-query').value = '';
    await Guide.search(q);
  });

  // Réactivité store
  store.subscribe('guideVisible', (visible) => {
    const panel = document.getElementById('kpi-guide-panel');
    panel?.setAttribute('aria-hidden', String(!visible));
    panel?.classList.toggle('kpi-guide-panel--open', visible);
  });

  store.subscribe('guideMessages', (messages) => {
    _renderGuideMessages(messages);
  });

  store.subscribe('notifications', (notifs) => {
    _renderNotifications(notifs);
  });

  store.subscribe('session', (session) => {
    _updateModaliteBadge(session?.modalite);
  });
}

// ── Router ──────────────────────────────────────────────────────────

async function _route(hash) {
  const [path, ...paramParts] = (hash.replace('#/', '').split('/'));
  const param = paramParts.join('/');

  // Mettre à jour nav active
  document.querySelectorAll('.kpi-nav-link').forEach(a => {
    a.classList.toggle('kpi-nav-link--active', a.dataset.route === path);
  });

  const main = document.getElementById('kpi-main');
  main.innerHTML = `<div class="kpi-loading"><div class="kpi-spinner"></div></div>`;

  switch(path) {
    case 'map':
    case '':
      await viewMissionMap(main);
      break;
    case 'diagnostic':
      await viewDiagnostic(main);
      break;
    case 'activite':
      await viewActivite(main, parseInt(param));
      break;
    case 'session':
      await viewSession(main, param);
      break;
    case 'formateur':
      if (store.isFormateur()) await viewFormateur(main);
      else _route('#/map');
      break;
    case 'profil':
      await viewProfil(main);
      break;
    default:
      _route('#/map');
  }
}

// ── View : Carte des missions ────────────────────────────────────────

async function viewMissionMap(container) {
  const kpiProfile = store.getKpiProfile();
  const sequences  = store.get('sequences');
  const progression = store.get('progression');

  // Si pas encore de diagnostic → proposer
  if (!kpiProfile?.completed_diagnostic_at) {
    container.innerHTML = `
      <div class="kpi-onboarding">
        <div class="kpi-onboarding__visual">
          <div class="kpi-onboarding__orbit">
            <div class="kpi-onboarding__planet">📊</div>
          </div>
        </div>
        <div class="kpi-onboarding__content">
          <h1 class="kpi-onboarding__title">Bienvenue dans le KPI Lab</h1>
          <p class="kpi-onboarding__desc">
            Avant de commencer votre parcours, faites un test rapide de positionnement.
            Il adaptera l'expérience à votre niveau.
          </p>
          <a href="#/diagnostic" class="kpi-btn kpi-btn--primary kpi-btn--lg">
            🚀 Commencer le diagnostic
          </a>
        </div>
      </div>
    `;
    return;
  }

  // Carte des missions
  const totalActivites = sequences.reduce((acc, s) =>
    acc + s.kpi_seances.reduce((a, se) => a + se.kpi_activites.length, 0), 0);

  const doneActivites = Object.values(progression).filter(p => p.statut === 'termine').length;
  const globalPct = totalActivites ? Math.round(doneActivites / totalActivites * 100) : 0;

  container.innerHTML = `
    <div class="kpi-map">
      <div class="kpi-map__header">
        <h1 class="kpi-map__title">Carte des missions</h1>
        <div class="kpi-map__progress-global">
          <span class="kpi-map__progress-label">${doneActivites} / ${totalActivites} activités</span>
          <div class="kpi-progress-bar">
            <div class="kpi-progress-bar__fill" style="width:${globalPct}%"></div>
          </div>
        </div>
      </div>
      <div class="kpi-map__sequences">
        ${sequences.map((seq, seqIdx) => _renderSequenceCard(seq, seqIdx, progression)).join('')}
      </div>
    </div>
  `;

  // Animer les barres de progression
  requestAnimationFrame(() => {
    container.querySelectorAll('.kpi-progress-bar__fill').forEach(el => {
      el.style.transition = 'width 0.8s ease';
    });
  });
}

function _renderSequenceCard(seq, idx, progression) {
  const seances = seq.kpi_seances?.sort((a,b) => a.ordre - b.ordre) || [];
  const totalActs = seances.reduce((a, se) => a + (se.kpi_activites?.length || 0), 0);
  const doneActs  = seances.reduce((a, se) =>
    a + (se.kpi_activites || []).filter(ac => progression[ac.id]?.statut === 'termine').length, 0);
  const pct = totalActs ? Math.round(doneActs / totalActs * 100) : 0;
  const locked = idx > 0 && (() => {
    const prev = store.get('sequences')[idx - 1];
    const prevActs = (prev?.kpi_seances || []).reduce((a,s) => a + (s.kpi_activites?.length||0), 0);
    const prevDone = (prev?.kpi_seances || []).reduce((a,s) =>
      a + (s.kpi_activites||[]).filter(ac => progression[ac.id]?.statut === 'termine').length, 0);
    return prevActs > 0 && prevDone < Math.ceil(prevActs * 0.7); // 70% pour déverrouiller
  })();

  return `
    <div class="kpi-seq-card ${locked ? 'kpi-seq-card--locked' : ''}" style="--seq-color:${seq.couleur}">
      <div class="kpi-seq-card__header">
        <div class="kpi-seq-card__icon-wrap">
          <i data-lucide="${seq.icon}" aria-hidden="true"></i>
        </div>
        <div class="kpi-seq-card__meta">
          <div class="kpi-seq-card__code">${seq.code}</div>
          <h2 class="kpi-seq-card__title">${seq.titre}</h2>
          <div class="kpi-seq-card__duree">⏱ ${seq.duree_heures}h</div>
        </div>
        ${locked ? '<div class="kpi-seq-card__lock">🔒</div>' : ''}
      </div>
      ${!locked ? `
        <div class="kpi-seq-card__progress">
          <div class="kpi-progress-bar kpi-progress-bar--sm">
            <div class="kpi-progress-bar__fill" data-width="${pct}" style="width:${pct}%;background:${seq.couleur}"></div>
          </div>
          <span class="kpi-seq-card__pct">${pct}%</span>
        </div>
        <div class="kpi-seq-card__seances">
          ${seances.map(se => _renderSeanceItem(se, progression)).join('')}
        </div>
      ` : `<p class="kpi-seq-card__locked-msg">Complétez 70% de la séquence précédente pour débloquer.</p>`}
    </div>
  `;
}

function _renderSeanceItem(seance, progression) {
  const acts = seance.kpi_activites?.sort((a,b) => a.ordre - b.ordre) || [];
  const done  = acts.filter(a => progression[a.id]?.statut === 'termine').length;
  const total = acts.length;
  const allDone = done === total && total > 0;

  return `
    <div class="kpi-seance-item ${allDone ? 'kpi-seance-item--done' : ''}">
      <div class="kpi-seance-item__header">
        <span class="kpi-seance-item__status">${allDone ? '✅' : done > 0 ? '🔄' : '⬜'}</span>
        <span class="kpi-seance-item__code">${seance.code}</span>
        <span class="kpi-seance-item__titre">${seance.titre}</span>
        <span class="kpi-seance-item__count">${done}/${total}</span>
      </div>
      <div class="kpi-seance-item__activites">
        ${acts.map(a => `
          <a href="#/activite/${a.id}" class="kpi-act-chip
            ${progression[a.id]?.statut === 'termine' ? 'kpi-act-chip--done' : ''}
            ${progression[a.id]?.statut === 'en_cours' ? 'kpi-act-chip--active' : ''}"
            title="${a.titre}">
            ${_typeIcon(a.type)}
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function _typeIcon(type) {
  const icons = {
    quiz:        '❓',
    drag_drop:   '↕️',
    text_input:  '✍️',
    csv_import:  '📁',
    simulator:   '🎛️',
    carte_mentale:'🧠',
    saynete:     '🎭',
    synthese:    '📋',
  };
  return icons[type] || '▶️';
}

// ── View : Diagnostic ────────────────────────────────────────────────

async function viewDiagnostic(container) {
  // Quiz de positionnement (15 questions adaptatives)
  const questions = _getDiagnosticQuestions();
  let current = 0;
  const answers = [];

  function renderQ(idx) {
    const q = questions[idx];
    container.innerHTML = `
      <div class="kpi-diagnostic">
        <div class="kpi-diagnostic__header">
          <h1>📍 Test de positionnement</h1>
          <div class="kpi-diagnostic__progress">
            <div class="kpi-progress-bar">
              <div class="kpi-progress-bar__fill" style="width:${idx/questions.length*100}%"></div>
            </div>
            <span>${idx + 1} / ${questions.length}</span>
          </div>
        </div>
        <div class="kpi-diagnostic__card">
          <p class="kpi-diagnostic__theme">Thème : ${q.theme}</p>
          <h2 class="kpi-diagnostic__question">${q.texte}</h2>
          <div class="kpi-diagnostic__options">
            ${q.options.map((opt, i) => `
              <button class="kpi-diag-opt" data-idx="${i}">${opt.texte}</button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.kpi-diag-opt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const answerIdx = parseInt(btn.dataset.idx);
        const correct   = q.options[answerIdx].correct;
        answers.push({ q: idx, correct, niveau: q.niveau_min });

        btn.classList.add(correct ? 'kpi-diag-opt--correct' : 'kpi-diag-opt--wrong');
        if (!correct) {
          container.querySelector(`[data-idx="${q.options.findIndex(o=>o.correct)}"]`)
            ?.classList.add('kpi-diag-opt--correct');
        }

        await new Promise(r => setTimeout(r, 900));
        current++;
        if (current < questions.length) {
          renderQ(current);
        } else {
          await _finishDiagnostic(container, answers);
        }
      });
    });
  }

  renderQ(0);
}

async function _finishDiagnostic(container, answers) {
  const correct = answers.filter(a => a.correct).length;
  const pct     = Math.round(correct / answers.length * 100);

  // Déterminer le niveau
  const niveau = pct <= 20 ? 'eillettrisme'
    : pct <= 40 ? 'neophyte'
    : pct <= 55 ? 'debutant'
    : pct <= 70 ? 'intermediaire'
    : pct <= 85 ? 'avance'
    : 'expert';

  const niveauxData = store.get('niveaux');
  const niveauData  = niveauxData.find(n => n.slug === niveau);

  // Sauvegarder en BDD
  const profile = store.getProfile();
  if (profile) {
    await supabase.from('kpi_student_profile').upsert({
      profile_id:              profile.id,
      niveau_id:               niveauData?.id,
      score_diagnostic:        pct,
      completed_diagnostic_at: new Date().toISOString(),
    });

    store.set('kpiProfile', { ...store.getKpiProfile(), niveau_id: niveauData?.id, score_diagnostic: pct });
  }

  container.innerHTML = `
    <div class="kpi-diagnostic-result">
      <div class="kpi-diagnostic-result__circle" style="--niveau-color:${niveauData?.couleur}">
        <span class="kpi-diagnostic-result__score">${pct}%</span>
      </div>
      <h1 class="kpi-diagnostic-result__niveau" style="color:${niveauData?.couleur}">
        ${niveauData?.label || niveau}
      </h1>
      <p class="kpi-diagnostic-result__desc">${niveauData?.description || ''}</p>
      <div class="kpi-diagnostic-result__actions">
        <a href="#/map" class="kpi-btn kpi-btn--primary kpi-btn--lg">
          🗺️ Découvrir mes missions
        </a>
      </div>
    </div>
  `;

  Guide.celebrate(pct, 50);
}

// ── View : Activité ──────────────────────────────────────────────────

async function viewActivite(container, activiteId) {
  if (!activiteId) { _route('#/map'); return; }

  // Charger l'activité depuis le store
  let activite = null;
  for (const seq of store.get('sequences')) {
    for (const seance of (seq.kpi_seances || [])) {
      activite = (seance.kpi_activites || []).find(a => a.id === activiteId);
      if (activite) { activite._seance = seance; activite._sequence = seq; break; }
    }
    if (activite) break;
  }

  if (!activite) {
    container.innerHTML = `<div class="kpi-error">Activité introuvable. <a href="#/map">Retour à la carte</a></div>`;
    return;
  }

  store.set('activiteCourante', activite);
  Guide.introduceActivite(activite);

  // Marquer "en_cours"
  const profile = store.getProfile();
  if (profile && !store.getProgressionForActivite(activiteId)?.completed_at) {
    supabase.from('kpi_activite_progress').upsert({
      profile_id: profile.id,
      activite_id: activiteId,
      statut: 'en_cours',
      started_at: new Date().toISOString(),
    }, { onConflict: 'profile_id,activite_id' });
  }

  container.innerHTML = `
    <div class="kpi-activite-view">
      <div class="kpi-activite-view__breadcrumb">
        <a href="#/map">Missions</a>
        <span>›</span>
        <span>${activite._sequence?.code}</span>
        <span>›</span>
        <span>${activite._seance?.titre}</span>
      </div>
      <div class="kpi-activite-view__header">
        <div class="kpi-activite-view__type-badge">${_typeIcon(activite.type)} ${_typeLabel(activite.type)}</div>
        <h1 class="kpi-activite-view__titre">${activite.titre}</h1>
        <p class="kpi-activite-view__desc">${activite.description || ''}</p>
      </div>
      <div class="kpi-activite-view__body" id="activite-body"></div>
      <div class="kpi-activite-view__footer">
        <button class="kpi-btn kpi-btn--ghost" id="btn-indice">
          💡 Indice (${activite.indices?.length || 0})
        </button>
        <div class="kpi-activite-view__nav">
          <a href="#/map" class="kpi-btn kpi-btn--secondary">← Carte</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-indice')?.addEventListener('click', () => {
    Guide.giveIndice(activite);
  });

  // Rendre l'activité selon son type
  const body = document.getElementById('activite-body');
  await _renderActiviteBody(body, activite);
}

async function _renderActiviteBody(container, activite) {
  const { type, contenu } = activite;

  switch (type) {
    case 'quiz':
      await renderQuiz(container, activite);
      break;
    case 'drag_drop':
      await renderDragDrop(container, activite);
      break;
    case 'text_input':
      await renderTextInput(container, activite);
      break;
    case 'simulator':
      await renderSimulator(container, activite);
      break;
    case 'csv_import':
      await renderCsvImport(container, activite);
      break;
    case 'synthese':
      await renderSynthese(container, activite);
      break;
    case 'saynete':
      await renderSaynete(container, activite);
      break;
    default:
      container.innerHTML = `<p class="kpi-placeholder">Activité de type "${type}" — à venir.</p>`;
  }
}

// ── Widget : Quiz ────────────────────────────────────────────────────

async function renderQuiz(container, activite) {
  const { contenu } = activite;
  const questions = contenu.questions || [];
  const seuilReussite = contenu.seuil_reussite || activite.seuil_reussite || 70;
  let current = 0;
  const answers = [];

  function renderQ(idx) {
    if (idx >= questions.length) {
      _showQuizResults();
      return;
    }
    const q = questions[idx];
    const isVF  = q.type === 'vrai_faux';
    const isQCM = q.type === 'qcm';
    const isCalc = q.type === 'calcul';

    container.innerHTML = `
      <div class="kpi-quiz">
        <div class="kpi-quiz__progress">${idx + 1} / ${questions.length}</div>
        <div class="kpi-quiz__card">
          <p class="kpi-quiz__question">${q.texte}</p>
          <div class="kpi-quiz__options" id="quiz-options">
            ${isVF ? `
              <button class="kpi-quiz-opt" data-answer="true">✅ Vrai</button>
              <button class="kpi-quiz-opt" data-answer="false">❌ Faux</button>
            ` : isQCM ? q.options.map((opt, i) => `
              <button class="kpi-quiz-opt" data-answer="${i}">${opt}</button>
            `).join('') : `
              <input type="number" class="kpi-input" id="calc-answer" step="0.01" placeholder="Votre réponse…">
              <button class="kpi-btn kpi-btn--primary" id="btn-calc-submit">Valider</button>
            `}
          </div>
          ${q.explication ? `<div class="kpi-quiz__explication" id="quiz-explication" hidden>${q.explication}</div>` : ''}
        </div>
      </div>
    `;

    const check = (userAnswer, correct) => {
      answers.push({ correct });
      container.querySelectorAll('.kpi-quiz-opt').forEach(btn => {
        btn.disabled = true;
        if (String(btn.dataset.answer) === String(correct)) btn.classList.add('kpi-quiz-opt--correct');
        else if (String(btn.dataset.answer) === String(userAnswer)) btn.classList.add('kpi-quiz-opt--wrong');
      });
      if (q.explication) container.querySelector('#quiz-explication')?.removeAttribute('hidden');
      setTimeout(() => renderQ(current + 1), 1200);
      current++;
    };

    if (isCalc) {
      document.getElementById('btn-calc-submit')?.addEventListener('click', () => {
        const val = parseFloat(document.getElementById('calc-answer')?.value);
        const correct = Math.abs(val - q.reponse) <= (q.tolerance || 0);
        answers.push({ correct });
        current++;
        setTimeout(() => renderQ(current), 900);
      });
    } else {
      container.querySelectorAll('.kpi-quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const answer = btn.dataset.answer === 'true' ? true : btn.dataset.answer === 'false' ? false : parseInt(btn.dataset.answer);
          check(answer, q.reponse ?? q.reponse);
        });
      });
    }
  }

  function _showQuizResults() {
    const correct = answers.filter(a => a.correct).length;
    const score   = Math.round(correct / questions.length * 100);
    const passed  = score >= seuilReussite;

    container.innerHTML = `
      <div class="kpi-quiz-result ${passed ? 'kpi-quiz-result--pass' : 'kpi-quiz-result--fail'}">
        <div class="kpi-quiz-result__score">${score}%</div>
        <p class="kpi-quiz-result__msg">${passed ? '✅ Validé !' : '🔁 À refaire'}</p>
        <p>${correct} / ${questions.length} bonnes réponses</p>
        ${!passed ? `<button class="kpi-btn kpi-btn--secondary" id="btn-retry">Recommencer</button>` : ''}
      </div>
    `;

    document.getElementById('btn-retry')?.addEventListener('click', () => {
      current = 0;
      answers.length = 0;
      renderQ(0);
    });

    _saveProgress(activite.id, score, passed, answers);
    Guide.celebrate(score, seuilReussite);
  }

  renderQ(0);
}

// ── Widget : Drag & Drop ─────────────────────────────────────────────

async function renderDragDrop(container, activite) {
  const { contenu } = activite;
  const items = contenu.items || [];
  const colonnes = contenu.colonnes || [];
  const type = contenu.type || 'categories'; // 'categories' | 'association'

  const _shuffled = [...items].sort(() => Math.random() - 0.5);

  container.innerHTML = `
    <div class="kpi-drag">
      <p class="kpi-drag__consigne">${contenu.consigne || ''}</p>
      <div class="kpi-drag__bank" id="drag-bank">
        ${_shuffled.map(item => `
          <div class="kpi-drag-item" draggable="true" data-id="${item.id}" data-correct="${item.categorie || item.graphique || item.usage || item.type_suggere || item.type || ''}">
            ${item.texte || item.valeur || item.nom || item.label || ''}
          </div>
        `).join('')}
      </div>
      <div class="kpi-drag__zones">
        ${colonnes.map(col => `
          <div class="kpi-drag-zone" data-col="${col}" id="zone-${col}">
            <div class="kpi-drag-zone__label">${col.replace(/_/g,' ')}</div>
            <div class="kpi-drag-zone__items" id="items-${col}"></div>
          </div>
        `).join('')}
      </div>
      <button class="kpi-btn kpi-btn--primary kpi-drag__submit" id="btn-drag-submit">Vérifier</button>
    </div>
  `;

  // Drag & Drop natif HTML5
  let dragged = null;

  container.querySelectorAll('.kpi-drag-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragged = item;
      item.classList.add('kpi-dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('kpi-dragging'));
  });

  container.querySelectorAll('.kpi-drag-zone').forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('kpi-drag-zone--over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('kpi-drag-zone--over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('kpi-drag-zone--over');
      if (dragged) {
        zone.querySelector('.kpi-drag-zone__items')?.appendChild(dragged);
        dragged._zone = zone.dataset.col;
      }
    });
  });

  document.getElementById('btn-drag-submit')?.addEventListener('click', () => {
    let correct = 0;
    container.querySelectorAll('.kpi-drag-item').forEach(item => {
      const userZone = item.closest('.kpi-drag-zone')?.dataset.col;
      const expected = item.dataset.correct;
      const isOk = userZone === expected;
      item.classList.toggle('kpi-drag-item--correct', isOk);
      item.classList.toggle('kpi-drag-item--wrong',   !isOk && !!userZone);
      if (isOk) correct++;
    });
    const score = Math.round(correct / items.length * 100);
    const passed = score >= (activite.seuil_reussite || 75);
    Guide.celebrate(score, activite.seuil_reussite || 75);
    _saveProgress(activite.id, score, passed, null);
  });
}

// ── Widget : Text Input ──────────────────────────────────────────────

async function renderTextInput(container, activite) {
  const { contenu } = activite;

  container.innerHTML = `
    <div class="kpi-text-input">
      ${contenu.contexte ? `<div class="kpi-text-input__context">${contenu.contexte}</div>` : ''}
      <p class="kpi-text-input__consigne">${contenu.consigne || ''}</p>
      <textarea class="kpi-textarea" id="text-response" rows="6"
        placeholder="${contenu.placeholder || 'Votre réponse…'}"></textarea>
      <div class="kpi-text-input__footer">
        ${contenu.min_mots ? `<span class="kpi-text-input__count" id="word-count">0 / ${contenu.min_mots} mots min.</span>` : ''}
        <button class="kpi-btn kpi-btn--primary" id="btn-text-submit">Soumettre</button>
      </div>
    </div>
  `;

  const ta    = document.getElementById('text-response');
  const count = document.getElementById('word-count');

  ta?.addEventListener('input', () => {
    const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
    if (count) count.textContent = `${words} / ${contenu.min_mots} mots min.`;
    if (count) count.style.color = words >= (contenu.min_mots||0) ? 'var(--kpi-success)' : 'inherit';
  });

  document.getElementById('btn-text-submit')?.addEventListener('click', async () => {
    const texte = ta?.value.trim();
    if (!texte) { ta?.classList.add('kpi-input--error'); return; }

    await _submitReponse(activite, { texte });
    _saveProgress(activite.id, 100, true, { texte });
    Guide.celebrate(100, 0);
  });
}

// ── Widget : Synthèse ────────────────────────────────────────────────

async function renderSynthese(container, activite) {
  const { contenu } = activite;

  container.innerHTML = `
    <div class="kpi-synthese">
      <div class="kpi-synthese__points">
        ${(contenu.points || []).map(p => `
          <div class="kpi-synthese__point">
            <span class="kpi-synthese__check">✅</span>
            <span>${p}</span>
          </div>
        `).join('')}
      </div>
      ${contenu.completion ? `
        <div class="kpi-synthese__completion">
          <p class="kpi-synthese__completion-text">${contenu.completion.texte}</p>
          <input type="text" class="kpi-input" id="completion-answer"
                 placeholder="${contenu.completion.placeholder || ''}">
          <button class="kpi-btn kpi-btn--primary" id="btn-completion-submit">Valider</button>
        </div>
      ` : `<button class="kpi-btn kpi-btn--primary" id="btn-synthese-done">✅ J'ai lu et compris</button>`}
    </div>
  `;

  document.getElementById('btn-synthese-done')?.addEventListener('click', () => {
    _saveProgress(activite.id, 100, true, null);
    Guide.celebrate(100, 0);
  });

  document.getElementById('btn-completion-submit')?.addEventListener('click', () => {
    const val = document.getElementById('completion-answer')?.value.trim();
    if (!val) return;
    _saveProgress(activite.id, 100, true, { completion: val });
    Guide.celebrate(100, 0);
  });
}

// ── Widget : Saynète ─────────────────────────────────────────────────

async function renderSaynete(container, activite) {
  const { contenu } = activite;

  container.innerHTML = `
    <div class="kpi-saynete">
      <div class="kpi-saynete__scenario">
        <div class="kpi-saynete__scenario-icon">🎭</div>
        <p>${contenu.scenario || ''}</p>
      </div>
      ${contenu.personnages?.length ? `
        <div class="kpi-saynete__roles">
          <strong>Personnages :</strong>
          ${contenu.personnages.map(p => `<span class="kpi-role-chip">${p}</span>`).join('')}
        </div>
      ` : ''}
      ${contenu.objectif ? `<p class="kpi-saynete__objectif">🎯 ${contenu.objectif}</p>` : ''}
      <textarea class="kpi-textarea" id="saynete-response" rows="5"
        placeholder="Décrivez votre réponse, votre prise de position ou résumez les échanges…"></textarea>
      <div class="kpi-saynete__footer">
        ${contenu.partage_classe ? `<p class="kpi-saynete__partage-note">📡 Cette réponse sera partagée avec la classe (après validation du formateur)</p>` : ''}
        <button class="kpi-btn kpi-btn--primary" id="btn-saynete-submit">Envoyer</button>
      </div>
    </div>
  `;

  document.getElementById('btn-saynete-submit')?.addEventListener('click', async () => {
    const texte = document.getElementById('saynete-response')?.value.trim();
    if (!texte) return;
    await _submitReponse(activite, { texte }, contenu.partage_classe);
    _saveProgress(activite.id, 100, true, { texte });
    Guide.celebrate(100, 0);
  });
}

// ── Widget : CSV Import ──────────────────────────────────────────────

async function renderCsvImport(container, activite) {
  const { contenu } = activite;

  container.innerHTML = `
    <div class="kpi-csv">
      <p class="kpi-csv__consigne">${contenu.consigne || ''}</p>
      <div class="kpi-csv__upload">
        <label class="kpi-csv__drop-zone" for="csv-file">
          <span class="kpi-csv__drop-icon">📁</span>
          <span>Glissez un fichier CSV ici ou cliquez pour importer</span>
          <input type="file" id="csv-file" accept=".csv,.xlsx" hidden>
        </label>
      </div>
      <div class="kpi-csv__preview" id="csv-preview"></div>
      ${(contenu.questions||[]).length ? `
        <div class="kpi-csv__questions" id="csv-questions">
          ${(contenu.questions||[]).map(q => `
            <div class="kpi-csv__question">
              <label>${q.texte}</label>
              <input type="${q.type === 'nombre' ? 'number' : 'text'}" class="kpi-input"
                     data-qid="${q.id}" placeholder="Votre réponse…">
            </div>
          `).join('')}
          <button class="kpi-btn kpi-btn--primary" id="btn-csv-submit">Valider mes réponses</button>
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('csv-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
    const rows    = lines.slice(1, 6); // Preview 5 lignes

    const preview = document.getElementById('csv-preview');
    preview.innerHTML = `
      <table class="kpi-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.split(',').map(c => `<td>${c.trim().replace(/^"|"$/g,'')}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <p class="kpi-csv__info">${lines.length - 1} lignes importées. Aperçu des 5 premières.</p>
    `;
  });

  document.getElementById('btn-csv-submit')?.addEventListener('click', async () => {
    const answers = {};
    container.querySelectorAll('[data-qid]').forEach(inp => {
      answers[inp.dataset.qid] = inp.value.trim();
    });
    await _submitReponse(activite, { answers });
    _saveProgress(activite.id, 100, true, answers);
    Guide.celebrate(100, 0);
  });
}

// ── Widget : Simulateur Dashboard ───────────────────────────────────

async function renderSimulator(container, activite) {
  const { contenu } = activite;
  const { data: widgetsCat } = await supabase
    .from('kpi_widgets_catalogue')
    .select('*')
    .eq('is_active', true);

  const widgets = widgetsCat || [];
  let layout = []; // [{widget_code, x, y, w, h, config}]

  container.innerHTML = `
    <div class="kpi-sim">
      <div class="kpi-sim__consigne">${contenu.consigne || ''}</div>
      ${contenu.contexte ? `<div class="kpi-sim__context">${contenu.contexte}</div>` : ''}
      <div class="kpi-sim__workspace">
        <div class="kpi-sim__palette" id="sim-palette">
          <strong class="kpi-sim__palette-title">Widgets disponibles</strong>
          ${widgets.map(w => `
            <div class="kpi-sim-widget-pick" draggable="true"
                 data-code="${w.code}" data-type="${w.type}" title="${w.description}">
              <span>${w.icon ? `<i data-lucide="${w.icon}"></i>` : '📊'}</span>
              <span class="kpi-sim-widget-pick__label">${w.label}</span>
            </div>
          `).join('')}
        </div>
        <div class="kpi-sim__canvas" id="sim-canvas">
          <p class="kpi-sim__canvas-hint">Faites glisser les widgets ici pour construire votre dashboard</p>
        </div>
      </div>
      <div class="kpi-sim__footer">
        <button class="kpi-btn kpi-btn--secondary" id="btn-sim-clear">🗑 Réinitialiser</button>
        <button class="kpi-btn kpi-btn--primary" id="btn-sim-submit">Soumettre mon dashboard</button>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ node: container });

  const canvas = document.getElementById('sim-canvas');

  // Drag depuis palette → canvas
  container.querySelectorAll('.kpi-sim-widget-pick').forEach(pick => {
    pick.addEventListener('dragstart', e => {
      e.dataTransfer.setData('widget_code', pick.dataset.code);
      e.dataTransfer.setData('widget_type', pick.dataset.type);
    });
  });

  canvas.addEventListener('dragover', e => { e.preventDefault(); canvas.classList.add('kpi-sim__canvas--over'); });
  canvas.addEventListener('dragleave', () => canvas.classList.remove('kpi-sim__canvas--over'));
  canvas.addEventListener('drop', e => {
    e.preventDefault();
    canvas.classList.remove('kpi-sim__canvas--over');
    const code = e.dataTransfer.getData('widget_code');
    const type = e.dataTransfer.getData('widget_type');
    if (!code) return;

    const w = widgets.find(w => w.code === code);
    _addWidgetToCanvas(canvas, w, contenu.donnees_simulees);
    layout.push({ widget_code: code, type });
    if (canvas.querySelector('.kpi-sim__canvas-hint')) {
      canvas.querySelector('.kpi-sim__canvas-hint').remove();
    }
  });

  document.getElementById('btn-sim-clear')?.addEventListener('click', () => {
    layout = [];
    canvas.innerHTML = '<p class="kpi-sim__canvas-hint">Faites glisser les widgets ici pour construire votre dashboard</p>';
  });

  document.getElementById('btn-sim-submit')?.addEventListener('click', async () => {
    if (!layout.length) { Guide.search('comment construire un dashboard'); return; }
    await _submitReponse(activite, { layout, donnees: contenu.donnees_simulees });
    _saveProgress(activite.id, 75, true, { layout });
    Guide.celebrate(75, activite.seuil_reussite || 70);
  });
}

function _addWidgetToCanvas(canvas, widget, donnees) {
  const el = document.createElement('div');
  el.className = 'kpi-sim-widget';
  el.draggable = true;

  const data = donnees?.[widget.code.replace('kpi_', '')] || donnees?.[widget.code] || null;

  el.innerHTML = `
    <div class="kpi-sim-widget__header">
      <span class="kpi-sim-widget__label">${widget.label}</span>
      <button class="kpi-sim-widget__remove" title="Supprimer">✕</button>
    </div>
    <div class="kpi-sim-widget__body">
      ${_renderWidgetPreview(widget, data)}
    </div>
  `;

  el.querySelector('.kpi-sim-widget__remove')?.addEventListener('click', () => el.remove());
  canvas.appendChild(el);
}

function _renderWidgetPreview(widget, data) {
  if (data === null || data === undefined) {
    return `<div class="kpi-sim-widget__placeholder">Données simulées disponibles après validation</div>`;
  }
  switch(widget.type) {
    case 'number':
      return `<div class="kpi-sim-widget__number">${typeof data === 'number' ? data.toFixed(1) : data}<span class="kpi-sim-widget__unit">${widget.config_defaut?.unite||''}</span></div>`;
    case 'trend_arrow':
      return `<div class="kpi-sim-widget__trend ${data > 0 ? 'up' : 'down'}">${data > 0 ? '↗' : '↘'} ${Math.abs(data)}%</div>`;
    case 'gauge':
      const pct = Math.min(100, data);
      return `<div class="kpi-sim-widget__gauge"><svg viewBox="0 0 100 60" width="120"><path d="M10,55 A45,45,0,0,1,90,55" fill="none" stroke="#e2e8f0" stroke-width="10"/><path d="M10,55 A45,45,0,0,1,90,55" fill="none" stroke="${pct>80?'#ef4444':pct>60?'#f59e0b':'#10b981'}" stroke-width="10" stroke-dasharray="${pct*1.4},141"/></svg><span>${pct}%</span></div>`;
    default:
      return `<div class="kpi-sim-widget__chart-placeholder">[${widget.type}]</div>`;
  }
}

// ── View : Console Formateur ─────────────────────────────────────────

async function viewFormateur(container) {
  // Créer ou récupérer la session active
  const profile = store.getProfile();

  const { data: sessions } = await supabase
    .from('kpi_sessions')
    .select('*, kpi_seances(titre)')
    .eq('formateur_id', profile.id)
    .in('statut', ['planifiee', 'active', 'pause'])
    .order('created_at', { ascending: false })
    .limit(5);

  container.innerHTML = `
    <div class="kpi-formateur">
      <div class="kpi-formateur__header">
        <h1>Console formateur</h1>
        <button class="kpi-btn kpi-btn--primary" id="btn-new-session">+ Nouvelle session</button>
      </div>
      <div class="kpi-formateur__sessions">
        ${(sessions || []).map(s => _renderSessionCard(s)).join('') || '<p class="kpi-placeholder">Aucune session active.</p>'}
      </div>
    </div>
  `;

  document.getElementById('btn-new-session')?.addEventListener('click', () => _createSession(container));
}

function _renderSessionCard(session) {
  const modalite = MODALITES[session.modalite] || MODALITES.elearning;
  return `
    <div class="kpi-session-card" data-session-id="${session.id}">
      <div class="kpi-session-card__header" style="--modalite-color:${modalite.color}">
        <span class="kpi-session-card__modalite">${modalite.label}</span>
        <span class="kpi-session-card__statut kpi-session-card__statut--${session.statut}">${session.statut}</span>
      </div>
      <div class="kpi-session-card__body">
        <h3>${session.titre}</h3>
        <div class="kpi-session-card__actions">
          <a href="#/session/${session.id}" class="kpi-btn kpi-btn--primary kpi-btn--sm">Gérer la session</a>
        </div>
      </div>
    </div>
  `;
}

async function _createSession(container) {
  const profile  = store.getProfile();
  const sequences = store.get('sequences');

  const { data: cohortes } = await supabase
    .from('lms_cohortes')
    .select('id, nom')
    .order('nom');

  // Modal de création simple
  const modal = document.createElement('div');
  modal.className = 'kpi-modal-overlay';
  modal.innerHTML = `
    <div class="kpi-modal">
      <h2>Nouvelle session</h2>
      <label>Titre
        <input type="text" class="kpi-input" id="session-titre" value="Session KPI — ${new Date().toLocaleDateString('fr')}">
      </label>
      <label>Cohorte
        <select class="kpi-input" id="session-cohorte">
          <option value="">— Libre (sans cohorte) —</option>
          ${(cohortes||[]).map(c => `<option value="${c.id}">${c.nom}</option>`).join('')}
        </select>
      </label>
      <label>Modalité
        <select class="kpi-input" id="session-modalite">
          ${Object.entries(MODALITES).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
        </select>
      </label>
      <div class="kpi-modal__footer">
        <button class="kpi-btn kpi-btn--ghost" id="btn-modal-cancel">Annuler</button>
        <button class="kpi-btn kpi-btn--primary" id="btn-modal-create">Créer</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById('btn-modal-cancel')?.addEventListener('click', () => modal.remove());
  document.getElementById('btn-modal-create')?.addEventListener('click', async () => {
    const titre     = document.getElementById('session-titre')?.value.trim() || 'Session KPI';
    const cohorteId = document.getElementById('session-cohorte')?.value || null;
    const modalite  = document.getElementById('session-modalite')?.value || 'elearning';

    const { data: session, error } = await supabase.from('kpi_sessions').insert({
      titre, modalite,
      formateur_id: profile.id,
      cohorte_id:   cohorteId || null,
      statut:       'planifiee',
    }).select().single();

    modal.remove();
    if (!error && session) {
      window.location.hash = `#/session/${session.id}`;
    }
  });
}

// ── View : Session live ──────────────────────────────────────────────

async function viewSession(container, sessionId) {
  const { data: session, error } = await supabase
    .from('kpi_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    container.innerHTML = `<div class="kpi-error">Session introuvable. <a href="#/map">Retour</a></div>`;
    return;
  }

  store.set('session', session);
  const isFormateur = store.isFormateur();
  const modalite    = MODALITES[session.modalite] || MODALITES.elearning;

  container.innerHTML = `
    <div class="kpi-session-view" data-modalite="${session.modalite}">
      <div class="kpi-session-view__header" style="--modalite-color:${modalite.color}">
        <div class="kpi-session-view__info">
          <h1>${session.titre}</h1>
          <div class="kpi-session-view__meta">
            <span class="kpi-badge" style="background:${modalite.color}">${modalite.label}</span>
            <span class="kpi-session-view__online" id="session-online">● 1 en ligne</span>
          </div>
        </div>
        ${isFormateur ? `
          <div class="kpi-session-view__controls">
            <select class="kpi-input kpi-input--sm" id="ctrl-modalite">
              ${Object.entries(MODALITES).map(([k,v]) =>
                `<option value="${k}" ${k===session.modalite?'selected':''}>${v.label}</option>`
              ).join('')}
            </select>
            <button class="kpi-btn kpi-btn--sm kpi-btn--danger" id="btn-attention">⚡ Attention</button>
            <button class="kpi-btn kpi-btn--sm kpi-btn--primary" id="btn-timer">⏱ Timer</button>
          </div>
        ` : ''}
      </div>

      ${isFormateur ? _renderFormateurPanel(session) : _renderStagiairePanel(session)}
    </div>
  `;

  // Rejoindre le canal Realtime
  joinSessionRealtime(sessionId, {
    onSessionUpdate: (s) => _updateSessionView(container, s),
    onPresence:      (users) => {
      const el = document.getElementById('session-online');
      if (el) el.textContent = `● ${users.length} en ligne`;
    },
    onNewReponse: isFormateur ? (r) => _appendReponseToList(r) : null,
  });

  if (isFormateur) {
    // Changement de modalité
    document.getElementById('ctrl-modalite')?.addEventListener('change', async (e) => {
      await changeModalite(sessionId, e.target.value);
    });
    document.getElementById('btn-attention')?.addEventListener('click', () => {
      sendBroadcast(sessionId, 'attention', { message: 'Attention requise' });
    });
    document.getElementById('btn-timer')?.addEventListener('click', () => {
      sendBroadcast(sessionId, 'timer_start', { minutes: 10 });
    });
  }
}

function _renderFormateurPanel(session) {
  const sequences = store.get('sequences');
  return `
    <div class="kpi-formateur-panel">
      <div class="kpi-formateur-panel__col">
        <h3>Séances & activités</h3>
        <div class="kpi-formateur-panel__seances">
          ${sequences.map(seq => (seq.kpi_seances||[]).map(se => `
            <div class="kpi-formateur-seance">
              <strong>${se.code} — ${se.titre}</strong>
              <div class="kpi-formateur-acts">
                ${(se.kpi_activites||[]).map(a => `
                  <button class="kpi-btn kpi-btn--sm kpi-btn--ghost kpi-formateur-act-btn"
                          data-activite-id="${a.id}" title="${a.titre}">
                    ${_typeIcon(a.type)} ${a.code}
                  </button>
                `).join('')}
              </div>
            </div>
          `).join('')).join('')}
        </div>
      </div>
      <div class="kpi-formateur-panel__col">
        <h3>Réponses reçues</h3>
        <div id="formateur-reponses">
          <p class="kpi-placeholder">En attente de réponses…</p>
        </div>
        <div id="formateur-online-users"></div>
      </div>
    </div>
  `;
}

function _renderStagiairePanel(session) {
  return `
    <div class="kpi-stagiaire-panel">
      <div class="kpi-stagiaire-panel__waiting" id="stagiaire-waiting">
        <div class="kpi-spinner kpi-spinner--lg"></div>
        <p>En attente de l'activité…</p>
        <p class="kpi-stagiaire-panel__hint">Le formateur va lancer l'activité.</p>
      </div>
      <div class="kpi-stagiaire-panel__content" id="stagiaire-content" hidden></div>
    </div>
  `;
}

function _appendReponseToList(reponse) {
  const container = document.getElementById('formateur-reponses');
  if (!container) return;
  if (container.querySelector('.kpi-placeholder')) container.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'kpi-reponse-card';
  card.dataset.reponseId = reponse.id;
  card.innerHTML = `
    <div class="kpi-reponse-card__content">
      <span class="kpi-reponse-card__status kpi-reponse-card__status--${reponse.statut}">${reponse.statut}</span>
      <p>${typeof reponse.contenu === 'string' ? reponse.contenu : JSON.stringify(reponse.contenu).slice(0,100)}</p>
    </div>
    <div class="kpi-reponse-card__actions">
      <button class="kpi-btn kpi-btn--sm kpi-btn--primary" data-action="share" data-id="${reponse.id}">Partager</button>
      <button class="kpi-btn kpi-btn--sm kpi-btn--ghost"   data-action="hide"  data-id="${reponse.id}">Masquer</button>
    </div>
  `;

  card.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const statut = btn.dataset.action === 'share' ? 'shared' : 'hidden';
      await supabase.from('kpi_reponses')
        .update({ statut, moderated_at: new Date().toISOString() })
        .eq('id', btn.dataset.id);
      card.querySelector('.kpi-reponse-card__status').textContent = statut;
      card.querySelector('.kpi-reponse-card__status').className = `kpi-reponse-card__status kpi-reponse-card__status--${statut}`;
    });
  });

  container.prepend(card);
}

function _updateSessionView(container, session) {
  // Mise à jour du badge modalité
  _updateModaliteBadge(session.modalite);

  // Si nouvelle activité courante → charger pour les stagiaires
  if (!store.isFormateur() && session.activite_active_id) {
    const waiting = document.getElementById('stagiaire-waiting');
    const content = document.getElementById('stagiaire-content');
    if (waiting) waiting.hidden = true;
    if (content) {
      content.hidden = false;
      viewActivite(content, session.activite_active_id);
    }
  }
}

// ── View : Profil ─────────────────────────────────────────────────────

async function viewProfil(container) {
  const profile    = store.getProfile();
  const kpiProfile = store.getKpiProfile();
  const niveaux    = store.get('niveaux');
  const monNiveau  = niveaux.find(n => n.id === kpiProfile?.niveau_id);
  const progression = store.get('progression');
  const doneCount  = Object.values(progression).filter(p => p.statut === 'termine').length;

  container.innerHTML = `
    <div class="kpi-profil">
      <div class="kpi-profil__card">
        <div class="kpi-profil__avatar" style="background:${monNiveau?.couleur || '#6366f1'}">
          ${(profile.prenom[0] + profile.nom[0]).toUpperCase()}
        </div>
        <div class="kpi-profil__info">
          <h1>${profile.prenom} ${profile.nom}</h1>
          <span class="kpi-badge" style="background:${monNiveau?.couleur}">${monNiveau?.label || 'Non évalué'}</span>
          <p class="kpi-profil__desc">${monNiveau?.description || ''}</p>
        </div>
      </div>
      <div class="kpi-profil__stats">
        <div class="kpi-stat-card">
          <div class="kpi-stat-card__value">${kpiProfile?.score_diagnostic || '—'}%</div>
          <div class="kpi-stat-card__label">Score diagnostic</div>
        </div>
        <div class="kpi-stat-card">
          <div class="kpi-stat-card__value">${doneCount}</div>
          <div class="kpi-stat-card__label">Activités terminées</div>
        </div>
        <div class="kpi-stat-card">
          <div class="kpi-stat-card__value">${Object.values(progression).reduce((a,p) => a + (p.tentatives||0), 0)}</div>
          <div class="kpi-stat-card__label">Tentatives totales</div>
        </div>
      </div>
      ${!kpiProfile?.completed_diagnostic_at ? `
        <div class="kpi-profil__diagnostic-cta">
          <p>Vous n'avez pas encore fait le test de positionnement.</p>
          <a href="#/diagnostic" class="kpi-btn kpi-btn--primary">Faire le diagnostic</a>
        </div>
      ` : ''}
      <div class="kpi-profil__niveaux">
        <h2>Niveaux andragogiques</h2>
        <div class="kpi-niveaux-list">
          ${niveaux.map(n => `
            <div class="kpi-niveau-item ${n.id === kpiProfile?.niveau_id ? 'kpi-niveau-item--active' : ''}" style="--n-color:${n.couleur}">
              <span class="kpi-niveau-item__dot"></span>
              <span class="kpi-niveau-item__label">${n.label}</span>
              <span class="kpi-niveau-item__desc">${n.description}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── Helpers communs ────────────────────────────────────────────────────

async function _submitReponse(activite, contenu, partageClasse = false) {
  const profile = store.getProfile();
  const session = store.getSession();
  if (!profile) return;

  const { error } = await supabase.from('kpi_reponses').insert({
    profile_id:  profile.id,
    activite_id: activite.id,
    session_id:  session?.id || null,
    contenu,
    statut:      partageClasse ? 'pending' : 'approved',
  });

  if (!error && partageClasse) {
    store.addNotification({
      type: 'sent',
      text: '✅ Réponse envoyée — en attente de validation du formateur',
    });
  }
}

async function _saveProgress(activiteId, score, passed, reponse) {
  const profile = store.getProfile();
  if (!profile) return;

  const statut = passed ? 'termine' : 'echec';
  const prog   = store.getProgressionForActivite(activiteId);

  const { data } = await supabase.from('kpi_activite_progress').upsert({
    profile_id:     profile.id,
    activite_id:    activiteId,
    statut,
    score,
    tentatives:     (prog?.tentatives || 0) + 1,
    reponse_finale: reponse,
    completed_at:   passed ? new Date().toISOString() : null,
  }, { onConflict: 'profile_id,activite_id' }).select().single();

  if (data) store.setProgression(activiteId, data);
}

function _updateModaliteBadge(modalite) {
  const badge = document.getElementById('badge-modalite');
  if (!badge) return;
  const m = MODALITES[modalite];
  if (!m) { badge.textContent = ''; return; }
  badge.textContent = m.label;
  badge.style.background = m.color;
}

function _renderGuideMessages(messages) {
  const el = document.getElementById('kpi-guide-messages');
  if (!el) return;
  el.innerHTML = messages.map(m => `
    <div class="kpi-guide-msg kpi-guide-msg--${m.type}">
      ${m.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
    </div>
  `).join('');
  el.scrollTop = el.scrollHeight;
}

function _renderNotifications(notifs) {
  const el = document.getElementById('kpi-notifications');
  if (!el) return;
  const recent = notifs.filter(n => Date.now() - n.ts.getTime() < 5000);
  el.innerHTML = recent.map(n => `
    <div class="kpi-notif kpi-notif--${n.type}">${n.text}</div>
  `).join('');
}

function _typeLabel(type) {
  const labels = {
    quiz: 'Quiz', drag_drop: 'Tri', text_input: 'Rédaction',
    csv_import: 'Import CSV', simulator: 'Simulateur', synthese: 'Synthèse', saynete: 'Saynète',
  };
  return labels[type] || type;
}

// ── Diagnostic questions ───────────────────────────────────────────

function _getDiagnosticQuestions() {
  return [
    { theme: 'Fondamentaux', niveau_min: 'neophyte', texte: 'Un KPI est toujours exprimé en pourcentage.', options: [{texte:'Vrai',correct:false},{texte:'Faux',correct:true}] },
    { theme: 'Fondamentaux', niveau_min: 'neophyte', texte: 'KPI signifie :', options: [{texte:'Key Performance Index',correct:false},{texte:'Key Performance Indicator',correct:true},{texte:'Key Process Integration',correct:false},{texte:'Knowledge Performance Index',correct:false}] },
    { theme: 'Méthode SMART', niveau_min: 'debutant', texte: 'Dans SMART, la lettre M signifie :', options: [{texte:'Manageable',correct:false},{texte:'Mesurable',correct:true},{texte:'Motivant',correct:false},{texte:'Méthodique',correct:false}] },
    { theme: 'Méthode SMART', niveau_min: 'debutant', texte: '"Améliorer les ventes" est un objectif SMART.', options: [{texte:'Vrai',correct:false},{texte:'Faux',correct:true}] },
    { theme: 'Données', niveau_min: 'debutant', texte: 'Un fichier CSV est :', options: [{texte:'Un fichier de traitement de texte',correct:false},{texte:'Un fichier de données tabulaires séparées par des virgules',correct:true},{texte:'Un fichier image',correct:false},{texte:'Un format de base de données',correct:false}] },
    { theme: 'Données', niveau_min: 'intermediaire', texte: 'Quelle est la formule du taux de turnover ?', options: [{texte:'Départs / Effectif fin × 100',correct:false},{texte:'((Départs + Arrivées) / 2) / Effectif moyen × 100',correct:true},{texte:'Arrivées / Départs × 100',correct:false},{texte:'Départs × Effectif / 100',correct:false}] },
    { theme: 'Base de données', niveau_min: 'debutant', texte: 'Une clé primaire est :', options: [{texte:'Un mot de passe',correct:false},{texte:'Un identifiant unique pour chaque ligne',correct:true},{texte:'Un champ obligatoire',correct:false},{texte:'Le premier champ de la table',correct:false}] },
    { theme: 'Visualisation', niveau_min: 'intermediaire', texte: 'Pour afficher une évolution dans le temps, on utilise :', options: [{texte:'Un camembert',correct:false},{texte:'Une courbe',correct:true},{texte:'Un tableau',correct:false},{texte:'Une jauge',correct:false}] },
    { theme: 'Visualisation', niveau_min: 'intermediaire', texte: 'Un camembert est adapté quand il y a plus de 7 catégories.', options: [{texte:'Vrai',correct:false},{texte:'Faux',correct:true}] },
    { theme: 'RGPD', niveau_min: 'debutant', texte: 'Les données de salaire sont des données personnelles sensibles.', options: [{texte:'Vrai',correct:true},{texte:'Faux',correct:false}] },
    { theme: 'Formule', niveau_min: 'intermediaire', texte: 'L\'effectif moyen entre début d\'année (100 sal.) et fin d\'année (120 sal.) est :', options: [{texte:'100',correct:false},{texte:'110',correct:true},{texte:'120',correct:false},{texte:'220',correct:false}] },
    { theme: 'Dashboard', niveau_min: 'avance', texte: 'Un dashboard efficace répond à plusieurs questions complexes simultanément.', options: [{texte:'Vrai',correct:false},{texte:'Faux — il répond à 1 objectif clair',correct:true}] },
    { theme: 'Types', niveau_min: 'intermediaire', texte: 'Le type de donnée correct pour un salaire est :', options: [{texte:'TEXT',correct:false},{texte:'INTEGER',correct:false},{texte:'DECIMAL',correct:true},{texte:'BOOLEAN',correct:false}] },
    { theme: 'Analyse', niveau_min: 'avance', texte: 'Un taux d\'absentéisme de 3% est TOUJOURS un bon résultat.', options: [{texte:'Vrai',correct:false},{texte:'Faux — il faut un benchmark de référence',correct:true}] },
    { theme: 'Expert', niveau_min: 'expert', texte: 'La corrélation entre deux variables numériques se visualise avec :', options: [{texte:'Un camembert',correct:false},{texte:'Un nuage de points',correct:true},{texte:'Une courbe de tendance',correct:false},{texte:'Un histogramme',correct:false}] },
  ];
}

// ── Démarrage ──────────────────────────────────────────────────────

boot();
