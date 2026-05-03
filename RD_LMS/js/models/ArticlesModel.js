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

/**
 * Synchronise les flux RSS actifs.
 * Stratégie multi-proxy : rss2json → allorigins (XML) → erreur.
 * Insère les nouveaux articles dans lms_articles (doublons ignorés via url_externe).
 * @param {Array} sources — liste de {id, url_rss, categorie, nom}
 * @returns {{ added: number, skipped: number, errors: string[] }}
 */
export async function syncRSSFeeds(sources) {
    const result = { added: 0, skipped: 0, errors: [] };

    // Charger les URLs déjà en base pour éviter les doublons
    const { data: existing } = await db
        .from('lms_articles')
        .select('url_externe')
        .not('url_externe', 'is', null);
    const existingUrls = new Set((existing || []).map(a => a.url_externe));

    for (const source of sources) {
        if (!source.url_rss) continue;
        try {
            const items = await _fetchRSSItems(source.url_rss, source.nom);

            for (const item of items) {
                const url = item.link || item.guid;
                if (!url || existingUrls.has(url)) { result.skipped++; continue; }

                // Nettoyer le HTML de la description pour l'excerpt
                const div = document.createElement('div');
                div.innerHTML = item.description || '';
                const text  = (div.textContent || '').trim();
                const excerpt = text.slice(0, 300) || null;
                const words   = text.split(/\s+/).filter(Boolean).length;
                const duree_lecture = Math.max(1, Math.round(words / 200));

                const { error } = await db.from('lms_articles').insert({
                    titre:         (item.title || '').trim().slice(0, 255),
                    excerpt,
                    url_externe:   url,
                    image_url:     item.thumbnail || item.enclosure?.link || item.image || null,
                    categorie:     source.categorie || 'inspiration',
                    source_id:     source.id,
                    duree_lecture,
                    actif:         true,
                });

                if (error && error.code !== '23505') { // 23505 = unique violation
                    result.errors.push(`[${source.nom}] ${item.title?.slice(0, 40)}: ${error.message}`);
                } else {
                    result.added++;
                    existingUrls.add(url);
                }
            }

            // Mettre à jour derniere_sync
            await db.from('lms_article_sources')
                .update({ derniere_sync: new Date().toISOString() })
                .eq('id', source.id);

        } catch (err) {
            result.errors.push(`[${source.nom}] ${err.message}`);
        }
    }

    return result;
}

/**
 * Tente de récupérer les items RSS via plusieurs proxys CORS.
 * Proxy 1 : rss2json.com (JSON, simple)
 * Proxy 2 : allorigins.win (XML brut, parse natif)
 */
async function _fetchRSSItems(url, sourceName) {
    // ── Proxy 1 : rss2json.com ────────────────────────────────
    try {
        const p1 = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=30`;
        const r1 = await fetch(p1, { signal: AbortSignal.timeout(10000) });
        if (r1.ok) {
            const j1 = await r1.json();
            if (j1.status === 'ok' && j1.items?.length) return j1.items;
        }
    } catch (_) { /* timeout ou CORS → fallback */ }

    // ── Proxy 2 : allorigins.win (XML brut) ───────────────────
    const p2 = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const r2  = await fetch(p2, { signal: AbortSignal.timeout(12000) });
    if (!r2.ok) throw new Error(`allorigins HTTP ${r2.status}`);
    const j2 = await r2.json();
    if (!j2.contents) throw new Error('Contenu RSS vide');

    return _parseXMLItems(j2.contents);
}

/**
 * Parse un flux RSS/Atom XML brut → tableau d'items normalisés.
 */
function _parseXMLItems(xmlStr) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlStr, 'text/xml');
    const items  = [];

    // RSS 2.0
    for (const el of doc.querySelectorAll('item')) {
        items.push({
            title:       el.querySelector('title')?.textContent || '',
            link:        el.querySelector('link')?.textContent  || el.querySelector('guid')?.textContent || '',
            guid:        el.querySelector('guid')?.textContent  || '',
            description: el.querySelector('description')?.textContent || '',
            thumbnail:   el.querySelector('enclosure')?.getAttribute('url')
                      || el.querySelector('media\\:thumbnail, thumbnail')?.getAttribute('url')
                      || null,
        });
    }

    // Atom (si aucun <item>)
    if (!items.length) {
        for (const el of doc.querySelectorAll('entry')) {
            const linkEl = el.querySelector('link[rel="alternate"], link');
            items.push({
                title:       el.querySelector('title')?.textContent || '',
                link:        linkEl?.getAttribute('href') || linkEl?.textContent || '',
                guid:        el.querySelector('id')?.textContent || '',
                description: el.querySelector('summary, content')?.textContent || '',
                thumbnail:   null,
            });
        }
    }

    if (!items.length) throw new Error('Aucun article trouvé dans le flux XML');
    return items;
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
