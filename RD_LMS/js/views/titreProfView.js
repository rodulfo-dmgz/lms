/**
 * titreProfView.js — Pages "Titre Professionnel" du dashboard stagiaire
 * Sections : REAC · Compétences · Référentiel d'évaluation · ECF · Dossier professionnel
 */

// ─── Configuration des pages ──────────────────────────────────
const PAGE_META = {
    reac: {
        icon:    'file-text',
        label:   'REAC',
        title:   'Référentiel Emploi Activités Compétences',
        color:   'primary',
        breadcrumb: 'REAC',
    },
    competences: {
        icon:    'check-square',
        label:   'Compétences visées',
        title:   'Compétences visées par votre titre',
        color:   'secondary',
        breadcrumb: 'Compétences',
    },
    referentiel: {
        icon:    'clipboard',
        label:   "Référentiel d'évaluation",
        title:   "Modalités d'évaluation",
        color:   'accent',
        breadcrumb: 'Référentiel',
    },
    ecf: {
        icon:    'pen-tool',
        label:   'ECF',
        title:   'Évaluations en cours de formation',
        color:   'primary',
        breadcrumb: 'ECF',
    },
    'dossier-pro': {
        icon:    'folder',
        label:   'Dossier professionnel',
        title:   'Votre dossier professionnel',
        color:   'secondary',
        breadcrumb: 'Dossier Pro',
    },
};

// ─── Sommaire latéral ─────────────────────────────────────────
const NAV_ITEMS = [
    { hash: '#/titre-pro/reac',        icon: 'file-text',    label: 'REAC'                      },
    { hash: '#/titre-pro/competences',  icon: 'check-square', label: 'Compétences visées'         },
    { hash: '#/titre-pro/referentiel',  icon: 'clipboard',    label: "Référentiel d'évaluation"   },
    { hash: '#/titre-pro/ecf',          icon: 'pen-tool',     label: 'ECF'                        },
    { hash: '#/titre-pro/dossier-pro',  icon: 'folder',       label: 'Dossier professionnel'      },
];

// ─── Mapping types de documents par page ─────────────────────
const PAGE_DOC_TYPES = {
    reac:          ['reac', 'referentiel'],
    competences:   ['reac', 'referentiel'],
    referentiel:   ['referentiel', 'grille_ecf'],
    ecf:           ['grille_ecf'],
    'dossier-pro': ['dp_modele', 'annexe'],
};

const DOC_TYPE_LABELS = {
    reac:          { label: 'REAC',                  icon: 'file-text',  color: 'primary'   },
    referentiel:   { label: 'Référentiel',            icon: 'clipboard',  color: 'secondary' },
    dp_modele:     { label: 'Modèle DP',              icon: 'folder',     color: 'accent'    },
    grille_ecf:    { label: 'Grille ECF',             icon: 'pen-tool',   color: 'primary'   },
    annexe:        { label: 'Annexe',                 icon: 'paperclip',  color: 'secondary' },
    autre:         { label: 'Document',               icon: 'file',       color: 'secondary' },
};

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024)       return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ─── Section de téléchargements ───────────────────────────────
function buildDocsSection(page, docs) {
    const relevantTypes = PAGE_DOC_TYPES[page] || [];
    const relevantDocs  = docs.filter(d => relevantTypes.includes(d.type));

    if (!relevantDocs.length) return '';

    const rows = relevantDocs.map(doc => {
        const meta = DOC_TYPE_LABELS[doc.type] || DOC_TYPE_LABELS.autre;
        const size = doc.file_size ? ` <span class="tp-doc-size">${formatFileSize(doc.file_size)}</span>` : '';
        const link = doc.url_public
            ? `<a href="${esc(doc.url_public)}" target="_blank" rel="noopener noreferrer"
                  class="btn btn-secondary btn-sm tp-doc-btn" title="Télécharger ${esc(doc.nom)}">
                 <i data-lucide="download" aria-hidden="true"></i> Télécharger
               </a>`
            : `<span class="tp-doc-unavail"><i data-lucide="lock" aria-hidden="true"></i> Non disponible</span>`;

        return `
        <div class="tp-doc-row">
          <div class="tp-doc-row__icon tp-doc-row__icon--${meta.color}">
            <i data-lucide="${meta.icon}" aria-hidden="true"></i>
          </div>
          <div class="tp-doc-row__body">
            <div class="tp-doc-row__name">${esc(doc.nom)}</div>
            <div class="tp-doc-row__meta">
              <span class="tp-meta-badge tp-meta-badge--sm">${esc(meta.label)}</span>
              ${size}
              ${doc.description ? `<span class="tp-doc-row__desc">${esc(doc.description)}</span>` : ''}
            </div>
          </div>
          <div class="tp-doc-row__action">${link}</div>
        </div>`;
    }).join('');

    return `
    <div class="tp-section tp-section--docs">
      <h3 class="tp-section__title"><i data-lucide="download-cloud"></i> Documents à télécharger</h3>
      <div class="tp-docs-list">${rows}</div>
    </div>`;
}

