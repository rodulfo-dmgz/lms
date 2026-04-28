const TYPE_LABELS = {
    cours:      'Cours',
    tp:         'TP',
    exercice:   'Exercice',
    quiz:       'Quiz',
    evaluation: 'Évaluation',
};

export function renderMesCours(container, { courses, seqByCours, seancesBySeq, progressBySeance }) {
    if (!courses?.length) {
        container.innerHTML = `
        <div class="page-mes-cours">
          <h1 class="page-title">Mes Cours</h1>
          <div class="card"><p class="empty-state">
            <i data-lucide="inbox" style="width:32px;height:32px;display:block;margin:0 auto var(--space-3)"></i>
            Aucun cours assigné pour le moment.
          </p></div>
        </div>`;
        return;
    }

    const totalSeances = Object.values(seancesBySeq).flat().length;
    const doneSeances  = Object.values(progressBySeance).filter(p => p.statut === 'termine').length;
    const globalPct    = totalSeances ? Math.round(doneSeances / totalSeances * 100) : 0;
    const today        = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    container.innerHTML = `
    <div class="page-mes-cours">

      <!-- Header (masqué à l'impression) -->
      <div class="mes-cours-header no-print">
        <div>
          <h1 class="page-title" style="margin-bottom:var(--space-1)">Mes Cours</h1>
          <p style="font-size:var(--font-body2-size);color:var(--text-tertiary)">
            ${courses.length} cours · ${totalSeances} séances · ${globalPct}% terminé
          </p>
        </div>
        <button id="printBtn" class="btn btn-ghost">
          <i data-lucide="printer" aria-hidden="true"></i>
          Imprimer / PDF
        </button>
      </div>

      <!-- En-tête impression uniquement -->
      <div class="print-only print-header">
        <h1>Programme de formation — Mes Cours</h1>
        <p>Généré le ${today} · ${globalPct}% terminé (${doneSeances}/${totalSeances} séances)</p>
        <hr>
      </div>

      <!-- Liste des cours -->
      <div class="mes-cours-list">
        ${courses.map((c, i) => buildCourseBlock(c, i, seqByCours, seancesBySeq, progressBySeance)).join('')}
      </div>
    </div>`;
}

function buildCourseBlock(cours, idx, seqByCours, seancesBySeq, progressBySeance) {
    const sequences  = seqByCours[cours.cours_id] || [];
    const allSeances = sequences.flatMap(s => seancesBySeq[s.id] || []);
    const done       = allSeances.filter(s => progressBySeance[s.id]?.statut === 'termine').length;
    const pct        = allSeances.length ? Math.round(done / allSeances.length * 100) : 0;
    const duree      = cours.duree_reelle || cours.duree_heures || '—';

    return `
    <div class="cours-block">
      <div class="cours-block__header">
        <div class="cours-block__header-left">
          <div class="cours-block__num">Cours ${idx + 1}</div>
          <h2 class="cours-block__title">${escapeText(cours.titre)}</h2>
          ${cours.description ? `<p class="cours-block__desc">${escapeText(cours.description)}</p>` : ''}
        </div>
        <div class="cours-block__header-right">
          <div class="cours-block__meta">${duree}h · ${allSeances.length} séance${allSeances.length !== 1 ? 's' : ''}</div>
          <div class="cours-block__pct" style="color:${pct === 100 ? 'var(--semantic-success)' : 'var(--action-primary)'}">${pct}%</div>
          <div class="progress-bar" style="width:120px">
            <div class="progress-bar__fill ${pct === 100 ? 'progress-bar__fill--success' : ''}"
                 style="width:${pct}%"></div>
          </div>
        </div>
      </div>

      ${sequences.length
        ? sequences.map(seq => buildSeqBlock(seq, seancesBySeq[seq.id] || [], progressBySeance)).join('')
        : `<p style="font-size:var(--font-body2-size);color:var(--text-muted);padding:var(--space-3) 0">Aucune séquence disponible.</p>`}
    </div>`;
}

function buildSeqBlock(seq, seances, progressBySeance) {
    const done = seances.filter(s => progressBySeance[s.id]?.statut === 'termine').length;

    return `
    <div class="seq-block">
      <div class="seq-block__header">
        <i data-lucide="layers" aria-hidden="true"></i>
        <span class="seq-block__title">${escapeText(seq.titre)}</span>
        <span class="seq-block__count">${done}/${seances.length}</span>
      </div>
      ${seq.objectif ? `<p class="seq-block__objectif">${escapeText(seq.objectif)}</p>` : ''}
      ${seances.length ? `
      <table class="seances-table">
        <thead><tr>
          <th>Séance</th><th>Type</th><th>Durée</th><th>Statut</th>
        </tr></thead>
        <tbody>
          ${seances.map(s => buildSeanceRow(s, progressBySeance[s.id])).join('')}
        </tbody>
      </table>` : ''}
    </div>`;
}

function buildSeanceRow(seance, progress) {
    const statut = progress?.statut || 'non_commence';
    const isDone = statut === 'termine';
    const date   = isDone && progress?.date_completion
        ? new Date(progress.date_completion).toLocaleDateString('fr-FR')
        : '';

    return `
    <tr class="${isDone ? 'seance-row--done' : ''}">
      <td>${escapeText(seance.titre)}</td>
      <td><span class="tag-type tag-${seance.type || 'cours'}">${TYPE_LABELS[seance.type] || seance.type || '—'}</span></td>
      <td style="font-family:var(--font-mono);white-space:nowrap">${seance.duree_heures || '—'}h</td>
      <td>
        ${isDone
          ? `<span class="badge badge-success">✓ Terminé${date ? ` · ${date}` : ''}</span>`
          : `<span class="badge badge-neutral">À faire</span>`}
      </td>
    </tr>`;
}

function escapeText(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}
