-- ================================================================
-- Contenu démo complet — APA.1 · Accueillir un visiteur anglophone
-- ================================================================

UPDATE lms_seances
SET contenu = '
<div class="seance-contenu">

  <!-- ① OBJECTIFS -->
  <div class="seance-section">
    <div class="seance-section-title">
      <i data-lucide="target"></i> Objectifs de la séance
    </div>
    <ul class="objectifs-list">
      <li>
        <span class="objectif-dot"><i data-lucide="check"></i></span>
        Maîtriser les formules d''accueil en anglais professionnel (formel et informel)
      </li>
      <li>
        <span class="objectif-dot"><i data-lucide="check"></i></span>
        Adapter son registre de langue selon le profil du visiteur
      </li>
      <li>
        <span class="objectif-dot"><i data-lucide="check"></i></span>
        Orienter et accompagner un visiteur anglophone dans les locaux avec assurance
      </li>
      <li>
        <span class="objectif-dot"><i data-lucide="check"></i></span>
        Gérer les situations imprévues : retard, salle indisponible, visiteur sans rendez-vous
      </li>
    </ul>
  </div>

  <!-- ② VIDÉO + DESCRIPTION (2 colonnes) -->
  <div class="seance-section">
    <div class="seance-section-title">
      <i data-lucide="play-circle"></i> Vidéo pédagogique
    </div>
    <div class="seance-media-row">

      <!-- Colonne gauche : player vidéo -->
      <div>
        <div class="video-wrapper">
          <iframe
            src="https://www.youtube.com/embed/xKpnc0lj9IU"
            title="Professional English Greetings at Work"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy">
          </iframe>
        </div>
        <div class="video-meta">
          <span class="video-meta-tag"><i data-lucide="clock"></i> 12 min</span>
          <span class="video-meta-tag"><i data-lucide="bar-chart-2"></i> Niveau B1–B2</span>
          <span class="video-meta-tag"><i data-lucide="subtitles"></i> Sous-titres EN/FR</span>
          <span class="video-meta-tag"><i data-lucide="youtube"></i> English with Lucy</span>
        </div>
      </div>

      <!-- Colonne droite : description + points clés -->
      <div class="video-side-panel">
        <p class="video-desc">
          Cette vidéo présente les meilleures pratiques de l''accueil professionnel en anglais.
          Vous y découvrirez les formules adaptées à chaque situation : premier contact,
          orientation, prise en charge d''un visiteur VIP, et gestion d''un retard.
        </p>
        <ul class="video-keypoints">
          <li><i data-lucide="check-circle-2"></i> Formules d''accueil formelles vs informelles</li>
          <li><i data-lucide="check-circle-2"></i> Gestion du temps d''attente</li>
          <li><i data-lucide="check-circle-2"></i> Orientation dans les locaux</li>
          <li><i data-lucide="check-circle-2"></i> Protocole pour les visiteurs sans rendez-vous</li>
          <li><i data-lucide="check-circle-2"></i> Erreurs les plus fréquentes à éviter</li>
        </ul>
      </div>

    </div>
  </div>

  <!-- ③ AUDIO -->
  <div class="seance-section">
    <div class="seance-section-title">
      <i data-lucide="headphones"></i> Écoute — Dialogues modèles
    </div>
    <div class="audio-players">

      <div class="audio-player">
        <button class="audio-player__play" aria-label="Écouter le dialogue 1">
          <i data-lucide="play"></i>
        </button>
        <div class="audio-player__body">
          <div class="audio-player__title">Dialogue 1 — Accueil standard (locuteur natif)</div>
          <div class="audio-player__subtitle">Niveau B1 · Vitesse normale · Accent britannique</div>
          <div class="audio-progress">
            <div class="audio-progress__bar">
              <div class="audio-progress__fill" style="width:0%"></div>
            </div>
            <span class="audio-progress__time">0:00 / 2:14</span>
          </div>
        </div>
        <span class="audio-player__duration">2:14</span>
      </div>

      <div class="audio-player">
        <button class="audio-player__play" aria-label="Écouter le dialogue 2">
          <i data-lucide="play"></i>
        </button>
        <div class="audio-player__body">
          <div class="audio-player__title">Dialogue 2 — Visiteur sans rendez-vous (situation complexe)</div>
          <div class="audio-player__subtitle">Niveau B2 · Vitesse normale · Accent américain</div>
          <div class="audio-progress">
            <div class="audio-progress__bar">
              <div class="audio-progress__fill" style="width:0%"></div>
            </div>
            <span class="audio-progress__time">0:00 / 3:47</span>
          </div>
        </div>
        <span class="audio-player__duration">3:47</span>
      </div>

      <div class="audio-player">
        <button class="audio-player__play" aria-label="Écouter le dialogue 3">
          <i data-lucide="play"></i>
        </button>
        <div class="audio-player__body">
          <div class="audio-player__title">Dialogue 3 — Accueil d''un délégué international (formel)</div>
          <div class="audio-player__subtitle">Niveau C1 · Vitesse rapide · Accent international</div>
          <div class="audio-progress">
            <div class="audio-progress__bar">
              <div class="audio-progress__fill" style="width:0%"></div>
            </div>
            <span class="audio-progress__time">0:00 / 4:02</span>
          </div>
        </div>
        <span class="audio-player__duration">4:02</span>
      </div>

    </div>
  </div>

  <!-- ④ RESSOURCES -->
  <div class="seance-section">
    <div class="seance-section-title">
      <i data-lucide="paperclip"></i> Ressources à télécharger
    </div>
    <div class="ressources-grid">

      <a href="https://storage.exemple.fr/apa1/guide-accueil-anglais.pdf"
         class="ressource-card ressource-card--pdf" target="_blank" rel="noopener">
        <div class="ressource-card__icon"><i data-lucide="file-text"></i></div>
        <div class="ressource-card__info">
          <div class="ressource-card__name">Guide — Accueil en anglais</div>
          <div class="ressource-card__meta">PDF · 2,4 Mo · 18 pages</div>
        </div>
        <i data-lucide="download" class="ressource-card__dl"></i>
      </a>

      <a href="https://storage.exemple.fr/apa1/phrases-cles.xlsx"
         class="ressource-card ressource-card--xlsx" target="_blank" rel="noopener">
        <div class="ressource-card__icon"><i data-lucide="table-2"></i></div>
        <div class="ressource-card__info">
          <div class="ressource-card__name">Banque de phrases — 80 expressions</div>
          <div class="ressource-card__meta">Excel · 48 Ko · 3 onglets</div>
        </div>
        <i data-lucide="download" class="ressource-card__dl"></i>
      </a>

      <a href="https://storage.exemple.fr/apa1/fiche-vocabulaire.docx"
         class="ressource-card ressource-card--docx" target="_blank" rel="noopener">
        <div class="ressource-card__icon"><i data-lucide="file-type-2"></i></div>
        <div class="ressource-card__info">
          <div class="ressource-card__name">Fiche vocabulaire — Réception & accueil</div>
          <div class="ressource-card__meta">Word · 124 Ko · À compléter</div>
        </div>
        <i data-lucide="download" class="ressource-card__dl"></i>
      </a>

      <a href="https://storage.exemple.fr/apa1/support-cours-apa1.pptx"
         class="ressource-card ressource-card--pptx" target="_blank" rel="noopener">
        <div class="ressource-card__icon"><i data-lucide="presentation"></i></div>
        <div class="ressource-card__info">
          <div class="ressource-card__name">Support de cours — APA.1 Séance 1</div>
          <div class="ressource-card__meta">PowerPoint · 5,1 Mo · 24 slides</div>
        </div>
        <i data-lucide="download" class="ressource-card__dl"></i>
      </a>

      <a href="https://storage.exemple.fr/apa1/scripts-dialogues.zip"
         class="ressource-card ressource-card--zip" target="_blank" rel="noopener">
        <div class="ressource-card__icon"><i data-lucide="archive"></i></div>
        <div class="ressource-card__info">
          <div class="ressource-card__name">Scripts + audios MP3 (pack complet)</div>
          <div class="ressource-card__meta">ZIP · 18,3 Mo · 3 dialogues</div>
        </div>
        <i data-lucide="download" class="ressource-card__dl"></i>
      </a>

      <a href="https://www.bbc.co.uk/learningenglish"
         class="ressource-card ressource-card--link" target="_blank" rel="noopener">
        <div class="ressource-card__icon"><i data-lucide="external-link"></i></div>
        <div class="ressource-card__info">
          <div class="ressource-card__name">BBC Learning English — Business</div>
          <div class="ressource-card__meta">Lien externe · Gratuit</div>
        </div>
        <i data-lucide="arrow-up-right" class="ressource-card__dl"></i>
      </a>

    </div>
  </div>

  <!-- ⑤ PHRASES CLÉS -->
  <div class="seance-section">
    <div class="seance-section-title">
      <i data-lucide="message-square-quote"></i> Phrases essentielles à mémoriser
    </div>
    <div class="phrases-grid">
      <div class="phrase-item">
        <span class="phrase-en">Good morning, welcome to [Company]. How may I help you?</span>
        <span class="phrase-fr">Bonjour, bienvenue chez [Entreprise]. Comment puis-je vous aider ?</span>
      </div>
      <div class="phrase-item">
        <span class="phrase-en">Do you have an appointment? Who are you here to see?</span>
        <span class="phrase-fr">Avez-vous un rendez-vous ? Qui souhaitez-vous rencontrer ?</span>
      </div>
      <div class="phrase-item">
        <span class="phrase-en">Please take a seat. I''ll let him know you''ve arrived.</span>
        <span class="phrase-fr">Je vous en prie, asseyez-vous. Je vais le prévenir de votre arrivée.</span>
      </div>
      <div class="phrase-item">
        <span class="phrase-en">I''m afraid he''s running a few minutes late. Can I offer you something to drink?</span>
        <span class="phrase-fr">Je suis désolé(e), il a un léger retard. Puis-je vous offrir quelque chose ?</span>
      </div>
      <div class="phrase-item">
        <span class="phrase-en">Please follow me, I''ll show you to the meeting room.</span>
        <span class="phrase-fr">Veuillez me suivre, je vous accompagne en salle de réunion.</span>
      </div>
      <div class="phrase-item">
        <span class="phrase-en">Could you please sign in and wear this visitor badge?</span>
        <span class="phrase-fr">Pourriez-vous signer ici et porter ce badge visiteur ?</span>
      </div>
      <div class="phrase-item">
        <span class="phrase-en">I''m sorry, he''s in a meeting right now. Can I take a message?</span>
        <span class="phrase-fr">Je suis désolé(e), il est en réunion. Puis-je prendre un message ?</span>
      </div>
      <div class="phrase-item">
        <span class="phrase-en">The lifts are just around the corner. His office is on the 3rd floor.</span>
        <span class="phrase-fr">Les ascenseurs sont juste au coin. Son bureau est au 3e étage.</span>
      </div>
    </div>
  </div>

  <!-- ⑥ ACTIVITÉ PRATIQUE -->
  <div class="seance-section">
    <div class="seance-section-title">
      <i data-lucide="pen-line"></i> Activité pratique — Mise en situation
    </div>
    <p class="activite-desc">
      À partir des scripts et de l''audio modèle, simulez l''accueil d''un visiteur anglophone.
      Enregistrez votre simulation (1 min environ) et transmettez-la à votre formateur pour correction et feedback personnalisé.
    </p>
    <div class="activite-steps">
      <div class="step">
        <span class="step-num">01</span>
        <span>Téléchargez le <strong>guide PDF</strong> et lisez les scripts pages 8 à 12</span>
      </div>
      <div class="step">
        <span class="step-num">02</span>
        <span>Écoutez le <strong>Dialogue 1</strong> (audio ci-dessus) au moins 2 fois en suivant le script</span>
      </div>
      <div class="step">
        <span class="step-num">03</span>
        <span>Entraînez-vous à voix haute avec le script, puis sans</span>
      </div>
      <div class="step">
        <span class="step-num">04</span>
        <span>Enregistrez votre simulation : mémo vocal, Teams ou Zoom (durée : 1 min min.)</span>
      </div>
      <div class="step">
        <span class="step-num">05</span>
        <span>Déposez l''enregistrement dans votre espace partagé ou envoyez-le à votre formateur</span>
      </div>
    </div>
  </div>

</div>
'
WHERE titre = 'Accueillir un visiteur anglophone'
  AND sequence_id = (
      SELECT id FROM lms_sequences WHERE titre LIKE 'APA.1%' LIMIT 1
  );
