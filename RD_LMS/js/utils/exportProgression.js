/**
 * exportProgression.js — Export de la progression des stagiaires
 *
 * Formats : CSV · JSON · XLSX (SheetJS) · PDF (print window)
 * Couleurs brand :
 *   Terminé  → #2bc4b8 (--color-secondary-500)
 *   Incomplet → #ffaa82 (--color-accent-300)
 */

const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

// ════════════════════════════════════════════════════════
//  CSV — résumé liste stagiaires
// ════════════════════════════════════════════════════════
export function exportCSV(rows, filename = 'progression.csv') {
    const headers = [
        'Nom', 'Prénom', 'Cohorte',
        'Séances terminées', 'Séances total', '% Progression',
        'Quiz moy. (%)', 'Devoirs soumis', 'En attente', 'Notés',
        'Dernière activité',
    ];

    const lines = [
        headers.join(';'),
        ...rows.map(r => [
            _q(r.nom),
            _q(r.prenom),
            _q(r.cohorte_nom ?? ''),
            Number(r.seances_terminees ?? 0),
            Number(r.seances_total ?? 0),
            _pct(r.seances_terminees, r.seances_total),
            r.quiz_avg_pct ?? '',
            Number(r.devoirs_submitted ?? 0),
            Number(r.devoirs_pending ?? 0),
            Number(r.devoirs_graded ?? 0),
            r.last_activity ? new Date(r.last_activity).toLocaleDateString('fr-FR') : '',
        ].join(';')),
    ];

    _download('﻿' + lines.join('\r\n'), filename, 'text/csv;charset=utf-8');
}

// ════════════════════════════════════════════════════════
//  JSON
// ════════════════════════════════════════════════════════
export function exportJSON(rows, filename = 'progression.json') {
    const data = rows.map(r => ({
        id:                 r.id,
        nom:                r.nom,
        prenom:             r.prenom,
        cohorte:            r.cohorte_nom,
        seances_terminees:  Number(r.seances_terminees ?? 0),
        seances_total:      Number(r.seances_total ?? 0),
        progression_pct:    _pct(r.seances_terminees, r.seances_total),
        quiz_moyenne_pct:   r.quiz_avg_pct,
        devoirs_soumis:     Number(r.devoirs_submitted ?? 0),
        devoirs_en_attente: Number(r.devoirs_pending ?? 0),
        devoirs_notes:      Number(r.devoirs_graded ?? 0),
        derniere_activite:  r.last_activity,
    }));

    _download(JSON.stringify(data, null, 2), filename, 'application/json');
}

