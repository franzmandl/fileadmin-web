import {Overwrite} from 'common/TsUtil';
import {InodeDto, createInode, Inode} from './Inode';
import {NewInode} from './NewInode';

export interface DirectoryDto {
    readonly canSearch: boolean;
    readonly children: ReadonlyArray<InodeDto>;
    readonly errors: ReadonlyArray<string>;
    readonly inode: InodeDto;
    readonly nameCursorPosition?: number;
    readonly newInodeTemplate: NewInode;
}

export type Directory = Overwrite<
    DirectoryDto,
    {
        readonly children: ReadonlyArray<Inode>;
        readonly inode: Inode;
    }
>;

export function createDirectory({inode, children, ...directory}: DirectoryDto, prev: Inode | undefined): Directory {
    return {
        inode: createInode(inode, prev),
        children: children.map((child) => createInode(child, undefined)),
        ...directory,
    };
}
