import {AppStore} from './useAppStore';
import {InodeStore} from './InodeStore';
import {AudioPlayerStore} from 'components/audio-player/useAudioPlayerStore';
import {AuthenticationStore} from './useAuthenticationStore';
import {ConsoleStore} from 'components/console/useConsoleStore';
import {GalleryStore} from 'components/gallery/useGalleryStore';
import {SuggestionStore} from './useSuggestionStore';
import {ClipboardStore} from 'components/clipboard/useClipboardStore';
import {InodeEventBus} from './InodeEventBus';

export interface AppContext {
    readonly appStore: AppStore;
    readonly audioPlayerStore: AudioPlayerStore;
    readonly authenticationStore: AuthenticationStore;
    readonly clipboardStore: ClipboardStore;
    readonly consoleStore: ConsoleStore;
    readonly galleryStore: GalleryStore;
    readonly inodeEventBus: InodeEventBus;
    readonly inodeStore: InodeStore;
    readonly suggestionStore: SuggestionStore;
}
