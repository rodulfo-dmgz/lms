/**
 * kpi-realtime.js — Supabase Realtime manager
 *
 * 3 canaux par session :
 * 1. postgres_changes — kpi_reponses (modération live)
 * 2. postgres_changes — kpi_sessions (changement modalité, activité courante)
 * 3. broadcast — messages formateur → classe (timer, attention, etc.)
 * 4. presence — qui est en ligne dans la session
 */

import { supabase } from './kpi-auth.js?v=2';
import { store } from './kpi-store.js?v=2';

let _channel = null;
let _presenceChannel = null;

/**
 * Rejoindre une session Realtime
 * @param {string} sessionId
 * @param {{ onBroadcast, onSessionUpdate, onNewReponse, onPresence }} callbacks
 */
export function joinSessionRealtime(sessionId, callbacks = {}) {
  leaveSession();

  // ── Canal principal (DB changes + broadcast) ──────────────────────
  _channel = supabase.channel(`kpi_session:${sessionId}`, {
    config: { broadcast: { self: false }, presence: { key: '' } },
  });

  // Session update (modalité, activité courante)
  _channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'kpi_sessions', filter: `id=eq.${sessionId}` },
    (payload) => {
      store.set('session', { ...store.getSession(), ...payload.new });
      callbacks.onSessionUpdate?.(payload.new);
    }
  );

  // Nouvelles réponses stagiaires → formateur
  _channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'kpi_reponses', filter: `session_id=eq.${sessionId}` },
    (payload) => {
      callbacks.onNewReponse?.(payload.new);
      if (store.isFormateur()) {
        store.addNotification({
          type: 'new_reponse',
          text: 'Nouvelle réponse reçue',
          data: payload.new,
        });
      }
    }
  );

  // Modération de réponses (statut → shared)
  _channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'kpi_reponses', filter: `session_id=eq.${sessionId}` },
    (payload) => {
      if (payload.new.statut === 'shared') {
        callbacks.onReponseShared?.(payload.new);
        if (!store.isFormateur()) {
          store.addNotification({
            type: 'reponse_partagee',
            text: 'Le formateur a partagé une réponse',
            data: payload.new,
          });
        }
      }
    }
  );

  // Broadcasts formateur → classe
  _channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'kpi_broadcasts', filter: `session_id=eq.${sessionId}` },
    (payload) => {
      _handleBroadcast(payload.new, callbacks.onBroadcast);
    }
  );

  _channel.subscribe((status) => {
    console.log('[KPI Realtime]', status);
  });

  // ── Présence ──────────────────────────────────────────────────────
  _presenceChannel = supabase.channel(`kpi_presence:${sessionId}`);
  const profile = store.getProfile();

  _presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = _presenceChannel.presenceState();
      const users = Object.values(state).flat();
      store.set('onlineUsers', users);
      callbacks.onPresence?.(users);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && profile) {
        await _presenceChannel.track({
          profile_id: profile.id,
          prenom:     profile.prenom,
          nom:        profile.nom,
          role:       profile.role,
          joined_at:  new Date().toISOString(),
        });
      }
    });

  return { channel: _channel, presenceChannel: _presenceChannel };
}

/**
 * Envoyer un broadcast formateur
 */
export async function sendBroadcast(sessionId, type, contenu = {}) {
  const profile = store.getProfile();
  if (!profile) return;

  const { error } = await supabase.from('kpi_broadcasts').insert({
    session_id:   sessionId,
    formateur_id: profile.id,
    type,
    contenu,
  });

  if (error) console.error('[KPI Broadcast]', error);
}

/**
 * Changer la modalité d'une session (formateur)
 */
export async function changeModalite(sessionId, modalite) {
  const { error } = await supabase
    .from('kpi_sessions')
    .update({ modalite })
    .eq('id', sessionId);

  if (error) console.error('[KPI Modalite]', error);
}

/**
 * Passer à l'activité suivante (formateur)
 */
export async function setActiviteCourante(sessionId, activiteId) {
  const { error } = await supabase
    .from('kpi_sessions')
    .update({ activite_active_id: activiteId })
    .eq('id', sessionId);

  if (error) console.error('[KPI SetActivite]', error);
}

export function leaveSession() {
  if (_channel)         { supabase.removeChannel(_channel);         _channel = null; }
  if (_presenceChannel) { supabase.removeChannel(_presenceChannel); _presenceChannel = null; }
}

// ── Handlers internes ──────────────────────────────────────────────

function _handleBroadcast(broadcast, callback) {
  const { type, contenu } = broadcast;

  switch (type) {
    case 'attention':
      store.addNotification({ type: 'attention', text: '⚡ Attention demandée par le formateur', data: contenu });
      _flashAttention();
      break;
    case 'timer_start':
      store.addNotification({ type: 'timer', text: `⏱ Timer démarré : ${contenu.minutes} min`, data: contenu });
      break;
    case 'timer_stop':
      store.addNotification({ type: 'timer_stop', text: '⏱ Temps écoulé !', data: contenu });
      break;
    case 'felicitation':
      store.addNotification({ type: 'success', text: contenu.message || '🎉 Bravo !', data: contenu });
      break;
    case 'message':
      store.addGuideMessage(`📢 ${contenu.texte}`, 'formateur');
      break;
    default:
      break;
  }

  callback?.(broadcast);
}

function _flashAttention() {
  // Flash fond rouge
  document.body.classList.add('kpi-attention-flash');
  setTimeout(() => document.body.classList.remove('kpi-attention-flash'), 1500);

  // Afficher l'overlay d'attention puis le masquer après 3s (ou au clic)
  const overlay = document.getElementById('kpi-attention-overlay');
  if (overlay) {
    overlay.hidden = false;
    setTimeout(() => { overlay.hidden = true; }, 3000);
  }
}
