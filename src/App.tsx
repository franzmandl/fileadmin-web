import React, {ReactNode, useMemo, useState} from 'react';
import axios from 'axios';
import {Alert} from 'reactstrap';
import {DirectoryPageMemorized} from 'pages/DirectoryPage';
import {InodeStore} from 'stores/InodeStore';
import {FilePage} from 'pages/FilePage';
import {LoginPage} from 'pages/LoginPage';
import {AppLocation, constant} from 'common/constants';
import {LoadingIndicator} from 'components/util/LoadingIndicator';
import {ModalComponent} from 'components/util/ModalComponent';
import {ConsoleComponent} from 'components/console/ConsoleComponent';
import './App.scss';
import {AppContext} from 'stores/AppContext';
import {Toaster} from 'react-hot-toast';
import {Gallery} from 'components/gallery/Gallery';
import {useAppStore} from 'stores/useAppStore';
import {AudioPlayer} from 'components/audio-player/AudioPlayer';
import {useAuthenticationStore} from 'stores/useAuthenticationStore';
import {useDepsEffect} from 'common/ReactUtil';
import {useSuggestionStore} from 'stores/useSuggestionStore';
import {ParsedDate, equalsDate} from 'common/Util';
import {useAudioPlayerStore} from 'components/audio-player/useAudioPlayerStore';
import {useGalleryStore} from 'components/gallery/useGalleryStore';
import {useConsoleStore} from 'components/console/useConsoleStore';
import {useClipboardStore} from 'components/clipboard/useClipboardStore';
import {ClipboardComponent} from 'components/clipboard/ClipboardComponent';
import {InodeEventBus} from 'stores/InodeEventBus';
import {useListener} from 'common/useListener';

const inodeStore = new InodeStore(axios);

export function App(): React.JSX.Element {
    const {appStore, isLoading, keyboardControl, modalContent} = useAppStore();
    const {consoleEntries, consoleStore, setShowConsole, showConsole} = useConsoleStore();
    const inodeEventBus = useMemo(() => new InodeEventBus(), []);
    const {clipboardControl, clipboardStore} = useClipboardStore(appStore, consoleStore, inodeEventBus, inodeStore);
    const {audioPlayerControl, audioPlayerStore} = useAudioPlayerStore(appStore);
    const {authenticationStore, isLoggedIn} = useAuthenticationStore(axios, appStore, consoleStore);
    const {galleryControl, galleryStore} = useGalleryStore(appStore);
    const suggestionStore = useSuggestionStore(appStore, consoleStore, inodeStore);

    const context: AppContext = useMemo(
        () => ({
            appStore,
            audioPlayerStore,
            authenticationStore,
            clipboardStore,
            consoleStore,
            galleryStore,
            inodeEventBus,
            inodeStore,
            suggestionStore,
        }),
        [appStore, audioPlayerStore, authenticationStore, clipboardStore, consoleStore, galleryStore, inodeEventBus, suggestionStore],
    );
    const {location, now} = appStore.appParameter.values;

    // Fix that soft-keyboards do not reduce page height any more.
    const [className, setClassName] = useState<string>('');
    useDepsEffect(() => {
        // Delayed to let the click events of the sidebar buttons through.
        setTimeout((): void => {
            setClassName(keyboardControl !== undefined ? 'app-keyboard' : '');
        }, 200);
    }, [keyboardControl]);

    const [pageReloadRecommend, setPageReloadRecommend] = useState(false);
    useListener(
        (): void => setPageReloadRecommend(!equalsDate(constant.loadPageDate, new Date())),
        (listener): void => {
            window.addEventListener('focus', listener);
            listener();
        },
        (listener): void => window.removeEventListener('focus', listener),
    );

    return (
        <div className={`app ${className} ${getNowClassName(now, pageReloadRecommend)}`}>
            {renderPage()}
            {audioPlayerControl !== undefined && (
                <AudioPlayer audioPlayerControl={audioPlayerControl} context={context} isLoggedIn={isLoggedIn} />
            )}
            <ClipboardComponent clipboardControl={clipboardControl} context={context} isLoggedIn={isLoggedIn} />
            <ConsoleComponent entries={consoleEntries} hidden={!showConsole} hide={(): void => setShowConsole(false)} />
            {galleryControl !== undefined && (
                <Gallery context={context} galleryControl={galleryControl} isLoggedIn={isLoggedIn} keyboardControl={keyboardControl} />
            )}
            <div ref={appStore.modalContainerRef} className='app-modal-container' />
            {isLoading && <LoadingIndicator />}
            <ModalComponent content={modalContent} context={context} />
            <Toaster toastOptions={{className: 'app-toast'}} position='bottom-center' />
        </div>
    );

    function renderPage(): ReactNode {
        if (!isLoggedIn) {
            return <LoginPage axios={axios} context={context} />;
        } else if (location === AppLocation.inodes) {
            return <DirectoryPageMemorized context={context} keyboardControl={keyboardControl} />;
        } else if (location === AppLocation.edit) {
            return <FilePage context={context} keyboardControl={keyboardControl} />;
        } else {
            return (
                <PageAlert>
                    Location <i>{location}</i> not found.
                </PageAlert>
            );
        }
    }
}

function PageAlert({children}: {readonly children: ReactNode}): React.JSX.Element {
    return (
        <Alert className='m-5' color='danger'>
            {children}
        </Alert>
    );
}

function getNowClassName(now: ParsedDate, overrideDanger: boolean): string {
    if (overrideDanger || (now.string !== '' && now.string !== constant.nowString)) {
        return 'app-border-danger';
    } else if (now.date !== undefined) {
        return 'app-border-warning';
    } else {
        return '';
    }
}
