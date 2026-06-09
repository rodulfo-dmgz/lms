/**
 * kpi-store.js — État réactif de l'application KPI
 * Pub/Sub léger sans dépendances externes.
 */

const _state = {
  profile:         null,   // lms_profiles row
  kpiProfile:      null,   // kpi_student_profile row
  niveaux:         [],     // kpi_niveaux (seed)
  sequences:       [],     // kpi_sequences avec séances
  session:         null,   // kpi_sessions — session active
  activiteCourante: null,  // kpi_activites — activité en cours
  reponses:        [],     // kpi_reponses — buffer session
  progression:     {},     // { activite_id: kpi_activite_progress }
  guideVisible:    false,
  guideMessages:   [],
  onlineUsers:     [],     // Supabase Presence
  notifications:   [],     // broadcasts reçus
  view:            'loading', // 'loading' | 'diagnostic' | 'map' | 'activite' | 'formateur' | 'session'
};

const _listeners = {};

export const store = {
  get: (key) => _state[key],

  set(key, value) {
    _state[key] = value;
    (_listeners[key] || []).forEach(fn => fn(value));
    (_listeners['*']  || []).forEach(fn => fn(key, value));
  },

  update(key, updater) {
    this.set(key, updater(_state[key]));
  },

  subscribe(key, fn) {
    _listeners[key] = _listeners[key] || [];
    _listeners[key].push(fn);
    return () => {
      _listeners[key] = _listeners[key].filter(f => f !== fn);
    };
  },

  // Helpers pratiques
  getProfile()    { return _state.profile; },
  getKpiProfile() { return _state.kpiProfile; },
  getSession()    { return _state.session; },
  getNiveau()     { return _state.niveaux.find(n => n.id === _state.kpiProfile?.niveau_id) || null; },
  isFormateur()   { return _state.profile?.role === 'formateur' || _state.profile?.role === 'admin'; },

  addNotification(notif) {
    const n = { ...notif, id: Date.now(), ts: new Date() };
    this.set('notifications', [n, ..._state.notifications].slice(0, 20));
    return n;
  },

  addGuideMessage(msg, type = 'guide') {
    const m = { text: msg, type, ts: new Date(), id: Date.now() };
    this.set('guideMessages', [..._state.guideMessages, m].slice(-50));
    this.set('guideVisible', true);
  },

  clearGuide() {
    this.set('guideMessages', []);
    this.set('guideVisible', false);
  },

  setProgression(activiteId, progress) {
    this.set('progression', { ..._state.progression, [activiteId]: progress });
  },

  getProgressionForActivite(activiteId) {
    return _state.progression[activiteId] || null;
  },

  dump() { return { ..._state }; }, // debug
};
