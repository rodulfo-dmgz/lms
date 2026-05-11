-- ============================================================
-- LMS DASHBOA_RD — Étape 5 : Enrichissement commercial des financements
-- ============================================================
-- Ajoute les champs commerciaux à lms_financements
-- Migration sûre : toutes les colonnes sont NULLable
-- ============================================================

ALTER TABLE lms_financements
    ADD COLUMN IF NOT EXISTS type_financement       VARCHAR(50),
    ADD COLUMN IF NOT EXISTS financeur              VARCHAR(150),
    ADD COLUMN IF NOT EXISTS organisme_gestionnaire VARCHAR(150),
    ADD COLUMN IF NOT EXISTS code_cpf               VARCHAR(20),
    ADD COLUMN IF NOT EXISTS prix_ht                NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS prix_ttc               NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS taux_tva               NUMERIC(5,2)  DEFAULT 20.00,
    ADD COLUMN IF NOT EXISTS taux_prise_charge      NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS plafond_montant         NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS plafond_heures          INT,
    ADD COLUMN IF NOT EXISTS notes_commerciales      TEXT,
    ADD COLUMN IF NOT EXISTS actif                   BOOLEAN       DEFAULT TRUE;

-- Valeurs par défaut pour les lignes existantes
UPDATE lms_financements SET actif = TRUE WHERE actif IS NULL;

-- Commentaires
COMMENT ON COLUMN lms_financements.type_financement       IS 'CPF | OPCO | PÔLE_EMPLOI | ENTREPRISE | PERSONNEL | AUTRE';
COMMENT ON COLUMN lms_financements.financeur              IS 'Nom de l''organisme financeur (ex : ATLAS, Pôle Emploi, Région…)';
COMMENT ON COLUMN lms_financements.organisme_gestionnaire IS 'OPCO ou organisme qui gère le dossier';
COMMENT ON COLUMN lms_financements.code_cpf               IS 'Numéro CPF de la formation (si éligible)';
COMMENT ON COLUMN lms_financements.prix_ht                IS 'Tarif HT en euros';
COMMENT ON COLUMN lms_financements.prix_ttc               IS 'Tarif TTC en euros (calculé ou saisi)';
COMMENT ON COLUMN lms_financements.taux_tva               IS 'Taux TVA en % (ex : 20.00)';
COMMENT ON COLUMN lms_financements.taux_prise_charge      IS 'Pourcentage pris en charge par le financeur (0–100)';
COMMENT ON COLUMN lms_financements.plafond_montant         IS 'Plafond de financement en euros';
COMMENT ON COLUMN lms_financements.plafond_heures          IS 'Plafond de financement en heures';
COMMENT ON COLUMN lms_financements.notes_commerciales      IS 'Notes internes (conditions particulières, contacts…)';
COMMENT ON COLUMN lms_financements.actif                   IS 'FALSE = masqué dans les selects mais non supprimé';

-- ── RLS : admin peut tout voir + modifier ───────────────────
-- (Les politiques existantes sur lms_financements s'appliquent déjà,
--  pas besoin de nouvelles politiques pour les colonnes ajoutées)
