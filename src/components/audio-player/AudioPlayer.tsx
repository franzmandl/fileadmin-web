import {getNextIndex, getPrevIndex} from 'common/HasLength';
import {focusNothing, useDepsEffect} from 'common/ReactUtil';
import {encodePath} from 'common/Util';
import {getDownloadPath, Inode} from 'model/Inode';
import {useCallback, useRef, useState} from 'react';
import {Button, ButtonGroup} from 'reactstrap';
import {AppContext} from 'stores/AppContext';
import './AudioPlayer.scss';
import {AudioPlayerControl} from './AudioPlayerControl';

export function AudioPlayer({
    audioPlayerControl: {inodes},
    context: {appStore, audioPlayerStore},
}: {
    readonly audioPlayerControl: AudioPlayerControl;
    readonly context: AppContext;
}): JSX.Element {
    const ref = useRef<HTMLAudioElement>(null);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const currentInode: Inode | undefined = inodes[currentIndex];
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [isRepeat, setIsRepeat] = useState<boolean>(false);
    useDepsEffect(() => {
        appStore.enterPreventClose();
        return () => appStore.exitPreventClose();
    }, []);
    const play = useCallback(() => {
        ref.current?.play();
        setIsPlaying(true);
    }, []);
    const pause = useCallback(() => {
        ref.current?.pause();
        setIsPlaying(false);
    }, []);
    const stop = useCallback(() => {
        pause();
        if (ref.current !== null) {
            ref.current.currentTime = 0;
        }
    }, [pause]);
    const selectPrevSong = useCallback(() => {
        setCurrentIndex(getPrevIndex(inodes, currentIndex));
    }, [currentIndex, inodes]);
    const selectNextSong = useCallback(() => {
        setCurrentIndex(getNextIndex(inodes, currentIndex));
    }, [currentIndex, inodes]);
    const onSongEnded = useCallback(() => {
        selectNextSong();
        if (isRepeat || currentIndex + 1 < inodes.length) {
            play();
        }
    }, [currentIndex, inodes.length, isRepeat, play, selectNextSong]);
    const shuffle = useCallback(() => {
        alert('Not implemented yet.');
    }, []);
    return (
        <div className='audio-player'>
            <div className='audio-player-left'>
                <Button
                    className={`m-1 mdi ${isPlaying ? 'mdi-pause' : 'mdi-play'}`}
                    size='lg'
                    onClick={useCallback(() => {
                        focusNothing();
                        isPlaying ? pause() : play();
                    }, [isPlaying, pause, play])}
                />
                <ButtonGroup>
                    <Button
                        className='mdi mdi-skip-backward'
                        onClick={useCallback(() => {
                            focusNothing();
                            selectPrevSong();
                            play();
                        }, [play, selectPrevSong])}
                    />
                    <Button
                        className='mdi mdi-stop'
                        onClick={useCallback(() => {
                            focusNothing();
                            stop();
                        }, [stop])}
                    />
                    <Button
                        className='mdi mdi-skip-forward'
                        onClick={useCallback(() => {
                            focusNothing();
                            selectNextSong();
                            play();
                        }, [selectNextSong, play])}
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
                    onPlay={useCallback(() => setIsPlaying(true), [])}
                    onPause={useCallback(() => setIsPlaying(false), [])}
                    src={getDownloadPath(currentInode, encodePath(currentInode.path))}
                />
            </div>
            <div className='audio-player-right'>
                <ButtonGroup>
                    <Button
                        className='mdi mdi-repeat'
                        active={isRepeat}
                        onClick={useCallback(() => {
                            focusNothing();
                            setIsRepeat((prev) => !prev);
                        }, [])}
                    />
                    <Button
                        className='mdi mdi-shuffle'
                        onClick={useCallback(() => {
                            focusNothing();
                            shuffle();
                        }, [shuffle])}
                    />
                </ButtonGroup>
                <Button
                    className='m-1 mdi mdi-close'
                    onClick={useCallback(() => {
                        focusNothing();
                        audioPlayerStore.setAudioPlayerControl(undefined);
                    }, [audioPlayerStore])}
                />
            </div>
        </div>
    );
}
