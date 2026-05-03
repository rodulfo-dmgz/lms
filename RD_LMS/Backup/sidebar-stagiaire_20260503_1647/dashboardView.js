/**
 * dashboardView.js — Dashboard v2 (redesign inspiré claude.ai/design Dashboard v2.html)
 * Identité préservée : strip de messages (dailyMessage/contextualMessage) + titre professionnel
 * Backup : dashboardView.v1.backup.js
 */

const ROLE_LABELS = {
    admin:             'Administrateur',
    formateur_editeur: 'Formateur Éditeur',
    formateur:         'Formateur',
    stagiaire:         'Stagiaire',
    invite:            'Invité',
};

const TIP_ICON_MAP = { motivation: 'rocket', citation: 'quote', conseil: 'sparkles' };

// Icônes pour les thumbnails de course cards (cycle)
const COURSE_ICONS  = ['clipboard-list', 'globe-2', 'megaphone', 'shield-check', 'trending-up', 'layers', 'cpu', 'book-open', 'database', 'users', 'code-2', 'network'];
const TASK_ICONS    = ['book-open', 'file-text', 'layers', 'cpu', 'shield-check', 'trending-up'];
const TASK_COLORS   = ['var(--action-primary)', 'var(--action-cta)', 'var(--color-secondary-600)', '#5b48b8', '#1f6aa3'];

// Thèmes des course cards (3 couleurs cycliques)
const CARD_THEMES = [
    { bg: 'var(--color-primary-100)',   deep: 'var(--color-primary-700)'   },
    { bg: 'var(--color-accent-100)',    deep: 'var(--color-accent-700)'    },
    { bg: 'var(--color-secondary-100)', deep: 'var(--color-secondary-700)' },
];

