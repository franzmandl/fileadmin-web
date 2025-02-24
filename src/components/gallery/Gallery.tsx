import {AppLocation, ParamName, hashWordRegex} from 'common/constants';
import {addAroundIndex, getNextIndex, getPrevIndex, HasLength} from 'common/HasLength';
import {arrayRemove, arrayReplace, focusNothing, useDepsEffect, useDepsLayoutEffect, useSanitizedValue} from 'common/ReactUtil';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {nameAllowSlashRegex, mod, paramsToHash, setParam, deleteParam, ifMinusOne} from 'common/Util';
import {Inode, createClipboardId, createClipboardItem, getDownloadPath} from 'dto/Inode';
import React, {Dispatch, useState} from 'react';
import {Button} from 'reactstrap';
import {AppContext} from 'stores/AppContext';
import {AutoResizeTextarea} from 'components/textarea/AutoResizeTextarea';
import './Gallery.scss';
import {GalleryControl} from './GalleryControl';
import {KeyboardControl} from 'components/keyboard-control/KeyboardControl';
import {KeyboardControlComponent} from 'components/keyboard-control/KeyboardControlComponent';
import {MenuDropdown} from 'components/dropdown/MenuDropdown';
import {useMove} from 'components/inode/useMove';
import {useListener} from 'common/useListener';
import {InodeDropdown} from 'components/inode/InodeDropdown';

