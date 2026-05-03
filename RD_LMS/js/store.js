// ── Clés de persistance sessionStorage ────────────────────
const SS_VIEW_AS         = 'lms_viewAs';
const SS_VIEW_AS_PROFILE = 'lms_viewAsProfile';

function _ssGet(key) {
    try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch { return null; }
}
function _ssSet(key, val) {
    try { val == null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, JSON.stringify(val)); }
    catch { /* silencieux si quota dépassé */ }
}

export const store = {
    state: {
        user:            null,   // { id, email }
        profile:         null,   // { prenom, nom, role, first_login }
        courses:         [],
        progressSummary: [],
        dailyMessage:    null,
        // Restaurés depuis sessionStorage au chargement de la page
        viewAs:          _ssGet(SS_VIEW_AS),
        viewAsProfile:   _ssGet(SS_VIEW_AS_PROFILE),
    },
    _listeners: [],

    subscribe(fn) {
        this._listeners.push(fn);
        return () => { this._listeners = this._listeners.filter(l => l !== fn); };
    },
    _notify() { this._listeners.forEach(fn => fn(this.state)); },

    setUser(u)              { this.state.user = u;              this._notify(); },
    setProfile(p)           { this.state.profile = p;           this._notify(); },
    setCourses(c)           { this.state.courses = c;           this._notify(); },
    setProgressSummary(s)   { this.state.progressSummary = s;   this._notify(); },
    setDailyMessage(m)      { this.state.dailyMessage = m;      this._notify(); },
    setViewAs(v)            { this.state.viewAs = v;       _ssSet(SS_VIEW_AS, v);          this._notify(); },
    setViewAsProfile(p)     { this.state.viewAsProfile = p; _ssSet(SS_VIEW_AS_PROFILE, p); this._notify(); },

    getUser()           { return this.state.user; },
    getProfile()        { return this.state.profile; },
    getViewAsProfile()  { return this.state.viewAsProfile; },
    /** Profil actif : celui du stagiaire simulé si viewAs actif, sinon le propre profil. */
    getActiveProfile()  { return this.state.viewAsProfile ?? this.state.profile; },
    getRole()           { return this.state.viewAs?.role ?? this.state.profile?.role; },
    /** ID actif pour les requêtes de données (progression, devoirs…) */
    getActiveProfileId() {
        return this.state.viewAs?.profileId ?? this.state.user?.id;
    },

    reset() {
        _ssSet(SS_VIEW_AS, null);
        _ssSet(SS_VIEW_AS_PROFILE, null);
        this.state = {
            user: null, profile: null, courses: [],
            progressSummary: [], dailyMessage: null,
            viewAs: null, viewAsProfile: null,
        };
        this._notify();
    }
};
