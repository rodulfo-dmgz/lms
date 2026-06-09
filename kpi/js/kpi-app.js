/**
 * kpi-app.js — Orchestrateur principal de la SPA KPI
 * Routing hash :
 * #/map        → Carte des missions
 * #/diagnostic → Quiz de positionnement
 * #/activite/:id → Activité
 * #/session/:id  → Session live
 * #/formateur    → Console formateur
 * #/profil       → Mon profil
 */

import { requireAuth, onAuthStateChange, supabase } from './kpi-auth.js';
import { store } from './kpi-store.js';
import { Guide } from './guide.js';
import { MODALITES } from './kpi-config.js';
import { joinSessionRealtime, leaveSession, changeModalite, sendBroadcast } from './kpi-realtime.js';

// ── Helper Phosphor Icons ────────────────────────────────────────
// Mappe les anciens noms Lucide/DB vers Phosphor quand nécessaire
const _ICON_MAP = {
  'table-2':          'table',
  'layout-dashboard': 'squares-four',
  'layout':           'squares-four',
  'bar-chart-2':      'chart-bar',
  'trending-up':      'trend-up',
  'pie-chart':        'chart-pie',
  'type':             'text-t',
  'video':            'video-camera',
  'monitor':          'desktop',
  'sprout':           'plant',
  'zap':              'lightning',
  'layers':           'stack',
  'user-check':       'user-check',
  'bell':             'bell',
  'book-open':        'book-open',
};

/** Retourne du HTML pour une icône Phosphor
 * @param {string} name  - nom Phosphor ou Lucide (mappé automatiquement)
 * @param {string} weight - 'regular'|'fill'|'bold'|'duotone'
 */
function ph(name, weight = 'regular') {
  const mapped = _ICON_MAP[name] || name;
  const cls = weight === 'fill'   ? 'ph-fill'
            : weight === 'bold'   ? 'ph-bold'
            : weight === 'duotone'? 'ph-duotone'
            : 'ph';
  return `<i class="${cls} ph-${mapped}" aria-hidden="true"></i>`;
}

// ── Boot ─────────────────────────────────────────────────────────

async function boot() {
  const auth = await requireAuth();
  if (!auth) return; // login form affiché par requireAuth()

  const { profile, kpiProfile } = auth;
  store.set('profile', profile);
  store.set('kpiProfile', kpiProfile);

  await _loadReferenceData();

  Guide.init(profile, { ...kpiProfile, niveau_slug: _getNiveauSlug(kpiProfile?.niveau_id) });

  onAuthStateChange(() => {});
  _mountApp();
  _route(window.location.hash || '#/map');
  window.addEventListener('hashchange', () => _route(window.location.hash));
}

async function _loadReferenceData() {
  const [{ data: niveaux }, { data: sequences }] = await Promise.all([
    supabase.from('kpi_niveaux').select('*').order('ordre'),
    supabase.from('kpi_sequences').select('*, kpi_seances(*, kpi_activites(*))').eq('is_active', true).order('ordre'),
  ]);

  store.set('niveaux', niveaux || []);
  store.set('sequences', sequences || []);

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
  return store.get('niveaux').find(n => n.id === niveauId)?.slug || 'neophyte';
}

// ── Mount App ────────────────────────────────────────────────────

function _mountApp() {
  const app     = document.getElementById('kpi-app');
  const profile = store.getProfile();
  const initials = (profile.prenom[0] + profile.nom[0]).toUpperCase();

  app.innerHTML = `
    <header class="kpi-header" id="kpi-header">
      <div class="kpi-header__brand">
        ${ph('chart-bar', 'fill')}
        <span class="kpi-header__title">KPI Lab</span>
        <span class="kpi-badge-modalite" id="badge-modalite"></span>
      </div>
      <nav class="kpi-header__nav">
        <a href="#/map" class="kpi-nav-link" data-route="map">
          ${ph('map-trifold')} Missions
        </a>
        ${store.isFormateur() ? `
        <a href="#/formateur" class="kpi-nav-link" data-route="formateur">
          ${ph('monitor-play')} Console
        </a>` : ''}
        <a href="#/profil" class="kpi-nav-link" data-route="profil">
          ${ph('user-circle')} Profil
        </a>
      </nav>
      <div class="kpi-header__actions">
        <button class="kpi-btn kpi-btn--ghost kpi-btn--sm kpi-btn--icon" id="btn-guide-toggle" title="Guide pédagogique">
          ${ph('lightbulb', 'bold')}
        </button>
        <div class="kpi-avatar" title="${profile.prenom} ${profile.nom}">${initials}</div>
      </div>
    </header>

    <div class="kpi-notifications" id="kpi-notifications"></div>

    <main class="kpi-main" id="kpi-main">
      <div class="kpi-loading"><div class="kpi-spinner"></div></div>
    </main>

    <aside class="kpi-guide-panel" id="kpi-guide-panel" aria-hidden="true">
      <div class="kpi-guide-panel__header">
        ${ph('lightbulb', 'fill')}
        <span class="kpi-guide-panel__title">Guide pédagogique</span>
        <button class="kpi-btn kpi-btn--ghost kpi-btn--sm kpi-btn--icon" id="btn-guide-close">${ph('x')}</button>
      </div>
      <div class="kpi-guide-messages" id="kpi-guide-messages"></div>
      <form class="kpi-guide-input" id="kpi-guide-form">
        <input type="text" class="kpi-input" id="kpi-guide-query"
               placeholder="Posez une question…" autocomplete="off">
        <button type="submit" class="kpi-btn kpi-btn--primary kpi-btn--sm">
          ${ph('paper-plane-right')}
        </button>
      </form>
    </aside>

    <div class="kpi-attention-overlay" id="kpi-attention-overlay" hidden>
      <div class="kpi-attention-card">
        <span class="kpi-attention-icon">${ph('lightning', 'fill')}</span>
        <p>Attention demandée par le formateur</p>
        <span style="font-size:12px;opacity:.6">Cliquez pour fermer</span>
      </div>
    </div>
  `;

  // Events
  document.getElementById('btn-guide-toggle').addEventListener('click', () => Guide.toggle());
  document.getElementById('btn-guide-close').addEventListener('click', () => Guide.close());

  document.getElementById('kpi-attention-overlay')?.addEventListener('click', () => {
    document.getElementById('kpi-attention-overlay').hidden = true;
  });

  document.getElementById('kpi-guide-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = document.getElementById('kpi-guide-query').value.trim();
    if (!q) return;
    document.getElementById('kpi-guide-query').value = '';
    await Guide.search(q);
  });

  // Réactivité
  store.subscribe('guideVisible', (v) => {
    const p = document.getElementById('kpi-guide-panel');
    p?.setAttribute('aria-hidden', String(!v));
    p?.classList.toggle('kpi-guide-panel--open', v);
  });
  store.subscribe('guideMessages', _renderGuideMessages);
  store.subscribe('notifications', _renderNotifications);
  store.subscribe('session', (s) => _updateModaliteBadge(s?.modalite));
}

// ── Router ───────────────────────────────────────────────────────

