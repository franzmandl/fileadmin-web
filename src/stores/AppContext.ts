import {AppStore} from './useAppStore';
import {InodeStore} from './InodeStore';
import {AudioPlayerStore} from './useAudioPlayerStore';
import {AuthenticationStore} from './useAuthenticationStore';
import {ConsoleStore} from './useConsoleStore';
import {GalleryStore} from './useGalleryStore';

export interface AppContext {
    readonly appStore: AppStore;
    readonly audioPlayerStore: AudioPlayerStore;
    readonly authenticationStore: AuthenticationStore;
    readonly consoleStore: ConsoleStore;
    readonly galleryStore: GalleryStore;
    readonly inodeStore: InodeStore;
}
