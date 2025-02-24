import {getNextIndex, getPrevIndex} from 'common/HasLength';
import {focusNothing, useDepsEffect} from 'common/ReactUtil';
import {getDownloadPath, Inode} from 'dto/Inode';
import React, {useRef, useState} from 'react';
import {Button, ButtonGroup} from 'reactstrap';
import {AppContext} from 'stores/AppContext';
import './AudioPlayer.scss';
import {AudioPlayerControl} from './AudioPlayerControl';

export function AudioPlayer({
    audioPlayerControl: {inodes},
    context: {appStore, audioPlayerStore},
    isLoggedIn,
}: {
    readonly audioPlayerControl: AudioPlayerControl;
    readonly context: AppContext;
    readonly isLoggedIn: boolean;
}): React.JSX.Element {
    const ref = useRef<HTMLAudioElement>(null);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const currentInode: Inode | undefined = inodes[currentIndex];
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [isRepeat, setIsRepeat] = useState<boolean>(false);
    useDepsEffect(() => {
        appStore.enterPreventClose();
        return () => appStore.exitPreventClose();
    }, []);
    const play = (): void => {
        ref.current?.play();
        setIsPlaying(true);
    };
    const pause = (): void => {
        ref.current?.pause();
        setIsPlaying(false);
    };
    const stop = (): void => {
        pause();
        if (ref.current !== null) {
            ref.current.currentTime = 0;
        }
    };
    const selectPrevSong = (): void => {
        setCurrentIndex(getPrevIndex(inodes, currentIndex));
    };
    const selectNextSong = (): void => {
        setCurrentIndex(getNextIndex(inodes, currentIndex));
    };
    const onSongEnded = (): void => {
        selectNextSong();
        if (isRepeat || currentIndex + 1 < inodes.length) {
            play();
        }
    };
    useDepsEffect(() => {
        if (!isLoggedIn) {
            pause();
        }
    }, [isLoggedIn]);
    const shuffle = (): void => {
        alert('Not implemented yet.');
    };
    return (
        <div className='audio-player' hidden={!isLoggedIn}>
            <div className='audio-player-left'>
                <Button
                    className={`m-1 mdi ${isPlaying ? 'mdi-pause' : 'mdi-play'}`}
                    size='lg'
                    onClick={(): void => {
                        focusNothing();
                        isPlaying ? pause() : play();
                    }}
                />
                <ButtonGroup>
                    <Button
                        className='mdi mdi-skip-backward'
                        onClick={(): void => {
                            focusNothing();
                            selectPrevSong();
                            play();
                        }}
                    />
                    <Button
                        className='mdi mdi-stop'
                        onClick={(): void => {
                            focusNothing();
                            stop();
                        }}
                    />
                    <Button
                        className='mdi mdi-skip-forward'
                        onClick={(): void => {
                            focusNothing();
                            selectNextSong();
                            play();
                        }}
                    />
                </ButtonGroup>
            </div>
            <div className='audio-player-empty' />
            <div className='audio-player-progress'>
                <audio
                    ref={ref}
                    autoPlay={isPlaying}
                    className='m-1'
                    controls
                    onEnded={onSongEnded}
                    onPlay={(): void => setIsPlaying(true)}
                    onPause={(): void => setIsPlaying(false)}
                    src={getDownloadPath(currentInode)}
                />
            </div>
            <div className='audio-player-right'>
                <ButtonGroup>
                    <Button
                        className='mdi mdi-repeat'
                        active={isRepeat}
                        onClick={(): void => {
                            focusNothing();
                            setIsRepeat((prev) => !prev);
                        }}
                    />
                    <Button
                        className='mdi mdi-shuffle'
                        onClick={(): void => {
                            focusNothing();
                            shuffle();
                        }}
                    />
                </ButtonGroup>
                <Button
                    className='m-1 mdi mdi-close'
                    onClick={(): void => {
                        focusNothing();
                        audioPlayerStore.setAudioPlayerControl(undefined);
                    }}
                />
            </div>
        </div>
    );
}