async function _route(hash) {
  const [path, ...rest] = (hash.replace('#/', '').split('/'));
  const param = rest.join('/');

  document.querySelectorAll('.kpi-nav-link').forEach(a =>
    a.classList.toggle('kpi-nav-link--active', a.dataset.route === path)
  );

  const main = document.getElementById('kpi-main');
  main.innerHTML = `<div class="kpi-loading"><div class="kpi-spinner"></div></div>`;

  switch (path) {
    case 'map': case '': await viewMissionMap(main); break;
    case 'diagnostic':   await viewDiagnostic(main); break;
    case 'activite':     await viewActivite(main, parseInt(param)); break;
    case 'session':      await viewSession(main, param); break;
    case 'formateur':    store.isFormateur() ? await viewFormateur(main) : _route('#/map'); break;
    case 'profil':       await viewProfil(main); break;
    default:             _route('#/map');
  }
}

// ── View : Carte des missions ────────────────────────────────────

async function viewMissionMap(container) {
  const kpiProfile  = store.getKpiProfile();
  const sequences   = store.get('sequences');
  const progression = store.get('progression');

  if (!kpiProfile?.completed_diagnostic_at) {
    container.innerHTML = `
      <div class="kpi-onboarding">
        <div class="kpi-onboarding__visual">
          <div class="kpi-onboarding__orbit">
            <div class="kpi-onboarding__planet">${ph('chart-bar', 'fill')}</div>
          </div>
        </div>
        <div class="kpi-onboarding__content">
          <h1 class="kpi-onboarding__title">Bienvenue dans le KPI Lab</h1>
          <p class="kpi-onboarding__desc">
            Avant de commencer votre parcours, faites un test rapide de positionnement.
            Il adaptera l'expérience à votre niveau.
          </p>
          <a href="#/diagnostic" class="kpi-btn kpi-btn--primary kpi-btn--lg">
            ${ph('rocket-launch')} Commencer le diagnostic
          </a>
        </div>
      </div>`;
    return;
  }

  const totalActs = sequences.reduce((a, s) =>
    a + (s.kpi_seances||[]).reduce((b, se) => b + (se.kpi_activites?.length||0), 0), 0);
  const doneActs  = Object.values(progression).filter(p => p.statut === 'termine').length;
  const globalPct = totalActs ? Math.round(doneActs / totalActs * 100) : 0;

  container.innerHTML = `
    <div class="kpi-map">
      <div class="kpi-map__header">
        <h1 class="kpi-map__title">Carte des missions</h1>
        <div class="kpi-map__progress-global">
          <span class="kpi-map__progress-label">${doneActs} / ${totalActs} activités</span>
          <div class="kpi-progress-bar">
            <div class="kpi-progress-bar__fill" style="width:${globalPct}%"></div>
          </div>
        </div>
      </div>
      <div class="kpi-map__sequences">
        ${sequences.map((seq, idx) => _renderSequenceCard(seq, idx, progression)).join('')}
      </div>
    </div>`;
}

function _renderSequenceCard(seq, idx, progression) {
  const seances  = (seq.kpi_seances||[]).sort((a,b) => a.ordre - b.ordre);
  const totalActs = seances.reduce((a, se) => a + (se.kpi_activites?.length||0), 0);
  const doneActs  = seances.reduce((a, se) =>
    a + (se.kpi_activites||[]).filter(ac => progression[ac.id]?.statut==='termine').length, 0);
  const pct    = totalActs ? Math.round(doneActs / totalActs * 100) : 0;
  const locked = idx > 0 && (() => {
    const prev = store.get('sequences')[idx - 1];
    const pTotal = (prev?.kpi_seances||[]).reduce((a,s) => a+(s.kpi_activites?.length||0),0);
    const pDone  = (prev?.kpi_seances||[]).reduce((a,s) =>
      a+(s.kpi_activites||[]).filter(ac=>progression[ac.id]?.statut==='termine').length,0);
    return pTotal > 0 && pDone < Math.ceil(pTotal * 0.7);
  })();

  return `
    <div class="kpi-seq-card${locked?' kpi-seq-card--locked':''}" style="--seq-color:${seq.couleur}">
      <div class="kpi-seq-card__header">
        <div class="kpi-seq-card__icon-wrap">${ph(seq.icon||'stack')}</div>
        <div class="kpi-seq-card__meta">
          <div class="kpi-seq-card__code">${seq.code}</div>
          <h2 class="kpi-seq-card__title">${seq.titre}</h2>
          <div class="kpi-seq-card__duree">${ph('clock')} ${seq.duree_heures}h</div>
        </div>
        ${locked ? `<div class="kpi-seq-card__lock">${ph('lock', 'fill')}</div>` : ''}
      </div>
      ${!locked ? `
        <div class="kpi-seq-card__progress">
          <div class="kpi-progress-bar kpi-progress-bar--sm" style="flex:1">
            <div class="kpi-progress-bar__fill" style="width:${pct}%;background:${seq.couleur}"></div>
          </div>
          <span class="kpi-seq-card__pct">${pct}%</span>
        </div>
        <div class="kpi-seq-card__seances">
          ${seances.map(se => _renderSeanceItem(se, progression)).join('')}
        </div>
      ` : `<p class="kpi-seq-card__locked-msg">Complétez 70% de la séquence précédente pour débloquer.</p>`}
    </div>`;
}

function _renderSeanceItem(seance, progression) {
  const acts   = (seance.kpi_activites||[]).sort((a,b) => a.ordre - b.ordre);
  const done   = acts.filter(a => progression[a.id]?.statut==='termine').length;
  const total  = acts.length;
  const allDone = done === total && total > 0;

  const statusIcon = allDone
    ? ph('check-circle', 'fill')
    : done > 0
    ? `<span style="animation:kpi-spin 2s linear infinite;display:inline-block">${ph('arrows-clockwise')}</span>`
    : ph('circle');

  return `
    <div class="kpi-seance-item${allDone?' kpi-seance-item--done':''}">
      <div class="kpi-seance-item__header">
        <span class="kpi-seance-item__status">${statusIcon}</span>
        <span class="kpi-seance-item__code">${seance.code}</span>
        <span class="kpi-seance-item__titre">${seance.titre}</span>
        <span class="kpi-seance-item__count">${done}/${total}</span>
      </div>
      <div class="kpi-seance-item__activites">
        ${acts.map(a => `
          <a href="#/activite/${a.id}"
             class="kpi-act-chip
               ${progression[a.id]?.statut==='termine' ? 'kpi-act-chip--done' : ''}
               ${progression[a.id]?.statut==='en_cours' ? 'kpi-act-chip--active' : ''}"
             title="${a.titre}">
            ${_typeIcon(a.type)}
          </a>`).join('')}
      </div>
    </div>`;
}

function _typeIcon(type) {
  const icons = {
    quiz:         'question',
    drag_drop:    'arrows-down-up',
    text_input:   'pencil-simple',
    csv_import:   'file-csv',
    simulator:    'sliders',
    carte_mentale:'brain',
    saynete:      'theater-masks',
    synthese:     'clipboard-text',
  };
  return ph(icons[type] || 'play');
}

function _typeLabel(type) {
  return { quiz:'Quiz', drag_drop:'Tri', text_input:'Rédaction',
           csv_import:'Import CSV', simulator:'Simulateur',
           synthese:'Synthèse', saynete:'Saynète' }[type] || type;
}