// ─── Export principal ────────────────────────────────────────
export function renderDashboard(container, { profile, progressSummary, dailyMessage, contextualMessage, role, isViewAs = false, adminStats = null }) {

    // ── Dashboard admin (sans simulation active) ─────────────
    if (role === 'admin' && !isViewAs) {
        renderAdminDashboard(container, { profile, adminStats });
        return;
    }

    // ── Calculs globaux ─────────────────────────────────────
    const totalSeances   = progressSummary.reduce((s, c) => s + (c.total_seances || 0), 0);
    const totalTerminees = progressSummary.reduce((s, c) => s + (c.terminees     || 0), 0);
    const globalPct      = totalSeances ? Math.round(totalTerminees / totalSeances * 100) : 0;
    const inProgress     = progressSummary.filter(c => c.pourcentage > 0 && c.pourcentage < 100);
    const completed      = progressSummary.filter(c => c.pourcentage === 100);

    // ── Greeting ────────────────────────────────────────────
    const hour   = new Date().getHours();
    const salut  = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    const today  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const prenom = profile?.prenom || '';
    const titrePro = profile?.titre_pro?.intitule || ROLE_LABELS[role] || '';

    // Top modules : d'abord les en-cours (desc par %), puis les pending
    const topModules = [
        ...inProgress.sort((a, b) => b.pourcentage - a.pourcentage),
        ...progressSummary.filter(c => c.pourcentage === 0),
    ].slice(0, 3);

    // ── Rendu ───────────────────────────────────────────────
    container.innerHTML = `
    <div class="dv2-page">

      <!-- ══ HERO ══ -->
      <div class="dv2-hero">
        <div class="dv2-hero__content">
          <div class="dv2-hero__eyebrow">
            <span class="dv2-hero__date">${today}</span>
            ${titrePro ? `<span class="dv2-hero__titre-badge"><i data-lucide="shield-check" aria-hidden="true"></i>${esc(titrePro)}</span>` : ''}
          </div>
          <h1 class="dv2-hero__title">${esc(salut)}, <span>${esc(prenom)}</span> !</h1>
          <p class="dv2-hero__sub">
            ${globalPct > 0
              ? `Vous avez complété <strong>${globalPct}%</strong> de votre cursus · <strong>${totalTerminees}</strong> séances terminées`
              : 'Retrouvez ici votre progression et vos modules assignés.'}
          </p>
          <div class="dv2-hero__prog-wrap" role="progressbar" aria-valuenow="${globalPct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progression ${globalPct}%">
            <div class="dv2-hero__prog-bar" style="width:${globalPct}%"></div>
          </div>
          <div class="dv2-hero__actions">
            <a href="#/modules" class="dv2-btn-cta">
              <i data-lucide="play" aria-hidden="true"></i> Reprendre
            </a>
            <a href="#/modules" class="dv2-btn-ghost">
              <i data-lucide="book-open" aria-hidden="true"></i> Ma formation
            </a>
          </div>
        </div>
        <div class="dv2-hero__illu" aria-hidden="true">
          ${CAP_SVG}
        </div>
      </div>

      <!-- ══ MESSAGES — identité unique RD WORKFLOW ══ -->
      ${buildTip(dailyMessage, contextualMessage)}

      <!-- ══ KPIs ══ -->
      ${buildKPIBar({ totalTerminees, totalSeances, inProgress: inProgress.length, completed: completed.length, total: progressSummary.length, globalPct })}

      <!-- ══ CONTENU PRINCIPAL ══ -->
      <div class="dv2-content">

        <!-- Colonne principale -->
        <div class="dv2-col-main">

          <!-- Course cards -->
          <section class="dv2-section">
            <div class="dv2-section-head">
              <h2 class="dv2-section-head__title">
                <i data-lucide="graduation-cap" aria-hidden="true"></i>
                Mes modules
                <span class="dv2-count">${progressSummary.length}</span>
              </h2>
              <a href="#/modules" class="dv2-see-all">
                Tout voir <i data-lucide="arrow-up-right" aria-hidden="true"></i>
              </a>
            </div>
            <div class="dv2-courses">
              ${topModules.length
                ? topModules.map((m, i) => buildCourseCard(m, i)).join('')
                : `<p class="dv2-empty">Aucun module assigné pour le moment.</p>`}
            </div>
          </section>

          <!-- Achievements -->
          <section class="dv2-section">
            <div class="dv2-section-head">
              <h2 class="dv2-section-head__title">
                <i data-lucide="award" aria-hidden="true"></i>
                Réussites
              </h2>
            </div>
            <div class="dv2-achievements">
              ${buildAchievements(completed.length, totalTerminees, globalPct, inProgress.length)}
            </div>
          </section>

        </div>

        <!-- Colonne latérale -->
        <div class="dv2-col-side">

          <!-- Calendrier -->
          ${buildCalendar()}

          <!-- Progression globale -->
          <div class="dv2-card">
            <div class="dv2-card__title">
              <i data-lucide="pie-chart" aria-hidden="true"></i>
              Avancement
            </div>
            <div class="dv2-ring-wrap">
              <div class="dv2-ring" style="--pct:${globalPct}" role="img" aria-label="Progression ${globalPct}%">
                <div class="dv2-ring__num">${globalPct}<small>%</small></div>
              </div>
              <div class="dv2-ring-meta">
                <div class="dv2-ring-row">
                  <span>Séances</span>
                  <strong>${totalTerminees} / ${totalSeances}</strong>
                </div>
                <div class="dv2-ring-row">
                  <span>Modules terminés</span>
                  <strong>${completed.length} / ${progressSummary.length}</strong>
                </div>
                <div class="dv2-ring-row">
                  <span>Statut</span>
                  <strong>${globalPct === 100 ? '✓ Complété' : globalPct > 0 ? 'En cours' : 'Non démarré'}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Modules à compléter -->
          ${inProgress.length ? buildTasksCard(inProgress) : ''}

        </div>
      </div>

    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    // ── Fermer le tip ──────────────────────────────────────
    container.querySelector('#dv2-tip-close')?.addEventListener('click', () => {
        container.querySelector('#dv2-tip')?.remove();
    });

    // ── Clic sur course card ───────────────────────────────
    container.querySelectorAll('.dv2-course[data-cours-id]').forEach(card => {
        card.addEventListener('click', () => {
            window.location.hash = `#/modules/${card.dataset.coursId}`;
        });
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
        });
    });

    // ── Clic sur task ──────────────────────────────────────
    container.querySelectorAll('.dv2-task[data-cours-id]').forEach(t => {
        t.addEventListener('click', () => {
            window.location.hash = `#/modules/${t.dataset.coursId}`;
        });
        t.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); }
        });
    });
}