export function Gallery({
    context,
    galleryControl,
    keyboardControl,
    isLoggedIn,
}: {
    readonly context: AppContext;
    readonly galleryControl: GalleryControl;
    readonly isLoggedIn: boolean;
    readonly keyboardControl: KeyboardControl | undefined;
}): React.JSX.Element {
    const {appStore, authenticationStore, consoleStore, galleryStore, inodeEventBus, inodeStore, suggestionStore} = context;
    const [currentIndex, setCurrentIndex] = useState<number>(galleryControl.index);
    const [inodes, setInodes] = useState<ReadonlyArray<Inode>>(galleryControl.inodes);
    const currentInode: Inode | undefined = inodes[currentIndex];
    const [newName, setNewName] = useState<string>('');
    const oldName = currentInode?.name ?? '';
    useDepsLayoutEffect(() => setNewName(oldName), [oldName]);
    const cannotMoveToNewName = newName === oldName || currentInode === undefined;
    const [rotateDeg, setRotateDeg] = useState<number>(0);
    const [backgroundColorClassNameIndex, setBackgroundColorClassNameIndex] = useState<number>(0);

    const {isLoaded, loadIndex} = useLoadedIndices(currentIndex, setCurrentIndex, inodes);
    const [, setNewSanitizedName] = useSanitizedValue([newName, setNewName], nameAllowSlashRegex);
    const onClose = (): void => galleryStore.setGalleryControl(undefined);

    useDepsEffect(() => {
        if (currentInode === undefined || !appStore.appParameter.values.galleryIsOpen) {
            onClose();
        }
    }, [currentInode, appStore.appParameter.values.galleryIsOpen]);

    const delete_ = useAsyncCallback<boolean, [], void>(
        () =>
            currentInode === undefined
                ? false
                : appStore.confirm(
                      <>
                          Deleting inode: <pre className='overflow-auto'>{currentInode.name}</pre>
                      </>,
                  ),
        (value) => (value ? deleteImmediately() : undefined),
        consoleStore.handleError,
    );
    const deleteImmediately = useAsyncCallback(
        () => appStore.indicateLoading(appStore.preventClose(inodeStore.delete(currentInode))),
        () => {
            setInodes((prev) => arrayRemove(prev, currentIndex));
            setCurrentIndex((prev) => Math.max(0, prev - 1));
            inodeEventBus.fire(currentInode.parentPath, {_type: 'delete', path: currentInode.path});
        },
        consoleStore.handleError,
    );

    const moveImmediately = useMove({
        context,
        newParentPath: currentInode.parentPath,
        oldPath: currentInode.path,
        onMove: (newInode) => {
            setInodes((prev) => arrayReplace(prev, currentIndex, newInode));
            inodeEventBus.fireMove(newInode, currentInode.path, currentInode.parentPath);
        },
    });
    const move = (): void => {
        if (cannotMoveToNewName) {
            return;
        }
        moveImmediately(newName);
    };

    const onSaveKeyDown = (ev: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        ev.preventDefault();
        move();
        focusNothing();
    };

    const prevImage = (): void => loadIndex(getPrevIndex(inodes, currentIndex));
    const nextImage = (): void => loadIndex(getNextIndex(inodes, currentIndex));
    const rotateClockwise = (): void => setRotateDeg((prev) => mod(prev + 90, 360));
    const rotateCounterclockwise = (): void => setRotateDeg((prev) => mod(prev - 90, 360));
    const [cursorPosition, setCursorPosition] = useState<number>();

    useListener(
        (ev: KeyboardEvent): boolean => {
            if (ev.target === document.body) {
                switch (ev.key) {
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
                        rotateCounterclockwise();
                        break;
                    case 'e':
                    case 'F2':
                        ev.preventDefault();
                        setCursorPosition(ifMinusOne(newName.lastIndexOf('.'), newName.length));
                        break;
                    case 'Delete':
                        ev.preventDefault();
                        delete_();
                        break;
                    case 'Escape':
                        ev.preventDefault();
                        onClose();
                        break;
                }
            } else if (ev.key === 'Escape') {
                focusNothing();
            }
            return true;
        },
        (listener): void => appStore.keyDownListeners.add(listener),
        (listener): void => appStore.keyDownListeners.remove(listener),
        [appStore.keyDownListeners],
    );

    const suggestionControl = suggestionStore.createSuggestionControl(currentInode?.path, hashWordRegex);

    const createHref = (path: string): string =>
        paramsToHash(
            deleteParam(setParam(appStore.appParameter.getEncodedLocation(AppLocation.inodes), ParamName.path, path), ParamName.gallery),
        );

    return (
        <div className='gallery page page-auto' hidden={!isLoggedIn}>
            <div className={`page-main ${backgroundColorClassNames[backgroundColorClassNameIndex]}`}>
                <div className='gallery-main'>
                    {inodes.map((inode, index) => {
                        if (!isLoaded(index)) {
                            return;
                        }
                        if (inode.imageUrl !== null) {
                            return (
                                <img key={index} className={`rotate-${rotateDeg}`} hidden={index !== currentIndex} src={inode.imageUrl} />
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
                        onClick={(ev): void => {
                            ev.stopPropagation();
                            onClose();
                        }}
                    />
                </div>
                <div className='gallery-bottom'>
                    <AutoResizeTextarea
                        cursorPosition={cursorPosition}
                        setCursorPosition={setCursorPosition}
                        setKeyboardControl={appStore.setKeyboardControl}
                        onCtrlSKeyDown={onSaveKeyDown}
                        onEnterKeyDown={onSaveKeyDown}
                        value={newName}
                        setValue={setNewSanitizedName}
                        spellCheck={appStore.appParameter.values.spellCheck}
                        suggestionControl={suggestionControl}
                        textareaClassName='font-monospace ps-2'
                    />
                </div>
            </div>
            <div className='page-sidebar'>
                <div>
                    <Button
                        className='page-sidebar-icon mdi mdi-contrast-circle'
                        color='light'
                        onClick={(): void => {
                            focusNothing();
                            setBackgroundColorClassNameIndex((prev) => mod(prev + 1, backgroundColorClassNames.length));
                        }}
                    />
                    <Button
                        className='page-sidebar-icon mdi mdi-rotate-left'
                        color='warning'
                        onClick={(): void => {
                            focusNothing();
                            rotateCounterclockwise();
                        }}
                    />
                    <a
                        className='page-sidebar-icon btn btn-secondary'
                        href={getDownloadPath(currentInode)}
                        role='button'
                        target='_blank'
                        rel='noreferrer'
                        onClick={focusNothing}
                    >
                        <span className='mdi mdi-download' />
                    </a>
                    <Button
                        className='page-sidebar-icon mdi mdi-content-save-outline'
                        color='success'
                        disabled={cannotMoveToNewName}
                        onClick={(): void => {
                            focusNothing();
                            move();
                        }}
                    />
                    <InodeDropdown
                        className='page-sidebar-icon'
                        context={context}
                        container={'body'}
                        createHref={createHref}
                        cut={(): void => context.clipboardStore.cut(createClipboardId(currentInode), createClipboardItem(currentInode))}
                        delete_={delete_}
                        inode={currentInode}
                    />
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

function useLoadedIndices(
    currentIndex: number,
    setCurrentIndex: Dispatch<number>,
    hasLength: HasLength,
): {
    readonly isLoaded: (index: number) => boolean;
    readonly loadIndex: (index: number) => void;
} {
    const [loadedIndices, setLoadedIndices] = useState<ReadonlySet<number>>(new Set<number>());
    useDepsEffect(() => setLoadedIndices(addAroundIndex(new Set<number>(), hasLength, currentIndex)), [hasLength]);
    const loadIndex = (index: number): void => {
        setCurrentIndex(index);
        setLoadedIndices((prev) => addAroundIndex(new Set<number>(prev), hasLength, index));
    };
    const isLoaded = (index: number): boolean => loadedIndices.has(index);
    return {isLoaded, loadIndex};
}
