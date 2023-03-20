import {serverPath} from 'common/constants';
import {getName, getParentPath, getType, humanFileSize, Type} from 'common/Util';
import {Link} from './Link';
import {Operation} from './Operation';
import {Task} from './Task';

export interface BaseInode {
    readonly error: string | null;
    readonly filterHighlightTags: ReadonlyArray<string> | null;
    readonly filterOutputPath: string | null;
    readonly friendlyName: string | null;
    readonly isDirectory: boolean;
    readonly isFile: boolean;
    readonly isRoot: boolean;
    readonly isRunLast: boolean;
    readonly isVirtual: boolean;
    readonly lastModified: number | null;
    readonly link: Link | null;
    readonly localPath: string | null;
    readonly mimeType: string | null;
    readonly operation: Operation;
    readonly parentOperation: Operation | null;
    readonly path: string;
    readonly realPath: string;
    readonly size: number | null;
    readonly task: Task | null;
}

export interface Inode extends BaseInode {
    readonly canAnyAdd: boolean;
    readonly canAnyGet: boolean;
    readonly filterHighlightTagSet: ReadonlySet<string> | null;
    readonly name: string;
    readonly orderName: string;
    readonly parentLocalPath: string | null;
    readonly parentPath: string;
    readonly realParentPath: string;
    readonly type: ReadonlyArray<Type>;
}

export function createInode(inode: BaseInode): Inode {
    const name = getName(inode.path);
    return {
        ...inode,
        canAnyAdd: inode.operation.canDirectoryAdd || inode.operation.canFileSet,
        canAnyGet: inode.operation.canDirectoryGet || inode.operation.canFileGet,
        filterHighlightTagSet: inode.filterHighlightTags !== null ? new Set(inode.filterHighlightTags) : null,
        name,
        orderName: inode.friendlyName ?? name,
        parentLocalPath: inode.localPath !== null ? getParentPath(inode.localPath) : null,
        parentPath: getParentPath(inode.path),
        realParentPath: getParentPath(inode.realPath),
        type: getType(inode.mimeType),
    };
}

export function formatSize(inode: Inode): string {
    if (inode.size !== null) {
        return inode.isFile ? humanFileSize(inode.size) : String(inode.size);
    } else {
        return '?';
    }
}

export function isReadmeFile(inode: Inode): boolean {
    return inode.isFile && /^readme\./i.test(inode.name);
}

export function isSpecial(inode: Inode): boolean {
    return isReadmeFile(inode);
}

export function getDownloadPath({operation}: Pick<Inode, 'operation'>, encodedPath: string): string {
    return operation.canFileStream ? serverPath.authenticatedPath.fileStream(encodedPath) : serverPath.authenticatedPath.file(encodedPath);
}

export const emptyInode = createInode({
    error: null,
    filterHighlightTags: [],
    filterOutputPath: null,
    friendlyName: null,
    isDirectory: false,
    isFile: false,
    isRoot: false,
    isRunLast: false,
    isVirtual: false,
    lastModified: null,
    link: null,
    localPath: null,
    mimeType: null,
    operation: {
        canDirectoryAdd: false,
        canDirectoryGet: false,
        canFileGet: false,
        canFileSet: false,
        canFileStream: false,
        canInodeCopy: false,
        canInodeDelete: false,
        canInodeMove: false,
        canInodeRename: false,
        canInodeShare: false,
        canInodeToDirectory: false,
        canInodeToFile: false,
    },
    parentOperation: null,
    path: '',
    realPath: '',
    size: null,
    task: null,
});
