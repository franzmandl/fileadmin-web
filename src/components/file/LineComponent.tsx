import classNames from 'classnames';
import {arrayReplace, focusNothing} from 'common/ReactUtil';
import {getOriginalIndent, newLine} from 'common/Util';
import {Action} from 'components/Action';
import {AutoResizeTextarea} from 'components/textarea/AutoResizeTextarea';
import {SetKeyboardControl} from 'components/keyboard-control/KeyboardControl';
import React, {Dispatch, Fragment, ReactNode} from 'react';
import {CheckboxInput} from './CheckboxInput';
import './LineComponent.scss';
import {SuggestionControl} from 'components/textarea/RichTextarea';
import {tagRegexGrouped, urlRegex, wholeUrlRegex} from 'common/constants';

export type GetServerUrl = (relativePath: string, isThumbnail: boolean) => string;
export type OnTagClick = ((clickedTag: string) => void) | undefined;

export interface LineMeta {
    readonly cursorPosition?: number;
    readonly isEdit: boolean;
}

export function LineComponent({
    action,
    filterHighlightTags,
    getServerUrl,
    handleAction,
    setKeyboardControl,
    line,
    meta,
    onTagClick,
    parentIndex,
    save,
    spellCheck,
    setParentValue,
    suggestionControl,
}: {
    readonly action: Action;
    readonly filterHighlightTags: ReadonlySet<string>;
    readonly getServerUrl: GetServerUrl;
    readonly handleAction: (action: Action, line: string, index: number, cursorPosition: number, handled: () => void) => void;
    readonly setKeyboardControl?: SetKeyboardControl;
    readonly line: string;
    readonly meta: LineMeta;
    readonly onTagClick: OnTagClick;
    readonly parentIndex: number;
    readonly save: () => void;
    readonly spellCheck: boolean;
    readonly setParentValue: (value: string, index: number) => void;
    readonly suggestionControl: SuggestionControl;
}): React.JSX.Element {
    const onClick = (ev: React.MouseEvent, cursorPosition: number): void =>
        handleAction(action, line, parentIndex, cursorPosition, () => ev.stopPropagation());
    const disabled = action !== Action.view;
    const context: LineContext = {
        disabled,
        filterHighlightTags,
        getServerUrl,
        onClick,
        onTagClick,
    };
    const setValue = (value: string): void => setParentValue(value, parentIndex);
    const onSaveKeyDown = (ev: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        ev.preventDefault();
        save();
    };
    const helper = new Helper(0);
    return (
        <div className={classNames('text-line', {hoverable: !meta.isEdit && disabled})} onClick={(ev): void => onClick(ev, line.length)}>
            {meta.isEdit ? (
                <AutoResizeTextarea
                    cursorPosition={meta.cursorPosition}
                    setKeyboardControl={setKeyboardControl}
                    onCtrlSKeyDown={onSaveKeyDown}
                    spellCheck={spellCheck}
                    suggestionControl={suggestionControl}
                    textareaClassName='font-monospace ps-2'
                    value={line}
                    setValue={setValue}
                />
            ) : (
                line
                    .split(newLine)
                    .map((part, index, parts) =>
                        helper.wrap(
                            <ParsedIndent
                                key={`${index * indexFactor}${LineComponent.name}`}
                                context={context}
                                cursorOffset={helper.cursorOffset}
                                indentedValue={part}
                                parentIndex={index}
                                parentValues={parts}
                                setParentValue={setValue}
                            />,
                            part.length + 1,
                        ),
                    )
            )}
        </div>
    );
}

type OnClick = (ev: React.MouseEvent, cursorPosition: number) => void;

