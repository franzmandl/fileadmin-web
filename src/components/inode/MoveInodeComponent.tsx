import {focusNothing} from 'common/ReactUtil';
import {useSanitizedValue} from 'common/ReactUtil';
import {nameAllowSlashRegex} from 'common/Util';
import {Dispatch, useCallback} from 'react';
import {Button} from 'reactstrap';
import {AutoResizeTextarea} from 'components/textarea/AutoResizeTextarea';
import {SetKeyboardControl} from 'components/keyboard-control/KeyboardControl';
import './MoveInodeComponent.scss';
import {SuggestionControl} from 'components/textarea/RichTextarea';

export function MoveInodeComponent({
    setKeyboardControl,
    oldName,
    moveToNewName,
    newName,
    setNewName,
    newNameCursorPosition,
    setNewNameCursorPosition,
    spellCheck,
    suggestionControl,
}: {
    readonly setKeyboardControl: SetKeyboardControl;
    readonly oldName: string;
    readonly moveToNewName: () => void;
    readonly newName: string;
    readonly setNewName: Dispatch<string>;
    readonly newNameCursorPosition: number | undefined;
    readonly setNewNameCursorPosition: Dispatch<number | undefined>;
    readonly spellCheck: boolean;
    readonly suggestionControl: SuggestionControl;
}): JSX.Element {
    const [, setNewSanitizedName] = useSanitizedValue([newName, setNewName], nameAllowSlashRegex);

    const onSaveKeyDown = useCallback(
        (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
            ev.preventDefault();
            moveToNewName();
        },
        [moveToNewName]
    );

    return (
        <div className='move-inode-component'>
            <AutoResizeTextarea
                cursorPosition={newNameCursorPosition}
                setCursorPosition={setNewNameCursorPosition}
                setKeyboardControl={setKeyboardControl}
                onCtrlSKeyDown={onSaveKeyDown}
                onEnterKeyDown={onSaveKeyDown}
                spellCheck={spellCheck}
                suggestionControl={suggestionControl}
                textareaClassName='font-monospace ps-2'
                value={newName}
                setValue={setNewSanitizedName}
            />
            <Button
                className='m-1'
                color={newName !== oldName ? 'success' : 'dark'}
                onClick={useCallback(
                    (ev: React.MouseEvent) => {
                        ev.stopPropagation();
                        focusNothing();
                        moveToNewName();
                    },
                    [moveToNewName]
                )}
            >
                <span className={`mdi ${newName !== oldName ? 'mdi-content-save-outline' : 'mdi-close'}`} />
            </Button>
        </div>
    );
}
