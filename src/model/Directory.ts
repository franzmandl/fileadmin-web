import {BaseInode, createInode, Inode} from './Inode';
import {NewInode} from './NewInode';

export interface BaseDirectory {
    readonly canSearch: boolean;
    readonly nameCursorPosition: number | null;
    readonly errors: ReadonlyArray<string>;
    readonly inode: BaseInode;
    readonly inodes: ReadonlyArray<BaseInode>;
    readonly newInodeTemplate: NewInode;
}

export interface Directory extends BaseDirectory {
    readonly inode: Inode;
    readonly inodes: ReadonlyArray<Inode>;
}

export function createDirectory({inode, inodes, ...directory}: BaseDirectory): Directory {
    return {
        inode: createInode(inode),
        inodes: inodes.map(createInode),
        ...directory,
    };
}