interface LineContext {
    readonly disabled: boolean;
    readonly filterHighlightTags: ReadonlySet<string>;
    readonly getServerUrl: GetServerUrl;
    readonly onClick: OnClick;
    readonly onTagClick: OnTagClick;
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
}): React.JSX.Element {
    const indent = getOriginalIndent(indentedValue);
    const value = indentedValue.substring(indent.length);
    const setIndentedValue = (nextIndentedValue: string): void => {
        setParentValue(arrayReplace(parentValues, parentIndex, nextIndentedValue).join(newLine));
    };
    return (
        <div
            className={classNames('ps-2 text-line-grid', {'fw-bold': /^#{1,6} /.test(value), 'text-muted': /\[x\]/.test(indent)})}
            onClick={(ev): void => context.onClick(ev, cursorOffset)}
        >
            <OnClickDiv cursorOffset={cursorOffset} onClick={context.onClick}>
                {parseCheckbox(indent, (nextIndent) => setIndentedValue(nextIndent + value), cursorOffset, context)}
            </OnClickDiv>
            <div className='text-line-column2' onClick={(ev): void => context.onClick(ev, cursorOffset + indentedValue.length)}>
                {value === '---' ? (
                    <hr />
                ) : (
                    parseCheckbox(value, (nextValue) => setIndentedValue(indent + nextValue), cursorOffset + indent.length, context)
                )}
            </div>
        </div>
    );
}

function parseCheckbox(value: string, setValue: Dispatch<string>, cursorOffset: number, context: LineContext): ReactNode {
    const helper = new Helper(cursorOffset);
    return value.split(/(\[[x ]\])/).map((part, index, parts) =>
        helper.wrap(
            index % 2 === 0 ? (
                <Fragment key={`${index * indexFactor}${parseCheckbox.name}`}>
                    {parseMarkdownImage(part, helper.cursorOffset, context)}
                </Fragment>
            ) : (
                <OnClickDiv
                    key={`${index * indexFactor}${parseCheckbox.name}`}
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
            part.length,
        ),
    );
}

function parseMarkdownImage(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const helper = new Helper(cursorOffset);
    return value.split(/(!\[(.*?)\]\((.*?)\))/).map((part, index, parts) =>
        index % 4 === 0
            ? helper.wrap(
                  <Fragment key={`${index * indexFactor}${parseMarkdownImage.name}`}>
                      {parseMarkdownUrl(part, helper.cursorOffset, context)}
                  </Fragment>,
                  part.length,
              )
            : index % 4 === 3 &&
              // parts[index - 2] = '![' parts[index - 1] '](' parts[index] = part ')'
              helper.wrap(
                  <OnClickDiv
                      key={`${index * indexFactor}${parseMarkdownImage.name}`}
                      cursorOffset={helper.cursorOffset + parts[index - 2].length - 1}
                      onClick={context.onClick}
                  >
                      {wholeUrlRegex.test(part) ? (
                          renderImg(parts[index - 1], part)
                      ) : (
                          <a
                              href={context.getServerUrl(part, false)}
                              target='_blank'
                              rel='noreferrer'
                              className={classNames({disabled: context.disabled})}
                              onClick={focusNothing}
                          >
                              {renderImg(parts[index - 1], context.getServerUrl(part, true))}
                          </a>
                      )}
                  </OnClickDiv>,
                  parts[index - 2].length,
              ),
    );
}

function renderImg(alt: string, src: string): ReactNode {
    return <img className='align-baseline text-original' alt={alt || 'Error'} src={src} />;
}

function parseMarkdownUrl(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const helper = new Helper(cursorOffset);
    return value.split(/(\[(.*?)\]\((.*?)\))/).map((part, index, parts) =>
        index % 4 === 0
            ? helper.wrap(
                  <Fragment key={`${index * indexFactor}${parseMarkdownUrl.name}`}>
                      {parseRawUrl(part, helper.cursorOffset, context)}
                  </Fragment>,
                  part.length,
              )
            : index % 4 === 3 &&
              // parts[index - 2] = '[' parts[index - 1] '](' parts[index] = part ')'
              helper.wrap(
                  <OnClickSpan
                      key={`${index * indexFactor}${parseMarkdownUrl.name}`}
                      cursorOffset={helper.cursorOffset + 1}
                      onClick={context.onClick}
                  >
                      <a
                          href={wholeUrlRegex.test(part) ? part : context.getServerUrl(part, false)}
                          target='_blank'
                          rel='noreferrer'
                          className={classNames({disabled: context.disabled})}
                          onClick={focusNothing}
                      >
                          {parts[index - 1]}
                      </a>
                  </OnClickSpan>,
                  parts[index - 2].length,
              ),
    );
}

function parseRawUrl(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const helper = new Helper(cursorOffset);
    return value.split(urlRegex).map((part, index) =>
        helper.wrap(
            index % 2 === 0 ? (
                <Fragment key={`${index * indexFactor}${parseRawUrl.name}`}>{parseFormat(part, helper.cursorOffset, context)}</Fragment>
            ) : (
                <OnClickSpan key={`${index * indexFactor}${parseRawUrl.name}`} cursorOffset={helper.cursorOffset} onClick={context.onClick}>
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
            part.length,
        ),
    );
}

function parseFormat(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const helper = new Helper(cursorOffset);
    // NOTE: Do not forget to adapt getOriginalIndent.
    return value.split(/(\*\*.+?\*\*|~~.+?~~|\+\+|--|\+-|\([!/?iox ]\))/).map((part, index) =>
        helper.wrap(
            index % 2 === 0 ? (
                <Fragment key={`${index * indexFactor}${parseFormat.name}`}>{parseTags(part, helper.cursorOffset, context)}</Fragment>
            ) : (
                <OnClickSpan key={`${index * indexFactor}${parseFormat.name}`} cursorOffset={helper.cursorOffset} onClick={context.onClick}>
                    {parseFormatHelper(part)}
                </OnClickSpan>
            ),
            part.length,
        ),
    );
}

function parseFormatHelper(value: string): ReactNode {
    switch (value[0]) {
        case '*':
            return <b>{value}</b>;
        case '~':
            return <s>{value}</s>;
        case '+':
            return <b className={value[1] === '+' ? 'text-success' : ''}>{value}</b>;
        case '-':
            return <b className='text-danger'>{value}</b>;
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

function parseTags(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const {onTagClick} = context;
    if (onTagClick === undefined) {
        return parseKeywords(value, cursorOffset, context);
    } else {
        const helper = new Helper(cursorOffset);
        return value.split(tagRegexGrouped).map((part, index, parts) =>
            index % 4 === 0
                ? helper.wrap(
                      <Fragment key={`${index * indexFactor}${parseTags.name}`}>
                          {parseKeywords(part, helper.cursorOffset, context)}
                      </Fragment>,
                      part.length,
                  )
                : index % 4 === 3 &&
                  // parts[index - 2] = ('#@' = parts[index - 1]) + (parts[index + 2] = part)
                  helper.wrap(
                      <OnClickSpan
                          key={`${index * indexFactor}${parseTags.name}`}
                          cursorOffset={helper.cursorOffset}
                          onClick={context.onClick}
                      >
                          {parts[index - 1]}
                          <span
                              className={classNames(context.filterHighlightTags.has(part) ? 'link-tag-match' : 'link-tag', {
                                  disabled: context.disabled,
                              })}
                              onClick={(): void => onTagClick(part)}
                          >
                              {part}
                          </span>
                      </OnClickSpan>,
                      parts[index - 2].length,
                  ),
        );
    }
}

function parseKeywords(value: string, cursorOffset: number, context: LineContext): ReactNode {
    const helper = new Helper(cursorOffset);
    // Used 'TO[D]O' so it does not match real code To Dos.
    // '\u00C0-\u00FF' matches Latin-1 Supplement see https://jrgraphix.net/r/Unicode/00A0-00FF
    return value.split(/((^|\s|[^\p{L}\d])(NOTE|BEGIN|END|CAUTION|TO[D]O|WARNING)($|\s|[^\p{L}\d]))/u).map((part, index, parts) =>
        index % 5 === 0
            ? helper.wrap(
                  <OnClickSpan
                      key={`${index * indexFactor}${parseKeywords.name}`}
                      cursorOffset={helper.cursorOffset}
                      onClick={context.onClick}
                  >
                      {part}
                  </OnClickSpan>,
                  part.length,
              )
            : index % 5 === 3 &&
              // parts[index - 2] = parts[index - 1] parts[index] = part parts[index + 1]
              helper.wrap(
                  <OnClickSpan
                      key={`${index * indexFactor}${parseKeywords.name}`}
                      cursorOffset={helper.cursorOffset}
                      onClick={context.onClick}
                  >
                      {parts[index - 1]}
                      {parseKeywordsHelper(part)}
                      {parts[index + 1]}
                  </OnClickSpan>,
                  parts[index - 2].length,
              ),
    );
}

function parseKeywordsHelper(value: string): ReactNode {
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
}): React.JSX.Element {
    return (
        <div className={classNames('d-inline-block', className)} onClick={useOnClickCallback(cursorOffset, onClick)}>
            {children}
        </div>
    );
}

function OnClickSpan({
    children,
    className,
    cursorOffset,
    onClick,
}: {
    readonly children: ReactNode;
    readonly className?: string;
    readonly cursorOffset: number;
    readonly onClick: OnClick;
}): React.JSX.Element {
    return (
        <span className={className} onClick={useOnClickCallback(cursorOffset, onClick)}>
            {children}
        </span>
    );
}

function useOnClickCallback(cursorOffset: number, onClick: OnClick) {
    return (ev: React.MouseEvent): void => onClick(ev, cursorOffset + getSelectionCharacterOffsetWithin(ev.currentTarget).start);
}

class Helper {
    constructor(public cursorOffset: number) {}

    wrap(node: ReactNode, increment: number): ReactNode {
        this.cursorOffset += increment;
        return node;
    }
}

const indexFactor = 1;

/**
 * Taken from https://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container/4812022#4812022
 */
function getSelectionCharacterOffsetWithin(element: EventTarget): {readonly start: number; readonly end: number} {
    let start = 0;
    let end = 0;
    const doc = (element as any).ownerDocument || (element as any).document;
    const win = doc.defaultView || doc.parentWindow;
    if (typeof win.getSelection != 'undefined') {
        const sel = win.getSelection();
        if (sel.rangeCount > 0) {
            const range = win.getSelection().getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            start = preCaretRange.toString().length;
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            end = preCaretRange.toString().length;
        }
    } else {
        const sel = doc.selection;
        if (sel && sel.type != 'Control') {
            const textRange = sel.createRange();
            const preCaretTextRange = doc.body.createTextRange();
            preCaretTextRange.moveToElementText(element);
            preCaretTextRange.setEndPoint('EndToStart', textRange);
            start = preCaretTextRange.text.length;
            preCaretTextRange.setEndPoint('EndToEnd', textRange);
            end = preCaretTextRange.text.length;
        }
    }
    return {start, end};
}
