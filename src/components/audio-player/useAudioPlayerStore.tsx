import {AudioPlayerControl, SetAudioPlayerControl} from './AudioPlayerControl';
import {Inode} from 'dto/Inode';
import {useMemo, useState} from 'react';
import {AppStore} from 'stores/useAppStore';

export interface AudioPlayerStore {
    readonly enqueue: (inode: Inode) => void;
    readonly setAudioPlayerControl: SetAudioPlayerControl;
}

export function useAudioPlayerStore(appStore: AppStore): {
    readonly audioPlayerControl: AudioPlayerControl | undefined;
    readonly audioPlayerStore: AudioPlayerStore;
} {
    const [audioPlayerControl, setAudioPlayerControl] = useState<AudioPlayerControl>();
    return {
        audioPlayerControl,
        audioPlayerStore: useMemo(
            () => ({
                enqueue: (inode): void => {
                    setAudioPlayerControl((prev) => {
                        if (prev !== undefined) {
                            appStore.toast(<>Added to queue.</>);
                        }
                        return enqueue(prev, inode);
                    });
                },
                setAudioPlayerControl,
            }),
            [appStore],
        ),
    };
}

function enqueue(prev: AudioPlayerControl | undefined, inode: Inode): AudioPlayerControl {
    return {
        inodes: [...(prev?.inodes ?? []), inode],
    };
}