// ─── Barre KPIs ──────────────────────────────────────────────
function buildKPIBar({ totalTerminees, totalSeances, inProgress, completed, total, globalPct }) {
    const remaining = total - completed;
    const seancePct = totalSeances ? Math.round(totalTerminees / totalSeances * 100) : 0;

    const stats = [
        {
            icon:  'layers',
            value: totalTerminees,
            suffix: `/ ${totalSeances}`,
            label: 'Séances terminées',
            bar:   seancePct,
            color: '',
        },
        {
            icon:  'play-circle',
            value: inProgress,
            suffix: inProgress > 1 ? 'actifs' : 'actif',
            label: 'Modules en cours',
            bar:   total ? Math.round(inProgress / total * 100) : 0,
            color: 'var(--semantic-warning)',
        },
        {
            icon:  'check-circle-2',
            value: completed,
            suffix: `/ ${total}`,
            label: 'Modules terminés',
            bar:   total ? Math.round(completed / total * 100) : 0,
            color: 'var(--semantic-success)',
        },
        {
            icon:  'hourglass',
            value: remaining,
            suffix: remaining > 1 ? 'restants' : 'restant',
            label: 'Modules à démarrer',
            bar:   total ? Math.round(remaining / total * 100) : 0,
            color: 'var(--text-muted)',
        },
    ];

    return `
    <div class="dv2-kpi-bar">
      ${stats.map(s => `
      <div class="dv2-kpi">
        <div class="dv2-kpi__head">
          <i data-lucide="${s.icon}" aria-hidden="true"></i>
          <span class="dv2-kpi__label">${s.label}</span>
        </div>
        <div class="dv2-kpi__value">
          <span class="dv2-kpi__num">${s.value}</span>
          <span class="dv2-kpi__suffix">${s.suffix}</span>
        </div>
        <div class="dv2-kpi__bar">
          <div class="dv2-kpi__fill" style="width:${s.bar}%;${s.color ? `background:${s.color}` : ''}"></div>
        </div>
      </div>`).join('')}
    </div>`;
}

// ─── Strip de messages (identité unique RD WORKFLOW) ────────
function buildTip(dailyMessage, contextualMessage) {
    if (!dailyMessage && !contextualMessage) return '';
    const icon    = dailyMessage ? (TIP_ICON_MAP[dailyMessage.type] || 'sparkles') : 'trending-up';
    const label   = dailyMessage?.type || 'Info';
    const texte   = dailyMessage?.texte || contextualMessage || '';
    return `
    <div class="dv2-tip" id="dv2-tip">
      <div class="dv2-tip__icon">
        <i data-lucide="${icon}" aria-hidden="true"></i>
      </div>
      <div class="dv2-tip__body">
        <span class="dv2-tip__label">${esc(label)}</span>
        <span class="dv2-tip__text">${esc(texte)}</span>
      </div>
      <button class="dv2-tip__close" id="dv2-tip-close" aria-label="Fermer">
        <i data-lucide="x" aria-hidden="true"></i>
      </button>
    </div>`;
}

// ─── Course card ─────────────────────────────────────────────
function buildCourseCard(m, i) {
    const theme    = CARD_THEMES[i % CARD_THEMES.length];
    const pct      = m.pourcentage || 0;
    const left     = Math.max(0, (m.total_seances || 0) - (m.terminees || 0));
    const code     = extractCode(m.cours_titre);
    const title    = m.cours_titre.replace(/^[A-Z]{2,5}\s*[—–\-]\s*/, '').trim();
    const icon     = COURSE_ICONS[i % COURSE_ICONS.length];
    const featured = i === 0 && pct > 0;
    const hasImg   = !!m.image_url;

    const thumb = hasImg
        ? `<div class="dv2-course__thumb dv2-course__thumb--img">
             <img src="${escAttr(m.image_url)}" alt="" loading="lazy" class="dv2-course__bg-img"
                  onerror="this.closest('.dv2-course__thumb').classList.remove('dv2-course__thumb--img');this.remove()">
             <span class="dv2-course__tag">${esc(code)}</span>
           </div>`
        : `<div class="dv2-course__thumb">
             <span class="dv2-course__tag">${esc(code)}</span>
             <i data-lucide="${icon}" class="dv2-course__icon" aria-hidden="true"></i>
           </div>`;

    return `
    <article class="dv2-course${featured ? ' dv2-course--featured' : ''}"
             data-cours-id="${m.cours_id}"
             style="--dv2-bg:${theme.bg};--dv2-deep:${theme.deep}"
             role="button" tabindex="0"
             aria-label="${esc(m.cours_titre)}, ${pct}% complété">
      ${thumb}
      <div class="dv2-course__body">
        <h3 class="dv2-course__name">${esc(title)}</h3>
        <div class="dv2-course__track">
          <div class="dv2-course__fill" style="width:${pct}%"></div>
        </div>
        <div class="dv2-course__meta">
          <span>${left} séance${left !== 1 ? 's' : ''} restante${left !== 1 ? 's' : ''}</span>
          <strong class="dv2-mono">${pct}%</strong>
        </div>
      </div>
    </article>`;
}