// ── View : Diagnostic ────────────────────────────────────────────

async function viewDiagnostic(container) {
  const questions = _getDiagnosticQuestions();
  let current = 0;
  const answers = [];

  function renderQ(idx) {
    const q = questions[idx];
    container.innerHTML = `
      <div class="kpi-diagnostic">
        <div class="kpi-diagnostic__header">
          <h1>${ph('map-pin', 'fill')} Test de positionnement</h1>
          <div class="kpi-diagnostic__progress">
            <div class="kpi-progress-bar" style="flex:1">
              <div class="kpi-progress-bar__fill" style="width:${idx/questions.length*100}%"></div>
            </div>
            <span>${idx + 1} / ${questions.length}</span>
          </div>
        </div>
        <div class="kpi-diagnostic__card">
          <p class="kpi-diagnostic__theme">${ph('tag')} ${q.theme}</p>
          <h2 class="kpi-diagnostic__question">${q.texte}</h2>
          <div class="kpi-diagnostic__options">
            ${q.options.map((opt, i) => `
              <button class="kpi-diag-opt" data-idx="${i}" data-correct="${opt.correct}">${opt.texte}</button>
            `).join('')}
          </div>
        </div>
      </div>`;

    container.querySelectorAll('.kpi-diag-opt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const correct = btn.dataset.correct === 'true';
        answers.push({ correct });
        container.querySelectorAll('.kpi-diag-opt').forEach(b => {
          b.disabled = true;
          if (b.dataset.correct === 'true') b.classList.add('kpi-diag-opt--correct');
          else if (b === btn && !correct) b.classList.add('kpi-diag-opt--wrong');
        });
        await new Promise(r => setTimeout(r, 900));
        current++;
        if (current < questions.length) renderQ(current);
        else await _finishDiagnostic(container, answers);
      });
    });
  }
  renderQ(0);
}

async function _finishDiagnostic(container, answers) {
  const correct = answers.filter(a => a.correct).length;
  const pct     = Math.round(correct / answers.length * 100);
  const niveau  = pct<=20?'eillettrisme':pct<=40?'neophyte':pct<=55?'debutant':pct<=70?'intermediaire':pct<=85?'avance':'expert';
  const niveauData = store.get('niveaux').find(n => n.slug === niveau);

  const profile = store.getProfile();
  if (profile) {
    await supabase.from('kpi_student_profile').upsert({
      profile_id: profile.id,
      niveau_id:  niveauData?.id,
      score_diagnostic: pct,
      completed_diagnostic_at: new Date().toISOString(),
    });
    store.set('kpiProfile', { ...store.getKpiProfile(), niveau_id: niveauData?.id, score_diagnostic: pct });
  }

  container.innerHTML = `
    <div class="kpi-diagnostic-result">
      <div class="kpi-diagnostic-result__circle" style="--niveau-color:${niveauData?.couleur||'#6366f1'}">
        <span class="kpi-diagnostic-result__score">${pct}%</span>
      </div>
      <h1 class="kpi-diagnostic-result__niveau" style="color:${niveauData?.couleur}">${niveauData?.label||niveau}</h1>
      <p class="kpi-diagnostic-result__desc">${niveauData?.description||''}</p>
      <a href="#/map" class="kpi-btn kpi-btn--primary kpi-btn--lg">
        ${ph('map-trifold')} Découvrir mes missions
      </a>
    </div>`;

  Guide.celebrate(pct, 50);
}

// ── View : Activité ──────────────────────────────────────────────

async function viewActivite(container, activiteId) {
  if (!activiteId) { _route('#/map'); return; }

  let activite = null;
  for (const seq of store.get('sequences')) {
    for (const seance of (seq.kpi_seances||[])) {
      activite = (seance.kpi_activites||[]).find(a => a.id === activiteId);
      if (activite) { activite._seance = seance; activite._sequence = seq; break; }
    }
    if (activite) break;
  }

  if (!activite) {
    container.innerHTML = `<div class="kpi-error">${ph('warning')} Activité introuvable. <a href="#/map">Retour</a></div>`;
    return;
  }

  store.set('activiteCourante', activite);
  Guide.introduceActivite(activite);

  const profile = store.getProfile();
  if (profile && !store.getProgressionForActivite(activiteId)?.completed_at) {
    supabase.from('kpi_activite_progress').upsert({
      profile_id: profile.id, activite_id: activiteId,
      statut: 'en_cours', started_at: new Date().toISOString(),
    }, { onConflict: 'profile_id,activite_id' });
  }

  container.innerHTML = `
    <div class="kpi-activite-view">
      <div class="kpi-activite-view__breadcrumb">
        <a href="#/map">${ph('map-trifold')} Missions</a>
        <span>${ph('caret-right')}</span>
        <span>${activite._sequence?.code}</span>
        <span>${ph('caret-right')}</span>
        <span>${activite._seance?.titre}</span>
      </div>
      <div class="kpi-activite-view__header">
        <div class="kpi-activite-view__type-badge">${_typeIcon(activite.type)} ${_typeLabel(activite.type)}</div>
        <h1 class="kpi-activite-view__titre">${activite.titre}</h1>
        <p class="kpi-activite-view__desc">${activite.description||''}</p>
      </div>
      <div class="kpi-activite-view__body" id="activite-body"></div>
      <div class="kpi-activite-view__footer">
        <button class="kpi-btn kpi-btn--ghost" id="btn-indice">
          ${ph('lightbulb', 'bold')} Indice (${activite.indices?.length||0})
        </button>
        <a href="#/map" class="kpi-btn kpi-btn--secondary">${ph('arrow-left')} Carte</a>
      </div>
    </div>`;

  document.getElementById('btn-indice')?.addEventListener('click', () => Guide.giveIndice(activite));
  await _renderActiviteBody(document.getElementById('activite-body'), activite);
}

async function _renderActiviteBody(container, activite) {
  switch (activite.type) {
    case 'quiz':        await renderQuiz(container, activite);      break;
    case 'drag_drop':   await renderDragDrop(container, activite);  break;
    case 'text_input':  await renderTextInput(container, activite); break;
    case 'simulator':   await renderSimulator(container, activite); break;
    case 'csv_import':  await renderCsvImport(container, activite); break;
    case 'synthese':    await renderSynthese(container, activite);  break;
    case 'saynete':     await renderSaynete(container, activite);   break;
    default: container.innerHTML = `<p class="kpi-placeholder">Type "${activite.type}" — à venir.</p>`;
  }
}

// ── Widget : Quiz ────────────────────────────────────────────────

