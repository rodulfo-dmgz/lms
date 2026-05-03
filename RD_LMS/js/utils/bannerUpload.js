/**
 * bannerUpload.js — Upload d'images bannières vers Supabase Storage
 *
 * Bucket requis : créez un bucket PUBLIC nommé "media" dans votre
 * projet Supabase (Storage → New bucket → Name: "media" → Public: ✓).
 *
 * Chemins de stockage :
 *   banners/cours/{coursId}/{timestamp}_{filename}
 *   banners/sequences/{seqId}/{timestamp}_{filename}
 *   banners/seances/{seanceId}/{timestamp}_{filename}
 */

import { db } from '../lib/supabaseClient.js';

// ── Configuration ────────────────────────────────────────────
export const BANNER_BUCKET = 'media';      // Nom du bucket Supabase Storage
export const MAX_SIZE_MB   = 3;            // Taille max en Mo

// Dossiers à explorer pour le picker
const BANNER_PREFIXES = ['banners/cours', 'banners/sequences', 'banners/seances'];

/**
 * Valide un fichier image avant upload.
 * @param {File} file
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateBannerFile(file) {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED.includes(file.type)) {
        return { ok: false, error: 'Format non supporté. Utilisez JPEG, PNG ou WebP.' };
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return { ok: false, error: `Fichier trop lourd (max ${MAX_SIZE_MB} Mo).` };
    }
    return { ok: true };
}

/**
 * Upload une image bannière vers Supabase Storage.
 * @param {File}   file     — fichier image local
 * @param {string} entityId — ID de l'entité (cours, séquence, séance) pour l'organisation
 * @param {string} prefix   — dossier de stockage (ex: 'banners/cours')
 * @returns {Promise<string>} URL publique
 */
export async function uploadBannerImage(file, entityId = '', prefix = 'banners/cours') {
    const safe   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = entityId || (typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now());
    const path   = `${prefix}/${folder}/${Date.now()}_${safe}`;

    const { error } = await db.storage
        .from(BANNER_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;

    const { data } = db.storage.from(BANNER_BUCKET).getPublicUrl(path);
    return data.publicUrl;
}

/**
 * Liste toutes les images bannières stockées dans Supabase Storage.
 * Explore les dossiers : banners/cours/, banners/sequences/, banners/seances/
 * @returns {Promise<Array<{name, url, size, path, category}>>}
 */
export async function listBannerImages() {
    const images = [];

    for (const prefix of BANNER_PREFIXES) {
        // Niveau 1 : sous-dossiers (par entity_id) dans le prefix
        const { data: level1, error: e1 } = await db.storage
            .from(BANNER_BUCKET)
            .list(prefix, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

        if (e1 || !level1?.length) continue;

        const directFiles = level1.filter(i => i.metadata?.mimetype?.startsWith('image/'));
        const folders     = level1.filter(i => !i.metadata);

        // Fichiers à plat dans le prefix
        for (const f of directFiles) {
            const path = `${prefix}/${f.name}`;
            const { data } = db.storage.from(BANNER_BUCKET).getPublicUrl(path);
            images.push({ name: f.name, url: data.publicUrl, size: f.metadata?.size || 0, path, category: prefix });
        }

        // Fichiers dans les sous-dossiers — listing en parallèle (max 50 dossiers)
        const subResults = await Promise.all(
            folders.slice(0, 50).map(folder =>
                db.storage.from(BANNER_BUCKET)
                    .list(`${prefix}/${folder.name}`, {
                        limit: 30,
                        sortBy: { column: 'created_at', order: 'desc' },
                    })
            )
        );

        subResults.forEach((res, i) => {
            if (res.error || !res.data) return;
            const folderName = folders[i].name;
            for (const f of res.data) {
                if (!f.metadata?.mimetype?.startsWith('image/')) continue;
                const path = `${prefix}/${folderName}/${f.name}`;
                const { data } = db.storage.from(BANNER_BUCKET).getPublicUrl(path);
                images.push({ name: f.name, url: data.publicUrl, size: f.metadata?.size || 0, path, category: prefix });
            }
        });
    }

    return images;
}
