import useResizeObserver from '@react-hook/resize-observer';
import {stopPropagation, useDepsEffect} from 'common/ReactUtil';
import {Dispatch, KeyboardEventHandler, useCallback, useRef} from 'react';
import {RichTextarea, SuggestionControl} from './RichTextarea';
import {SetKeyboardControl} from 'components/keyboard-control/KeyboardControl';

/**
 * Inspired by https://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize
 */
export function AutoResizeTextarea({
    className,
    cursorPosition,
    setCursorPosition,
    onCtrlSKeyDown,
    onEnterKeyDown,
    onKeyDown,
    setKeyboardControl,
    spellCheck,
    suggestionControl,
    textareaClassName,
    value,
    setValue,
}: {
    readonly className?: string;
    readonly cursorPosition?: number;
    readonly setCursorPosition?: Dispatch<number | undefined>;
    readonly onCtrlSKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
    readonly onEnterKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
    readonly onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
    readonly setKeyboardControl?: SetKeyboardControl;
    readonly spellCheck?: boolean;
    readonly suggestionControl?: SuggestionControl;
    readonly textareaClassName?: string;
    readonly value: string;
    readonly setValue: Dispatch<string>;
}): JSX.Element {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const resizeTextarea = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea !== null) {
            textarea.style.height = 'auto'; // Necessary!
            textarea.style.height = `${Math.min(window.innerHeight, textarea.scrollHeight)}px`;
        }
    }, []);
    useDepsEffect(resizeTextarea, [value]);
    useResizeObserver(document.body, resizeTextarea);
    useDepsEffect(() => {
        const textarea = textareaRef.current;
        if (textarea !== null && cursorPosition !== undefined) {
            textarea.focus();
            textarea.setSelectionRange(cursorPosition, cursorPosition);
        }
        setCursorPosition?.(undefined);
    }, [cursorPosition]);
    return (
        <RichTextarea
            ref={textareaRef}
            className={className}
            onClick={stopPropagation}
            onCtrlSKeyDown={onCtrlSKeyDown}
            onEnterKeyDown={onEnterKeyDown}
            onKeyDown={onKeyDown}
            rows={1}
            setKeyboardControl={setKeyboardControl}
            spellCheck={spellCheck}
            suggestionControl={suggestionControl}
            textareaClassName={textareaClassName}
            value={value}
            setValue={setValue}
        />
    );
}
