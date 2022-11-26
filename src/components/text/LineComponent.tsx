import classNames from 'classnames';
import {arrayReplace, focusNothing} from 'common/ReactUtil';
import {getOriginalIndent, newLine} from 'common/Util';
import {Action} from 'components/Action';
import {AutoResizeTextarea} from 'components/AutoResizeTextarea';
import {SetKeyboardControl} from 'components/KeyboardControl';
import React, {Fragment, ReactNode, useCallback, useMemo} from 'react';
import {Dispatch} from 'react';
import {CheckboxInput} from './CheckboxInput';
import './LineComponent.scss';

export type GetAbsoluteUrl = (relativePath: string, isThumbnail: boolean) => string;

export interface LineMeta {
    readonly cursorPosition?: number;
    readonly isEdit: boolean;
}

export function LineComponent({
    action,
    getAbsoluteUrl,
    handleAction,
    setKeyboardControl,
    line,
    meta,
    parentIndex,
    save,
    spellCheck,
    setParentValue,
}: {
    readonly action: Action;
    readonly getAbsoluteUrl: GetAbsoluteUrl;
    readonly handleAction: (action: Action, line: string, index: number, cursorPosition: number, handled: () => void) => void;
    readonly setKeyboardControl?: SetKeyboardControl;
    readonly line: string;
    readonly meta: LineMeta;
    readonly parentIndex: number;
    readonly save: () => void;
    readonly spellCheck: boolean;
    readonly setParentValue: (value: string, index: number) => void;
}): JSX.Element {
    const onClick = useCallback(
        (ev: React.MouseEvent, cursorPosition: number) =>
            handleAction(action, line, parentIndex, cursorPosition, () => ev.stopPropagation()),
        [action, handleAction, parentIndex, line]
    );
    const disabled = action !== Action.view;
    const context = useMemo<LineContext>(() => ({disabled, getAbsoluteUrl, onClick}), [disabled, getAbsoluteUrl, onClick]);
    const setValue = useCallback((value: string) => setParentValue(value, parentIndex), [parentIndex, setParentValue]);
    const onSaveKeyDown = useCallback(
        (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
            ev.preventDefault();
            save();
        },
        [save]
    );
    const helper = new Helper(0);
    return (
        <div
            className={classNames('text-line', {hoverable: !meta.isEdit && disabled})}
            onClick={useCallback((ev: React.MouseEvent) => onClick(ev, line.length), [line.length, onClick])}
        >
            {meta.isEdit ? (
                <AutoResizeTextarea
                    className='font-monospace ps-2'
                    cursorPosition={meta.cursorPosition}
                    setKeyboardControl={setKeyboardControl}
                    onCtrlSKeyDown={onSaveKeyDown}
                    spellCheck={spellCheck}
                    value={line}
                    setValue={setValue}
                />
            ) : (
                line
                    .split(newLine)
                    .map((part, index, parts) =>
                        helper.wrap(
                            <ParsedIndent
                                key={index}
                                context={context}
                                cursorOffset={helper.cursorOffset}
                                indentedValue={part}
                                parentIndex={index}
                                parentValues={parts}
                                setParentValue={setValue}
                            />,
                            part.length + 1
                        )
                    )
            )}
        </div>
    );
}

type OnClick = (ev: React.MouseEvent, cursorPosition: number) => void;

interface LineContext {
    readonly disabled: boolean;
    readonly getAbsoluteUrl: GetAbsoluteUrl;
    readonly onClick: OnClick;
}

