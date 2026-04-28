export function renderProfile(container, { profile, user }) {
    const initials  = `${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}`.toUpperCase();
    const hasAvatar = !!profile.avatar_url;

    container.innerHTML = `
    <div class="page-profile">

      <!-- Avatar + identité -->
      <div class="profile-avatar-section">
        <div class="profile-avatar" id="profileAvatarDisplay">
          ${hasAvatar
            ? `<img src="${escapeAttr(profile.avatar_url)}" alt="${escapeAttr(profile.prenom)}" class="profile-avatar__img">`
            : `<span>${initials}</span>`}
        </div>
        <div class="profile-avatar-actions">
          <div class="profile-info">
            <div class="profile-name">${escapeText(profile.prenom)} ${escapeText(profile.nom)}</div>
            <div class="profile-email">${escapeText(user?.email || '')}</div>
            ${profile.titre_pro ? `
            <div style="margin-top:var(--space-2)">
              <span class="badge badge-primary">
                ${escapeText(profile.titre_pro.sigle)} — ${escapeText(profile.titre_pro.intitule)}
              </span>
            </div>` : ''}
          </div>
          <div style="margin-top:var(--space-4);display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
            <button type="button" id="changeAvatarBtn" class="btn btn-ghost btn-sm">
              <i data-lucide="camera" aria-hidden="true"></i>
              Changer la photo
            </button>
            <span id="avatarStatus" style="font-size:var(--font-caption-size)"></span>
          </div>
          <input type="file" id="avatarInput" accept="image/jpeg,image/png,image/webp" style="display:none" aria-label="Choisir une photo de profil">
        </div>
      </div>

      <!-- Formulaire informations personnelles -->
      <form id="profileForm" class="profile-form" novalidate>
        <h2 class="card-title" style="margin-bottom:var(--space-2)">Informations personnelles</h2>
        <p style="font-size:var(--font-body2-size);color:var(--text-tertiary);margin-bottom:var(--space-4)">
          Ces informations sont utilisées pour personnaliser votre expérience sur la plateforme.
        </p>

        <div style="display:grid;grid-template-columns:120px 1fr 1fr;gap:var(--space-4)">
          <div class="form-group">
            <label for="civilite" class="form-label">Civilité</label>
            <select id="civilite" name="civilite" class="form-input">
              <option value="">—</option>
              <option value="M."   ${profile.civilite === 'M.'   ? 'selected' : ''}>M.</option>
              <option value="Mme"  ${profile.civilite === 'Mme'  ? 'selected' : ''}>Mme</option>
              <option value="Mlle" ${profile.civilite === 'Mlle' ? 'selected' : ''}>Mlle</option>
            </select>
          </div>
          <div class="form-group">
            <label for="prenom" class="form-label form-label--required">Prénom</label>
            <input type="text" id="prenom" name="prenom" class="form-input"
              value="${escapeAttr(profile.prenom)}" required autocomplete="given-name">
          </div>
          <div class="form-group">
            <label for="nom" class="form-label form-label--required">Nom</label>
            <input type="text" id="nom" name="nom" class="form-input"
              value="${escapeAttr(profile.nom)}" required autocomplete="family-name">
          </div>
        </div>

        <div class="form-group">
          <label for="telephone" class="form-label">Téléphone</label>
          <div class="input-icon-wrapper">
            <i data-lucide="phone" class="input-prefix-icon" aria-hidden="true"></i>
            <input type="tel" id="telephone" name="telephone"
              class="form-input form-input--icon-left"
              value="${escapeAttr(profile.telephone || '')}"
              placeholder="06 00 00 00 00" autocomplete="tel">
          </div>
        </div>

        <div class="form-group">
          <label for="adresse" class="form-label">Adresse</label>
          <div class="input-icon-wrapper">
            <i data-lucide="map-pin" class="input-prefix-icon" aria-hidden="true"></i>
            <input type="text" id="adresse" name="adresse"
              class="form-input form-input--icon-left"
              value="${escapeAttr(profile.adresse || '')}"
              placeholder="12 rue de la Formation" autocomplete="street-address">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:150px 1fr;gap:var(--space-4)">
          <div class="form-group">
            <label for="code_postal" class="form-label">Code postal</label>
            <input type="text" id="code_postal" name="code_postal" class="form-input"
              value="${escapeAttr(profile.code_postal || '')}"
              placeholder="75000" autocomplete="postal-code">
          </div>
          <div class="form-group">
            <label for="ville" class="form-label">Ville</label>
            <input type="text" id="ville" name="ville" class="form-input"
              value="${escapeAttr(profile.ville || '')}"
              placeholder="Paris" autocomplete="address-level2">
          </div>
        </div>

        <div id="formStatus" style="display:none;padding:var(--space-3) var(--space-4);border-radius:var(--radius-lg);font-size:var(--font-body2-size)"></div>

        <div style="display:flex;justify-content:flex-end">
          <button type="submit" id="profileSaveBtn" class="btn btn-cta">
            <i data-lucide="save" aria-hidden="true"></i>
            Enregistrer
          </button>
        </div>
      </form>

    </div>`;
}

function escapeText(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
