import {constant, serverPath} from 'common/constants';
import {encodePath, getName, getParentPath, getType, humanFileSize, isAnyType, Type} from 'common/Util';
import {Link} from './Link';
import {Operation} from './Operation';
import {Task, TaskDto, createTask} from './Task';
import {Overwrite} from 'common/TsUtil';
import {Item, ItemDto, createItem} from './Item';
import {ClipboardItem} from 'components/clipboard/ClipboardControl';

export interface InodeDto {
    readonly errors: ReadonlyArray<string>;
    readonly friendlyName?: string;
    readonly isDirectory: boolean;
    readonly isFile: boolean;
    readonly isRoot: boolean;
    readonly isRunLast: boolean;
    readonly isTimeDirectory: boolean;
    readonly isVirtual: boolean;
    readonly item?: ItemDto;
    readonly lastModifiedMilliseconds?: number;
    readonly link?: Link;
    readonly localPath?: string;
    readonly mimeType: string;
    readonly operation: Operation;
    readonly parentOperation?: Operation;
    readonly path: string;
    readonly realPath: string;
    readonly size?: number;
    readonly task?: TaskDto;
}

export type Inode = Overwrite<
    InodeDto,
    {
        readonly canAnyAdd: boolean;
        readonly canAnyGet: boolean;
        readonly encodedPath: string;
        readonly imageUrl?: string;
        readonly item?: Item;
        readonly lastModifiedDate?: Date;
        readonly name: string;
        readonly orderName: string;
        readonly parentLocalPath?: string;
        readonly parentPath: string;
        readonly priorityOfItem: number;
        readonly priorityOfTask: number;
        readonly realParentPath: string;
        readonly task?: Task;
        readonly thumbnailUrl?: string;
        readonly type: ReadonlySet<Type>;
    }
>;

export function createInode(inode: InodeDto, prev: Inode | undefined): Inode {
    const encodedPath = encodePath(inode.path);
    const name = getName(inode.path);
    const type = getType(inode.mimeType);
    let imageUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    if (isAnyType(type, Type.image)) {
        imageUrl = serverPath.authenticatedPath.file(encodedPath);
        thumbnailUrl = serverPath.authenticatedPath.fileConvertImageToImage(encodedPath, constant.thumbnailDimension);
    } else if (isAnyType(type, Type.pdf)) {
        imageUrl = serverPath.authenticatedPath.fileConvertPdfToImage(encodedPath, constant.imageOfPdfDimension);
        thumbnailUrl = serverPath.authenticatedPath.fileConvertPdfToImage(encodedPath, constant.thumbnailDimension);
    }
    return {
        ...inode,
        canAnyAdd: inode.operation.canDirectoryAdd || inode.operation.canFileSet,
        canAnyGet: inode.operation.canDirectoryGet || inode.operation.canFileGet,
        encodedPath,
        imageUrl,
        item: inode.item !== undefined ? createItem(inode.item) : undefined,
        lastModifiedDate: inode.lastModifiedMilliseconds !== undefined ? new Date(inode.lastModifiedMilliseconds) : undefined,
        name,
        orderName: inode.friendlyName ?? name,
        parentLocalPath: inode.localPath !== undefined ? getParentPath(inode.localPath) : undefined,
        parentPath: getParentPath(inode.path),
        priorityOfItem: inode.item?.result?.priority ?? prev?.priorityOfItem ?? constant.priorityOfItem.default,
        priorityOfTask: inode.task?.priority ?? constant.priorityOfTask.default,
        realParentPath: getParentPath(inode.realPath),
        task: inode.task !== undefined ? createTask(inode.task) : undefined,
        thumbnailUrl,
        type,
    };
}

export function createClipboardId({path}: Inode): string {
    return path;
}

export function createClipboardItem({name, parentPath, thumbnailUrl}: Inode): ClipboardItem {
    return {name, parentPath, thumbnailUrl};
}

export function formatSize(inode: Inode): string {
    if (inode.size !== undefined) {
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

export function getDownloadPath({encodedPath, operation}: Pick<Inode, 'encodedPath' | 'operation'>): string {
    return operation.canFileStream ? serverPath.authenticatedPath.fileStream(encodedPath) : serverPath.authenticatedPath.file(encodedPath);
}

export const emptyInode = createInode(
    {
        errors: [],
        isDirectory: false,
        isFile: false,
        isRoot: false,
        isRunLast: false,
        isTimeDirectory: false,
        isVirtual: false,
        mimeType: '',
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
        path: '',
        realPath: '',
    },
    undefined,
);
