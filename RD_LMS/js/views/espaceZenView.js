/**
 * espaceZenView.js — Espace Zen du dashboard stagiaire
 * Pages : Lecture · Musique
 * Musique : radios libres avec lecteur HTML5 intégré (sans compte requis)
 * Lecture : trois types — conseil, lien externe, article avec volet latéral
 */

// ─── Radios en direct ─────────────────────────────────────────
// Streams icecast — plus fiables que stream.radiofrance.fr pour l'embed navigateur
const DIRECT_STREAMS = [
    {
        id:      'fip',
        name:    'FIP',
        genre:   'Éclectique · Jazz · Monde · Rock',
        color:   'primary',
        icon:    'radio',
        stream:  'https://icecast.radiofrance.fr/fip-midfi.mp3',
        website: 'https://www.radiofrance.fr/fip',
        label:   'Radio France',
        desc:    'La radio sans frontières : jazz, world, indie, pop — une curation musicale unique.',
    },
    {
        id:      'franceculture',
        name:    'France Culture',
        genre:   'Documentaires · Philosophie · Sciences · Société',
        color:   'secondary',
        icon:    'book-open',
        stream:  'https://icecast.radiofrance.fr/franceculture-midfi.mp3',
        website: 'https://www.radiofrance.fr/franceculture',
        label:   'Radio France',
        desc:    'Conférences, émissions de fond et documentaires sonores pour enrichir votre culture.',
    },
    {
        id:      'franceinter',
        name:    'France Inter',
        genre:   'Actualité · Culture · Humour · Musique',
        color:   'accent',
        icon:    'mic',
        stream:  'https://icecast.radiofrance.fr/franceinter-midfi.mp3',
        website: 'https://www.radiofrance.fr/franceinter',
        label:   'Radio France',
        desc:    'La première radio française : information, culture et débats accessibles à tous.',
    },
    {
        id:      'nova',
        name:    'Radio Nova',
        genre:   'Funk · Soul · Hip-Hop · Monde · Jazz',
        color:   'primary',
        icon:    'music',
        stream:  'https://novazz.ice.infomaniak.ch/novaparis.mp3',
        website: 'https://nova.fr',
        label:   'Nova',
        desc:    'Radio indépendante emblématique, programmation éclectique et pointue depuis 1981.',
    },
    {
        id:      'meuh',
        name:    'Radio Meuh',
        genre:   'Funk · Groove · Hip-Hop · Soul · Techno',
        color:   'secondary',
        icon:    'headphones',
        stream:  'https://radiomeuh.ice.infomaniak.ch/radiomeuh-128.mp3',
        website: 'https://www.radiomeuh.com',
        label:   'Radio Meuh',
        desc:    'Webradio groove et festive depuis la montagne — funk, hip-hop et soul non-stop.',
    },
];

// ─── Plateformes à explorer ────────────────────────────────────
const EXPLORE_LINKS = [
    { id: 'radiogarden', name: 'Radio Garden',         desc: 'Explorez toutes les radios du monde sur un globe interactif. Cliquez sur n\'importe quelle ville et écoutez sa radio locale.', icon: 'globe-2',    color: 'accent',    url: 'https://radio.garden',                badge: 'Incontournable' },
    { id: 'nts',         name: 'NTS Radio',             desc: 'Plateforme globale avec studios à Londres, LA et Shanghai. Programmation avant-gardiste aux frontières de l\'électronique.', icon: 'radio',     color: 'primary',   url: 'https://www.nts.live',                badge: 'Découverte'     },
    { id: 'arteradio',   name: 'Arte Radio',            desc: 'Documentaires sonores, fictions et créations originales audio de grande qualité sur des sujets de société et de culture.',  icon: 'mic-2',     color: 'secondary', url: 'https://www.arteradio.com',           badge: 'Culturel'       },
    { id: 'radioplayer', name: 'Radioplayer France',    desc: 'Plus de 800 radios françaises (publiques et privées) sur une interface unique et gratuite.',                                 icon: 'list-music',color: 'accent',    url: 'https://www.radioplayer.fr',          badge: '800+ radios'    },
    { id: 'allzic',      name: 'Allzic Radio',          desc: 'Large catalogue de webradios thématiques françaises (Chill Out, Classique, Lounge…) accessibles gratuitement.',            icon: 'music-2',   color: 'primary',   url: 'https://www.allzic.com',              badge: 'Thématique'     },
    { id: 'toutes',      name: 'Toutes-les-radios.fr',  desc: 'Annuaire de centaines de webradios françaises avec filtres par genre musical. Idéal pour explorer selon son humeur.',      icon: 'search',    color: 'secondary', url: 'https://www.toutes-les-radios.fr',    badge: 'Annuaire'       },
];

