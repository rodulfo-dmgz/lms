const TYPES_FINANCEMENT = [
    { value: 'CPF',         label: 'CPF — Compte Personnel de Formation' },
    { value: 'OPCO',        label: 'OPCO — Opérateur de Compétences' },
    { value: 'PÔLE_EMPLOI', label: 'Pôle Emploi / France Travail' },
    { value: 'ENTREPRISE',  label: 'Plan de formation entreprise' },
    { value: 'PERSONNEL',   label: 'Financement personnel' },
    { value: 'AUTRE',       label: 'Autre' },
];

export function renderFinancementForm(container, { financement = null, onSave, onCancel }) {
    const isEdit = financement !== null;
    const f      = financement || {};

    container.innerHTML = `
    <div class="page-admin">

      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">
            ${isEdit ? `Modifier : ${esc(f.nom || '')}` : 'Nouveau financement'}
          </h1>
          <p class="admin-page-sub">
            ${isEdit ? 'Informations commerciales et paramètres' : 'Créer un nouveau mode de financement'}
          </p>
        </div>
        <button class="btn btn-ghost" id="btnCancelFinancement">
          <i data-lucide="arrow-left" aria-hidden="true"></i> Retour
        </button>
      </div>

      <form id="formFinancement" novalidate>

        <!-- ── Identification ── -->
        <div class="admin-section">
          <div class="admin-section-header">
            <i data-lucide="info" aria-hidden="true"></i>
            <h2>Identification</h2>
          </div>
          <div class="admin-section-body">
            <div class="form-grid">

              <div class="form-group form-group--full">
                <label class="form-label form-label--required" for="finNom">Nom du financement</label>
                <input type="text" id="finNom" name="nom" class="form-input"
                       placeholder="ex : OPCO ATLAS 2026" required
                       value="${esc(f.nom || '')}">
              </div>

              <div class="form-group">
                <label class="form-label" for="finType">Type de financement</label>
                <select id="finType" name="type_financement" class="form-input">
                  <option value="">— Sélectionner —</option>
                  ${TYPES_FINANCEMENT.map(t =>
                    `<option value="${t.value}" ${f.type_financement === t.value ? 'selected' : ''}>${t.label}</option>`
                  ).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="finCodeCpf">Code CPF</label>
                <input type="text" id="finCodeCpf" name="code_cpf" class="form-input"
                       placeholder="ex : 237 359"
                       value="${esc(f.code_cpf || '')}">
                <p class="form-hint">Numéro d'enregistrement Mon Compte Formation</p>
              </div>

              <div class="form-group form-group--full">
                <label class="form-label" for="finDescription">Description</label>
                <textarea id="finDescription" name="description" class="form-input form-textarea"
                          rows="3" placeholder="Description courte visible dans les interfaces">${esc(f.description || '')}</textarea>
              </div>

            </div>
          </div>
        </div>

        <!-- ── Organismes ── -->
        <div class="admin-section">
          <div class="admin-section-header">
            <i data-lucide="building-2" aria-hidden="true"></i>
            <h2>Organismes</h2>
          </div>
          <div class="admin-section-body">
            <div class="form-grid">

              <div class="form-group">
                <label class="form-label" for="finFinanceur">Financeur</label>
                <input type="text" id="finFinanceur" name="financeur" class="form-input"
                       placeholder="ex : ATLAS, Pôle Emploi, Région IDF…"
                       value="${esc(f.financeur || '')}">
                <p class="form-hint">Organisme qui verse les fonds</p>
              </div>

              <div class="form-group">
                <label class="form-label" for="finOrganisme">Organisme gestionnaire</label>
                <input type="text" id="finOrganisme" name="organisme_gestionnaire" class="form-input"
                       placeholder="ex : AKTO, CONSTRUCTYS…"
                       value="${esc(f.organisme_gestionnaire || '')}">
                <p class="form-hint">OPCO ou organisme qui traite le dossier</p>
              </div>

            </div>
          </div>
        </div>

        <!-- ── Tarification ── -->
        <div class="admin-section">
          <div class="admin-section-header">
            <i data-lucide="euro" aria-hidden="true"></i>
            <h2>Tarification</h2>
          </div>
          <div class="admin-section-body">
            <div class="form-grid">

              <div class="form-group">
                <label class="form-label" for="finPrixHT">Prix HT (€)</label>
                <input type="number" id="finPrixHT" name="prix_ht" class="form-input"
                       step="0.01" min="0" placeholder="0.00"
                       value="${f.prix_ht ?? ''}">
              </div>

              <div class="form-group">
                <label class="form-label" for="finTauxTva">Taux TVA (%)</label>
                <select id="finTauxTva" name="taux_tva" class="form-input">
                  <option value="0"   ${(f.taux_tva ?? 20) == 0   ? 'selected' : ''}>0 % (exonéré)</option>
                  <option value="5.5" ${(f.taux_tva ?? 20) == 5.5 ? 'selected' : ''}>5,5 %</option>
                  <option value="10"  ${(f.taux_tva ?? 20) == 10  ? 'selected' : ''}>10 %</option>
                  <option value="20"  ${(f.taux_tva ?? 20) == 20  ? 'selected' : ''}>20 %</option>
                </select>
                <p class="form-hint">La formation professionnelle est souvent exonérée</p>
              </div>

              <div class="form-group">
                <label class="form-label" for="finPrixTTC">Prix TTC (€)</label>
                <input type="number" id="finPrixTTC" name="prix_ttc" class="form-input"
                       step="0.01" min="0" placeholder="Calculé automatiquement"
                       value="${f.prix_ttc ?? ''}">
                <p class="form-hint">Laissez vide pour calculer depuis HT + TVA</p>
              </div>

            </div>
          </div>
        </div>

        <!-- ── Prise en charge ── -->
        <div class="admin-section">
          <div class="admin-section-header">
            <i data-lucide="percent" aria-hidden="true"></i>
            <h2>Prise en charge</h2>
          </div>
          <div class="admin-section-body">
            <div class="form-grid">

              <div class="form-group">
                <label class="form-label" for="finTauxPEC">Taux de prise en charge (%)</label>
                <input type="number" id="finTauxPEC" name="taux_prise_charge" class="form-input"
                       step="0.01" min="0" max="100" placeholder="ex : 100"
                       value="${f.taux_prise_charge ?? ''}">
                <p class="form-hint">Pourcentage pris en charge par le financeur</p>
              </div>

              <div class="form-group">
                <label class="form-label" for="finPlafondMontant">Plafond (€)</label>
                <input type="number" id="finPlafondMontant" name="plafond_montant" class="form-input"
                       step="0.01" min="0" placeholder="Montant maximum pris en charge"
                       value="${f.plafond_montant ?? ''}">
              </div>

              <div class="form-group">
                <label class="form-label" for="finPlafondHeures">Plafond (heures)</label>
                <input type="number" id="finPlafondHeures" name="plafond_heures" class="form-input"
                       step="1" min="0" placeholder="Nombre d'heures maximum"
                       value="${f.plafond_heures ?? ''}">
              </div>

            </div>
          </div>
        </div>

        <!-- ── Notes & Statut ── -->
        <div class="admin-section">
          <div class="admin-section-header">
            <i data-lucide="notebook-pen" aria-hidden="true"></i>
            <h2>Notes &amp; statut</h2>
          </div>
          <div class="admin-section-body">
            <div class="form-grid">

              <div class="form-group form-group--full">
                <label class="form-label" for="finNotes">Notes commerciales</label>
                <textarea id="finNotes" name="notes_commerciales" class="form-input form-textarea"
                          rows="4" placeholder="Contacts, conditions particulières, procédure de demande…">${esc(f.notes_commerciales || '')}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Statut</label>
                <label class="produit-toggle">
                  <input type="checkbox" id="finActif" name="actif"
                         ${f.actif !== false ? 'checked' : ''}>
                  <span class="produit-toggle__slider"></span>
                  <span class="produit-toggle__label" id="finActifLabel">
                    ${f.actif !== false ? 'Actif' : 'Inactif'}
                  </span>
                </label>
                <p class="form-hint">Un financement inactif n'apparaît plus dans les selects</p>
              </div>

            </div>
          </div>
        </div>

        <!-- ── Actions ── -->
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btnCancelFinancement2">Annuler</button>
          <button type="submit" class="btn btn-cta" id="btnSaveFinancement">
            <i data-lucide="save" aria-hidden="true"></i>
            ${isEdit ? 'Enregistrer les modifications' : 'Créer le financement'}
          </button>
        </div>

      </form>
    </div>`;

    // ── Calcul automatique TTC ───────────────────────────────
    const htInput  = container.querySelector('#finPrixHT');
    const tvaInput = container.querySelector('#finTauxTva');
    const ttcInput = container.querySelector('#finPrixTTC');

    function calcTTC() {
        const ht  = parseFloat(htInput.value);
        const tva = parseFloat(tvaInput.value);
        if (!isNaN(ht) && !isNaN(tva)) {
            ttcInput.value = (ht * (1 + tva / 100)).toFixed(2);
        }
    }
    htInput.addEventListener('input',  calcTTC);
    tvaInput.addEventListener('change', calcTTC);

    // ── Toggle label actif ───────────────────────────────────
    const actifCheck = container.querySelector('#finActif');
    const actifLabel = container.querySelector('#finActifLabel');
    actifCheck.addEventListener('change', () => {
        actifLabel.textContent = actifCheck.checked ? 'Actif' : 'Inactif';
    });

    // ── Soumission ───────────────────────────────────────────
    container.querySelector('#formFinancement').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = container.querySelector('#btnSaveFinancement');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Enregistrement…';
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: saveBtn });

        const fd      = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        // FormData ne capture pas les checkboxes non cochés — forcer la valeur booléenne
        payload.actif = actifCheck.checked;

        try {
            await onSave(payload);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i data-lucide="save"></i> ${isEdit ? 'Enregistrer les modifications' : 'Créer le financement'}`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: saveBtn });
        }
    });

    // ── Annuler ──────────────────────────────────────────────
    container.querySelectorAll('#btnCancelFinancement, #btnCancelFinancement2').forEach(btn => {
        btn.addEventListener('click', () => onCancel?.());
    });
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
}
