import { getStudentSequences, getCours } from '../models/SequenceModel.js';
import { renderSequenceList }            from '../views/sequenceListView.js';
import { safeCall }                      from '../errorHandler.js';

export async function loadSequences(container, coursId) {
    container.innerHTML = `<div class="loading">
        <i data-lucide="loader-2" class="spin" aria-hidden="true"></i>
        Chargement des séquences…
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const [sequences, cours] = await Promise.all([
        safeCall(() => getStudentSequences(coursId), 'sequences'),
        safeCall(() => getCours(coursId),            'cours')
    ]);

    renderSequenceList(container, {
        cours,
        sequences: sequences || [],
        onSequenceClick: (sequenceId) => {
            window.location.hash = `#/modules/${coursId}/sequences/${sequenceId}`;
        },
        onBack: () => {
            window.location.hash = '#/modules';
        }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
