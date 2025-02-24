import {useAsyncCallback} from 'common/useAsyncCallback';
import {ConsoleStore} from 'components/console/useConsoleStore';
import {AppStore} from 'stores/useAppStore';

export function useCopyToClipboard(appStore: AppStore, consoleStore: ConsoleStore, data: string): () => Promise<void> {
    return useAsyncCallback(
        () => navigator.clipboard.writeText(data),
        () => appStore.toast('Copied to clipboard'),
        consoleStore.handleError,
    );
}