// ─── Catégories articles ───────────────────────────────────────
const CAT_LABELS = {
    inspiration: { label: 'Inspiration',  color: 'accent'    },
    'bien-etre': { label: 'Bien-être',    color: 'secondary' },
    methode:     { label: 'Méthode',      color: 'primary'   },
    cariere:     { label: 'Carrière',     color: 'primary'   },
    actualite:   { label: 'Actualité',    color: 'secondary' },
};

// ─── NAV ──────────────────────────────────────────────────────
const ZEN_NAV = [
    { hash: '#/espace-zen/lecture', icon: 'book',  label: 'Lecture' },
    { hash: '#/espace-zen/musique', icon: 'music', label: 'Musique' },
];

// ─── Rendu principal ──────────────────────────────────────────
export function renderEspaceZenPage(container, { page, articles = [] }) {
    const navHTML = ZEN_NAV.map(item => {
        const active = location.hash === item.hash;
        return `
        <a href="${item.hash}" class="tp-sidebar-link${active ? ' active' : ''}">
          <i data-lucide="${item.icon}" aria-hidden="true"></i>
          <span>${item.label}</span>
        </a>`;
    }).join('');

    const content = page === 'lecture'
        ? buildLecturePage(articles)
        : buildMusiquePage();

    container.innerHTML = `
    <div class="tp-page">

      <nav class="page-breadcrumb" aria-label="Fil d'ariane">
        <a href="#/dashboard" class="page-breadcrumb__link">Dashboard</a>
        <i data-lucide="chevron-right" aria-hidden="true"></i>
        <span class="page-breadcrumb__current">Espace Zen</span>
        <i data-lucide="chevron-right" aria-hidden="true"></i>
        <span class="page-breadcrumb__current">${page === 'lecture' ? 'Lecture' : 'Musique'}</span>
      </nav>

      <div class="tp-hero tp-hero--zen">
        <div class="tp-hero__content">
          <div class="tp-hero__eyebrow">
            <i data-lucide="leaf" aria-hidden="true"></i>
            <span>Espace Zen</span>
          </div>
          <h1 class="tp-hero__title">
            ${page === 'lecture' ? 'Lecture & développement' : 'Musique & concentration'}
          </h1>
          <p class="tp-hero__sub">
            ${page === 'lecture'
              ? 'Des conseils courts, des articles inspirants — lisez à votre rythme.'
              : 'Radios libres, sans compte, sans abonnement — créez votre bulle de concentration.'}
          </p>
        </div>
        <div class="tp-hero__icon" aria-hidden="true">
          <i data-lucide="${page === 'lecture' ? 'book-open' : 'headphones'}"></i>
        </div>
      </div>

      <div class="tp-layout">
        <aside class="tp-sidebar" aria-label="Navigation Espace Zen">
          <div class="tp-sidebar__label">Sections</div>
          ${navHTML}
          <div class="zen-sidebar-quote">
            <i data-lucide="quote" aria-hidden="true"></i>
            <p>« Prendre soin de soi n'est pas un luxe, c'est une nécessité. »</p>
          </div>
        </aside>

        <main class="tp-main" id="zen-main">
          ${content}
        </main>
      </div>
    </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons({ root: container });

    if (page === 'musique') {
        mountRadioPlayer(container);
    } else {
        mountLectureInteractions(container, articles);
    }
}

// ─── PAGE LECTURE ─────────────────────────────────────────────

function buildLecturePage(articles) {
    if (!articles.length) {
        return `
        <div class="zen-empty">
          <i data-lucide="book" aria-hidden="true"></i>
          <h3>Articles bientôt disponibles</h3>
          <p>Notre équipe prépare des contenus inspirants et pédagogiques. Revenez bientôt !</p>
        </div>`;
    }

    // Séparer en deux types d'affichage
    const conseils  = articles.filter(a => !a.url_externe && !a.contenu);
    const links     = articles.filter(a =>  a.url_externe && !a.contenu);
    const full      = articles.filter(a =>  a.contenu);

    const blocks = [];

    // Bloc "Conseils du jour"
    if (conseils.length) {
        blocks.push(`
        <section class="zen-lecture-block">
          <div class="zen-lecture-block__header">
            <span class="zen-lecture-block__icon zen-lecture-block__icon--accent">
              <i data-lucide="lightbulb" aria-hidden="true"></i>
            </span>
            <div>
              <h2 class="zen-section-title">Conseils &amp; bonnes pratiques</h2>
              <p class="zen-section-sub">Des astuces courtes pour mieux apprendre et progresser.</p>
            </div>
          </div>
          <div class="zen-conseils-grid">
            ${conseils.map(a => buildConseilCard(a)).join('')}
          </div>
        </section>`);
    }

    // Bloc "Articles à lire"
    if (full.length) {
        blocks.push(`
        <section class="zen-lecture-block">
          <div class="zen-lecture-block__header">
            <span class="zen-lecture-block__icon zen-lecture-block__icon--primary">
              <i data-lucide="book-open" aria-hidden="true"></i>
            </span>
            <div>
              <h2 class="zen-section-title">Articles à lire</h2>
              <p class="zen-section-sub">Cliquez sur "Lire" pour ouvrir l'article dans un volet latéral.</p>
            </div>
          </div>
          <div class="zen-full-articles-grid">
            ${full.map(a => buildFullCard(a)).join('')}
          </div>
        </section>`);
    }

    // Bloc "Liens & ressources"
    if (links.length) {
        blocks.push(`
        <section class="zen-lecture-block">
          <div class="zen-lecture-block__header">
            <span class="zen-lecture-block__icon zen-lecture-block__icon--secondary">
              <i data-lucide="external-link" aria-hidden="true"></i>
            </span>
            <div>
              <h2 class="zen-section-title">Liens &amp; ressources</h2>
              <p class="zen-section-sub">Articles sélectionnés sur le web — s'ouvrent dans un nouvel onglet.</p>
            </div>
          </div>
          <div class="zen-links-list">
            ${links.map(a => buildLinkRow(a)).join('')}
          </div>
        </section>`);
    }

    // Fallback : si tous les articles sont d'un type mixte, afficher ensemble
    if (!blocks.length) {
        blocks.push(`<div class="zen-articles__grid">
            ${articles.map(a => buildArticleCard(a, a.url_externe ? 'external' : a.contenu ? 'drawer' : 'conseil')).join('')}
        </div>`);
    }

    return `<div class="zen-articles">${blocks.join('')}</div>`;
}

// ─── Conseil card (tip inline, pas de lien externe) ───────────
function buildConseilCard(article) {
    const cat  = CAT_LABELS[article.categorie] || { label: article.categorie, color: 'accent' };
    const dur  = article.duree_lecture || 2;
    return `
    <div class="zen-conseil" data-cat="${article.categorie}">
      <div class="zen-conseil__icon">
        <i data-lucide="lightbulb" aria-hidden="true"></i>
      </div>
      <div class="zen-conseil__body">
        <div class="zen-conseil__title">${esc(article.titre)}</div>
        ${article.excerpt ? `<div class="zen-conseil__excerpt">${esc(article.excerpt)}</div>` : ''}
        <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
          <span class="badge badge--${cat.color} badge--sm">${esc(cat.label)}</span>
          <span style="font-size:11px;color:var(--text-muted);display:inline-flex;align-items:center;gap:4px;">
            <i data-lucide="clock" aria-hidden="true"></i>${dur} min
          </span>
        </div>
      </div>
    </div>`;
}

// ─── Lien externe (ligne cliquable) ──────────────────────────
function buildLinkRow(article) {
    const cat = CAT_LABELS[article.categorie] || { label: article.categorie, color: 'secondary' };
    return `
    <a href="${escAttr(article.url_externe)}" target="_blank" rel="noopener noreferrer"
       class="zen-link-row" title="${esc(article.titre)}">
      <div class="zen-link-row__icon">
        <i data-lucide="link" aria-hidden="true"></i>
      </div>
      <div class="zen-link-row__body">
        <div class="zen-link-row__title">${esc(article.titre)}</div>
        ${article.excerpt ? `<div class="zen-link-row__excerpt">${esc(article.excerpt)}</div>` : ''}
      </div>
      <span class="badge badge--${cat.color} badge--sm" style="flex-shrink:0">${esc(cat.label)}</span>
      <div class="zen-link-row__arrow"><i data-lucide="arrow-up-right" aria-hidden="true"></i></div>
    </a>`;
}

// ─── Carte article complet (volet latéral) ────────────────────
function buildFullCard(article) {
    const cat      = CAT_LABELS[article.categorie] || { label: article.categorie, color: 'primary' };
    const duree    = article.duree_lecture || 5;
    const initials = (article.titre || '?').slice(0, 2).toUpperCase();

    const thumbContent = article.image_url
        ? `<img src="${escAttr(article.image_url)}" alt="" loading="lazy" class="zen-full-card__img"
               onerror="this.closest('.zen-full-card__thumb').style.background='var(--surface-subtle)';this.remove()">`
        : `<div class="zen-full-card__initials">${initials}</div>`;

    return `
    <button class="zen-full-card js-open-drawer" data-article-id="${article.id}"
            aria-label="Lire ${esc(article.titre)}">
      <div class="zen-full-card__thumb zen-article__thumb--${cat.color}">
        ${thumbContent}
        <span class="zen-article__cat badge badge--${cat.color}">${esc(cat.label)}</span>
      </div>
      <div class="zen-full-card__body">
        <h3 class="zen-full-card__title">${esc(article.titre)}</h3>
        ${article.excerpt ? `<p class="zen-full-card__excerpt">${esc(article.excerpt)}</p>` : ''}
        <div class="zen-full-card__footer">
          <span class="zen-full-card__time">
            <i data-lucide="clock" aria-hidden="true"></i> ${duree} min
          </span>
          <span class="zen-full-card__cta">
            Lire <i data-lucide="panel-right" aria-hidden="true"></i>
          </span>
        </div>
      </div>
    </button>`;
}

// ─── Article card générique (conservé pour compatibilité) ─────
function buildArticleCard(article, type) {
    const cat      = CAT_LABELS[article.categorie] || { label: article.categorie, color: 'primary' };
    const duree    = article.duree_lecture || 5;
    const initials = (article.titre || '?').slice(0, 2).toUpperCase();
    const artId    = article.id;

    const thumbContent = article.image_url
        ? `<img src="${escAttr(article.image_url)}" alt="" loading="lazy" class="zen-article__img"
               onerror="this.closest('.zen-article__thumb').classList.add('zen-article__thumb--fallback');this.remove()">`
        : `<span class="zen-article__initials">${initials}</span>`;

    const action = type === 'external'
        ? `<a href="${escAttr(article.url_externe)}" target="_blank" rel="noopener noreferrer"
              class="zen-article__read-link zen-article__read-link--ext">
             Lire l'article <i data-lucide="arrow-up-right"></i>
           </a>`
        : `<button class="zen-article__read-link js-open-drawer"
                   data-article-id="${artId}" aria-label="Lire ${esc(article.titre)}">
             Lire <i data-lucide="chevron-right"></i>
           </button>`;

    return `
    <article class="zen-article zen-article--${type}">
      <div class="zen-article__thumb zen-article__thumb--${cat.color}">
        ${thumbContent}
        <span class="zen-article__cat badge badge--${cat.color}">${esc(cat.label)}</span>
      </div>
      <div class="zen-article__body">
        <h3 class="zen-article__title">${esc(article.titre)}</h3>
        ${article.excerpt ? `<p class="zen-article__excerpt">${esc(article.excerpt)}</p>` : ''}
        <div class="zen-article__meta">
          <span class="zen-article__time">
            <i data-lucide="clock" aria-hidden="true"></i> ${duree} min
          </span>
          ${action}
        </div>
      </div>
    </article>`;
}

// ─── Volet latéral (drawer) pour articles internes ────────────
function mountLectureInteractions(container, articles) {
    // Créer le drawer s'il n'existe pas
    let drawer = document.getElementById('zen-article-drawer');
    if (!drawer) {
        drawer = document.createElement('div');
        drawer.id        = 'zen-article-drawer';
        drawer.className = 'zen-drawer';
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        drawer.innerHTML = `
          <div class="zen-drawer__overlay" id="zen-drawer-overlay"></div>
          <div class="zen-drawer__panel">
            <div class="zen-drawer__header">
              <div class="zen-drawer__header-meta" id="zen-drawer-meta"></div>
              <button class="zen-drawer__close" id="zen-drawer-close" aria-label="Fermer">
                <i data-lucide="x" aria-hidden="true"></i>
              </button>
            </div>
            <h2 class="zen-drawer__title" id="zen-drawer-title"></h2>
            <div class="zen-drawer__body" id="zen-drawer-body"></div>
          </div>`;
        document.body.appendChild(drawer);
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: drawer });
    }

    const openDrawer  = (article) => {
        const cat = CAT_LABELS[article.categorie] || { label: article.categorie, color: 'primary' };
        const dur = article.duree_lecture || 5;
        drawer.querySelector('#zen-drawer-title').textContent  = article.titre || '';
        drawer.querySelector('#zen-drawer-meta').innerHTML = `
          <span class="badge badge--${cat.color} badge--sm">${esc(cat.label)}</span>
          <span class="zen-drawer__time"><i data-lucide="clock"></i> ${dur} min</span>`;
        drawer.querySelector('#zen-drawer-body').innerHTML = article.contenu
            ? `<div class="zen-drawer__content">${article.contenu.replace(/\n/g, '<br>')}</div>`
            : `<p class="zen-drawer__excerpt">${esc(article.excerpt || '')}</p>`;
        drawer.classList.add('zen-drawer--open');
        drawer.querySelector('#zen-drawer-close').focus();
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: drawer.querySelector('#zen-drawer-meta') });
        document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
        drawer.classList.remove('zen-drawer--open');
        document.body.style.overflow = '';
    };

    // Boutons "Lire" (drawer)
    container.querySelectorAll('.js-open-drawer').forEach(btn => {
        btn.addEventListener('click', () => {
            const id  = btn.dataset.articleId;
            const art = articles.find(a => a.id === id);
            if (art) openDrawer(art);
        });
    });

    // Fermer
    document.getElementById('zen-drawer-close')?.addEventListener('click', closeDrawer);
    document.getElementById('zen-drawer-overlay')?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') { closeDrawer(); document.removeEventListener('keydown', onEsc); }
    });
    // Fermer sur navigation
    window.addEventListener('hashchange', closeDrawer, { once: true });
}

// ─── PAGE MUSIQUE ─────────────────────────────────────────────
function buildMusiquePage() {
    return `
    <!-- Lecteur audio caché, réutilisé pour toutes les radios -->
    <audio id="zen-audio" preload="none" crossorigin="anonymous"></audio>

    <section class="zen-section-block">
      <div class="zen-section-block__header">
        <h2 class="zen-section-title"><i data-lucide="radio"></i> Radios en direct</h2>
        <p class="zen-section-sub">Aucun compte requis — cliquez ▶ et c'est parti.</p>
      </div>
      <div class="zen-radios">
        ${DIRECT_STREAMS.map(r => buildRadioCard(r)).join('')}
      </div>
    </section>

    <section class="zen-section-block" style="margin-top: var(--space-8)">
      <div class="zen-section-block__header">
        <h2 class="zen-section-title"><i data-lucide="globe-2"></i> Explorer &amp; découvrir</h2>
        <p class="zen-section-sub">Plateformes gratuites pour aller encore plus loin.</p>
      </div>
      <div class="zen-explore-grid">
        ${EXPLORE_LINKS.map(l => buildExploreCard(l)).join('')}
      </div>
    </section>

    <div class="tp-notice tp-notice--tip" style="margin-top: var(--space-6)">
      <i data-lucide="lightbulb" aria-hidden="true"></i>
      <div>
        <strong>Conseil</strong> — La musique sans paroles (FIP, Radio Meuh) aide davantage
        à la concentration que les radios parlées. France Culture est idéale pendant les pauses.
      </div>
    </div>`;
}

function buildRadioCard(r) {
    return `
    <div class="zen-radio zen-radio--${r.color}" id="radio-card-${r.id}">
      <div class="zen-radio__icon">
        <i data-lucide="${r.icon}" aria-hidden="true"></i>
      </div>
      <div class="zen-radio__body">
        <div class="zen-radio__name">${esc(r.name)}</div>
        <div class="zen-radio__genre">${esc(r.genre)}</div>
        <div class="zen-radio__desc">${esc(r.desc)}</div>
      </div>
      <div class="zen-radio__actions">
        <button class="zen-radio__play-btn js-radio-play"
                id="play-btn-${r.id}"
                data-radio-id="${r.id}"
                data-stream="${escAttr(r.stream)}"
                aria-label="Écouter ${esc(r.name)}" title="Écouter">
          <i data-lucide="play" aria-hidden="true"></i>
        </button>
        <a href="${escAttr(r.website)}" target="_blank" rel="noopener noreferrer"
           class="zen-radio__site-btn" aria-label="Site de ${esc(r.name)}" title="Site officiel">
          <i data-lucide="external-link" aria-hidden="true"></i>
        </a>
      </div>
    </div>`;
}

function buildExploreCard(l) {
    return `
    <a href="${escAttr(l.url)}" target="_blank" rel="noopener noreferrer"
       class="zen-explore zen-explore--${l.color}">
      <div class="zen-explore__icon">
        <i data-lucide="${l.icon}" aria-hidden="true"></i>
      </div>
      <div class="zen-explore__body">
        <div class="zen-explore__top">
          <span class="zen-explore__name">${esc(l.name)}</span>
          <span class="zen-explore__badge">${esc(l.badge)}</span>
        </div>
        <p class="zen-explore__desc">${esc(l.desc)}</p>
      </div>
      <i data-lucide="arrow-up-right" class="zen-explore__arrow" aria-hidden="true"></i>
    </a>`;
}

// ─── Lecteur radio HTML5 ──────────────────────────────────────
// Correction critique : Lucide remplace <i data-lucide> par <svg>, donc on ne peut
// plus utiliser le sélecteur "i[data-lucide]". On ré-injecte un <i> à chaque changement.
function mountRadioPlayer(container) {
    const audio = container.querySelector('#zen-audio');
    if (!audio) { console.warn('[Zen] #zen-audio introuvable'); return; }

    let currentId = null;

    container.querySelectorAll('.js-radio-play').forEach(btn => {
        btn.addEventListener('click', () => {
            const radioId = btn.dataset.radioId;
            const stream  = btn.dataset.stream;

            // Pause si déjà en lecture
            if (currentId === radioId && !audio.paused) {
                audio.pause();
                setRadioState(radioId, 'idle');
                currentId = null;
                return;
            }

            // Arrêter la précédente
            if (currentId && currentId !== radioId) {
                audio.pause();
                setRadioState(currentId, 'idle');
            }

            // Lancer la nouvelle
            currentId = radioId;
            setRadioState(radioId, 'loading');
            audio.src = stream;
            audio.load();
            audio.play()
                .then(()  => setRadioState(radioId, 'playing'))
                .catch(err => {
                    console.error('[Zen Radio] Erreur lecture :', err);
                    setRadioState(radioId, 'error');
                    currentId = null;
                });
        });
    });

    audio.addEventListener('ended',   () => { if (currentId) { setRadioState(currentId, 'idle'); currentId = null; } });
    audio.addEventListener('error',   () => { if (currentId) { setRadioState(currentId, 'error'); currentId = null; } });
    audio.addEventListener('waiting', () => { if (currentId) setRadioState(currentId, 'loading'); });
    audio.addEventListener('playing', () => { if (currentId) setRadioState(currentId, 'playing'); });

    // ── Swap d'icône fiable : on ré-injecte un <i> et on appelle createIcons ──
    function setRadioState(radioId, state) {
        const card = container.querySelector(`#radio-card-${radioId}`);
        const btn  = container.querySelector(`#play-btn-${radioId}`);
        if (!card) return;

        // Classe CSS de la carte
        card.classList.remove('zen-radio--playing', 'zen-radio--loading', 'zen-radio--error');
        if      (state === 'playing') card.classList.add('zen-radio--playing');
        else if (state === 'loading') card.classList.add('zen-radio--loading');
        else if (state === 'error')   card.classList.add('zen-radio--error');

        // Icône du bouton — on ré-injecte <i> pour que lucide puisse la traiter
        if (btn) {
            const ICONS = { playing: 'square', loading: 'loader-2', error: 'wifi-off', idle: 'play' };
            btn.innerHTML = `<i data-lucide="${ICONS[state] || 'play'}" aria-hidden="true"></i>`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
        }
    }
}

// ─── Helpers ─────────────────────────────────────────────────
function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
function escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
