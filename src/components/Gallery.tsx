import {serverPath} from 'common/constants';
import {addAroundIndex, getNextIndex, getPrevIndex, HasLength} from 'common/HasLength';
import {arrayRemove, arrayReplace, focusNothing, stopPropagation, useDepsEffect, useDepsLayoutEffect} from 'common/ReactUtil';
import {useLatest, useSanitizedValue} from 'common/ReactUtil';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {basenameAllowSlashRegExp, encodePath, isAnyType, mod, Type} from 'common/Util';
import {Inode} from 'model/Inode';
import React, {Dispatch, useCallback, useState} from 'react';
import {Button} from 'reactstrap';
import {AppContext} from 'stores/AppContext';
import {ReadonlySet} from 'typescript';
import {AutoResizeTextarea} from './AutoResizeTextarea';
import './Gallery.scss';
import {GalleryControl} from './GalleryControl';
import {KeyboardControl} from './KeyboardControl';
import {KeyboardControlComponent} from './KeyboardControlComponent';
import {MenuDropdown} from './MenuDropdown';

export function Gallery({
    context,
    galleryControl,
    keyboardControl,
    spellCheck,
}: {
    readonly context: AppContext;
    readonly galleryControl: GalleryControl;
    readonly keyboardControl: KeyboardControl | undefined;
    readonly spellCheck: boolean;
}): JSX.Element {
    const {appStore, authenticationStore, consoleStore, galleryStore, inodeStore} = context;
    const [currentIndex, setCurrentIndex] = useState<number>(galleryControl.index);
    const [inodes, setInodes] = useState<ReadonlyArray<Inode>>(galleryControl.inodes);
    const currentInode: Inode | undefined = inodes[currentIndex];
    const currentHref = currentInode !== undefined ? serverPath.authenticatedPath.file(encodePath(currentInode.path)) : undefined;
    const [newBasename, setNewBasename] = useState<string>('');
    const oldBasename = currentInode?.basename ?? '';
    useDepsLayoutEffect(() => setNewBasename(oldBasename), [oldBasename]);
    const cannotMoveToNewBasename = newBasename === oldBasename || currentInode === undefined;
    const [rotateDeg, setRotateDeg] = useState<number>(0);
    const [backgroundColorClassNameIndex, setBackgroundColorClassNameIndex] = useState<number>(0);

    const {isLoaded, loadIndex} = useLoadedIndices(currentIndex, setCurrentIndex, inodes);
    const [, setNewSanitizedBasename] = useSanitizedValue([newBasename, setNewBasename], basenameAllowSlashRegExp);
    const onClose = useCallback(() => galleryStore.setGalleryControl(undefined), [galleryStore]);

    useDepsEffect(() => {
        if (currentInode === undefined) {
            onClose();
        }
    }, [currentInode]);

    const moveImmediately = useAsyncCallback(
        () => appStore.indicateLoading(appStore.preventClose(inodeStore.move(currentInode, newBasename))),
        (newInode) => {
            setInodes((prev) => arrayReplace(prev, currentIndex, newInode));
            galleryControl.onEvent({discriminator: 'move', newInode, oldInode: currentInode});
        },
        consoleStore.handleError
    );
    const move = useCallback(() => {
        if (cannotMoveToNewBasename) {
            return;
        }
        moveImmediately();
    }, [cannotMoveToNewBasename, moveImmediately]);

    const remove = useAsyncCallback<boolean, [], void>(
        () =>
            currentInode === undefined
                ? false
                : appStore.confirm(
                      <>
                          Removing inode: <pre className='overflow-auto'>{currentInode.basename}</pre>
                      </>
                  ),
        (value) => (value ? removeImmediately() : undefined),
        consoleStore.handleError
    );
    const removeImmediately = useAsyncCallback(
        () => appStore.indicateLoading(appStore.preventClose(inodeStore.remove(currentInode))),
        () => {
            setInodes((prev) => arrayRemove(prev, currentIndex));
            setCurrentIndex((prev) => Math.max(0, prev - 1));
            galleryControl.onEvent({discriminator: 'remove', oldInode: currentInode});
        },
        consoleStore.handleError
    );

    const onSaveKeyDown = useCallback(
        (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
            ev.preventDefault();
            move();
        },
        [move]
    );

    const prevImage = useCallback(() => loadIndex(getPrevIndex(inodes, currentIndex)), [currentIndex, inodes, loadIndex]);
    const nextImage = useCallback(() => loadIndex(getNextIndex(inodes, currentIndex)), [currentIndex, inodes, loadIndex]);
    const rotateClockwise = useCallback(() => setRotateDeg((prev) => mod(prev + 90, 360)), []);
    const rotateCounterlockwise = useCallback(() => setRotateDeg((prev) => mod(prev - 90, 360)), []);

    const onKeyDownRef = useLatest((ev: KeyboardEvent) => {
        if (ev.target === document.body) {
            switch (ev.key) {
                case 'Escape':
                    ev.preventDefault();
                    onClose();
                    break;
                case 'ArrowLeft':
                case 'a':
                    ev.preventDefault();
                    prevImage();
                    break;
                case 'ArrowRight':
                case 'd':
                    ev.preventDefault();
                    nextImage();
                    break;
                case 'ArrowUp':
                case 'w':
                    ev.preventDefault();
                    rotateClockwise();
                    break;
                case 'ArrowDown':
                case 's':
                    ev.preventDefault();
                    rotateCounterlockwise();
                    break;
            }
        }
    });

    useDepsEffect(() => {
        const listener = (ev: KeyboardEvent) => onKeyDownRef.current(ev);
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []);

    return (
        <div className='gallery page page-auto'>
            <div className={`page-main ${backgroundColorClassNames[backgroundColorClassNameIndex]}`}>
                <div className='gallery-main'>
                    {inodes.map((inode, index) => {
                        if (!isLoaded(index)) {
                            return;
                        }
                        if (isAnyType(inode.type, Type.image)) {
                            return (
                                <img
                                    key={index}
                                    className={`rotate-${rotateDeg}`}
                                    hidden={index !== currentIndex}
                                    src={serverPath.authenticatedPath.file(encodePath(inode.path))}
                                />
                            );
                        }
                    })}
                </div>
                <div className='gallery-overlay gallery-left' onClick={prevImage}>
                    <span
                        className='mdi mdi-chevron-left fs-3 px-1 position-absolute top-50 start-0 translate-middle-y'
                        hidden={inodes.length === 1}
                    />
                    <span className='px-1 position-absolute top-0 start-0'>
                        {currentIndex + 1} / {inodes.length}
                    </span>
                </div>
                <div className='gallery-overlay gallery-right' onClick={nextImage}>
                    <span
                        className='mdi mdi-chevron-right fs-3 px-1 position-absolute top-50 end-0 translate-middle-y'
                        hidden={inodes.length === 1}
                    />
                    <span
                        className='mdi mdi-close fs-3 px-1 position-absolute top-0 end-0'
                        onClick={useCallback(
                            (ev: React.MouseEvent) => {
                                stopPropagation(ev);
                                onClose();
                            },
                            [onClose]
                        )}
                    />
                </div>
                <div className='gallery-bottom'>
                    <AutoResizeTextarea
                        className='font-monospace ps-2'
                        setKeyboardControl={appStore.setKeyboardControl}
                        onCtrlSKeyDown={onSaveKeyDown}
                        onEnterKeyDown={onSaveKeyDown}
                        value={newBasename}
                        setValue={setNewSanitizedBasename}
                        spellCheck={spellCheck}
                    />
                </div>
            </div>
            <div className='page-sidebar'>
                <div>
                    <Button
                        className='page-sidebar-icon'
                        color='success'
                        disabled={cannotMoveToNewBasename}
                        onClick={useCallback(() => {
                            focusNothing();
                            move();
                        }, [move])}
                    >
                        <span className='mdi mdi-content-save-outline' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        color='warning'
                        onClick={useCallback(() => {
                            focusNothing();
                            rotateCounterlockwise();
                        }, [rotateCounterlockwise])}
                    >
                        <span className='mdi mdi-rotate-left' />
                    </Button>
                    <Button
                        className='page-sidebar-icon'
                        color='light'
                        onClick={useCallback(() => {
                            focusNothing();
                            setBackgroundColorClassNameIndex((prev) => mod(prev + 1, backgroundColorClassNames.length));
                        }, [])}
                    >
                        <span className='mdi mdi-contrast-circle' />
                    </Button>
                    <a
                        className='page-sidebar-icon btn btn-secondary'
                        href={currentHref}
                        role='button'
                        target='_blank'
                        rel='noreferrer'
                        onClick={focusNothing}
                    >
                        <span className='mdi mdi-download' />
                    </a>
                    <Button
                        className='page-sidebar-icon'
                        color='danger'
                        onClick={useCallback(() => {
                            focusNothing();
                            remove();
                        }, [remove])}
                    >
                        <span className='mdi mdi-trash-can' />
                    </Button>
                    <KeyboardControlComponent keyboardControl={keyboardControl} />
                    <MenuDropdown className='page-sidebar-icon'>
                        {appStore.spellCheckDropdownItem}
                        {consoleStore.showConsoleDropdownItem}
                        {authenticationStore.logoutDropdownItem}
                    </MenuDropdown>
                </div>
            </div>
        </div>
    );
}

const backgroundColorClassNames = ['', 'bg-black', 'bg-white'];

function useLoadedIndices(currentIndex: number, setCurrentIndex: Dispatch<number>, hasLength: HasLength) {
    const [loadedIndices, setLoadedIndices] = useState<ReadonlySet<number>>(new Set<number>());
    useDepsEffect(() => setLoadedIndices(addAroundIndex(new Set<number>(), hasLength, currentIndex)), [hasLength]);
    const loadIndex = useCallback(
        (index: number) => {
            setCurrentIndex(index);
            setLoadedIndices((prev) =>
                addAroundIndex(
                    new Set<number>(prev as Set<number> /* ReadonlySet is not iterable for some reason, but Set is. */),
                    hasLength,
                    index
                )
            );
        },
        [hasLength, setCurrentIndex]
    );
    const isLoaded = useCallback((index: number) => loadedIndices.has(index), [loadedIndices]);
    return {isLoaded, loadIndex};
}