async function renderQuiz(container, activite) {
  const { contenu } = activite;
  const questions = contenu.questions || [];
  const seuilReussite = contenu.seuil_reussite || activite.seuil_reussite || 70;
  let current = 0;
  const answers = [];

  function renderQ(idx) {
    if (idx >= questions.length) { _showQuizResults(); return; }
    const q = questions[idx];

    container.innerHTML = `
      <div class="kpi-quiz">
        <div class="kpi-quiz__progress">
          <div class="kpi-progress-bar kpi-progress-bar--sm" style="flex:1">
            <div class="kpi-progress-bar__fill" style="width:${idx/questions.length*100}%"></div>
          </div>
          <span>${idx+1} / ${questions.length}</span>
        </div>
        <div class="kpi-quiz__card">
          <p class="kpi-quiz__question">${q.texte}</p>
          <div class="kpi-quiz__options" id="quiz-options">
            ${q.type==='vrai_faux' ? `
              <button class="kpi-quiz-opt" data-answer="true">${ph('check-circle')} Vrai</button>
              <button class="kpi-quiz-opt" data-answer="false">${ph('x-circle')} Faux</button>
            ` : q.type==='qcm' ? q.options.map((opt,i) => `
              <button class="kpi-quiz-opt" data-answer="${i}">${opt}</button>
            `).join('') : `
              <input type="number" class="kpi-input" id="calc-answer" step="0.01" placeholder="Votre réponse…">
              <button class="kpi-btn kpi-btn--primary" id="btn-calc-submit">${ph('check')} Valider</button>
            `}
          </div>
          ${q.explication ? `<div class="kpi-quiz__explication" id="quiz-explication" hidden>
            ${ph('info', 'fill')} ${q.explication}</div>` : ''}
        </div>
      </div>`;

    const checkAnswer = (userAnswer, correctAnswer) => {
      const isCorrect = String(userAnswer) === String(correctAnswer);
      answers.push({ correct: isCorrect });
      container.querySelectorAll('.kpi-quiz-opt').forEach(b => {
        b.disabled = true;
        if (String(b.dataset.answer) === String(correctAnswer)) b.classList.add('kpi-quiz-opt--correct');
        else if (String(b.dataset.answer) === String(userAnswer) && !isCorrect) b.classList.add('kpi-quiz-opt--wrong');
      });
      container.querySelector('#quiz-explication')?.removeAttribute('hidden');
      setTimeout(() => { current++; renderQ(current); }, 1400);
    };

    if (q.type === 'calcul') {
      document.getElementById('btn-calc-submit')?.addEventListener('click', () => {
        const val = parseFloat(document.getElementById('calc-answer')?.value);
        const ok  = Math.abs(val - q.reponse) <= (q.tolerance || 0);
        answers.push({ correct: ok });
        current++;
        setTimeout(() => renderQ(current), 900);
      });
    } else {
      container.querySelectorAll('.kpi-quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const ans = btn.dataset.answer === 'true' ? true
                    : btn.dataset.answer === 'false' ? false
                    : parseInt(btn.dataset.answer);
          checkAnswer(ans, q.reponse ?? q.reponse);
        });
      });
    }
  }

  function _showQuizResults() {
    const correct = answers.filter(a => a.correct).length;
    const score   = Math.round(correct / questions.length * 100);
    const passed  = score >= seuilReussite;

    container.innerHTML = `
      <div class="kpi-quiz-result ${passed?'kpi-quiz-result--pass':'kpi-quiz-result--fail'}">
        <div class="kpi-quiz-result__icon">${ph(passed?'trophy':'arrows-clockwise', 'fill')}</div>
        <div class="kpi-quiz-result__score">${score}%</div>
        <p class="kpi-quiz-result__msg">${passed?'Validé !':'À refaire'}</p>
        <p>${correct} / ${questions.length} bonnes réponses</p>
        ${!passed ? `<button class="kpi-btn kpi-btn--secondary" id="btn-retry">${ph('arrows-clockwise')} Recommencer</button>` : ''}
      </div>`;

    document.getElementById('btn-retry')?.addEventListener('click', () => {
      current = 0; answers.length = 0; renderQ(0);
    });
    _saveProgress(activite.id, score, passed, answers);
    Guide.celebrate(score, seuilReussite);
  }

  renderQ(0);
}

// ── Widget : Drag & Drop ─────────────────────────────────────────

async function renderDragDrop(container, activite) {
  const { contenu } = activite;
  const items    = contenu.items || [];
  const colonnes = contenu.colonnes || [];
  const shuffled = [...items].sort(() => Math.random() - 0.5);

  container.innerHTML = `
    <div class="kpi-drag">
      <p class="kpi-drag__consigne">${ph('info', 'fill')} ${contenu.consigne||''}</p>
      <div class="kpi-drag__bank" id="drag-bank">
        ${shuffled.map(item => `
          <div class="kpi-drag-item" draggable="true"
               data-id="${item.id}"
               data-correct="${item.categorie||item.graphique||item.usage||item.type||''}">
            ${item.texte||item.valeur||item.label||''}
          </div>`).join('')}
      </div>
      <div class="kpi-drag__zones">
        ${colonnes.map(col => `
          <div class="kpi-drag-zone" data-col="${col}">
            <div class="kpi-drag-zone__label">${ph('folder-open')} ${col.replace(/_/g,' ')}</div>
            <div class="kpi-drag-zone__items" id="items-${col}"></div>
          </div>`).join('')}
      </div>
      <button class="kpi-btn kpi-btn--primary kpi-drag__submit" id="btn-drag-submit">
        ${ph('check-circle')} Vérifier
      </button>
    </div>`;

  let dragged = null;
  container.querySelectorAll('.kpi-drag-item').forEach(item => {
    item.addEventListener('dragstart', () => { dragged = item; item.classList.add('kpi-dragging'); });
    item.addEventListener('dragend',   () => item.classList.remove('kpi-dragging'));
  });
  container.querySelectorAll('.kpi-drag-zone').forEach(zone => {
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('kpi-drag-zone--over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('kpi-drag-zone--over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('kpi-drag-zone--over');
      if (dragged) zone.querySelector('.kpi-drag-zone__items')?.appendChild(dragged);
    });
  });

  document.getElementById('btn-drag-submit')?.addEventListener('click', () => {
    let correct = 0;
    container.querySelectorAll('.kpi-drag-item').forEach(item => {
      const userZone = item.closest('.kpi-drag-zone')?.dataset.col;
      const expected = item.dataset.correct;
      const ok = userZone === expected;
      item.classList.toggle('kpi-drag-item--correct', ok);
      item.classList.toggle('kpi-drag-item--wrong', !ok && !!userZone);
      if (ok) correct++;
    });
    const score = Math.round(correct / items.length * 100);
    _saveProgress(activite.id, score, score >= (activite.seuil_reussite||75), null);
    Guide.celebrate(score, activite.seuil_reussite||75);
  });
}

// ── Widget : Text Input ──────────────────────────────────────────

async function renderTextInput(container, activite) {
  const { contenu } = activite;
  container.innerHTML = `
    <div class="kpi-text-input">
      ${contenu.contexte ? `<div class="kpi-text-input__context">${ph('books', 'fill')} ${contenu.contexte}</div>` : ''}
      <p class="kpi-text-input__consigne">${ph('pencil-simple', 'bold')} ${contenu.consigne||''}</p>
      <textarea class="kpi-textarea" id="text-response" rows="6"
                placeholder="${contenu.placeholder||'Votre réponse…'}"></textarea>
      <div class="kpi-text-input__footer">
        ${contenu.min_mots ? `<span class="kpi-text-input__count" id="word-count">0 / ${contenu.min_mots} mots min.</span>` : ''}
        <button class="kpi-btn kpi-btn--primary" id="btn-text-submit">
          ${ph('paper-plane-right')} Soumettre
        </button>
      </div>
    </div>`;

  const ta = document.getElementById('text-response');
  const counter = document.getElementById('word-count');
  ta?.addEventListener('input', () => {
    const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
    if (counter) {
      counter.textContent = `${words} / ${contenu.min_mots} mots min.`;
      counter.style.color = words >= (contenu.min_mots||0) ? 'var(--kpi-success)' : 'inherit';
    }
  });
  document.getElementById('btn-text-submit')?.addEventListener('click', async () => {
    const texte = ta?.value.trim();
    if (!texte) { ta?.classList.add('kpi-input--error'); return; }
    await _submitReponse(activite, { texte });
    _saveProgress(activite.id, 100, true, { texte });
    Guide.celebrate(100, 0);
  });
}

