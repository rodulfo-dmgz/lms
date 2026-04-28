export const store = {
    state: {
        user:            null,   // { id, email }
        profile:         null,   // { prenom, nom, role, first_login }
        courses:         [],
        progressSummary: [],
        dailyMessage:    null,
        viewAs:          null,   // { role, profileId } mode "voir en tant que"
    },
    _listeners: [],

    subscribe(fn) {
        this._listeners.push(fn);
        return () => { this._listeners = this._listeners.filter(l => l !== fn); };
    },
    _notify() { this._listeners.forEach(fn => fn(this.state)); },

    setUser(u)            { this.state.user = u;            this._notify(); },
    setProfile(p)         { this.state.profile = p;         this._notify(); },
    setCourses(c)         { this.state.courses = c;         this._notify(); },
    setProgressSummary(s) { this.state.progressSummary = s; this._notify(); },
    setDailyMessage(m)    { this.state.dailyMessage = m;    this._notify(); },
    setViewAs(v)          { this.state.viewAs = v;          this._notify(); },

    getUser()    { return this.state.user; },
    getProfile() { return this.state.profile; },
    getRole()    { return this.state.viewAs?.role ?? this.state.profile?.role; },

    reset() {
        this.state = {
            user: null, profile: null, courses: [],
            progressSummary: [], dailyMessage: null, viewAs: null
        };
        this._notify();
    }
};