// ─── Visionneuse PDF (lazy iframe) ───────────────────────────
function buildPDFViewer(docs, types, label) {
    const doc = docs.find(d => types.includes(d.type) && d.url_public);
    if (!doc) return '';
    const uid = `pdf-${doc.id}`;
    return `
    <div class="tp-pdf-block">
      <button class="tp-pdf-toggle js-pdf-toggle" data-target="${uid}" aria-expanded="false">
        <i data-lucide="file-text" aria-hidden="true"></i>
        <span>${esc(label)} — <em>${esc(doc.nom)}</em></span>
        <i data-lucide="chevron-down" class="tp-pdf-toggle__arrow" aria-hidden="true"></i>
      </button>
      <div class="tp-pdf-wrapper" id="${uid}" style="display:none">
        <div class="tp-pdf-toolbar">
          <span class="tp-pdf-toolbar__name"><i data-lucide="file" aria-hidden="true"></i>${esc(doc.nom)}</span>
          <a href="${esc(doc.url_public)}" target="_blank" rel="noopener noreferrer"
             class="btn btn-secondary btn-sm" title="Ouvrir dans un nouvel onglet">
            <i data-lucide="maximize-2" aria-hidden="true"></i> Plein écran
          </a>
        </div>
        <iframe data-src="${esc(doc.url_public)}" class="tp-pdf-frame"
                title="${esc(doc.nom)}" loading="lazy">
          <p>Votre navigateur ne supporte pas l'affichage de PDF inline.
             <a href="${esc(doc.url_public)}" target="_blank">Télécharger le fichier</a>.
          </p>
        </iframe>
      </div>
    </div>`;
}

// ─── Arbre AT / CP depuis le référentiel ─────────────────────
function buildReferentielTree(referentiel) {
    if (!referentiel?.length) return '';

    const ccpBlocks = referentiel.map((ccp, idx) => {
        const activites = (ccp.lms_activites || [])
            .sort((a, b) => a.ordre - b.ordre);

        const atBlocks = activites.map((at, atIdx) => {
            const competences = (at.lms_competences || [])
                .sort((a, b) => a.ordre - b.ordre);

            const cpItems = competences.map(cp => `
                <li class="tp-cp">
                  <span class="tp-cp__dot"></span>
                  <div class="tp-cp__body">
                    <div class="tp-cp__title">${esc(cp.intitule)}</div>
                    ${cp.description_processus
                        ? `<div class="tp-cp__desc">${esc(cp.description_processus)}</div>`
                        : ''}
                  </div>
                </li>`).join('');

            return `
            <div class="tp-at">
              <div class="tp-at__header">
                <span class="tp-at__num">${atIdx + 1}</span>
                <div>
                  <div class="tp-at__title">${esc(at.intitule)}</div>
                  ${at.description ? `<div class="tp-at__desc">${esc(at.description)}</div>` : ''}
                </div>
              </div>
              ${competences.length
                ? `<ul class="tp-cp-list">${cpItems}</ul>`
                : '<p class="tp-at__empty">Aucune compétence renseignée pour cette activité.</p>'}
            </div>`;
        }).join('');

        const ccpId = `ccp-body-${ccp.id}`;
        return `
        <div class="tp-ccp" id="ccp-${ccp.id}">
          <button class="tp-ccp__header js-ccp-toggle" data-target="${ccpId}" aria-expanded="${idx === 0}">
            <span class="tp-ccp__code">${esc(ccp.code)}</span>
            <span class="tp-ccp__title">${esc(ccp.intitule)}</span>
            <span class="tp-ccp__count">${activites.length} AT · ${activites.reduce((s, a) => s + (a.lms_competences?.length || 0), 0)} CP</span>
            <i data-lucide="${idx === 0 ? 'chevron-up' : 'chevron-down'}" class="tp-ccp__arrow" aria-hidden="true"></i>
          </button>
          <div class="tp-ccp__body" id="${ccpId}" ${idx === 0 ? '' : 'style="display:none"'}>
            ${atBlocks || '<p class="tp-ccp__empty">Aucune activité type renseignée pour ce CCP.</p>'}
          </div>
        </div>`;
    }).join('');

    return `
    <div class="tp-section">
      <h3 class="tp-section__title"><i data-lucide="layers"></i> Référentiel de compétences</h3>
      <div class="tp-referentiel-tree" id="referentiel-tree">
        ${ccpBlocks}
      </div>
    </div>`;
}