// ── Widget : Synthèse ────────────────────────────────────────────

async function renderSynthese(container, activite) {
  const { contenu } = activite;
  container.innerHTML = `
    <div class="kpi-synthese">
      <div class="kpi-synthese__points">
        ${(contenu.points||[]).map(p => `
          <div class="kpi-synthese__point">
            ${ph('check-circle', 'fill')}
            <span>${p}</span>
          </div>`).join('')}
      </div>
      ${contenu.completion ? `
        <div class="kpi-synthese__completion">
          <p class="kpi-synthese__completion-text">${contenu.completion.texte}</p>
          <input type="text" class="kpi-input" id="completion-answer"
                 placeholder="${contenu.completion.placeholder||''}">
          <button class="kpi-btn kpi-btn--primary" id="btn-completion-submit" style="margin-top:.5rem">
            ${ph('check')} Valider
          </button>
        </div>
      ` : `<button class="kpi-btn kpi-btn--primary" id="btn-synthese-done">
             ${ph('check-circle')} J'ai lu et compris
           </button>`}
    </div>`;

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

// ── Widget : Saynète ─────────────────────────────────────────────

async function renderSaynete(container, activite) {
  const { contenu } = activite;
  container.innerHTML = `
    <div class="kpi-saynete">
      <div class="kpi-saynete__scenario">
        <span class="kpi-saynete__scenario-icon">${ph('theater-masks', 'fill')}</span>
        <p>${contenu.scenario||''}</p>
      </div>
      ${contenu.personnages?.length ? `
        <div class="kpi-saynete__roles">
          ${ph('users')} <strong>Personnages :</strong>
          ${contenu.personnages.map(p => `<span class="kpi-role-chip">${p}</span>`).join('')}
        </div>` : ''}
      ${contenu.objectif ? `<p class="kpi-saynete__objectif">${ph('target', 'fill')} ${contenu.objectif}</p>` : ''}
      <textarea class="kpi-textarea" id="saynete-response" rows="5"
                placeholder="Décrivez votre réponse ou résumez les échanges…"></textarea>
      <div class="kpi-saynete__footer">
        ${contenu.partage_classe ? `
          <p class="kpi-saynete__partage-note">
            ${ph('broadcast')} Cette réponse sera partagée avec la classe après validation du formateur
          </p>` : ''}
        <button class="kpi-btn kpi-btn--primary" id="btn-saynete-submit">
          ${ph('paper-plane-right')} Envoyer
        </button>
      </div>
    </div>`;

  document.getElementById('btn-saynete-submit')?.addEventListener('click', async () => {
    const texte = document.getElementById('saynete-response')?.value.trim();
    if (!texte) return;
    await _submitReponse(activite, { texte }, contenu.partage_classe);
    _saveProgress(activite.id, 100, true, { texte });
    Guide.celebrate(100, 0);
  });
}

// ── Widget : CSV Import ──────────────────────────────────────────

async function renderCsvImport(container, activite) {
  const { contenu } = activite;
  container.innerHTML = `
    <div class="kpi-csv">
      <p class="kpi-csv__consigne">${ph('file-csv', 'bold')} ${contenu.consigne||''}</p>
      <div class="kpi-csv__upload">
        <label class="kpi-csv__drop-zone" for="csv-file">
          <span class="kpi-csv__drop-icon">${ph('upload-simple', 'bold')}</span>
          <span>Glissez un fichier CSV ici ou cliquez pour importer</span>
          <input type="file" id="csv-file" accept=".csv,.xlsx" hidden>
        </label>
      </div>
      <div class="kpi-csv__preview" id="csv-preview"></div>
      ${(contenu.questions||[]).length ? `
        <div class="kpi-csv__questions" id="csv-questions">
          ${(contenu.questions||[]).map(q => `
            <div class="kpi-csv__question">
              <label>${ph('question')} ${q.texte}</label>
              <input type="${q.type==='nombre'?'number':'text'}" class="kpi-input"
                     data-qid="${q.id}" placeholder="Votre réponse…">
            </div>`).join('')}
          <button class="kpi-btn kpi-btn--primary" id="btn-csv-submit">
            ${ph('check-circle')} Valider mes réponses
          </button>
        </div>` : ''}
    </div>`;

  document.getElementById('csv-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text    = await file.text();
    const lines   = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
    const rows    = lines.slice(1, 6);
    document.getElementById('csv-preview').innerHTML = `
      <table class="kpi-table">
        <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r=>`<tr>${r.split(',').map(c=>`<td>${c.trim().replace(/^"|"$/g,'')}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <p class="kpi-csv__info">${ph('info')} ${lines.length-1} lignes importées. Aperçu des 5 premières.</p>`;
  });

  document.getElementById('btn-csv-submit')?.addEventListener('click', async () => {
    const answers = {};
    container.querySelectorAll('[data-qid]').forEach(inp => { answers[inp.dataset.qid] = inp.value.trim(); });
    await _submitReponse(activite, { answers });
    _saveProgress(activite.id, 100, true, answers);
    Guide.celebrate(100, 0);
  });
}

// ── Widget : Simulateur Dashboard ───────────────────────────────

async function renderSimulator(container, activite) {
  const { contenu } = activite;
  const { data: widgetsCat } = await supabase
    .from('kpi_widgets_catalogue').select('*').eq('is_active', true);
  const widgets = widgetsCat || [];
  let layout = [];

  // Map icônes DB (anciens noms) → Phosphor
  const _widgetIcon = (icon) => ph(_ICON_MAP[icon] || icon);

  container.innerHTML = `
    <div class="kpi-sim">
      <div class="kpi-sim__consigne">${ph('info', 'fill')} ${contenu.consigne||''}</div>
      ${contenu.contexte ? `<div class="kpi-sim__context">${ph('buildings', 'fill')} ${contenu.contexte}</div>` : ''}
      <div class="kpi-sim__workspace">
        <div class="kpi-sim__palette" id="sim-palette">
          <strong class="kpi-sim__palette-title">${ph('squares-four')} Widgets</strong>
          ${widgets.map(w => `
            <div class="kpi-sim-widget-pick" draggable="true"
                 data-code="${w.code}" data-type="${w.type}" title="${w.description||w.label}">
              ${_widgetIcon(w.icon)}
              <span class="kpi-sim-widget-pick__label">${w.label}</span>
            </div>`).join('')}
        </div>
        <div class="kpi-sim__canvas" id="sim-canvas">
          <p class="kpi-sim__canvas-hint">${ph('arrow-left')} Glissez des widgets pour construire votre dashboard</p>
        </div>
      </div>
      <div class="kpi-sim__footer">
        <button class="kpi-btn kpi-btn--secondary" id="btn-sim-clear">${ph('trash')} Réinitialiser</button>
        <button class="kpi-btn kpi-btn--primary" id="btn-sim-submit">${ph('paper-plane-right')} Soumettre</button>
      </div>
    </div>`;

  const canvas = document.getElementById('sim-canvas');

  container.querySelectorAll('.kpi-sim-widget-pick').forEach(pick => {
    pick.addEventListener('dragstart', e => {
      e.dataTransfer.setData('widget_code', pick.dataset.code);
      e.dataTransfer.setData('widget_type', pick.dataset.type);
    });
  });
  canvas.addEventListener('dragover',  e => { e.preventDefault(); canvas.classList.add('kpi-sim__canvas--over'); });
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
    canvas.querySelector('.kpi-sim__canvas-hint')?.remove();
  });

  document.getElementById('btn-sim-clear')?.addEventListener('click', () => {
    layout = [];
    canvas.innerHTML = `<p class="kpi-sim__canvas-hint">${ph('arrow-left')} Glissez des widgets pour construire votre dashboard</p>`;
  });
  document.getElementById('btn-sim-submit')?.addEventListener('click', async () => {
    if (!layout.length) { Guide.search('comment construire un dashboard'); return; }
    await _submitReponse(activite, { layout, donnees: contenu.donnees_simulees });
    _saveProgress(activite.id, 75, true, { layout });
    Guide.celebrate(75, activite.seuil_reussite||70);
  });
}

