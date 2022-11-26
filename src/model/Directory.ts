import {BaseInode, createInode, Inode} from './Inode';
import {Settings} from './Settings';

export interface BaseDirectory {
    readonly inode: BaseInode;
    readonly inodes: ReadonlyArray<BaseInode>;
    readonly settings: Settings;
}

export interface Directory {
    readonly inode: Inode;
    readonly inodes: ReadonlyArray<Inode>;
    readonly settings: Settings;
}

export function createDirectory({inode, inodes, settings}: BaseDirectory): Directory {
    return {
        inode: createInode(inode),
        inodes: inodes.map(createInode),
        settings,
    };
}
