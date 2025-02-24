import classNames from 'classnames';
import {WordRegex, constant} from 'common/constants';
import {useDepsEffect, useDepsLayoutEffect} from 'common/ReactUtil';
import {alwaysThrow, getIndent, ifMinusOne, newLine} from 'common/Util';
import React, {
    Dispatch,
    ForwardedRef,
    forwardRef,
    KeyboardEventHandler,
    MouseEventHandler,
    MutableRefObject,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import {KeyboardControl, SetKeyboardControl} from 'components/keyboard-control/KeyboardControl';
import './RichTextarea.scss';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {getWord} from 'stores/useSuggestionStore';

export interface OnSuggestionReturnType {
    readonly nextSelectionStartAndEnd: number;
    readonly nextValue: string;
}

export interface SuggestionControl {
    readonly getSuggestions: (word: string | undefined) => Promise<ReadonlyArray<string>>;
    readonly onError: (error: unknown) => void;
    readonly onSuggestion: (textarea: HTMLTextAreaElement, suggestion: string) => OnSuggestionReturnType;
    readonly wordRegex: WordRegex;
}

export const RichTextarea = forwardRef(function RichTextarea(
    {
        autoFocus,
        className,
        onClick,
        onCtrlSKeyDown,
        onEnterKeyDown,
        onKeyDown,
        setKeyboardControl,
        rows,
        spellCheck,
        suggestionControl,
        textareaClassName,
        value,
        setValue,
    }: {
        readonly autoFocus?: boolean;
        readonly className?: string;
        readonly onClick?: MouseEventHandler<HTMLTextAreaElement>;
        readonly onCtrlSKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
        readonly onEnterKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
        readonly onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
        readonly rows?: number;
        readonly setKeyboardControl?: SetKeyboardControl;
        readonly spellCheck?: boolean;
        readonly suggestionControl?: SuggestionControl;
        readonly textareaClassName?: string;
        readonly value: string;
        readonly setValue: Dispatch<string>;
    },
    forwardedRef: ForwardedRef<HTMLTextAreaElement>,
): React.JSX.Element {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(forwardedRef, () => textareaRef.current as HTMLTextAreaElement, []);
    const [suggestions, setSuggestions] = useState<ReadonlyArray<string>>([]);
    /**
     * Originally this function used react-dom's flushSync.
     */
    const flushValue = (textarea: HTMLTextAreaElement, nextValue: string, selectionStart: number, selectionEnd: number): void => {
        setValue(nextValue);
        textarea.value = nextValue;
        textarea.setSelectionRange(selectionStart, selectionEnd);
    };
    const enterKeyDown = (ev: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        const textarea = ev.currentTarget;
        const {selectionStart, selectionEnd} = textarea;
        if (selectionStart === selectionEnd) {
            ev.preventDefault();
            const lineStart = value.lastIndexOf(newLine, selectionStart - 1) + 1;
            const line = value.substring(lineStart, selectionStart);
            const indent = getIndent(line);
            const nextSelectionStartAndEnd = selectionStart + 1 + indent.length;
            flushValue(
                textarea,
                value.substring(0, selectionStart) + newLine + indent + value.substring(selectionEnd),
                nextSelectionStartAndEnd,
                nextSelectionStartAndEnd,
            );
        }
    };
    const onSuggestion = (suggestion: string): void => {
        const textarea = getTextarea(textareaRef);
        if (textarea === null || suggestionControl === undefined) {
            return;
        }
        const {nextSelectionStartAndEnd, nextValue} = suggestionControl.onSuggestion(textarea, suggestion);
        flushValue(textarea, nextValue, nextSelectionStartAndEnd, nextSelectionStartAndEnd);
        setSuggestions([]);
    };
    const tabKeyDown = (ev: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        ev.preventDefault();
        const textarea = ev.currentTarget;
        const {selectionStart, selectionEnd} = textarea;
        const selectedValue = value.substring(selectionStart, selectionEnd);
        if (selectedValue.indexOf(newLine) === -1 && !ev.shiftKey) {
            const nextSelectionStartAndEnd = selectionStart + constant.indent.length;
            flushValue(
                textarea,
                value.substring(0, selectionStart) + constant.indent + value.substring(selectionEnd),
                nextSelectionStartAndEnd,
                nextSelectionStartAndEnd,
            );
        } else {
            const linesStart = value.lastIndexOf(newLine, selectionStart - 1) + 1;
            const linesEnd = ifMinusOne(value.indexOf(newLine, selectionEnd - 1), value.length);
            const lines = value.substring(linesStart, linesEnd).split(newLine);
            if (ev.shiftKey) {
                let replacedCharacterInFirstLineCount = 0;
                let replacedCharacterCount = 0;
                const replaceLine = (line: string, index: number): string =>
                    line.replace(constant.indentRegex, ({length}) => {
                        replacedCharacterInFirstLineCount += index === 0 ? length : 0;
                        replacedCharacterCount += length;
                        return '';
                    });
                flushValue(
                    textarea,
                    value.substring(0, linesStart) + lines.map(replaceLine).join(newLine) + value.substring(linesEnd),
                    Math.max(linesStart, selectionStart - replacedCharacterInFirstLineCount),
                    selectionEnd - replacedCharacterCount,
                );
            } else {
                flushValue(
                    textarea,
                    value.substring(0, linesStart) + constant.indent + lines.join(newLine + constant.indent) + value.substring(linesEnd),
                    selectionStart + constant.indent.length,
                    selectionEnd + constant.indent.length * lines.length,
                );
            }
        }
    };
    useDepsEffect(() => {
        const textarea = getTextarea(textareaRef);
        if (textarea !== null && textarea === document.activeElement) {
            setKeyboardControl?.(createKeyboardControl(textarea));
        }
    }, []);
    useDepsLayoutEffect(
        () => () => {
            const textarea = getTextarea(textareaRef);
            // Fix for mobile devices, where blur event is not triggered after textarea was unmounted while it was focused.
            // Use layout effect because it is the last time textarea !== null before unmounting.
            if (textarea !== null && textarea === document.activeElement) {
                setSuggestions([]);
                setKeyboardControl?.(undefined);
            }
        },
        [],
    );
    const [word, setWord] = useState<string>();
    const onChange = useAsyncCallback<ReadonlyArray<string>, [React.ChangeEvent<HTMLTextAreaElement>], void>(
        (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
            setValue(ev.target.value);
            if (suggestionControl !== undefined) {
                const nextWord = getWord(ev.currentTarget, suggestionControl.wordRegex);
                setWord(nextWord);
                return suggestionControl.getSuggestions(nextWord) ?? [];
            }
            return [];
        },
        setSuggestions,
        suggestionControl?.onError ?? alwaysThrow,
    );
    return (
        <div className={classNames('rich-textarea', className)}>
            <textarea
                autoFocus={autoFocus}
                className={classNames('reboot', textareaClassName)}
                data-scrollable='focus'
                ref={textareaRef}
                rows={rows}
                spellCheck={spellCheck}
                value={value}
                onBlur={(): void => {
                    setSuggestions([]);
                    setKeyboardControl?.(undefined);
                }}
                onChange={onChange}
                onClick={(ev): void => {
                    setSuggestions([]);
                    onClick?.(ev);
                }}
                onFocus={(ev): void => setKeyboardControl?.(createKeyboardControl(ev.currentTarget))}
                onKeyDown={(ev): void => {
                    onKeyDown?.(ev);
                    setSuggestions([]);
                    if (!ev.isDefaultPrevented()) {
                        if (ev.key === 'Enter') {
                            onEnterKeyDown?.(ev);
                            if (!ev.isDefaultPrevented()) {
                                enterKeyDown(ev);
                            }
                        } else if (ev.key === 's' && ev.ctrlKey) {
                            onCtrlSKeyDown?.(ev);
                        } else if (ev.key === 'Tab') {
                            tabKeyDown(ev);
                        }
                    }
                }}
            />
            <div className='rich-textarea-suggestions' hidden={suggestions.length === 0}>
                {suggestions.map((suggestion) => (
                    <Suggestion
                        key={suggestion}
                        className={suggestion === word ? 'bg-primary text-white' : ''}
                        onSuggestion={onSuggestion}
                        suggestion={suggestion}
                    />
                ))}
            </div>
        </div>
    );
});

function Suggestion({
    className,
    onSuggestion,
    suggestion,
}: {
    readonly className?: string;
    readonly onSuggestion: (suggestion: string) => void;
    readonly suggestion: string;
}): React.JSX.Element {
    return (
        <div
            className={className}
            onPointerDown={(ev): void => {
                ev.preventDefault();
                onSuggestion(suggestion);
            }}
        >
            {suggestion}
        </div>
    );
}

function createKeyboardControl(textarea: HTMLTextAreaElement): KeyboardControl {
    return {
        moveCursor: (relativePosition): void => {
            // blur + focus = scroll to cursor position.
            textarea.blur();
            textarea.focus();
            const {selectionDirection, selectionStart, selectionEnd} = textarea;
            const nextSelectionStartAndEnd = Math.max(
                0,
                (selectionDirection === 'backward' ? selectionStart : selectionEnd) + relativePosition,
            );
            textarea.setSelectionRange(nextSelectionStartAndEnd, nextSelectionStartAndEnd);
        },
    };
}

function getTextarea(ref: ForwardedRef<HTMLTextAreaElement>): HTMLTextAreaElement | null {
    // CAUTION: ref might be a function, therefore the cast.
    return (ref as MutableRefObject<HTMLTextAreaElement | null> | null)?.current ?? null;
}