function _addWidgetToCanvas(canvas, widget, donnees) {
  const el  = document.createElement('div');
  el.className = 'kpi-sim-widget';
  const data = donnees?.[widget.code.replace('kpi_','')] ?? donnees?.[widget.code] ?? null;
  el.innerHTML = `
    <div class="kpi-sim-widget__header">
      <span class="kpi-sim-widget__label">${widget.label}</span>
      <button class="kpi-sim-widget__remove" title="Supprimer">${ph('x')}</button>
    </div>
    <div class="kpi-sim-widget__body">${_renderWidgetPreview(widget, data)}</div>`;
  el.querySelector('.kpi-sim-widget__remove')?.addEventListener('click', () => el.remove());
  canvas.appendChild(el);
}

function _renderWidgetPreview(widget, data) {
  if (data === null || data === undefined)
    return `<div class="kpi-sim-widget__placeholder">${ph('chart-line')} Données simulées</div>`;
  switch (widget.type) {
    case 'number':
      return `<div class="kpi-sim-widget__number">${typeof data==='number'?data.toFixed(1):data}<span class="kpi-sim-widget__unit">${widget.config_defaut?.unite||''}</span></div>`;
    case 'trend_arrow':
      return `<div class="kpi-sim-widget__trend ${data>0?'up':'down'}">${ph(data>0?'trend-up':'trend-down', 'bold')} ${Math.abs(data)}%</div>`;
    case 'gauge':
      const pct = Math.min(100, data);
      const col = pct>80?'#ef4444':pct>60?'#f59e0b':'#10b981';
      return `<div class="kpi-sim-widget__gauge"><svg viewBox="0 0 100 60" width="110"><path d="M10,55 A45,45,0,0,1,90,55" fill="none" stroke="#334155" stroke-width="10"/><path d="M10,55 A45,45,0,0,1,90,55" fill="none" stroke="${col}" stroke-width="10" stroke-dasharray="${pct*1.4},141"/></svg><span>${pct}%</span></div>`;
    default:
      return `<div class="kpi-sim-widget__chart-placeholder">${ph('chart-bar')} ${widget.type}</div>`;
  }
}

// ── View : Console Formateur ─────────────────────────────────────

async function viewFormateur(container) {
  const profile = store.getProfile();
  const { data: sessions } = await supabase
    .from('kpi_sessions')
    .select('*')
    .eq('formateur_id', profile.id)
    .in('statut', ['planifiee','active','pause'])
    .order('created_at', { ascending: false })
    .limit(5);

  container.innerHTML = `
    <div class="kpi-formateur">
      <div class="kpi-formateur__header">
        <h1>${ph('monitor-play', 'fill')} Console formateur</h1>
        <button class="kpi-btn kpi-btn--primary" id="btn-new-session">
          ${ph('plus')} Nouvelle session
        </button>
      </div>
      <div class="kpi-formateur__sessions">
        ${(sessions||[]).map(_renderSessionCard).join('') ||
          `<p class="kpi-placeholder">${ph('calendar-blank')} Aucune session active.</p>`}
      </div>
    </div>`;

  document.getElementById('btn-new-session')?.addEventListener('click', () => _createSession(container));
}

function _renderSessionCard(session) {
  const m = MODALITES[session.modalite] || MODALITES.elearning;
  return `
    <div class="kpi-session-card">
      <div class="kpi-session-card__header" style="--modalite-color:${m.color}">
        <span class="kpi-session-card__modalite">${ph(m.icon||'desktop')} ${m.label}</span>
        <span class="kpi-session-card__statut kpi-session-card__statut--${session.statut}">${session.statut}</span>
      </div>
      <div class="kpi-session-card__body">
        <h3>${session.titre}</h3>
        <a href="#/session/${session.id}" class="kpi-btn kpi-btn--primary kpi-btn--sm">
          ${ph('arrow-right')} Gérer la session
        </a>
      </div>
    </div>`;
}

async function _createSession(container) {
  const profile = store.getProfile();
  const { data: cohortes } = await supabase.from('lms_cohortes').select('id, nom').order('nom');

  const modal = document.createElement('div');
  modal.className = 'kpi-modal-overlay';
  modal.innerHTML = `
    <div class="kpi-modal">
      <h2>${ph('plus-circle', 'fill')} Nouvelle session</h2>
      <label>Titre
        <input type="text" class="kpi-input" id="session-titre"
               value="Session KPI — ${new Date().toLocaleDateString('fr')}">
      </label>
      <label>Cohorte
        <select class="kpi-input" id="session-cohorte">
          <option value="">— Libre (sans cohorte) —</option>
          ${(cohortes||[]).map(c=>`<option value="${c.id}">${c.nom}</option>`).join('')}
        </select>
      </label>
      <label>Modalité
        <select class="kpi-input" id="session-modalite">
          ${Object.entries(MODALITES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
        </select>
      </label>
      <div class="kpi-modal__footer">
        <button class="kpi-btn kpi-btn--ghost" id="btn-modal-cancel">${ph('x')} Annuler</button>
        <button class="kpi-btn kpi-btn--primary" id="btn-modal-create">${ph('check')} Créer</button>
      </div>
    </div>`;

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
      statut: 'planifiee',
    }).select().single();
    modal.remove();
    if (!error && session) window.location.hash = `#/session/${session.id}`;
  });
}

// ── View : Session live ──────────────────────────────────────────

