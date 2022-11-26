import classNames from 'classnames';
import {constant} from 'common/constants';
import {useDepsLayoutEffect} from 'common/ReactUtil';
import {getIndent, ifMinusOne, newLine} from 'common/Util';
import {Dispatch, ForwardedRef, forwardRef, KeyboardEventHandler, MouseEventHandler, MutableRefObject, useCallback} from 'react';
import {SetKeyboardControl} from './KeyboardControl';

export const EnhancedTextarea = forwardRef(function EnhancedTextarea(
    {
        autoFocus,
        className,
        rows,
        onClick,
        onCtrlSKeyDown,
        onEnterKeyDown,
        onKeyDown,
        setKeyboardControl,
        spellCheck,
        value,
        setValue,
    }: {
        readonly autoFocus?: boolean;
        readonly className?: string;
        readonly rows?: number;
        readonly onClick?: MouseEventHandler<HTMLTextAreaElement>;
        readonly onCtrlSKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
        readonly onEnterKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
        readonly onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
        readonly setKeyboardControl?: SetKeyboardControl;
        readonly spellCheck?: boolean;
        readonly value: string;
        readonly setValue: Dispatch<string>;
    },
    textareaRef: ForwardedRef<HTMLTextAreaElement>
): JSX.Element {
    /**
     * Originally this function used react-dom's flushSync.
     */
    const flushValue = useCallback(
        (textarea: HTMLTextAreaElement, nextValue: string, selectionStart: number, selectionEnd: number) => {
            setValue(nextValue);
            textarea.value = nextValue;
            textarea.setSelectionRange(selectionStart, selectionEnd);
        },
        [setValue]
    );
    const enterKeyDown = useCallback(
        (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
                    nextSelectionStartAndEnd
                );
            }
        },
        [flushValue, value]
    );
    const tabKeyDown = useCallback(
        (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
                    nextSelectionStartAndEnd
                );
            } else {
                const linesStart = value.lastIndexOf(newLine, selectionStart - 1) + 1;
                const linesEnd = ifMinusOne(value.indexOf(newLine, selectionEnd - 1), value.length);
                const lines = value.substring(linesStart, linesEnd).split(newLine);
                if (ev.shiftKey) {
                    let replacedCharacterInFirstLineCount = 0;
                    let replacedCharacterCount = 0;
                    const replaceLine = (line: string, index: number): string =>
                        line.replace(constant.indentRegExp, ({length}) => {
                            replacedCharacterInFirstLineCount += index === 0 ? length : 0;
                            replacedCharacterCount += length;
                            return '';
                        });
                    flushValue(
                        textarea,
                        value.substring(0, linesStart) + lines.map(replaceLine).join(newLine) + value.substring(linesEnd),
                        Math.max(linesStart, selectionStart - replacedCharacterInFirstLineCount),
                        selectionEnd - replacedCharacterCount
                    );
                } else {
                    flushValue(
                        textarea,
                        value.substring(0, linesStart) +
                            constant.indent +
                            lines.join(newLine + constant.indent) +
                            value.substring(linesEnd),
                        selectionStart + constant.indent.length,
                        selectionEnd + constant.indent.length * lines.length
                    );
                }
            }
        },
        [flushValue, value]
    );
    useDepsLayoutEffect(
        () => () => {
            // Fix for mobile devices, where blur event is not triggered after textarea was unmounted while it was focused.
            // Using layout effect because it is the last time textareaRef.current !== null before unmounting.
            // CAUTION: textareaRef might be a function, therefore the cast.
            const textarea = (textareaRef as MutableRefObject<HTMLTextAreaElement | null> | null)?.current;
            if (textarea === document.activeElement) {
                setKeyboardControl?.(undefined);
            }
        },
        []
    );
    return (
        <textarea
            autoFocus={autoFocus}
            className={classNames('reboot', className)}
            data-scrollable='focus'
            ref={textareaRef}
            rows={rows}
            spellCheck={spellCheck}
            value={value}
            onBlur={useCallback(() => setKeyboardControl?.(undefined), [setKeyboardControl])}
            onChange={useCallback((ev: React.ChangeEvent<HTMLTextAreaElement>) => setValue(ev.target.value), [setValue])}
            onClick={onClick}
            onFocus={useCallback(
                (ev: React.FocusEvent<HTMLTextAreaElement>) => {
                    const textarea = ev.currentTarget; // Get it here!
                    setKeyboardControl?.({
                        moveCursor: (relativePosition) => {
                            // blur + focus = scroll to cursor position.
                            textarea.blur();
                            textarea.focus();
                            const {selectionDirection, selectionStart, selectionEnd} = textarea;
                            const nextSelectionStartAndEnd = Math.max(
                                0,
                                (selectionDirection === 'backward' ? selectionStart : selectionEnd) + relativePosition
                            );
                            textarea.setSelectionRange(nextSelectionStartAndEnd, nextSelectionStartAndEnd);
                        },
                    });
                },
                [setKeyboardControl]
            )}
            onKeyDown={useCallback(
                (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
                    onKeyDown?.(ev);
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
                },
                [enterKeyDown, onCtrlSKeyDown, onEnterKeyDown, onKeyDown, tabKeyDown]
            )}
        />
    );
});