function ParsedIndent({
    context,
    cursorOffset,
    indentedValue,
    parentIndex,
    parentValues,
    setParentValue,
}: {
    readonly context: LineContext;
    readonly cursorOffset: number;
    readonly indentedValue: string;
    readonly parentIndex: number;
    readonly parentValues: ReadonlyArray<string>;
    readonly setParentValue: Dispatch<string>;
}): JSX.Element {
    const indent = getOriginalIndent(indentedValue);
    const value = indentedValue.substring(indent.length);
    const setIndentedValue = useCallback(
        (nextIndentedValue: string) => {
            setParentValue(arrayReplace(parentValues, parentIndex, nextIndentedValue).join(newLine));
        },
        [parentIndex, parentValues, setParentValue]
    );
    return (
        <div
            className={classNames('ps-2 text-line-grid', {'fw-bold': /^#{1,6} /.test(value), 'text-muted': /\[x\]/.test(indent)})}
            onClick={useCallback((ev: React.MouseEvent) => context.onClick(ev, cursorOffset), [context, cursorOffset])}
        >
            <OnClickDiv cursorOffset={cursorOffset} onClick={context.onClick}>
                {parseCheckbox(
                    indent,
                    useCallback((nextIndent) => setIndentedValue(nextIndent + value), [setIndentedValue, value]),
                    cursorOffset,
                    context
                )}
            </OnClickDiv>
            <div
                className='text-line-column2'
                onClick={useCallback(
                    (ev: React.MouseEvent) => context.onClick(ev, cursorOffset + indentedValue.length),
                    [context, cursorOffset, indentedValue.length]
                )}
            >
                {parseCheckbox(
                    value,
                    useCallback((nextValue) => setIndentedValue(indent + nextValue), [setIndentedValue, indent]),
                    cursorOffset + indent.length,
                    context
                )}
            </div>
        </div>
    );
}

function parseCheckbox(value: string, setValue: Dispatch<string>, cursorOffset: number, context: LineContext): ReactNode {
    const keySuffix = 'c';
    const helper = new Helper(cursorOffset);
    return value.split(/(\[[x ]\])/).map((part, index, parts) =>
        helper.wrap(
            index % 2 === 0 ? (
                <Fragment key={`${index}${keySuffix}`}>{parseMarkdownImage(part, helper.cursorOffset, context)}</Fragment>
            ) : (
                <OnClickDiv
                    key={`${index}${keySuffix}`}
                    className='text-sign-container'
                    cursorOffset={helper.cursorOffset + 2}
                    onClick={context.onClick}
                >
                    <CheckboxInput
                        disabled={context.disabled}
                        onClick={focusNothing}
                        checked={part[1] === 'x'}
                        parentIndex={index}
                        parentValues={parts}
                        setParentValue={setValue}
                    />
                </OnClickDiv>
            ),
            part.length
        )
    );
}

function parseMarkdownImage(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const keySuffix = 'mi';
    const helper = new Helper(cursorOffset);
    return value.split(/(!\[([^\]]*)\]\(([^)]*)\))/g).map((part, index, parts) =>
        index % 4 === 0
            ? helper.wrap(
                  <Fragment key={`${index}${keySuffix}`}>{parseMarkdownUrl(part, helper.cursorOffset, context)}</Fragment>,
                  part.length
              )
            : index % 4 === 3 &&
              // parts[index - 2] = '![' parts[index - 1] '](' parts[index] = part ')'
              helper.wrap(
                  <OnClickDiv
                      key={`${index}${keySuffix}`}
                      cursorOffset={helper.cursorOffset + parts[index - 2].length - 1}
                      onClick={context.onClick}
                  >
                      {wholeUrlRegExp.test(part) ? (
                          renderImg(parts[index - 1], part)
                      ) : (
                          <a
                              href={context.getAbsoluteUrl(part, false)}
                              target='_blank'
                              rel='noreferrer'
                              className={classNames({disabled: context.disabled})}
                              onClick={focusNothing}
                          >
                              {renderImg(parts[index - 1], context.getAbsoluteUrl(part, true))}
                          </a>
                      )}
                  </OnClickDiv>,
                  parts[index - 2].length
              )
    );
}

function renderImg(alt: string, src: string): ReactNode {
    return <img className='align-baseline text-original' alt={alt || 'Error'} src={src} />;
}

function parseMarkdownUrl(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const keySuffix = 'mu';
    const helper = new Helper(cursorOffset);
    return value.split(/(\[([^\]]*)\]\(([^)]*)\))/g).map((part, index, parts) =>
        index % 4 === 0
            ? helper.wrap(<Fragment key={`${index}${keySuffix}`}>{parseRawUrl(part, helper.cursorOffset, context)}</Fragment>, part.length)
            : index % 4 === 3 &&
              // parts[index - 2] = '[' parts[index - 1] '](' parts[index] = part ')'
              helper.wrap(
                  <OnClickSpan key={`${index}${keySuffix}`} cursorOffset={helper.cursorOffset + 1} onClick={context.onClick}>
                      <a
                          href={wholeUrlRegExp.test(part) ? part : context.getAbsoluteUrl(part, false)}
                          target='_blank'
                          rel='noreferrer'
                          className={classNames({disabled: context.disabled})}
                          onClick={focusNothing}
                      >
                          {parts[index - 1]}
                      </a>
                  </OnClickSpan>,
                  parts[index - 2].length
              )
    );
}