async function viewSession(container, sessionId) {
  const { data: session, error } = await supabase
    .from('kpi_sessions').select('*').eq('id', sessionId).single();
  if (error || !session) {
    container.innerHTML = `<div class="kpi-error">${ph('warning')} Session introuvable. <a href="#/map">Retour</a></div>`;
    return;
  }
  store.set('session', session);
  const isFormateur = store.isFormateur();
  const m = MODALITES[session.modalite] || MODALITES.elearning;

  container.innerHTML = `
    <div class="kpi-session-view" data-modalite="${session.modalite}">
      <div class="kpi-session-view__header" style="--modalite-color:${m.color}">
        <div class="kpi-session-view__info">
          <h1>${session.titre}</h1>
          <div class="kpi-session-view__meta">
            <span class="kpi-badge" style="background:${m.color}">${ph(m.icon||'desktop')} ${m.label}</span>
            <span class="kpi-session-view__online" id="session-online">
              ${ph('circle', 'fill')} 1 en ligne
            </span>
          </div>
        </div>
        ${isFormateur ? `
          <div class="kpi-session-view__controls">
            <select class="kpi-input kpi-input--sm" id="ctrl-modalite">
              ${Object.entries(MODALITES).map(([k,v])=>
                `<option value="${k}" ${k===session.modalite?'selected':''}>${v.label}</option>`
              ).join('')}
            </select>
            <button class="kpi-btn kpi-btn--sm kpi-btn--danger"  id="btn-attention">
              ${ph('lightning', 'fill')} Attention
            </button>
            <button class="kpi-btn kpi-btn--sm kpi-btn--secondary" id="btn-timer">
              ${ph('timer')} Timer 10 min
            </button>
          </div>` : ''}
      </div>
      ${isFormateur ? _renderFormateurPanel(session) : _renderStagiairePanel(session)}
    </div>`;

  joinSessionRealtime(sessionId, {
    onSessionUpdate: (s) => _updateSessionView(container, s),
    onPresence: (users) => {
      const el = document.getElementById('session-online');
      if (el) el.innerHTML = `${ph('circle','fill')} ${users.length} en ligne`;
    },
    onNewReponse: isFormateur ? _appendReponseToList : null,
  });

  if (isFormateur) {
    document.getElementById('ctrl-modalite')?.addEventListener('change', e => changeModalite(sessionId, e.target.value));
    document.getElementById('btn-attention')?.addEventListener('click', () => sendBroadcast(sessionId, 'attention', {}));
    document.getElementById('btn-timer')?.addEventListener('click', () => sendBroadcast(sessionId, 'timer_start', { minutes: 10 }));
  }
}

function _renderFormateurPanel(session) {
  const sequences = store.get('sequences');
  return `
    <div class="kpi-formateur-panel">
      <div class="kpi-formateur-panel__col">
        <h3>${ph('list-bullets')} Séances & activités</h3>
        ${sequences.map(seq => (seq.kpi_seances||[]).map(se => `
          <div class="kpi-formateur-seance">
            <strong>${se.code} — ${se.titre}</strong>
            <div class="kpi-formateur-acts">
              ${(se.kpi_activites||[]).map(a => `
                <button class="kpi-btn kpi-btn--sm kpi-btn--ghost" data-activite-id="${a.id}" title="${a.titre}">
                  ${_typeIcon(a.type)} ${a.code}
                </button>`).join('')}
            </div>
          </div>`).join('')).join('')}
      </div>
      <div class="kpi-formateur-panel__col">
        <h3>${ph('chat-circle-text')} Réponses reçues</h3>
        <div id="formateur-reponses">
          <p class="kpi-placeholder">${ph('hourglass')} En attente de réponses…</p>
        </div>
      </div>
    </div>`;
}

function _renderStagiairePanel() {
  return `
    <div class="kpi-stagiaire-panel">
      <div class="kpi-stagiaire-panel__waiting" id="stagiaire-waiting">
        <div class="kpi-spinner kpi-spinner--lg"></div>
        <p>En attente de l'activité…</p>
        <p class="kpi-stagiaire-panel__hint">${ph('info')} Le formateur va lancer une activité.</p>
      </div>
      <div class="kpi-stagiaire-panel__content" id="stagiaire-content" hidden></div>
    </div>`;
}

function _appendReponseToList(reponse) {
  const container = document.getElementById('formateur-reponses');
  if (!container) return;
  if (container.querySelector('.kpi-placeholder')) container.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'kpi-reponse-card';
  card.innerHTML = `
    <div class="kpi-reponse-card__content">
      <span class="kpi-reponse-card__status kpi-reponse-card__status--${reponse.statut}">${reponse.statut}</span>
      <p>${typeof reponse.contenu==='string' ? reponse.contenu : JSON.stringify(reponse.contenu).slice(0,100)}</p>
    </div>
    <div class="kpi-reponse-card__actions">
      <button class="kpi-btn kpi-btn--sm kpi-btn--primary" data-action="share" data-id="${reponse.id}">
        ${ph('share-network')} Partager
      </button>
      <button class="kpi-btn kpi-btn--sm kpi-btn--ghost" data-action="hide" data-id="${reponse.id}">
        ${ph('eye-slash')} Masquer
      </button>
    </div>`;
  card.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const statut = btn.dataset.action === 'share' ? 'shared' : 'hidden';
      await supabase.from('kpi_reponses').update({ statut, moderated_at: new Date().toISOString() }).eq('id', btn.dataset.id);
    });
  });
  container.prepend(card);
}

function _updateSessionView(container, session) {
  _updateModaliteBadge(session.modalite);
  if (!store.isFormateur() && session.activite_active_id) {
    const waiting = document.getElementById('stagiaire-waiting');
    const content = document.getElementById('stagiaire-content');
    if (waiting) waiting.hidden = true;
    if (content) { content.hidden = false; viewActivite(content, session.activite_active_id); }
  }
}

// ── View : Profil ────────────────────────────────────────────────

