import { store }         from '../store.js';
import { updateProfile } from '../models/ProfileModel.js';
import { handleError }   from '../errorHandler.js';
import { db }            from '../lib/supabaseClient.js';
import { renderProfile } from '../views/profileView.js';

export async function loadProfile(container) {
    const profile = store.getProfile();
    const user    = store.getUser();

    renderProfile(container, { profile, user });
    if (typeof lucide !== 'undefined') lucide.createIcons();
    attachProfileEvents(container);
}

function attachProfileEvents(container) {
    const userId = store.getUser().id;

    // ── Photo upload ──────────────────────────────────────────
    const fileInput = container.querySelector('#avatarInput');
    const avatarBtn = container.querySelector('#changeAvatarBtn');
    const avatarStatus = container.querySelector('#avatarStatus');

    avatarBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showAvatarStatus(avatarStatus, 'Veuillez sélectionner une image (JPG, PNG, WebP).', true);
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showAvatarStatus(avatarStatus, "L'image doit faire moins de 2 Mo.", true);
            return;
        }

        showAvatarStatus(avatarStatus, 'Envoi en cours…');

        try {
            const ext  = file.name.split('.').pop().toLowerCase();
            const path = `${userId}/avatar.${ext}`;

            const { error: upErr } = await db.storage
                .from('avatars')
                .upload(path, file, { upsert: true, contentType: file.type });
            if (upErr) throw upErr;

            const { data: { publicUrl } } = db.storage
                .from('avatars')
                .getPublicUrl(path);

            await updateProfile(userId, { avatar_url: publicUrl });
            store.setProfile({ ...store.getProfile(), avatar_url: publicUrl });

            // Update avatar display in profile page
            const display = container.querySelector('#profileAvatarDisplay');
            if (display) {
                display.innerHTML = `<img src="${publicUrl}?t=${Date.now()}" alt="${store.getProfile().prenom}" class="profile-avatar__img">`;
            }

            // Update sidebar avatar
            const sidebarAvatar = document.querySelector('.sidebar-user__avatar');
            if (sidebarAvatar) {
                sidebarAvatar.innerHTML = `<img src="${publicUrl}?t=${Date.now()}" alt="${store.getProfile().prenom}" class="sidebar-user__photo">`;
            }

            showAvatarStatus(avatarStatus, 'Photo mise à jour !');
            setTimeout(() => showAvatarStatus(avatarStatus, ''), 3000);
        } catch (err) {
            handleError(err, 'Upload photo');
            showAvatarStatus(avatarStatus, "Erreur lors de l'envoi. Vérifiez que le bucket « avatars » existe dans Supabase Storage.", true);
        }
    });

    // ── Profile form ──────────────────────────────────────────
    const form     = container.querySelector('#profileForm');
    const statusEl = container.querySelector('#formStatus');

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = container.querySelector('#profileSaveBtn');

        const updates = {
            civilite:    container.querySelector('#civilite')?.value   || null,
            prenom:      container.querySelector('#prenom')?.value?.trim()   || '',
            nom:         container.querySelector('#nom')?.value?.trim()      || '',
            telephone:   container.querySelector('#telephone')?.value?.trim() || null,
            adresse:     container.querySelector('#adresse')?.value?.trim()   || null,
            code_postal: container.querySelector('#code_postal')?.value?.trim() || null,
            ville:       container.querySelector('#ville')?.value?.trim()    || null,
        };

        if (!updates.prenom || !updates.nom) {
            showFormStatus(statusEl, 'Prénom et nom sont requis.', true);
            return;
        }

        if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Enregistrement…'; if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn }); }

        try {
            const updated = await updateProfile(userId, updates);
            store.setProfile({ ...store.getProfile(), ...updated });

            // Update sidebar name
            const sidebarName = document.querySelector('.sidebar-user__name');
            if (sidebarName) sidebarName.textContent = `${updates.prenom} ${updates.nom}`;

            showFormStatus(statusEl, 'Profil mis à jour avec succès.', false);
        } catch (err) {
            handleError(err, 'Mise à jour profil');
            showFormStatus(statusEl, 'Erreur lors de la sauvegarde.', true);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="save" aria-hidden="true"></i> Enregistrer';
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btn });
            }
        }
    });
}

function showAvatarStatus(el, msg, isError = false) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? 'var(--semantic-danger)' : 'var(--text-tertiary)';
}

function showFormStatus(el, msg, isError = false) {
    if (!el) return;
    el.textContent = msg;
    el.className   = isError ? 'form-error-global' : 'form-success-global';
    el.style.display = 'block';
    if (!isError) setTimeout(() => { el.style.display = 'none'; }, 4000);
}
