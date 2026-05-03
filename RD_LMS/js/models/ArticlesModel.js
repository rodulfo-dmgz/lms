import { db } from '../lib/supabaseClient.js';

// ── Articles ─────────────────────────────────────────────────

export async function getArticles({ categorie = null, includeInactive = false } = {}) {
    let q = db
        .from('lms_articles')
        .select('id, titre, excerpt, categorie, duree_lecture, image_url, url_externe, source_id, actif, created_at, updated_at')
        .order('created_at', { ascending: false });

    if (!includeInactive) q = q.eq('actif', true);
    if (categorie)        q = q.eq('categorie', categorie);

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
}

export async function getArticleById(id) {
    const { data, error } = await db
        .from('lms_articles')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function createArticle(fields) {
    const { data, error } = await db
        .from('lms_articles')
        .insert(sanitizeArticle(fields))
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateArticle(id, fields) {
    const { data, error } = await db
        .from('lms_articles')
        .update({ ...sanitizeArticle(fields), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteArticle(id) {
    const { error } = await db.from('lms_articles').delete().eq('id', id);
    if (error) throw error;
}

function sanitizeArticle(f) {
    return {
        titre:         f.titre?.trim()        || undefined,
        excerpt:       f.excerpt?.trim()       || null,
        contenu:       f.contenu?.trim()       || null,
        categorie:     f.categorie             || 'inspiration',
        duree_lecture: f.duree_lecture         ? parseInt(f.duree_lecture, 10) : null,
        image_url:     f.image_url?.trim()     || null,
        url_externe:   f.url_externe?.trim()   || null,
        source_id:     f.source_id             || null,
        actif:         f.actif !== undefined ? Boolean(f.actif) : true,
    };
}

// ── Sources d'articles ────────────────────────────────────────

export async function getArticleSources({ includeInactive = false } = {}) {
    let q = db
        .from('lms_article_sources')
        .select('id, nom, url_rss, type, categorie, description, actif, derniere_sync, created_at')
        .order('nom');

    if (!includeInactive) q = q.eq('actif', true);

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
}

export async function createArticleSource(fields) {
    const { data, error } = await db
        .from('lms_article_sources')
        .insert(sanitizeSource(fields))
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateArticleSource(id, fields) {
    const { data, error } = await db
        .from('lms_article_sources')
        .update(sanitizeSource(fields))
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteArticleSource(id) {
    const { error } = await db.from('lms_article_sources').delete().eq('id', id);
    if (error) throw error;
}

function sanitizeSource(f) {
    return {
        nom:         f.nom?.trim()         || undefined,
        url_rss:     f.url_rss?.trim()     || null,
        type:        f.type                || 'rss',
        categorie:   f.categorie           || 'inspiration',
        description: f.description?.trim() || null,
        actif:       f.actif !== undefined ? Boolean(f.actif) : true,
    };
}