// ─── Contenu éducatif par page ────────────────────────────────
function buildPageContent(page, titrePro, docs = [], referentiel = []) {
    const code     = titrePro?.code_rncp  || '';
    const intitule = titrePro?.intitule   || 'votre titre professionnel';
    const sigle    = titrePro?.sigle      || '';
    const niveau   = titrePro?.niveau     ? `Niveau ${titrePro.niveau}` : '';

    switch (page) {

        case 'reac': return `
        <div class="tp-content">
          <div class="tp-intro">
            <p>Le <strong>REAC (Référentiel Emploi Activités Compétences)</strong> est le document officiel
            qui décrit les activités et compétences attendues pour l'obtention de votre titre professionnel.</p>
            <p>Il définit les situations professionnelles dans lesquelles vous devez vous montrer compétent,
            ainsi que les critères d'appréciation qui seront utilisés lors de votre évaluation finale.</p>
          </div>

          ${titrePro ? `
          <div class="tp-titre-card">
            <div class="tp-titre-card__header">
              <i data-lucide="award" aria-hidden="true"></i>
              <div>
                <div class="tp-titre-card__label">Votre titre professionnel</div>
                <div class="tp-titre-card__title">${esc(intitule)}</div>
              </div>
            </div>
            <div class="tp-titre-card__meta">
              ${code    ? `<span class="tp-meta-badge"><i data-lucide="hash"></i>${esc(code)}</span>`   : ''}
              ${sigle   ? `<span class="tp-meta-badge"><i data-lucide="tag"></i>${esc(sigle)}</span>`   : ''}
              ${niveau  ? `<span class="tp-meta-badge tp-meta-badge--primary"><i data-lucide="bar-chart-2"></i>${esc(niveau)}</span>` : ''}
            </div>
          </div>` : `
          <div class="tp-notice tp-notice--info">
            <i data-lucide="info" aria-hidden="true"></i>
            <span>Aucun titre professionnel n'a encore été associé à votre profil. Contactez votre formateur.</span>
          </div>`}

          <div class="tp-section">
            <h3 class="tp-section__title"><i data-lucide="layers"></i> Structure du REAC</h3>
            <div class="tp-cards-grid">
              <div class="tp-info-card">
                <div class="tp-info-card__icon tp-info-card__icon--primary"><i data-lucide="briefcase"></i></div>
                <div class="tp-info-card__body">
                  <div class="tp-info-card__label">Activités Types</div>
                  <div class="tp-info-card__text">Grandes catégories de tâches professionnelles que vous devrez maîtriser.</div>
                </div>
              </div>
              <div class="tp-info-card">
                <div class="tp-info-card__icon tp-info-card__icon--secondary"><i data-lucide="check-square"></i></div>
                <div class="tp-info-card__body">
                  <div class="tp-info-card__label">Compétences Professionnelles</div>
                  <div class="tp-info-card__text">Compétences précises attendues dans chaque activité type.</div>
                </div>
              </div>
              <div class="tp-info-card">
                <div class="tp-info-card__icon tp-info-card__icon--accent"><i data-lucide="target"></i></div>
                <div class="tp-info-card__body">
                  <div class="tp-info-card__label">Critères de performance</div>
                  <div class="tp-info-card__text">Indicateurs mesurables qui permettent d'évaluer votre niveau de maîtrise.</div>
                </div>
              </div>
            </div>
          </div>

          ${buildDocsSection('reac', docs)}
          ${buildPDFViewer(docs, ['reac', 'referentiel'], 'Visualiser le REAC')}

          <div class="tp-section">
            <h3 class="tp-section__title"><i data-lucide="external-link"></i> Ressources officielles</h3>
            ${titrePro?.url_reac ? `
            <a href="${esc(titrePro.url_reac)}" target="_blank" rel="noopener noreferrer" class="tp-link-card tp-link-card--highlight">
              <div class="tp-link-card__icon"><i data-lucide="file-text"></i></div>
              <div class="tp-link-card__body">
                <div class="tp-link-card__title">REAC officiel — ${esc(intitule)}</div>
                <div class="tp-link-card__sub">Lien direct vers le référentiel de votre titre professionnel</div>
              </div>
              <i data-lucide="arrow-up-right" class="tp-link-card__arrow"></i>
            </a>` : ''}
            <a href="https://www.banque.di.afpa.fr/EspaceEmployeursCandidatsActeurs/EGPRecherche.aspx"
               target="_blank" rel="noopener noreferrer" class="tp-link-card">
              <div class="tp-link-card__icon"><i data-lucide="database"></i></div>
              <div class="tp-link-card__body">
                <div class="tp-link-card__title">Banque de données AFPA</div>
                <div class="tp-link-card__sub">Recherchez votre REAC officiel par code RNCP</div>
              </div>
              <i data-lucide="arrow-up-right" class="tp-link-card__arrow"></i>
            </a>
            <a href="https://travail-emploi.gouv.fr/les-titres-professionnels"
               target="_blank" rel="noopener noreferrer" class="tp-link-card">
              <div class="tp-link-card__icon"><i data-lucide="flag"></i></div>
              <div class="tp-link-card__body">
                <div class="tp-link-card__title">Titres professionnels — Ministère du Travail</div>
                <div class="tp-link-card__sub">Information officielle sur le dispositif des titres pro</div>
              </div>
              <i data-lucide="arrow-up-right" class="tp-link-card__arrow"></i>
            </a>
          </div>
        </div>`;

        case 'competences': return `
        <div class="tp-content">
          <div class="tp-intro">
            <p>Les <strong>compétences visées</strong> sont issues directement du REAC de ${esc(intitule)}.
            Elles représentent ce que vous devrez démontrer savoir faire lors de l'évaluation finale.</p>
            <p>Chaque compétence est associée à une ou plusieurs <em>activités types</em>. Votre parcours de
            formation est structuré pour vous amener progressivement à maîtriser l'ensemble de ces compétences.</p>
          </div>

          <div class="tp-section">
            <h3 class="tp-section__title"><i data-lucide="target"></i> Organisation des compétences</h3>
            <div class="tp-steps">
              <div class="tp-step">
                <div class="tp-step__num">1</div>
                <div class="tp-step__body">
                  <div class="tp-step__title">Activité type (AT)</div>
                  <div class="tp-step__text">Grand domaine de compétences professionnelles (ex: "Gérer la relation client").</div>
                </div>
              </div>
              <div class="tp-step">
                <div class="tp-step__num">2</div>
                <div class="tp-step__body">
                  <div class="tp-step__title">Compétence professionnelle (CP)</div>
                  <div class="tp-step__text">Compétence précise au sein d'une AT (ex: "Traiter les demandes clients par écrit").</div>
                </div>
              </div>
              <div class="tp-step">
                <div class="tp-step__num">3</div>
                <div class="tp-step__body">
                  <div class="tp-step__title">Critère de performance</div>
                  <div class="tp-step__text">Indicateur observable qui confirme la maîtrise de la compétence.</div>
                </div>
              </div>
            </div>
          </div>

          <div class="tp-notice tp-notice--tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <div>
              <strong>Conseil</strong> — Chaque module de votre formation cible une ou plusieurs compétences.
              Consultez votre formateur pour identifier le lien entre vos séances et les compétences du REAC.
            </div>
          </div>

          ${buildReferentielTree(referentiel)}
          ${buildDocsSection('competences', docs)}

          <div class="tp-section">
            <h3 class="tp-section__title"><i data-lucide="external-link"></i> Référence officielle</h3>
            <a href="https://travail-emploi.gouv.fr/les-titres-professionnels"
               target="_blank" rel="noopener noreferrer" class="tp-link-card">
              <div class="tp-link-card__icon"><i data-lucide="flag"></i></div>
              <div class="tp-link-card__body">
                <div class="tp-link-card__title">Titres professionnels — Ministère du Travail</div>
                <div class="tp-link-card__sub">Détail de chaque titre et de ses compétences associées</div>
              </div>
              <i data-lucide="arrow-up-right" class="tp-link-card__arrow"></i>
            </a>
          </div>
        </div>`;

        case 'referentiel': return `
        <div class="tp-content">
          <div class="tp-intro">
            <p>Le <strong>référentiel d'évaluation</strong> (RE) décrit les modalités du passage du titre
            professionnel : comment vous serez évalué, dans quelles conditions, et sur quels critères.</p>
          </div>

          <div class="tp-section">
            <h3 class="tp-section__title"><i data-lucide="clipboard-list"></i> Les modalités d'évaluation</h3>
            <div class="tp-cards-grid">
              <div class="tp-info-card">
                <div class="tp-info-card__icon tp-info-card__icon--primary"><i data-lucide="monitor-check"></i></div>
                <div class="tp-info-card__body">
                  <div class="tp-info-card__label">Mise en situation professionnelle</div>
                  <div class="tp-info-card__text">Épreuve pratique simulant des situations réelles de travail. Durée et conditions définies dans le RE.</div>
                </div>
              </div>
              <div class="tp-info-card">
                <div class="tp-info-card__icon tp-info-card__icon--secondary"><i data-lucide="users"></i></div>
                <div class="tp-info-card__body">
                  <div class="tp-info-card__label">Entretien avec le jury</div>
                  <div class="tp-info-card__text">Échange avec un jury professionnel sur vos expériences, votre dossier et vos compétences.</div>
                </div>
              </div>
              <div class="tp-info-card">
                <div class="tp-info-card__icon tp-info-card__icon--accent"><i data-lucide="folder-open"></i></div>
                <div class="tp-info-card__body">
                  <div class="tp-info-card__label">Dossier professionnel</div>
                  <div class="tp-info-card__text">Document que vous préparez pour attester de vos acquis et de vos expériences professionnelles.</div>
                </div>
              </div>
            </div>
          </div>

          <div class="tp-section">
            <h3 class="tp-section__title"><i data-lucide="award"></i> Résultats possibles</h3>
            <div class="tp-steps">
              <div class="tp-step">
                <div class="tp-step__num tp-step__num--success">✓</div>
                <div class="tp-step__body">
                  <div class="tp-step__title">Titre obtenu</div>
                  <div class="tp-step__text">Toutes les compétences ont été validées. Vous obtenez le titre complet.</div>
                </div>
              </div>
              <div class="tp-step">
                <div class="tp-step__num tp-step__num--partial">~</div>
                <div class="tp-step__body">
                  <div class="tp-step__title">Certificat(s) de compétences (CCP)</div>
                  <div class="tp-step__text">Certains blocs de compétences ont été validés partiellement. Possibilité de repasser les épreuves.</div>
                </div>
              </div>
            </div>
          </div>

          <div class="tp-notice tp-notice--tip">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <div>
              <strong>À noter</strong> — Le jury est composé de professionnels du secteur. Ils évaluent vos
              compétences sur critères précis. Votre formateur vous préparera aux conditions réelles du passage.
            </div>
          </div>

          ${buildDocsSection('referentiel', docs)}
        </div>`;

        case 'ecf': return `
        <div class="tp-content">
          <div class="tp-intro">
            <p>Les <strong>ECF (Évaluations en Cours de Formation)</strong> sont des évaluations réalisées
            tout au long de votre formation, avant le passage devant le jury.</p>
            <p>Elles permettent à votre formateur de s'assurer que vous êtes prêt(e) à passer le titre
            professionnel et de vous préparer aux conditions réelles d'examen.</p>
          </div>

          <div class="tp-section">
            <h3 class="tp-section__title"><i data-lucide="check-circle-2"></i> Rôle des ECF</h3>
            <div class="tp-cards-grid">
              <div class="tp-info-card">
                <div class="tp-info-card__icon tp-info-card__icon--primary"><i data-lucide="gauge"></i></div>
                <div class="tp-info-card__body">
                  <div class="tp-info-card__label">Mesurer votre progression</div>
                  <div class="tp-info-card__text">Identifier vos points forts et les domaines à renforcer avant l'évaluation finale.</div>
                </div>
              </div>
              <div class="tp-info-card">
                <div class="tp-info-card__icon tp-info-card__icon--secondary"><i data-lucide="repeat"></i></div>
                <div class="tp-info-card__body">
                  <div class="tp-info-card__label">S'entraîner</div>
                  <div class="tp-info-card__text">Les ECF reproduisent les conditions de l'évaluation finale pour vous y habituer.</div>
                </div>
              </div>
              <div class="tp-info-card">
                <div class="tp-info-card__icon tp-info-card__icon--accent"><i data-lucide="file-check"></i></div>
                <div class="tp-info-card__body">
                  <div class="tp-info-card__label">Valider les acquis</div>
                  <div class="tp-info-card__text">Chaque ECF réussi confirme votre maîtrise d'une compétence du REAC.</div>
                </div>
              </div>
            </div>
          </div>

          <div class="tp-notice tp-notice--info">
            <i data-lucide="info" aria-hidden="true"></i>
            <div>
              <strong>Calendrier</strong> — Votre formateur vous indiquera les dates des ECF.
              Consultez la section <a href="#/mes-devoirs" class="tp-inline-link">Mes devoirs</a>
              pour suivre vos évaluations à rendre.
            </div>
          </div>

          ${buildDocsSection('ecf', docs)}
        </div>`;

        case 'dossier-pro': return `
        <div class="tp-content">
          <div class="tp-intro">
            <p>Le <strong>dossier professionnel (DP)</strong> est un document personnel et obligatoire
            que vous devez constituer et présenter lors du passage de votre titre professionnel.</p>
            <p>Il décrit vos <em>pratiques professionnelles</em> en lien avec les compétences du REAC,
            à travers des exemples concrets tirés de votre expérience (formation, stage, emploi).</p>
          </div>

          <div class="tp-section">
            <h3 class="tp-section__title"><i data-lucide="file-text"></i> Que contient le DP ?</h3>
            <div class="tp-steps">
              <div class="tp-step">
                <div class="tp-step__num">1</div>
                <div class="tp-step__body">
                  <div class="tp-step__title">Présentation personnelle</div>
                  <div class="tp-step__text">Votre parcours, vos expériences professionnelles et vos motivations.</div>
                </div>
              </div>
              <div class="tp-step">
                <div class="tp-step__num">2</div>
                <div class="tp-step__body">
                  <div class="tp-step__title">Exemples de pratiques professionnelles</div>
                  <div class="tp-step__text">Pour chaque activité type, un exemple concret illustrant votre compétence.</div>
                </div>
              </div>
              <div class="tp-step">
                <div class="tp-step__num">3</div>
                <div class="tp-step__body">
                  <div class="tp-step__title">Documents annexes (optionnel)</div>
                  <div class="tp-step__text">Attestations de stage, travaux réalisés, captures d'écran, etc.</div>
                </div>
              </div>
            </div>
          </div>

          <div class="tp-section">
            <h3 class="tp-section__title"><i data-lucide="lightbulb"></i> Conseils de rédaction</h3>
            <div class="tp-tip-list">
              <div class="tp-tip-item">
                <i data-lucide="check" aria-hidden="true"></i>
                <span>Soyez <strong>concret et factuel</strong> : décrivez des situations réelles que vous avez vécues.</span>
              </div>
              <div class="tp-tip-item">
                <i data-lucide="check" aria-hidden="true"></i>
                <span>Utilisez la <strong>méthode STAR</strong> : Situation, Tâche, Action, Résultat.</span>
              </div>
              <div class="tp-tip-item">
                <i data-lucide="check" aria-hidden="true"></i>
                <span>Chaque exemple doit couvrir <strong>une compétence du REAC</strong>.</span>
              </div>
              <div class="tp-tip-item">
                <i data-lucide="check" aria-hidden="true"></i>
                <span>Relisez-vous et faites <strong>relire par votre formateur</strong> avant la session.</span>
              </div>
              <div class="tp-tip-item">
                <i data-lucide="check" aria-hidden="true"></i>
                <span>Le jury lira votre DP <strong>avant l'entretien</strong> — soignez la présentation.</span>
              </div>
            </div>
          </div>

          <div class="tp-notice tp-notice--tip">
            <i data-lucide="clock" aria-hidden="true"></i>
            <div>
              <strong>Anticipez !</strong> — Le DP se prépare tout au long de la formation, pas la veille de l'examen.
              Notez vos expériences au fur et à mesure.
            </div>
          </div>

          ${buildDocsSection('dossier-pro', docs)}
          ${buildPDFViewer(docs, ['dp_modele'], 'Visualiser le modèle de Dossier Professionnel')}
        </div>`;

        default: return '<div class="tp-content"><p>Page non trouvée.</p></div>';
    }
}

