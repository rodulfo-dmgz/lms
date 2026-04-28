import { getSeancesWithProgress }  from '../models/SeanceModel.js';
import { toggleSeanceCompletion }  from '../models/ProgressModel.js';
import { renderSeanceList }        from '../views/seanceListView.js';
import { getSequence }             from '../models/SequenceModel.js';
import { safeCall }                from '../errorHandler.js';

export async function loadSeances(container, coursId, sequenceId) {
    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement des séances…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const [seances, sequence] = await Promise.all([
        safeCall(() => getSeancesWithProgress(sequenceId), 'seances'),
        getSequence(sequenceId).catch(() => null),
    ]);

    if (sequence?.titre) {
        window.dispatchEvent(new CustomEvent('lms:pagetitle', { detail: sequence.titre }));
    }

    renderSeanceList(container, seances || [], coursId, sequenceId, {
        onToggle: async (seanceId) => {
            return await safeCall(
                () => toggleSeanceCompletion(seanceId),
                'toggle progression'
            );
        },
        onBack: () => {
            window.location.hash = `#/modules/${coursId}`;
        }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
