import {focusNothing, stopPropagation, useDepsLayoutEffect, useSanitizedValue} from 'common/ReactUtil';
import {expressionToTimestampPrecision, formatTimestamp, getFileEnding, removeFileEnding, windowsNameRegex} from 'common/Util';
import {NewInode} from 'dto/NewInode';
import React, {useState} from 'react';
import {Button} from 'reactstrap';
import {AutoResizeTextarea} from 'components/textarea/AutoResizeTextarea';
import {SetKeyboardControl} from 'components/keyboard-control/KeyboardControl';
import {SuggestionControl} from 'components/textarea/RichTextarea';
import './AddInodeComponent.scss';

export function AddInodeComponent({
    addInodeAfterIndex,
    nameCursorPosition,
    setKeyboardControl,
    newInodeTemplate,
    onAdd,
    spellCheck,
    suggestionControl,
}: {
    readonly addInodeAfterIndex: number;
    readonly nameCursorPosition?: number;
    readonly setKeyboardControl: SetKeyboardControl;
    readonly newInodeTemplate: NewInode;
    readonly onAdd: (newInode: NewInode, addInodeAfterIndex: number) => void;
    readonly spellCheck: boolean;
    readonly suggestionControl: SuggestionControl;
}): React.JSX.Element {
    const [evaluatedName, evaluatedCursorPosition] = evaluateName(newInodeTemplate.name, nameCursorPosition);
    const evaluatedEnding = getFileEnding(evaluatedName);
    const [cursorPosition, setCursorPosition] = useState<number | undefined>(evaluatedCursorPosition);
    const [isFile, setIsFile] = useState<boolean>(newInodeTemplate.isFile);
    const [name, setName] = useSanitizedValue(useState<string>(evaluatedName), windowsNameRegex);

    // Requires a layout effect because AutoResizeTextarea's setCursorPosition?.(undefined) would be immediately overridden by setCursorPosition(evaluatedCursorPosition) rendering it useless.
    useDepsLayoutEffect(() => {
        setName(evaluatedName);
        setIsFile(newInodeTemplate.isFile);
        setCursorPosition(evaluatedCursorPosition);
    }, [evaluatedCursorPosition, newInodeTemplate]);

    const submit = (): void => {
        onAdd({name, isFile}, addInodeAfterIndex);
        setName(evaluatedName);
        setIsFile(newInodeTemplate.isFile);
        setCursorPosition(evaluatedCursorPosition);
    };

    const onSaveKeyDown = (ev: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        ev.preventDefault();
        submit();
    };

    return (
        <div className='add-inode-component' onClick={stopPropagation}>
            <AutoResizeTextarea
                cursorPosition={cursorPosition}
                setCursorPosition={setCursorPosition}
                setKeyboardControl={setKeyboardControl}
                onCtrlSKeyDown={onSaveKeyDown}
                onEnterKeyDown={onSaveKeyDown}
                spellCheck={spellCheck}
                suggestionControl={suggestionControl}
                textareaClassName='bg-transparent font-monospace ps-2'
                value={name}
                setValue={setName}
            />
            <Button
                className='m-1'
                onClick={(ev): void => {
                    ev.stopPropagation();
                    focusNothing();
                    const nextIsFile = !isFile;
                    setIsFile(nextIsFile);
                    if (nextIsFile) {
                        if (!name.endsWith(evaluatedEnding)) {
                            setName(name + evaluatedEnding);
                        }
                    } else {
                        setName(removeFileEnding(name));
                    }
                }}
            >
                <span className={`mdi ${isFile ? 'mdi-file' : 'mdi-folder'}`} />
            </Button>
            <Button
                className='m-1'
                color='success'
                onClick={(ev): void => {
                    ev.stopPropagation();
                    focusNothing();
                    submit();
                }}
            >
                <span className='mdi mdi-plus' />
            </Button>
        </div>
    );
}

function evaluateName(name: string, nameCursorPosition: number | undefined): [string, number | undefined] {
    const currentDate = new Date();
    let currentPosition = 0;
    let cursorPosition: number | undefined;
    const evaluatedName = name
        .split(/<(.*?)>/)
        .map((part, index) => {
            if (index % 2 === 0) {
                return incrementCursorPosition(part);
            } else {
                if (part === 'cursor' && cursorPosition === undefined) {
                    cursorPosition = currentPosition;
                    return '';
                }
                const timestampPrecision = expressionToTimestampPrecision[part];
                if (timestampPrecision !== undefined) {
                    return incrementCursorPosition(formatTimestamp(currentDate, timestampPrecision, '.'));
                }
                return incrementCursorPosition(`<${part}>`);
            }
        })
        .join('');
    return [evaluatedName, cursorPosition ?? getAlternativeCursorPosition(nameCursorPosition, evaluatedName.length)];

    function incrementCursorPosition(part: string): string {
        currentPosition += part.length;
        return part;
    }
}

function getAlternativeCursorPosition(nameCursorPosition: number | undefined, length: number): number {
    if (nameCursorPosition === undefined) {
        return length;
    } else if (nameCursorPosition < 0) {
        return length - nameCursorPosition;
    } else {
        return nameCursorPosition;
    }
}
