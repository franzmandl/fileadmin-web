import {constant} from 'common/constants';
import {focusNothing, stopPropagation, useDepsLayoutEffect} from 'common/ReactUtil';
import {useSanitizedValue} from 'common/ReactUtil';
import {formatTimestamp, TimestampPrecision, windowsBasenameRegExp} from 'common/Util';
import {NewInode} from 'model/NewInode';
import React, {useCallback, useState} from 'react';
import {Button} from 'reactstrap';
import {AutoResizeTextarea} from './AutoResizeTextarea';
import {SetKeyboardControl} from './KeyboardControl';

export function AddInodeComponent({
    addInodeAfterIndex,
    basenameCursorPosition,
    setKeyboardControl,
    newInodeTemplate,
    onAdd,
    spellCheck,
}: {
    readonly addInodeAfterIndex: number;
    readonly basenameCursorPosition: number;
    readonly setKeyboardControl: SetKeyboardControl;
    readonly newInodeTemplate: NewInode;
    readonly onAdd: (newInode: NewInode, addInodeAfterIndex: number) => void;
    readonly spellCheck: boolean;
}): JSX.Element {
    const evaluatedBasename = evaluateBasename(newInodeTemplate.basename);
    const [basename, setBasename] = useSanitizedValue(useState<string>(evaluatedBasename), windowsBasenameRegExp);
    const [cursorPosition, setCursorPosition] = useState<number | undefined>(basenameCursorPosition);
    const [isFile, setIsFile] = useState<boolean>(newInodeTemplate.isFile);

    // Requires a layout effect because AutoResizeTextarea's setCursorPosition?.(undefined) would be immediately overridden by setCursorPosition(basenameCursorPosition) rendering it useless.
    useDepsLayoutEffect(() => {
        setBasename(evaluatedBasename);
        setIsFile(newInodeTemplate.isFile);
        setCursorPosition(basenameCursorPosition);
    }, [basenameCursorPosition, newInodeTemplate]);

    const submit = useCallback(() => {
        onAdd({basename, isFile}, addInodeAfterIndex);
        setBasename(evaluatedBasename);
        setIsFile(newInodeTemplate.isFile);
        setCursorPosition(basenameCursorPosition);
    }, [onAdd, basename, isFile, addInodeAfterIndex, setBasename, evaluatedBasename, newInodeTemplate.isFile, basenameCursorPosition]);

    const onSaveKeyDown = useCallback(
        (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
            ev.preventDefault();
            submit();
        },
        [submit]
    );

    return (
        <div style={{display: 'grid', gridTemplateColumns: '1fr auto auto'}} onClick={stopPropagation}>
            <AutoResizeTextarea
                className='font-monospace'
                cursorPosition={cursorPosition}
                setCursorPosition={setCursorPosition}
                setKeyboardControl={setKeyboardControl}
                onCtrlSKeyDown={onSaveKeyDown}
                onEnterKeyDown={onSaveKeyDown}
                spellCheck={spellCheck}
                value={basename}
                setValue={setBasename}
            />
            <Button
                className='m-1'
                onClick={useCallback((ev: React.MouseEvent) => {
                    ev.stopPropagation();
                    focusNothing();
                    setIsFile((prev) => !prev);
                }, [])}
            >
                <span className={`mdi ${isFile ? 'mdi-file' : 'mdi-folder'}`} />
            </Button>
            <Button
                className='m-1'
                color='success'
                onClick={useCallback(
                    (ev: React.MouseEvent) => {
                        ev.stopPropagation();
                        focusNothing();
                        submit();
                    },
                    [submit]
                )}
            >
                <span className='mdi mdi-plus' />
            </Button>
        </div>
    );
}

function evaluateBasename(basename: string): string {
    return basename.replaceAll('<now>', formatTimestamp(constant.currentDate, TimestampPrecision.day));
}
