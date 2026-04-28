export function buildLoginHTML() {
    return `
<div class="login-page-wrapper">
  <main class="login-layout">

    <!-- Colonne gauche : Brand -->
    <section class="login-brand-card" aria-label="Identité DASHBOA_RD">
      <div class="login-brand-content">
        <img src="assets/images/logo.svg" alt="DASHBOA_RD" class="login-brand__logo">
        <h1 class="login-brand__name">DASHBOA_RD</h1>
        <p class="login-brand__tagline">KPI &amp; Tableaux de Bord</p>
        <p class="login-brand__slogan">Maîtrisez vos indicateurs de performance</p>
      </div>
    </section>

    <!-- Colonne droite : Formulaire -->
    <section class="login-form-card" aria-labelledby="formTitle">

      <button type="button" class="theme-toggle" id="themeToggle"
        aria-label="Basculer entre mode clair et mode sombre" aria-pressed="false">
        <i data-lucide="sun"></i>
      </button>

      <form id="loginForm" class="login-form" novalidate>
        <div>
          <h2 id="formTitle" class="login-form__title">Connexion</h2>
          <p class="login-form__subtitle">Accédez à votre espace de formation</p>
        </div>

        <!-- Email -->
        <div class="form-group">
          <label for="email" class="form-label form-label--required">Adresse email</label>
          <div class="input-icon-wrapper">
            <i data-lucide="mail" class="input-prefix-icon" aria-hidden="true"></i>
            <input type="email" id="email" name="email"
              class="form-input form-input--icon-left"
              placeholder="prenom.nom@rd-gestion.fr"
              autocomplete="email" inputmode="email"
              required aria-required="true" aria-describedby="email-error">
          </div>
          <span id="email-error" class="form-error" role="alert" style="display:none;"></span>
        </div>

        <!-- Mot de passe -->
        <div class="form-group">
          <label for="password" class="form-label form-label--required">Mot de passe</label>
          <div class="password-wrapper">
            <input type="password" id="password" name="password"
              class="form-input"
              placeholder="••••••••"
              autocomplete="current-password"
              required aria-required="true" aria-describedby="password-error">
            <button type="button" class="password-toggle" id="passwordToggle"
              aria-label="Afficher le mot de passe" aria-pressed="false">
              <i data-lucide="eye" id="eyeIcon"></i>
            </button>
          </div>
          <span id="password-error" class="form-error" role="alert" style="display:none;"></span>
        </div>

        <!-- Erreur globale -->
        <div id="login-error" class="form-error-global" role="alert" aria-live="polite"
          style="display:none;"></div>

        <button type="submit" class="btn btn-cta btn-full" id="submitBtn">
          <i data-lucide="log-in" aria-hidden="true"></i>
          Accéder au dashboard
        </button>

        <a href="#" class="forgot-password-link" id="forgotPasswordLink">
          Mot de passe oublié ?
        </a>
      </form>
    </section>
  </main>
</div>

<!-- Modale mot de passe oublié -->
<div id="forgotPasswordModal" role="dialog" aria-modal="true"
  aria-labelledby="forgotTitle" style="display:none;">
  <div id="forgotModalBackdrop" class="modal-backdrop"></div>
  <div class="modal-content" role="document">
    <div style="font-size:48px; text-align:center; margin-bottom:var(--space-4);">🔑</div>
    <h3 id="forgotTitle" class="modal-title">Mot de passe oublié ?</h3>
    <p class="modal-body">
      Pour réinitialiser votre mot de passe, contactez votre
      <strong>formateur</strong> ou l'<strong>administrateur</strong>
      de la plateforme.<br><br>
      Il pourra vous générer un nouveau mot de passe depuis son tableau de bord.
    </p>
    <button id="forgotModalCloseBtn" class="btn btn-cta btn-full">
      Compris, merci !
    </button>
  </div>
</div>`;
}
