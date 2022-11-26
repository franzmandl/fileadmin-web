import {focusNothing} from 'common/ReactUtil';
import {useSanitizedValue} from 'common/ReactUtil';
import {basenameAllowSlashRegExp} from 'common/Util';
import {Dispatch, useCallback} from 'react';
import {Button} from 'reactstrap';
import {AutoResizeTextarea} from './AutoResizeTextarea';
import {SetKeyboardControl} from './KeyboardControl';
import './MoveInodeComponent.scss';

export function MoveInodeComponent({
    setKeyboardControl,
    oldBasename,
    moveToNewBasename,
    newBasename,
    setNewBasename,
    newBasenameCursorPosition,
    setNewBasenameCursorPosition,
    spellCheck,
}: {
    readonly setKeyboardControl: SetKeyboardControl;
    readonly oldBasename: string;
    readonly moveToNewBasename: () => void;
    readonly newBasename: string;
    readonly setNewBasename: Dispatch<string>;
    readonly newBasenameCursorPosition: number | undefined;
    readonly setNewBasenameCursorPosition: Dispatch<number | undefined>;
    readonly spellCheck: boolean;
}): JSX.Element {
    const [, setNewSanitizedBasename] = useSanitizedValue([newBasename, setNewBasename], basenameAllowSlashRegExp);

    const onSaveKeyDown = useCallback(
        (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
            ev.preventDefault();
            moveToNewBasename();
        },
        [moveToNewBasename]
    );

    return (
        <div className='move-inode-component'>
            <AutoResizeTextarea
                className='font-monospace ps-2'
                cursorPosition={newBasenameCursorPosition}
                setCursorPosition={setNewBasenameCursorPosition}
                setKeyboardControl={setKeyboardControl}
                onCtrlSKeyDown={onSaveKeyDown}
                onEnterKeyDown={onSaveKeyDown}
                spellCheck={spellCheck}
                value={newBasename}
                setValue={setNewSanitizedBasename}
            />
            <Button
                className='m-1'
                color={newBasename !== oldBasename ? 'success' : 'dark'}
                onClick={useCallback(
                    (ev: React.MouseEvent) => {
                        ev.stopPropagation();
                        focusNothing();
                        moveToNewBasename();
                    },
                    [moveToNewBasename]
                )}
            >
                <span className={`mdi ${newBasename !== oldBasename ? 'mdi-content-save-outline' : 'mdi-close'}`} />
            </Button>
        </div>
    );
}
