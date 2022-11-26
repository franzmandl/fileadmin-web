import {Inode} from 'model/Inode';
import {Dispatch} from 'react';

export type GalleryEvent =
    | {readonly discriminator: 'move'; readonly newInode: Inode; readonly oldInode: Inode}
    | {readonly discriminator: 'remove'; readonly oldInode: Inode};

export interface GalleryControl {
    readonly index: number;
    readonly inodes: ReadonlyArray<Inode>;
    readonly onEvent: (ev: GalleryEvent) => void;
}

export type SetGalleryControl = Dispatch<GalleryControl | undefined>;
