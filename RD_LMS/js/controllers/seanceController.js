import { getStudentSeances }        from '../models/SeanceModel.js';
import { toggleSeanceCompletion }  from '../models/ProgressModel.js';
import { renderSeanceList }        from '../views/seanceListView.js';
import { getSequence }             from '../models/SequenceModel.js';
import { safeCall }                from '../errorHandler.js';
import { getMyActiveLocks, tryUnlockAccess } from '../models/LockModel.js';

export async function loadSeances(container, coursId, sequenceId) {
    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement des séances…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const [seances, sequence, locks] = await Promise.all([
        safeCall(() => getStudentSeances(sequenceId), 'seances'),
        getSequence(sequenceId).catch(() => null),
        safeCall(getMyActiveLocks, 'locks').catch(() => []),
    ]);

    if (sequence?.titre) {
        window.dispatchEvent(new CustomEvent('lms:pagetitle', { detail: sequence.titre }));
    }

    renderSeanceList(container, seances || [], coursId, sequenceId, sequence, {
        locks: locks || [],
        onToggle: async (seanceId) => {
            return await safeCall(
                () => toggleSeanceCompletion(seanceId),
                'toggle progression'
            );
        },
        onUnlock: async (lockId, code) => {
            return await safeCall(
                () => tryUnlockAccess(lockId, code),
                'unlock access'
            );
        },
        onUnlockSuccess: () => loadSeances(container, coursId, sequenceId),
        onBack: () => {
            window.location.hash = `#/modules/${coursId}`;
        }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
