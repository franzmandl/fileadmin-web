import {Inode} from 'dto/Inode';
import {Dispatch, SetStateAction} from 'react';

export interface AudioPlayerControl {
    readonly inodes: ReadonlyArray<Inode>;
}

export type SetAudioPlayerControl = Dispatch<SetStateAction<AudioPlayerControl | undefined>>;
