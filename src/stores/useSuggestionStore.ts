import {wait} from 'common/Util';
import {OnSuggestionReturnType, SuggestionControl} from 'components/textarea/RichTextarea';
import {useMemo} from 'react';
import {ReadonlyTextRange} from 'typescript';
import {InodeStore} from './InodeStore';
import {AppStore} from './useAppStore';
import {ConsoleStore} from 'components/console/useConsoleStore';
import {WordRegex} from 'common/constants';

export interface SuggestionStore {
    readonly createSuggestionControl: (path: string | undefined, wordRegex: WordRegex) => SuggestionControl;
}

export function useSuggestionStore(appStore: AppStore, consoleStore: ConsoleStore, inodeStore: InodeStore): SuggestionStore {
    return useMemo(
        () => ({
            createSuggestionControl: (path: string | undefined, wordRegex: WordRegex): SuggestionControl => ({
                getSuggestions:
                    path === undefined
                        ? (): Promise<ReadonlyArray<string>> => Promise.resolve([])
                        : (word: string | undefined): Promise<ReadonlyArray<string>> =>
                              word !== undefined ? inodeStore.getSuggestion(path, word) : Promise.resolve([]),
                onError: consoleStore.handleError,
                onSuggestion: (textarea: HTMLTextAreaElement, suggestion: string): OnSuggestionReturnType => {
                    const {pos, end} = getTextRange(textarea, wordRegex);
                    appStore.indicateLoading(wait(200)); // Prevent all click events for 200ms. Necessary on mobile devices.
                    return {
                        nextSelectionStartAndEnd: pos + suggestion.length,
                        nextValue: textarea.value.substring(0, pos) + suggestion + textarea.value.substring(end),
                    };
                },
                wordRegex,
            }),
        }),
        [appStore, consoleStore.handleError, inodeStore],
    );
}

function getTextRange({selectionStart, selectionEnd, value}: HTMLTextAreaElement, {startRegex, endRegex}: WordRegex): ReadonlyTextRange {
    const index = startRegex.exec(value.substring(0, selectionStart))?.index;
    return index === undefined
        ? {
              pos: selectionStart,
              end: selectionEnd,
          }
        : {
              pos: index + 1,
              end: selectionEnd + (endRegex.exec(value.substring(selectionEnd))?.[0]?.length ?? 0),
          };
}

export function getWord(textarea: HTMLTextAreaElement, wordRegex: WordRegex): string | undefined {
    const {pos, end} = getTextRange(textarea, wordRegex);
    return end - pos >= 1 ? textarea.value.substring(pos, end) : undefined;
}