// ─── Achievements ─────────────────────────────────────────────
function buildAchievements(completedCount, totalTerminees, globalPct, inProgressCount) {
    const achs = [];

    // Carte 1 : jalon actuel
    if (globalPct === 100) {
        achs.push({ bg: 'var(--color-accent-100)', deep: 'var(--color-accent-700)', ribbon: 'var(--color-accent-600)',
            eyebrow: 'Félicitations', title: 'Formation complète !', sub: 'Vous avez terminé tout votre cursus.', highlight: true });
    } else if (completedCount > 0) {
        achs.push({ bg: 'var(--color-accent-100)', deep: 'var(--color-accent-700)', ribbon: 'var(--color-accent-600)',
            eyebrow: 'Réussite', title: `${completedCount} module${completedCount > 1 ? 's' : ''} terminé${completedCount > 1 ? 's' : ''}`,
            sub: `${totalTerminees} séances complétées au total.`, highlight: true });
    } else if (inProgressCount > 0 || totalTerminees > 0) {
        achs.push({ bg: 'var(--color-accent-100)', deep: 'var(--color-accent-700)', ribbon: 'var(--color-accent-500)',
            eyebrow: 'En progression', title: 'Formation démarrée',
            sub: `${totalTerminees} séance${totalTerminees !== 1 ? 's' : ''} complétée${totalTerminees !== 1 ? 's' : ''}.` });
    } else {
        achs.push({ bg: 'var(--color-accent-100)', deep: 'var(--color-accent-700)', ribbon: 'var(--color-accent-400)',
            eyebrow: 'Prochain objectif', title: 'Démarrer votre première séance',
            sub: 'Votre parcours vous attend !' });
    }

    // Carte 2 : objectif suivant
    if (globalPct >= 75) {
        achs.push({ bg: 'var(--color-secondary-100)', deep: 'var(--color-secondary-700)', ribbon: 'var(--color-secondary-600)',
            eyebrow: 'Bientôt', title: 'Finalisation du cursus', sub: `Plus que ${100 - globalPct}% à compléter.` });
    } else if (globalPct >= 25) {
        achs.push({ bg: 'var(--color-secondary-100)', deep: 'var(--color-secondary-700)', ribbon: 'var(--color-secondary-600)',
            eyebrow: 'Objectif', title: 'Atteindre 75% du cursus', sub: `Vous êtes à ${globalPct}%, continuez !` });
    } else {
        achs.push({ bg: 'var(--color-secondary-100)', deep: 'var(--color-secondary-700)', ribbon: 'var(--color-secondary-500)',
            eyebrow: 'Objectif', title: 'Terminer votre premier module',
            sub: 'Chaque séance vous rapproche du but.' });
    }

    return achs.map(a => `
    <div class="dv2-ach${a.highlight ? ' dv2-ach--highlight' : ''}"
         style="--dv2-ach-bg:${a.bg};--dv2-ach-deep:${a.deep}">
      <div class="dv2-ach__eyebrow">${esc(a.eyebrow)}</div>
      <h4 class="dv2-ach__title">${esc(a.title)}</h4>
      <p class="dv2-ach__sub">${esc(a.sub)}</p>
      <a href="#/modules" class="dv2-ach__btn">
        Voir <i data-lucide="arrow-right" aria-hidden="true"></i>
      </a>
      <div class="dv2-ach__medal" aria-hidden="true">
        ${medalSVG(a.ribbon)}
      </div>
    </div>`).join('');
}

