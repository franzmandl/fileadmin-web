import {NewInode} from './NewInode';

export interface Settings {
    readonly basenameCursorPosition: number;
    readonly newInodeTemplate: NewInode;
    readonly isRunLast: boolean;
    readonly isTickets: boolean;
}