async function viewProfil(container) {
  const profile     = store.getProfile();
  const kpiProfile  = store.getKpiProfile();
  const niveaux     = store.get('niveaux');
  const monNiveau   = niveaux.find(n => n.id === kpiProfile?.niveau_id);
  const progression = store.get('progression');
  const doneCount   = Object.values(progression).filter(p => p.statut==='termine').length;

  container.innerHTML = `
    <div class="kpi-profil">
      <div class="kpi-profil__card">
        <div class="kpi-profil__avatar" style="background:${monNiveau?.couleur||'#6366f1'}">
          ${(profile.prenom[0]+profile.nom[0]).toUpperCase()}
        </div>
        <div class="kpi-profil__info">
          <h1>${profile.prenom} ${profile.nom}</h1>
          <span class="kpi-badge" style="background:${monNiveau?.couleur||'#6366f1'}">
            ${monNiveau?.label||'Non évalué'}
          </span>
          <p class="kpi-profil__desc">${monNiveau?.description||''}</p>
        </div>
      </div>

      <div class="kpi-profil__stats">
        <div class="kpi-stat-card">
          <div class="kpi-stat-card__icon">${ph('target', 'fill')}</div>
          <div class="kpi-stat-card__value">${kpiProfile?.score_diagnostic||'—'}%</div>
          <div class="kpi-stat-card__label">Score diagnostic</div>
        </div>
        <div class="kpi-stat-card">
          <div class="kpi-stat-card__icon">${ph('check-circle', 'fill')}</div>
          <div class="kpi-stat-card__value">${doneCount}</div>
          <div class="kpi-stat-card__label">Activités terminées</div>
        </div>
        <div class="kpi-stat-card">
          <div class="kpi-stat-card__icon">${ph('arrows-clockwise', 'bold')}</div>
          <div class="kpi-stat-card__value">${Object.values(progression).reduce((a,p)=>a+(p.tentatives||0),0)}</div>
          <div class="kpi-stat-card__label">Tentatives totales</div>
        </div>
      </div>

      ${!kpiProfile?.completed_diagnostic_at ? `
        <div class="kpi-profil__diagnostic-cta">
          <p>${ph('info', 'fill')} Vous n'avez pas encore fait le test de positionnement.</p>
          <a href="#/diagnostic" class="kpi-btn kpi-btn--primary">
            ${ph('map-pin')} Faire le diagnostic
          </a>
        </div>` : ''}

      <div class="kpi-profil__niveaux">
        <h2>${ph('stairs')} Niveaux andragogiques</h2>
        <div class="kpi-niveaux-list">
          ${niveaux.map(n => `
            <div class="kpi-niveau-item${n.id===kpiProfile?.niveau_id?' kpi-niveau-item--active':''}"
                 style="--n-color:${n.couleur}">
              <span class="kpi-niveau-item__dot"></span>
              <span class="kpi-niveau-item__label">${n.label}</span>
              <span class="kpi-niveau-item__desc">${n.description}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ── Helpers communs ───────────────────────────────────────────────

async function _submitReponse(activite, contenu, partageClasse = false) {
  const profile = store.getProfile();
  const session = store.getSession();
  if (!profile) return;
  const { error } = await supabase.from('kpi_reponses').insert({
    profile_id:  profile.id,
    activite_id: activite.id,
    session_id:  session?.id || null,
    contenu,
    statut: partageClasse ? 'pending' : 'approved',
  });
  if (!error && partageClasse) {
    store.addNotification({ type: 'sent', text: 'Réponse envoyée — en attente de validation' });
  }
}

async function _saveProgress(activiteId, score, passed, reponse) {
  const profile = store.getProfile();
  if (!profile) return;
  const prog = store.getProgressionForActivite(activiteId);
  const { data } = await supabase.from('kpi_activite_progress').upsert({
    profile_id:    profile.id,
    activite_id:   activiteId,
    statut:        passed ? 'termine' : 'echec',
    score,
    tentatives:    (prog?.tentatives||0) + 1,
    reponse_finale: reponse,
    completed_at:  passed ? new Date().toISOString() : null,
  }, { onConflict: 'profile_id,activite_id' }).select().single();
  if (data) store.setProgression(activiteId, data);
}

function _updateModaliteBadge(modalite) {
  const badge = document.getElementById('badge-modalite');
  if (!badge) return;
  const m = MODALITES[modalite];
  badge.textContent = m ? m.label : '';
  if (m) badge.style.background = m.color;
}

function _renderGuideMessages(messages) {
  const el = document.getElementById('kpi-guide-messages');
  if (!el) return;
  el.innerHTML = messages.map(m => `
    <div class="kpi-guide-msg kpi-guide-msg--${m.type}">
      ${m.text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

function _renderNotifications(notifs) {
  const el = document.getElementById('kpi-notifications');
  if (!el) return;
  const recent = notifs.filter(n => Date.now() - n.ts.getTime() < 5000);
  el.innerHTML = recent.map(n => `
    <div class="kpi-notif kpi-notif--${n.type}">${n.text}</div>`).join('');
}

// ── Questions diagnostic ─────────────────────────────────────────

function _getDiagnosticQuestions() {
  return [
    { theme:'Fondamentaux',  texte:'Un KPI est toujours exprimé en pourcentage.',
      options:[{texte:'Vrai',correct:false},{texte:'Faux',correct:true}] },
    { theme:'Fondamentaux',  texte:'KPI signifie :',
      options:[{texte:'Key Performance Index',correct:false},{texte:'Key Performance Indicator',correct:true},{texte:'Key Process Integration',correct:false},{texte:'Knowledge Performance Index',correct:false}] },
    { theme:'Méthode SMART', texte:'Dans SMART, M signifie :',
      options:[{texte:'Manageable',correct:false},{texte:'Mesurable',correct:true},{texte:'Motivant',correct:false},{texte:'Méthodique',correct:false}] },
    { theme:'Méthode SMART', texte:'"Améliorer les ventes" est un objectif SMART.',
      options:[{texte:'Vrai',correct:false},{texte:'Faux',correct:true}] },
    { theme:'Données',       texte:'Un fichier CSV est :',
      options:[{texte:'Un fichier de traitement de texte',correct:false},{texte:'Un fichier tabulaire séparé par des virgules',correct:true},{texte:'Un fichier image',correct:false},{texte:'Un format de base de données',correct:false}] },
    { theme:'Données',       texte:'Quelle est la formule du taux de turnover ?',
      options:[{texte:'Départs / Effectif fin × 100',correct:false},{texte:'((Départs + Arrivées) / 2) / Effectif moyen × 100',correct:true},{texte:'Arrivées / Départs × 100',correct:false},{texte:'Départs × Effectif / 100',correct:false}] },
    { theme:'Base de données',texte:'Une clé primaire est :',
      options:[{texte:'Un mot de passe',correct:false},{texte:'Un identifiant unique pour chaque ligne',correct:true},{texte:'Un champ obligatoire',correct:false},{texte:'Le premier champ de la table',correct:false}] },
    { theme:'Visualisation', texte:'Pour afficher une évolution dans le temps, on utilise :',
      options:[{texte:'Un camembert',correct:false},{texte:'Une courbe',correct:true},{texte:'Un tableau',correct:false},{texte:'Une jauge',correct:false}] },
    { theme:'Visualisation', texte:'Un camembert est adapté quand il y a plus de 7 catégories.',
      options:[{texte:'Vrai',correct:false},{texte:'Faux',correct:true}] },
    { theme:'RGPD',          texte:'Les données de salaire sont des données personnelles sensibles.',
      options:[{texte:'Vrai',correct:true},{texte:'Faux',correct:false}] },
    { theme:'Formule',       texte:'Effectif moyen entre 100 (début) et 120 (fin) :',
      options:[{texte:'100',correct:false},{texte:'110',correct:true},{texte:'120',correct:false},{texte:'220',correct:false}] },
    { theme:'Dashboard',     texte:'Un dashboard efficace répond à plusieurs questions complexes simultanément.',
      options:[{texte:'Vrai',correct:false},{texte:'Faux — 1 objectif clair',correct:true}] },
    { theme:'Types',         texte:'Le bon type pour un salaire est :',
      options:[{texte:'TEXT',correct:false},{texte:'INTEGER',correct:false},{texte:'DECIMAL',correct:true},{texte:'BOOLEAN',correct:false}] },
    { theme:'Analyse',       texte:'Un taux d\'absentéisme de 3% est TOUJOURS un bon résultat.',
      options:[{texte:'Vrai',correct:false},{texte:'Faux — il faut un benchmark',correct:true}] },
    { theme:'Expert',        texte:'La corrélation entre deux variables se visualise avec :',
      options:[{texte:'Un camembert',correct:false},{texte:'Un nuage de points',correct:true},{texte:'Une courbe',correct:false},{texte:'Un histogramme',correct:false}] },
  ];
}

// ── Démarrage ────────────────────────────────────────────────────
boot();
