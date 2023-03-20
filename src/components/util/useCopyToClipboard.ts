import {useAsyncCallback} from 'common/useAsyncCallback';
import {AppStore} from 'stores/useAppStore';
import {ConsoleStore} from 'stores/useConsoleStore';

export function useCopyToClipboard(appStore: AppStore, consoleStore: ConsoleStore, data: string): () => Promise<void> {
    return useAsyncCallback(
        () => navigator.clipboard.writeText(data),
        () => appStore.toast('Copied to clipboard'),
        consoleStore.handleError
    );
}
