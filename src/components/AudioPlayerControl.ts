import {Inode} from 'model/Inode';
import {Dispatch, SetStateAction} from 'react';

export interface AudioPlayerControl {
    readonly inodes: ReadonlyArray<Inode>;
}

export type SetAudioPlayerControl = Dispatch<SetStateAction<AudioPlayerControl | undefined>>;

export function createAudioPlayerControl(prev: AudioPlayerControl | undefined, inode: Inode): AudioPlayerControl {
    const inodes = prev !== undefined ? [...prev.inodes] : [];
    inodes.push(inode);
    return {
        inodes,
    };
}