// ════════════════════════════════════════════════════════
//  XLSX  (SheetJS chargé à la volée depuis CDN)
// ════════════════════════════════════════════════════════
export async function exportXLSX(rows, filename = 'progression.xlsx') {
    if (!window.XLSX) await _loadScript(XLSX_CDN);
    const XLSX = window.XLSX;

    const sheetData = [
        [
            'Nom', 'Prénom', 'Cohorte',
            'Séances terminées', 'Séances total', '% Progression',
            'Quiz moy. (%)', 'Devoirs soumis', 'En attente', 'Notés',
            'Dernière activité',
        ],
        ...rows.map(r => [
            r.nom ?? '',
            r.prenom ?? '',
            r.cohorte_nom ?? '',
            Number(r.seances_terminees ?? 0),
            Number(r.seances_total ?? 0),
            _pct(r.seances_terminees, r.seances_total),
            r.quiz_avg_pct ?? null,
            Number(r.devoirs_submitted ?? 0),
            Number(r.devoirs_pending ?? 0),
            Number(r.devoirs_graded ?? 0),
            r.last_activity ? new Date(r.last_activity).toLocaleDateString('fr-FR') : '',
        ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 24 },
        { wch: 18 }, { wch: 14 }, { wch: 14 },
        { wch: 13 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
        { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Progression');
    XLSX.writeFile(wb, filename);
}

// ════════════════════════════════════════════════════════
//  PDF LISTE — rapport de cohorte
// ════════════════════════════════════════════════════════
export function exportPDF(rows, title = 'Rapport de progression', cohorteName = '') {
    const now       = _nowFr();
    const totalDone = rows.reduce((s, r) => s + Number(r.seances_terminees ?? 0), 0);
    const totalAll  = rows.reduce((s, r) => s + Number(r.seances_total ?? 0), 0);
    const totalPend = rows.reduce((s, r) => s + Number(r.devoirs_pending ?? 0), 0);
    const avgPct    = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0;

    const tableRows = rows.map(r => {
        const done  = Number(r.seances_terminees ?? 0);
        const total = Number(r.seances_total ?? 0);
        const pct   = _pct(done, total);
        const barW  = `width:${pct}%;background:${pct >= 75 ? '#2bc4b8' : '#ffaa82'}`;

        const dSubmitted = Number(r.devoirs_submitted ?? 0);
        const dPending   = Number(r.devoirs_pending  ?? 0);
        const dGraded    = Number(r.devoirs_graded   ?? 0);

        return `
        <tr>
          <td class="td-name">${_h(r.prenom)} ${_h(r.nom)}</td>
          <td>${_h(r.cohorte_nom ?? '—')}</td>
          <td>
            <div class="bar-track"><div class="bar-fill" style="${barW}"></div></div>
          </td>
          <td class="td-pct" style="color:${pct >= 75 ? '#2bc4b8' : pct >= 30 ? '#e97b4a' : '#6366f1'}">${pct}%</td>
          <td class="td-num">${done} / ${total}</td>
          <td class="td-num">${r.quiz_avg_pct != null ? r.quiz_avg_pct + '%' : '—'}</td>
          <td>
            ${dSubmitted > 0
              ? `<span style="color:#2bc4b8;font-weight:600">${dGraded} notés</span>`
                + (dPending > 0
                    ? ` <span style="color:#ffaa82;font-size:10px">· ${dPending} attente</span>`
                    : '')
              : '<span style="color:#94a3b8">—</span>'}
          </td>
          <td class="td-date">${r.last_activity ? new Date(r.last_activity).toLocaleDateString('fr-FR') : '—'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${_h(title)}</title>
<style>
  *   { margin:0; padding:0; box-sizing:border-box; }
  body{ font-family:'Segoe UI',Arial,sans-serif; color:#1e293b; background:#fff; padding:36px 40px; font-size:12px; }

  /* ── Header ── */
  .rpt-header{ display:flex; align-items:center; justify-content:space-between;
               margin-bottom:28px; padding-bottom:18px; border-bottom:3px solid #2bc4b8; }
  .brand      { display:flex; align-items:center; gap:12px; }
  .brand-logo { width:42px; height:42px; border-radius:11px;
                background:linear-gradient(135deg,#2bc4b8 0%,#ffaa82 100%);
                display:flex; align-items:center; justify-content:center;
                color:#fff; font-weight:900; font-size:20px; flex-shrink:0; }
  .brand-name { font-size:20px; font-weight:800; letter-spacing:-.5px; }
  .brand-name span{ color:#2bc4b8; }
  .brand-sub  { font-size:10px; color:#94a3b8; margin-top:3px; }
  .rpt-meta   { text-align:right; }
  .rpt-title  { font-size:13px; font-weight:600; color:#334155; }
  .rpt-date   { font-size:10px; color:#94a3b8; margin-top:4px; }

  /* ── KPI chips ── */
  .kpis       { display:flex; gap:14px; margin-bottom:24px; flex-wrap:wrap; }
  .kpi        { padding:10px 18px; border-radius:12px; min-width:110px; }
  .kpi-label  { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.06em; }
  .kpi-val    { font-size:22px; font-weight:800; margin-top:2px; }
  .kpi--teal  { background:rgba(43,196,184,.1); }
  .kpi--teal  .kpi-val { color:#2bc4b8; }
  .kpi--orange{ background:rgba(255,170,130,.15); }
  .kpi--orange .kpi-val{ color:#e97b4a; }
  .kpi--slate { background:#f1f5f9; }
  .kpi--slate .kpi-val { color:#475569; }

  /* ── Table ── */
  table     { width:100%; border-collapse:collapse; }
  thead th  { background:#f8fafc; color:#64748b; text-align:left; padding:9px 10px;
              font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em;
              border-bottom:2px solid #e2e8f0; white-space:nowrap; }
  tbody tr  { border-bottom:1px solid #f1f5f9; }
  tbody tr:nth-child(even){ background:#fafafa; }
  td        { padding:9px 10px; vertical-align:middle; }
  .td-name  { font-weight:600; color:#1e293b; white-space:nowrap; }
  .td-pct   { font-weight:700; text-align:right; white-space:nowrap; }
  .td-num   { text-align:right; color:#475569; font-variant-numeric:tabular-nums; }
  .td-date  { color:#94a3b8; font-size:10px; white-space:nowrap; }

  /* ── Progress bar ── */
  .bar-track{ width:90px; height:6px; background:#e5e7eb; border-radius:99px; overflow:hidden; }
  .bar-fill { height:100%; border-radius:99px; }

  /* ── Legend / footer ── */
  .legend   { display:flex; gap:18px; margin-top:22px; padding-top:14px; border-top:1px solid #e2e8f0;
              font-size:10px; color:#64748b; }
  .ld       { display:flex; align-items:center; gap:5px; }
  .dot      { width:9px; height:9px; border-radius:50%; flex-shrink:0; }

  .footer   { margin-top:28px; text-align:center; font-size:9px; color:#94a3b8; }

  @page    { margin:15mm 12mm; }
  @media print {
    body     { padding:0; }
    .no-print{ display:none !important; }
  }
</style>
</head>
<body>

<div class="rpt-header">
  <div class="brand">
    <div class="brand-logo">D</div>
    <div>
      <div class="brand-name">DASHBOA<span>_</span>RD</div>
      <div class="brand-sub">Plateforme de formation professionnelle</div>
    </div>
  </div>
  <div class="rpt-meta">
    <div class="rpt-title">${_h(title)}${cohorteName ? ` — ${_h(cohorteName)}` : ''}</div>
    <div class="rpt-date">Généré le ${now}</div>
  </div>
</div>

<div class="kpis">
  <div class="kpi kpi--slate">
    <div class="kpi-label">Stagiaires</div>
    <div class="kpi-val">${rows.length}</div>
  </div>
  <div class="kpi kpi--teal">
    <div class="kpi-label">Progression moy.</div>
    <div class="kpi-val">${avgPct}%</div>
  </div>
  <div class="kpi kpi--teal">
    <div class="kpi-label">Séances terminées</div>
    <div class="kpi-val">${totalDone}</div>
  </div>
  <div class="kpi kpi--orange">
    <div class="kpi-label">Devoirs en attente</div>
    <div class="kpi-val">${totalPend}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Stagiaire</th>
      <th>Cohorte</th>
      <th>Progression</th>
      <th>%</th>
      <th>Séances</th>
      <th>Quiz moy.</th>
      <th>Devoirs</th>
      <th>Activité</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>

<div class="legend">
  <div class="ld"><div class="dot" style="background:#2bc4b8"></div> Terminé (≥ 75%)</div>
  <div class="ld"><div class="dot" style="background:#ffaa82"></div> En cours / non terminé</div>
  <div class="ld"><div class="dot" style="background:#94a3b8"></div> Non commencé</div>
</div>

<div class="footer">
  DASHBOA_RD — Rapport confidentiel — ${now}
</div>

<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

    _printWindow(html);
}

// ════════════════════════════════════════════════════════
//  PDF INDIVIDUEL — détail séance par séance
// ════════════════════════════════════════════════════════
export function exportStudentPDF(name, { coursTree, quizSubs, devoirSubs }) {
    const now = _nowFr();

    let totalS = 0, doneS = 0;
    coursTree.forEach(c => c.sequences.forEach(seq => seq.seances.forEach(s => {
        totalS++;
        if (s.statut === 'termine') doneS++;
    })));
    const globalPct = _pct(doneS, totalS);

    // ── Arbre des modules ──
    const modulesHtml = coursTree.map(cours => {
        let cTotal = 0, cDone = 0;
        cours.sequences.forEach(seq => seq.seances.forEach(s => {
            cTotal++;
            if (s.statut === 'termine') cDone++;
        }));
        const cPct = _pct(cDone, cTotal);

        const seqRows = cours.sequences.map(seq => {
            const rows = seq.seances.map(s => {
                const isDone   = s.statut === 'termine';
                const isInProg = s.statut === 'en_cours';
                const dot   = isDone   ? '#2bc4b8' : isInProg ? '#ffaa82' : '#e2e8f0';
                const label = isDone   ? 'Terminé'
                            : isInProg ? 'En cours'
                            :            'Non commencé';
                const nameColor = isDone ? '#1e293b' : '#64748b';
                return `
                <tr>
                  <td style="padding:5px 8px;font-size:11px;color:${nameColor}">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                                 background:${dot};margin-right:6px;vertical-align:middle;"></span>
                    ${_h(s.seance_titre)}
                  </td>
                  <td style="padding:5px 8px;font-size:10px;color:#94a3b8;white-space:nowrap">${_h(s.seance_type ?? '')}</td>
                  <td style="padding:5px 8px;font-size:10px;font-weight:600;white-space:nowrap;
                             color:${isDone ? '#2bc4b8' : isInProg ? '#e97b4a' : '#94a3b8'}">${label}</td>
                </tr>`;
            }).join('');

            return `
            <div style="margin-bottom:10px">
              <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;
                          letter-spacing:.06em;padding:4px 0;border-bottom:1px solid #e2e8f0;
                          margin-bottom:2px">
                ${_h(seq.sequence_titre)}
              </div>
              <table style="width:100%;border-collapse:collapse">${rows}</table>
            </div>`;
        }).join('');

        return `
        <div style="margin-bottom:18px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;
                      padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
            <div>
              <div style="font-size:13px;font-weight:700;color:#1e293b">${_h(cours.cours_titre)}</div>
              <div style="font-size:10px;color:#94a3b8;margin-top:2px">${cDone} / ${cTotal} séances</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:18px;font-weight:800;
                          color:${cPct >= 75 ? '#2bc4b8' : cPct >= 30 ? '#e97b4a' : '#6366f1'}">${cPct}%</div>
              <div style="width:80px;height:5px;background:#e5e7eb;border-radius:99px;
                          overflow:hidden;margin-top:3px">
                <div style="width:${cPct}%;height:100%;background:${cPct >= 75 ? '#2bc4b8' : '#ffaa82'};border-radius:99px"></div>
              </div>
            </div>
          </div>
          <div style="padding:12px 14px">${seqRows}</div>
        </div>`;
    }).join('');

    // ── Quiz ──
    const quizHtml = quizSubs.length === 0
        ? `<p style="color:#94a3b8;font-size:11px;padding:8px 0">Aucun quiz soumis.</p>`
        : `<table style="width:100%;border-collapse:collapse">
            <tr style="border-bottom:1px solid #e2e8f0">
              <th style="text-align:left;font-size:10px;color:#94a3b8;padding:5px 8px">Séance</th>
              <th style="text-align:right;font-size:10px;color:#94a3b8;padding:5px 8px">Score</th>
              <th style="text-align:right;font-size:10px;color:#94a3b8;padding:5px 8px">%</th>
              <th style="text-align:right;font-size:10px;color:#94a3b8;padding:5px 8px">Date</th>
            </tr>
            ${quizSubs.map(q => {
                const pct = q.max_score > 0 ? Math.round(q.score / q.max_score * 100) : null;
                return `
                <tr style="border-bottom:1px solid #f1f5f9">
                  <td style="padding:6px 8px;font-size:11px;color:#1e293b">${_h(q.lms_seances?.titre || '—')}</td>
                  <td style="padding:6px 8px;font-size:11px;text-align:right;color:#475569">${q.score} / ${q.max_score}</td>
                  <td style="padding:6px 8px;font-size:11px;text-align:right;font-weight:700;
                             color:${pct !== null && pct >= 70 ? '#2bc4b8' : '#e97b4a'}">${pct !== null ? pct + '%' : '—'}</td>
                  <td style="padding:6px 8px;font-size:10px;text-align:right;color:#94a3b8">${new Date(q.submitted_at).toLocaleDateString('fr-FR')}</td>
                </tr>`;
            }).join('')}
           </table>`;

    // ── Devoirs ──
    const devoirHtml = devoirSubs.length === 0
        ? `<p style="color:#94a3b8;font-size:11px;padding:8px 0">Aucun devoir déposé.</p>`
        : devoirSubs.map(d => {
            const isGraded = d.note !== null && d.note !== undefined;
            return `
            <div style="display:flex;gap:12px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px">
              <div style="width:32px;height:32px;border-radius:8px;flex-shrink:0;display:flex;
                          align-items:center;justify-content:center;font-size:16px;
                          background:${isGraded ? 'rgba(43,196,184,.1)' : 'rgba(255,170,130,.15)'};
                          color:${isGraded ? '#2bc4b8' : '#e97b4a'}">
                ${isGraded ? '✓' : '⏳'}
              </div>
              <div style="flex:1">
                <div style="font-size:12px;font-weight:600;color:#1e293b;margin-bottom:4px">${_h(d.lms_seances?.titre || '—')}</div>
                <div style="font-size:10px;color:${isGraded ? '#2bc4b8' : '#e97b4a'};font-weight:600">
                  ${isGraded ? `Note : ${d.note} / ${d.note_max ?? 20}` : 'En attente de correction'}
                </div>
                ${isGraded && d.feedback ? `<div style="font-size:10px;color:#64748b;margin-top:4px;font-style:italic">${_h(d.feedback)}</div>` : ''}
              </div>
              <div style="font-size:9px;color:#94a3b8;white-space:nowrap;margin-top:3px">
                ${new Date(d.submitted_at).toLocaleDateString('fr-FR')}
              </div>
            </div>`;
        }).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport — ${_h(name)}</title>
<style>
  *   { margin:0; padding:0; box-sizing:border-box; }
  body{ font-family:'Segoe UI',Arial,sans-serif; color:#1e293b; background:#fff; padding:36px 40px; }

  .rpt-header{ display:flex; align-items:center; justify-content:space-between;
               margin-bottom:28px; padding-bottom:18px; border-bottom:3px solid #2bc4b8; }
  .brand      { display:flex; align-items:center; gap:12px; }
  .brand-logo { width:40px; height:40px; border-radius:10px;
                background:linear-gradient(135deg,#2bc4b8,#ffaa82);
                display:flex; align-items:center; justify-content:center;
                color:#fff; font-weight:900; font-size:18px; }
  .brand-name { font-size:19px; font-weight:800; letter-spacing:-.5px; }
  .brand-name span{ color:#2bc4b8; }

  .student-banner{
    display:flex; align-items:center; gap:18px; padding:18px 20px;
    background:linear-gradient(135deg, rgba(43,196,184,.08), rgba(255,170,130,.06));
    border:1px solid rgba(43,196,184,.2); border-radius:14px; margin-bottom:24px;
  }
  .stu-avatar{
    width:52px; height:52px; border-radius:50%;
    background:linear-gradient(135deg,#2bc4b8,#1ea89e);
    color:#fff; font-size:18px; font-weight:800;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .stu-name  { font-size:18px; font-weight:800; color:#1e293b; }
  .stu-sub   { font-size:11px; color:#64748b; margin-top:4px; }

  .global-bar-wrap{ height:8px; background:#e5e7eb; border-radius:99px; overflow:hidden; margin-bottom:6px; }
  .global-bar     { height:100%; border-radius:99px; background:${globalPct >= 75 ? '#2bc4b8' : '#ffaa82'}; width:${globalPct}%; }

  .section-title{ font-size:14px; font-weight:700; color:#1e293b; margin:24px 0 12px;
                  padding-bottom:8px; border-bottom:2px solid #e2e8f0; }

  .footer{ margin-top:32px; text-align:center; font-size:9px; color:#94a3b8; }

  @page { margin:14mm 12mm; }
  @media print { body{ padding:0; } }
</style>
</head>
<body>

<div class="rpt-header">
  <div class="brand">
    <div class="brand-logo">D</div>
    <div>
      <div class="brand-name">DASHBOA<span>_</span>RD</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:3px">Plateforme de formation</div>
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:12px;font-weight:600;color:#334155">Rapport de progression individuel</div>
    <div style="font-size:10px;color:#94a3b8;margin-top:4px">Généré le ${now}</div>
  </div>
</div>

<div class="student-banner">
  <div class="stu-avatar">${name.split(' ').map(w => w[0] || '').join('').slice(0,2).toUpperCase()}</div>
  <div style="flex:1">
    <div class="stu-name">${_h(name)}</div>
    <div class="stu-sub">${doneS} / ${totalS} séances terminées · ${quizSubs.length} quiz · ${devoirSubs.length} devoir${devoirSubs.length !== 1 ? 's' : ''}</div>
    <div style="margin-top:8px">
      <div class="global-bar-wrap"><div class="global-bar"></div></div>
      <div style="font-size:11px;color:${globalPct >= 75 ? '#2bc4b8' : globalPct >= 30 ? '#e97b4a' : '#6366f1'};font-weight:700">
        ${globalPct}% de progression globale
      </div>
    </div>
  </div>
</div>

<div class="section-title">📚 Modules &amp; séances</div>
${modulesHtml}

<div class="section-title">🎯 Quiz</div>
${quizHtml}

<div class="section-title">📝 Devoirs</div>
${devoirHtml}

<div class="footer">DASHBOA_RD — Rapport confidentiel — ${now}</div>

<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

    _printWindow(html);
}

// ════════════════════════════════════════════════════════
//  Helpers privés
// ════════════════════════════════════════════════════════
function _pct(done, total) {
    const d = Number(done ?? 0), t = Number(total ?? 0);
    return t > 0 ? Math.round(d / t * 100) : 0;
}

function _q(str) {
    return `"${String(str ?? '').replace(/"/g, '""')}"`;
}

function _h(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _nowFr() {
    return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function _loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload  = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

function _printWindow(html) {
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) { alert('Autorisez les pop-ups pour générer le PDF.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
}

function _download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
