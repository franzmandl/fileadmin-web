import {getType, humanFileSize, Type} from 'common/Util';
import {Ticket} from './Ticket';

export interface BaseInode {
    readonly basename: string;
    readonly canRead: boolean;
    readonly canWrite: boolean;
    readonly dirname: string;
    readonly error: string | null;
    readonly friendlyName: string | null;
    readonly isDirectory: boolean;
    readonly isFile: boolean;
    readonly isRoot: boolean;
    readonly isVirtual: boolean;
    readonly lastModified: number;
    readonly mimeType: string;
    readonly path: string;
    readonly realDirname: string;
    readonly size: number;
    readonly target: string | null;
    readonly ticket: Ticket | null;
}

export interface Inode extends BaseInode {
    readonly type: ReadonlyArray<Type>;
}

export function createInode(inode: BaseInode): Inode {
    return {
        ...inode,
        type: getType(inode.mimeType),
    };
}

export function formatSize(inode: Inode): string {
    if (inode.isFile) {
        return humanFileSize(inode.size);
    } else if (!inode.canRead) {
        return '?';
    } else {
        return String(inode.size);
    }
}

export function isReadmeFile(inode: Inode): boolean {
    return inode.isFile && /^readme\./i.test(inode.basename);
}

function isIntersectionDirectory(inode: Inode): boolean {
    return inode.isDirectory && inode.basename === '&';
}

export function isSpecial(inode: Inode): boolean {
    return isReadmeFile(inode) || isIntersectionDirectory(inode);
}

export const emptyInode = createInode({
    basename: '',
    canRead: false,
    canWrite: false,
    dirname: '',
    error: null,
    friendlyName: null,
    isDirectory: false,
    isFile: false,
    isRoot: false,
    isVirtual: false,
    lastModified: 0,
    mimeType: '',
    path: '',
    realDirname: '',
    size: 0,
    target: null,
    ticket: null,
});
