import {Inode} from 'dto/Inode';
import {Dispatch} from 'react';

export interface GalleryControl {
    readonly index: number;
    readonly inodes: ReadonlyArray<Inode>;
}

export type SetGalleryControl = Dispatch<GalleryControl | undefined>;
