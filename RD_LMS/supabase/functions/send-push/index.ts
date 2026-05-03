/**
 * send-push — Edge Function Supabase
 *
 * Déclenchée via Database Webhook sur INSERT dans lms_notifications.
 * Envoie une Web Push notification à tous les appareils de l'utilisateur.
 *
 * Variables d'environnement requises dans Supabase :
 *   VAPID_SUBJECT    : "mailto:contact@votre-domaine.fr"
 *   VAPID_PUBLIC_KEY : clé publique VAPID (base64url)
 *   VAPID_PRIVATE_KEY: clé privée  VAPID (base64url)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY= Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_SUBJECT       = Deno.env.get('VAPID_SUBJECT')        ?? 'mailto:admin@dashbord.fr';
const VAPID_PUBLIC_KEY    = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY   = Deno.env.get('VAPID_PRIVATE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Point d'entrée ─────────────────────────────────────────
Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return new Response('Bad JSON', { status: 400 }); }

    // Payload envoyé par le Database Webhook : { type, table, record, ... }
    const record = (body.record ?? body) as Record<string, unknown>;
    const userId  = record.user_id  as string;
    const title   = record.title    as string ?? 'DASHBOA_RD';
    const message = record.message  as string ?? '';
    const link    = record.link     as string ?? '/';

    if (!userId) return new Response('Missing user_id', { status: 400 });

    // Récupérer toutes les subscriptions de cet utilisateur
    const { data: subs, error } = await supabase
        .from('lms_push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId);

    if (error || !subs?.length) {
        return new Response(JSON.stringify({ sent: 0, reason: 'no subscriptions' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const payload = JSON.stringify({
        title,
        body:  message,
        url:   `https://rodulfo-dmgz.github.io/lms/RD_LMS/#${link}`,
        icon:  'https://rodulfo-dmgz.github.io/lms/RD_LMS/assets/icons/icon-192.png',
        badge: 'https://rodulfo-dmgz.github.io/lms/RD_LMS/assets/icons/badge-72.png',
    });

    const results = await Promise.allSettled(
        subs.map(sub => _sendWebPush(sub, payload))
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(JSON.stringify({ sent, failed }), {
        headers: { 'Content-Type': 'application/json' },
    });
});

// ── Envoi d'un push via Web Push Protocol ──────────────────
async function _sendWebPush(
    sub: { endpoint: string; p256dh: string; auth: string },
    payload: string
) {
    const ttl        = 60 * 60 * 24;  // 24h
    const expiration = Math.floor(Date.now() / 1000) + 12 * 3600;

    const headers = await _buildVapidHeaders(sub.endpoint, expiration);
    const encrypted = await _encryptPayload(payload, sub.p256dh, sub.auth);

    const res = await fetch(sub.endpoint, {
        method:  'POST',
        headers: {
            ...headers,
            'Content-Type':     'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'TTL':              String(ttl),
        },
        body: encrypted,
    });

    if (!res.ok && res.status !== 201) {
        // Si 410 Gone : subscription expirée → supprimer
        if (res.status === 410) {
            await supabase
                .from('lms_push_subscriptions')
                .delete()
                .eq('endpoint', sub.endpoint);
        }
        throw new Error(`Push failed: ${res.status} ${await res.text()}`);
    }
}

// ── VAPID headers ───────────────────────────────────────────
async function _buildVapidHeaders(endpoint: string, expiration: number) {
    const audience = new URL(endpoint).origin;
    const header   = _b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
    const claims   = _b64url(JSON.stringify({
        aud: audience,
        exp: expiration,
        sub: VAPID_SUBJECT,
    }));
    const sigInput  = `${header}.${claims}`;
    const privKey   = await _importVapidPrivateKey(VAPID_PRIVATE_KEY);
    const sigBuffer = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privKey,
        new TextEncoder().encode(sigInput)
    );
    const jwt = `${sigInput}.${_arrayBufferToBase64Url(sigBuffer)}`;

    return {
        Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    };
}

async function _importVapidPrivateKey(base64Key: string): Promise<CryptoKey> {
    const raw = _base64UrlToUint8Array(base64Key);
    return crypto.subtle.importKey(
        'raw', raw,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false, ['sign']
    );
}

// ── Chiffrement AES-128-GCM (RFC 8291) ─────────────────────
async function _encryptPayload(payload: string, p256dhB64: string, authB64: string): Promise<ArrayBuffer> {
    const p256dh   = _base64UrlToUint8Array(p256dhB64);
    const authBytes= _base64UrlToUint8Array(authB64);
    const salt     = crypto.getRandomValues(new Uint8Array(16));

    const serverKeys = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true, ['deriveKey', 'deriveBits']
    );
    const serverPubKey = await crypto.subtle.exportKey('raw', serverKeys.publicKey);

    const clientPubKey = await crypto.subtle.importKey(
        'raw', p256dh,
        { name: 'ECDH', namedCurve: 'P-256' },
        false, []
    );

    const sharedSecret = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: clientPubKey },
        serverKeys.privateKey, 256
    );

    const prk = await _hkdf(authBytes, new Uint8Array(sharedSecret), 'Content-Encoding: auth\0', 32);
    const cek  = await _hkdf(salt, prk,
        _buildInfo('aes128gcm', new Uint8Array(serverPubKey), p256dh), 16);
    const nonce= await _hkdf(salt, prk,
        _buildInfo('nonce',     new Uint8Array(serverPubKey), p256dh), 12);

    const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        key,
        new TextEncoder().encode(payload + '\x02')   // record delimiter
    );

    // Build RFC 8291 content-encoding header
    const header = new Uint8Array(16 + 4 + 1 + serverPubKey.byteLength);
    header.set(salt);
    new DataView(header.buffer).setUint32(16, 4096, false);   // rs = 4096
    header[20] = serverPubKey.byteLength;
    header.set(new Uint8Array(serverPubKey), 21);

    const result = new Uint8Array(header.byteLength + encrypted.byteLength);
    result.set(header);
    result.set(new Uint8Array(encrypted), header.byteLength);
    return result.buffer;
}

async function _hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array | string, length: number) {
    const infoBytes = typeof info === 'string' ? new TextEncoder().encode(info) : info;
    const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const bits   = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt, info: infoBytes },
        ikmKey, length * 8
    );
    return new Uint8Array(bits);
}

function _buildInfo(type: string, clientPub: Uint8Array, serverPub: Uint8Array): Uint8Array {
    const label   = new TextEncoder().encode(`Content-Encoding: ${type}\0P-256\0`);
    const result  = new Uint8Array(label.byteLength + 2 + clientPub.byteLength + 2 + serverPub.byteLength);
    let offset = 0;
    result.set(label, offset);              offset += label.byteLength;
    new DataView(result.buffer).setUint16(offset, clientPub.byteLength, false); offset += 2;
    result.set(clientPub, offset);          offset += clientPub.byteLength;
    new DataView(result.buffer).setUint16(offset, serverPub.byteLength, false); offset += 2;
    result.set(serverPub, offset);
    return result;
}

// ── Utilitaires base64 ──────────────────────────────────────
function _b64url(str: string): string {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function _arrayBufferToBase64Url(buf: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function _base64UrlToUint8Array(b64: string): Uint8Array {
    const padding = '='.repeat((4 - (b64.length % 4)) % 4);
    return Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')+padding), c => c.charCodeAt(0));
}