function parseRawUrl(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const keySuffix = 'ru';
    const helper = new Helper(cursorOffset);
    return value.split(globalUrlRegExp).map((part, index) =>
        helper.wrap(
            index % 2 === 0 ? (
                <Fragment key={`${index}${keySuffix}`}>{parseFormat(part, helper.cursorOffset, context)}</Fragment>
            ) : (
                <OnClickSpan key={`${index}${keySuffix}`} cursorOffset={helper.cursorOffset} onClick={context.onClick}>
                    <a
                        href={part}
                        target='_blank'
                        rel='noreferrer'
                        className={classNames({disabled: context.disabled})}
                        onClick={focusNothing}
                    >
                        {part}
                    </a>
                </OnClickSpan>
            ),
            part.length
        )
    );
}

function parseFormat(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const keySuffix = 'f';
    const helper = new Helper(cursorOffset);
    // NOTE: Do not forget to adapt getOriginalIndent.
    return value.split(/(\*{2}.+?\*{2}|~{2}.+?~{2}|\([!/?iox ]\))/g).map((part, index) =>
        helper.wrap(
            index % 2 === 0 ? (
                <Fragment key={`${index}${keySuffix}`}>{parseKeywords(part, helper.cursorOffset, context)}</Fragment>
            ) : (
                <OnClickSpan key={`${index}${keySuffix}`} cursorOffset={helper.cursorOffset} onClick={context.onClick}>
                    {parseFormatHelper(part)}
                </OnClickSpan>
            ),
            part.length
        )
    );
}

function parseFormatHelper(value: string): ReactNode {
    switch (value[0]) {
        case '*':
            return <b>{value}</b>;
        case '~':
            return <s>{value}</s>;
        case '(':
            switch (value[1]) {
                case '!':
                    return <div className='text-sign-container text-warning mdi mdi-alert' />;
                case '/':
                    return <div className='text-sign-container text-success mdi mdi-check-circle' />;
                case '?':
                    return <div className='text-sign-container text-info mdi mdi-help-circle' />;
                case 'i':
                    return <div className='text-sign-container text-primary mdi mdi-information' />;
                case 'o':
                    return <div className='text-sign-container mdi mdi-circle' />;
                case 'x':
                    return <div className='text-sign-container text-danger mdi mdi-close-circle' />;
                case ' ':
                    return <div className='text-sign-container mdi mdi-circle-outline' />;
            }
    }
    return value;
}

