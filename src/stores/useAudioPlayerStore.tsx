import {AudioPlayerControl, createAudioPlayerControl, SetAudioPlayerControl} from 'components/AudioPlayerControl';
import {Inode} from 'model/Inode';
import {useMemo, useState} from 'react';
import {AppStore} from './useAppStore';

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
                enqueue: (inode) => {
                    setAudioPlayerControl((prev) => {
                        if (prev !== undefined) {
                            appStore.toast(<>Added to queue.</>);
                        }
                        return createAudioPlayerControl(prev, inode);
                    });
                },
                setAudioPlayerControl,
            }),
            [appStore]
        ),
    };
}