// ─── Calendrier ───────────────────────────────────────────────
function buildCalendar() {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const daysInMonth  = new Date(year, month + 1, 0).getDate();
    const firstDayRaw  = new Date(year, month, 1).getDay(); // 0=dim
    const firstOffset  = (firstDayRaw + 6) % 7; // lundi = 0

    const cells = [];
    for (let i = 0; i < firstOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const dayNames = ['L','M','M','J','V','S','D'];

    return `
    <div class="dv2-card">
      <div class="dv2-card__title">
        <i data-lucide="calendar-days" aria-hidden="true"></i>
        Mon planning
      </div>
      <div class="dv2-cal">
        <div class="dv2-cal__header">
          <span class="dv2-cal__month">${MONTHS[month]} ${year}</span>
        </div>
        <div class="dv2-cal__grid">
          ${dayNames.map(d => `<div class="dv2-cal__day-name">${d}</div>`).join('')}
          ${cells.map((d, i) => {
              if (!d) return `<div key="${i}"></div>`;
              const isToday = d === today;
              return `<div class="dv2-cal__day${isToday ? ' dv2-cal__day--today' : ''}">${d}</div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

// ─── Carte tâches (modules en cours) ─────────────────────────
function buildTasksCard(inProgress) {
    const tasks = inProgress
        .sort((a, b) => b.pourcentage - a.pourcentage)
        .slice(0, 4);

    return `
    <div class="dv2-card">
      <div class="dv2-card__title">
        <i data-lucide="list-checks" aria-hidden="true"></i>
        À compléter
      </div>
      <div class="dv2-tasks">
        ${tasks.map((m, i) => {
            const left  = Math.max(0, (m.total_seances || 0) - (m.terminees || 0));
            const icon  = TASK_ICONS[i % TASK_ICONS.length];
            const color = TASK_COLORS[i % TASK_COLORS.length];
            return `
            <div class="dv2-task" data-cours-id="${m.cours_id}" role="button" tabindex="0"
                 aria-label="Aller au module ${esc(m.cours_titre)}">
              <div class="dv2-task__icon" style="background:${color}">
                <i data-lucide="${icon}" aria-hidden="true"></i>
              </div>
              <div class="dv2-task__meta">
                <div class="dv2-task__title">${esc(m.cours_titre.replace(/^[A-Z]{2,5}\s*[—–\-]\s*/, '').trim())}</div>
                <div class="dv2-task__sub">${left} séance${left !== 1 ? 's' : ''} restante${left !== 1 ? 's' : ''} · ${m.pourcentage}%</div>
              </div>
              <span class="dv2-task__arrow"><i data-lucide="chevron-right" aria-hidden="true"></i></span>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ─── Dashboard Admin ──────────────────────────────────────────
function renderAdminDashboard(container, { profile, adminStats }) {
    const hour  = new Date().getHours();
    const salut = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const prenom = profile?.prenom || '';

    const s = adminStats?.nb_stagiaires ?? '—';
    const c = adminStats?.nb_cohortes   ?? '—';
    const p = adminStats?.nb_pathways   ?? '—';
    const m = adminStats?.nb_cours      ?? '—';

    // Groupes de raccourcis avec couleur d'accent
    const groups = [
        {
            label: 'Personnes',
            items: [
                { icon: 'users',          label: 'Cohortes',          sub: `${c} groupe${c !== 1 ? 's' : ''}`,            href: '#/admin/cohortes',          color: 'primary' },
                { icon: 'user',           label: 'Stagiaires',        sub: `${s} inscrit${s !== 1 ? 's' : ''}`,           href: '#/admin/stagiaires',        color: 'primary' },
                { icon: 'user-round-plus',label: 'Import stagiaires', sub: 'CSV ou saisie manuelle',                      href: '#/admin/inject-stagiaires', color: 'primary' },
            ],
        },
        {
            label: 'Contenus',
            items: [
                { icon: 'map',            label: 'Parcours',          sub: `${p} parcours`,                               href: '#/admin/parcours',          color: 'secondary' },
                { icon: 'package',        label: 'Produits',          sub: 'Bundles de contenu',                          href: '#/admin/produits',          color: 'secondary' },
                { icon: 'award',          label: 'Titres pro (RNCP)', sub: 'Référentiel national',                        href: '#/admin/titres-pro',        color: 'secondary' },
            ],
        },
        {
            label: 'Commercial',
            items: [
                { icon: 'credit-card',    label: 'Financements',      sub: 'Tarifs, OPCO, CPF',                           href: '#/admin/financements',      color: 'accent' },
            ],
        },
    ];

    container.innerHTML = `
    <div class="dv2-page">

      <!-- ══ HERO Admin ══ -->
      <div class="dv2-hero dv2-hero--admin">
        <div class="dv2-hero__content">
          <div class="dv2-hero__eyebrow">
            <span class="dv2-hero__date">${today}</span>
            <span class="dv2-hero__titre-badge">
              <i data-lucide="shield-check" aria-hidden="true"></i>Administrateur
            </span>
          </div>
          <h1 class="dv2-hero__title">${esc(salut)}, <span>${esc(prenom)}</span> !</h1>
          <p class="dv2-hero__sub">Console d'administration — gestion des stagiaires, cohortes et contenus.</p>
          <div class="dv2-hero__actions">
            <a href="#/admin/cohortes/nouveau" class="dv2-btn-cta">
              <i data-lucide="plus" aria-hidden="true"></i> Nouvelle cohorte
            </a>
            <a href="#/admin/inject-stagiaires" class="dv2-btn-ghost">
              <i data-lucide="user-round-plus" aria-hidden="true"></i> Ajouter des stagiaires
            </a>
          </div>
        </div>
        <div class="dv2-hero__illu dv2-hero__illu--admin" aria-hidden="true">
          ${ADMIN_SVG}
        </div>
      </div>

      <!-- ══ KPIs Admin ══ -->
      <div class="dv2-kpi-bar">
        <a href="#/admin/stagiaires" class="dv2-kpi dv2-kpi--link">
          <div class="dv2-kpi__head">
            <i data-lucide="users" aria-hidden="true"></i>
            <span class="dv2-kpi__label">Stagiaires inscrits</span>
          </div>
          <div class="dv2-kpi__value">
            <span class="dv2-kpi__num" style="color:var(--action-primary)">${s}</span>
          </div>
        </a>
        <a href="#/admin/cohortes" class="dv2-kpi dv2-kpi--link">
          <div class="dv2-kpi__head">
            <i data-lucide="school" aria-hidden="true"></i>
            <span class="dv2-kpi__label">Cohortes actives</span>
          </div>
          <div class="dv2-kpi__value">
            <span class="dv2-kpi__num" style="color:var(--action-cta)">${c}</span>
          </div>
        </a>
        <a href="#/admin/parcours" class="dv2-kpi dv2-kpi--link">
          <div class="dv2-kpi__head">
            <i data-lucide="map" aria-hidden="true"></i>
            <span class="dv2-kpi__label">Parcours</span>
          </div>
          <div class="dv2-kpi__value">
            <span class="dv2-kpi__num" style="color:var(--color-secondary-600)">${p}</span>
          </div>
        </a>
        <div class="dv2-kpi">
          <div class="dv2-kpi__head">
            <i data-lucide="book-open" aria-hidden="true"></i>
            <span class="dv2-kpi__label">Modules de contenu</span>
          </div>
          <div class="dv2-kpi__value">
            <span class="dv2-kpi__num">${m}</span>
          </div>
        </div>
      </div>

      <!-- ══ CONTENU PRINCIPAL ══ -->
      <div class="dv2-content">

        <!-- Colonne principale : Raccourcis groupés -->
        <div class="dv2-col-main">
          <section class="dv2-section">
            <div class="dv2-section-head">
              <h2 class="dv2-section-head__title">
                <i data-lucide="layout-grid" aria-hidden="true"></i>
                Actions rapides
              </h2>
              <a href="#/admin" class="dv2-see-all">
                Console Admin <i data-lucide="arrow-up-right" aria-hidden="true"></i>
              </a>
            </div>

            ${groups.map(g => `
            <div class="adm-group">
              <div class="adm-group__label">${g.label}</div>
              <div class="adm-group__grid">
                ${g.items.map(item => `
                <a href="${item.href}" class="adm-card adm-card--${item.color}">
                  <div class="adm-card__icon">
                    <i data-lucide="${item.icon}" aria-hidden="true"></i>
                  </div>
                  <div class="adm-card__body">
                    <span class="adm-card__label">${esc(item.label)}</span>
                    <span class="adm-card__sub">${esc(item.sub)}</span>
                  </div>
                  <i data-lucide="arrow-right" class="adm-card__arrow" aria-hidden="true"></i>
                </a>`).join('')}
              </div>
            </div>`).join('')}

          </section>
        </div>

        <!-- Colonne latérale -->
        <div class="dv2-col-side">

          ${buildCalendar()}

          <!-- Liens rapides sidebar -->
          <div class="dv2-card">
            <div class="dv2-card__title">
              <i data-lucide="zap" aria-hidden="true"></i>
              Raccourcis
            </div>
            <div class="dv2-tasks">
              ${[
                { icon: 'upload',        bg: 'var(--action-primary)',        label: 'Import CSV stagiaires',  sub: 'Créer plusieurs comptes',      href: '#/admin/inject-stagiaires' },
                { icon: 'git-branch',    bg: 'var(--color-secondary-600)',   label: 'Créer un parcours',      sub: 'Modules, séquences, séances',  href: '#/admin/parcours' },
                { icon: 'credit-card',   bg: 'var(--color-accent-600)',      label: 'Gérer les financements', sub: 'OPCO, CPF, prise en charge',   href: '#/admin/financements' },
              ].map(t => `
              <a href="${t.href}" class="dv2-task" style="text-decoration:none">
                <div class="dv2-task__icon" style="background:${t.bg}">
                  <i data-lucide="${t.icon}" aria-hidden="true"></i>
                </div>
                <div class="dv2-task__meta">
                  <div class="dv2-task__title">${t.label}</div>
                  <div class="dv2-task__sub">${t.sub}</div>
                </div>
                <span class="dv2-task__arrow"><i data-lucide="chevron-right" aria-hidden="true"></i></span>
              </a>`).join('')}
            </div>
          </div>

        </div>
      </div>

    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });
}

// ─── Helpers ──────────────────────────────────────────────────
function extractCode(titre) {
    const m = titre.match(/^([A-Z]{2,5})\s*[—–\-]/);
    return m ? m[1] : titre.replace(/[^A-ZÀ-Ÿ]/gi, '').slice(0, 3).toUpperCase();
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── SVG inline : Toque de diplômé (hero) ─────────────────────
const CAP_SVG = `<svg viewBox="0 0 130 130" aria-hidden="true" class="dv2-hero__cap-svg">
  <defs>
    <linearGradient id="dv2-cap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.55)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.15)"/>
    </linearGradient>
  </defs>
  <ellipse cx="65" cy="92" rx="44" ry="8" fill="rgba(0,0,0,0.18)"/>
  <path d="M65 30 L115 50 L65 70 L15 50 Z" fill="url(#dv2-cap)" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linejoin="round"/>
  <path d="M30 56 V78 Q30 88 65 88 Q100 88 100 78 V56" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linejoin="round"/>
  <path d="M65 70 L65 50" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  <line x1="115" y1="50" x2="118" y2="76" stroke="rgba(255,255,255,0.5)" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="118" cy="80" r="6" fill="var(--color-accent-400)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
</svg>`;

// ─── SVG inline : Icône admin (hero dashboard admin) ──────────
const ADMIN_SVG = `<svg viewBox="0 0 130 130" aria-hidden="true" class="dv2-hero__cap-svg">
  <defs>
    <linearGradient id="dv2-adm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.5)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.1)"/>
    </linearGradient>
  </defs>
  <!-- Fond circulaire -->
  <circle cx="65" cy="65" r="44" fill="url(#dv2-adm)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
  <!-- Shield / bouclier admin -->
  <path d="M65 28 L92 40 L92 62 Q92 80 65 96 Q38 80 38 62 L38 40 Z"
        fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linejoin="round"/>
  <!-- Coche admin -->
  <path d="M52 63 L61 72 L78 53"
        stroke="rgba(255,255,255,0.9)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

// ─── SVG inline : Médaille (achievements) ─────────────────────
function medalSVG(ribbon) {
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M30 40 L20 80 L34 76 L40 88 L50 60 Z" fill="${ribbon}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5" stroke-linejoin="round" opacity="0.8"/>
  <path d="M70 40 L80 80 L66 76 L60 88 L50 60 Z" fill="${ribbon}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5" stroke-linejoin="round" opacity="0.95"/>
  <circle cx="50" cy="42" r="22" fill="var(--color-accent-300)" stroke="var(--color-accent-600)" stroke-width="2.5"/>
  <circle cx="50" cy="42" r="14" fill="var(--color-accent-100)" stroke="var(--color-accent-600)" stroke-width="1.5"/>
  <path d="M50 32 l3 7 l8 1 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 l8 -1 z" fill="var(--color-accent-600)"/>
</svg>`;
}
