import {NewInode} from './NewInode';

export type Command =
    | ({readonly _type: 'Add'} & Add)
    | ({readonly _type: 'Delete'} & Delete)
    | ({readonly _type: 'Move'} & Move)
    | ({readonly _type: 'Share'} & Share)
    | ({readonly _type: 'ToDirectory'} & ToDirectory)
    | ({readonly _type: 'ToFile'} & ToFile);

export interface Add {
    readonly path: string;
    readonly newInode: NewInode;
}

export interface Delete {
    readonly path: string;
}

export interface Move {
    readonly path: string;
    readonly newPath: string;
}

export interface Share {
    readonly path: string;
    readonly days: number;
}

export interface ToDirectory {
    readonly path: string;
}

export interface ToFile {
    readonly path: string;
}
