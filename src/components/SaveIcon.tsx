import {ReactNode} from 'react';
import {SaveState} from './SaveState';

export function createSaveIcon(saveState: SaveState): ReactNode {
    return <span className={'position-absolute end-0 me-2 mdi mdi-content-save-outline fs-5 ' + saveStateClassName[saveState]} />;
}

const saveStateClassName = Object.freeze({
    [SaveState.failed]: 'text-danger',
    [SaveState.saved]: 'd-none',
    [SaveState.waiting]: 'text-warning',
});