function parseKeywords(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const keySuffix = 'k';
    const helper = new Helper(cursorOffset);
    // Used 'TO[D]O' so it does not match real code To Dos.
    // '\u00C0-\u00FF' matches Latin-1 Supplement see https://jrgraphix.net/r/Unicode/00A0-00FF
    return value
        .split(/((^|\s|[^A-Za-z0-9\u00C0-\u00FF])(NOTE|BEGIN|END|CAUTION|TO[D]O|WARNING)($|\s|[^A-Za-z0-9\u00C0-\u00FF]))/g)
        .map((part, index, parts) =>
            index % 5 === 0
                ? helper.wrap(
                      <OnClickSpan key={`${index}${keySuffix}`} cursorOffset={helper.cursorOffset} onClick={context.onClick}>
                          {part}
                      </OnClickSpan>,
                      part.length
                  )
                : index % 5 === 3 &&
                  // parts[index - 2] = parts[index - 1] parts[index] = part parts[index + 1]
                  helper.wrap(
                      <OnClickSpan key={`${index}${keySuffix}`} cursorOffset={helper.cursorOffset} onClick={context.onClick}>
                          {parts[index - 1]}
                          {parseKeywordsHelper(part)}
                          {parts[index + 1]}
                      </OnClickSpan>,
                      parts[index - 2].length
                  )
        );
}

function parseKeywordsHelper(value: string) {
    switch (value) {
        case 'NOTE':
            return <span className='text-note'>{value}</span>;
        case 'BEGIN':
        case 'END':
            return <span className='text-range'>{value}</span>;
        case 'CAUTION':
        case 'TO' + 'DO': // So it does not match real code To Dos.
        case 'WARNING':
            return <span className='text-warn'>{value}</span>;
    }
    return value;
}

function OnClickDiv({
    children,
    className,
    cursorOffset,
    onClick,
}: {
    readonly children: ReactNode;
    readonly className?: string;
    readonly cursorOffset: number;
    readonly onClick: OnClick;
}): JSX.Element {
    return (
        <div className={classNames('d-inline-block', className)} onClick={useOnClickCallback(cursorOffset, onClick)}>
            {children}
        </div>
    );
}

function OnClickSpan({
    children,
    cursorOffset,
    onClick,
}: {
    readonly children: ReactNode;
    readonly cursorOffset: number;
    readonly onClick: OnClick;
}): JSX.Element {
    return <span onClick={useOnClickCallback(cursorOffset, onClick)}>{children}</span>;
}

function useOnClickCallback(cursorOffset: number, onClick: OnClick) {
    return useCallback(
        (ev: React.MouseEvent) => onClick(ev, cursorOffset + getSelectionCharacterOffsetWithin(ev.currentTarget).start),
        [cursorOffset, onClick]
    );
}

class Helper {
    constructor(public cursorOffset: number) {}

    wrap(node: ReactNode, increment: number): ReactNode {
        this.cursorOffset += increment;
        return node;
    }
}

/*
 * URL regex adapted from https://www.ietf.org/rfc/rfc3986.txt https://urlregex.com/
 * Replaced group indicators "(" with non-capturing group indicator "(?:" see https://stackoverflow.com/questions/21419530/use-of-capture-groups-in-string-split
 * Added quotation mark '"', parentheses "(" ")", space " " to character ranges.
 * Made it string compatible.
 */
const urlPattern =
    // http         ://domain.test  /path          ?name=value    #hash
    '([^:/?#"()\\s]+://[^/?#"()\\s]+[^?#"\\s]*(?:\\?[^#"\\s]*)?(?:#[^"\\s]*)?|mailto:[^@]+@[^/?#"()\\s]+)';
const globalUrlRegExp = new RegExp(urlPattern, 'g');
const wholeUrlRegExp = new RegExp('^' + urlPattern + '$');

/**
 * Taken from https://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container/4812022#4812022
 */
function getSelectionCharacterOffsetWithin(element: EventTarget) {
    let start = 0;
    let end = 0;
    const doc = (element as any).ownerDocument || (element as any).document;
    const win = doc.defaultView || doc.parentWindow;
    let sel;
    if (typeof win.getSelection != 'undefined') {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            const range = win.getSelection().getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            start = preCaretRange.toString().length;
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            end = preCaretRange.toString().length;
        }
    } else if ((sel = doc.selection) && sel.type != 'Control') {
        const textRange = sel.createRange();
        const preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint('EndToStart', textRange);
        start = preCaretTextRange.text.length;
        preCaretTextRange.setEndPoint('EndToEnd', textRange);
        end = preCaretTextRange.text.length;
    }
    return {start, end};
}
