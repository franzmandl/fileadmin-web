import {tagEndingRegex, tagRegex} from 'common/constants';
import {wait} from 'common/Util';
import {OnSuggestionReturnType, SuggestionControl} from 'components/textarea/RichTextarea';
import {useMemo} from 'react';
import {ReadonlyTextRange} from 'typescript';
import {InodeStore} from './InodeStore';
import {AppStore} from './useAppStore';
import {ConsoleStore} from './useConsoleStore';

export interface SuggestionStore {
    readonly createSuggestionControl: (path: string | undefined) => SuggestionControl;
}

export function useSuggestionStore(appStore: AppStore, consoleStore: ConsoleStore, inodeStore: InodeStore): SuggestionStore {
    return useMemo(
        () => ({
            createSuggestionControl: (path: string | undefined): SuggestionControl => ({
                getSuggestions:
                    path === undefined
                        ? (): Promise<ReadonlyArray<string>> => Promise.resolve([])
                        : (textarea: HTMLTextAreaElement): Promise<ReadonlyArray<string>> => {
                              const {pos, end} = getTextRange(textarea);
                              return end - pos < 2
                                  ? Promise.resolve([])
                                  : inodeStore.getSuggestion(path, textarea.value.substring(pos, end));
                          },
                onError: consoleStore.handleError,
                onSuggestion: (textarea: HTMLTextAreaElement, suggestion: string): OnSuggestionReturnType => {
                    const {pos, end} = getTextRange(textarea);
                    appStore.indicateLoading(wait(200)); // Prevent all click events for 200ms. Necessary on mobile devices.
                    return {
                        nextSelectionStartAndEnd: pos + suggestion.length,
                        nextValue: textarea.value.substring(0, pos) + suggestion + textarea.value.substring(end),
                    };
                },
            }),
        }),
        [appStore, consoleStore.handleError, inodeStore]
    );
}

const wordStartRegex = new RegExp(tagRegex.source + '$', 'u');
const wordEndRegex = new RegExp('^' + tagEndingRegex.source, 'u');

function getTextRange({selectionStart, selectionEnd, value}: HTMLTextAreaElement): ReadonlyTextRange {
    const index = value.substring(0, selectionStart).match(wordStartRegex)?.index;
    return index === undefined
        ? {
              pos: selectionStart,
              end: selectionEnd,
          }
        : {
              pos: index + 1,
              end: selectionEnd + (value.substring(selectionEnd).match(wordEndRegex)?.[0]?.length ?? 0),
          };
}