// ─── Rendu principal ──────────────────────────────────────────
export function renderTitreProfPage(container, { page, titrePro, profile, docs = [], referentiel = [] }) {
    const meta = PAGE_META[page] || PAGE_META.reac;

    const navHTML = NAV_ITEMS.map(item => {
        const active = location.hash === item.hash;
        return `
        <a href="${item.hash}" class="tp-sidebar-link${active ? ' active' : ''}">
          <i data-lucide="${item.icon}" aria-hidden="true"></i>
          <span>${item.label}</span>
        </a>`;
    }).join('');

    container.innerHTML = `
    <div class="tp-page">

      <!-- Breadcrumb -->
      <nav class="page-breadcrumb" aria-label="Fil d'ariane">
        <a href="#/dashboard" class="page-breadcrumb__link">Dashboard</a>
        <i data-lucide="chevron-right" aria-hidden="true"></i>
        <span class="page-breadcrumb__current">Titre Professionnel</span>
        <i data-lucide="chevron-right" aria-hidden="true"></i>
        <span class="page-breadcrumb__current">${meta.breadcrumb}</span>
      </nav>

      <!-- Hero -->
      <div class="tp-hero tp-hero--${meta.color}">
        <div class="tp-hero__content">
          <div class="tp-hero__eyebrow">
            <i data-lucide="award" aria-hidden="true"></i>
            <span>Titre Professionnel</span>
          </div>
          <h1 class="tp-hero__title">${meta.title}</h1>
          ${titrePro ? `<p class="tp-hero__sub">${esc(titrePro.intitule)}${titrePro.code_rncp ? ` · ${esc(titrePro.code_rncp)}` : ''}</p>` : ''}
        </div>
        <div class="tp-hero__icon" aria-hidden="true">
          <i data-lucide="${meta.icon}"></i>
        </div>
      </div>

      <!-- Layout -->
      <div class="tp-layout">

        <!-- Sidebar navigation -->
        <aside class="tp-sidebar" aria-label="Navigation Titre Professionnel">
          <div class="tp-sidebar__label">Sections</div>
          ${navHTML}
        </aside>

        <!-- Contenu principal -->
        <main class="tp-main">
          ${buildPageContent(page, titrePro, docs, referentiel)}
        </main>

      </div>
    </div>`;
}

// ─── Helper sécurité XSS ─────────────────────────────────────
function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
