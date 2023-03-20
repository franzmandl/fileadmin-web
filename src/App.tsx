import {ReactNode, useMemo, useState} from 'react';
import axios from 'axios';
import {Alert} from 'reactstrap';
import {DirectoryPageMemorized} from 'pages/DirectoryPage';
import {InodeStore} from 'stores/InodeStore';
import {FilePage} from 'pages/FilePage';
import {LoginPage} from 'pages/LoginPage';
import {AppLocation, ParamName} from 'common/constants';
import {LoadingIndicator} from 'components/util/LoadingIndicator';
import {ModalComponent} from 'components/util/ModalComponent';
import {ConsoleComponent} from 'components/console/ConsoleComponent';
import './App.scss';
import {AppContext} from 'stores/AppContext';
import {Toaster} from 'react-hot-toast';
import {Gallery} from 'components/gallery/Gallery';
import {useAppStore} from 'stores/useAppStore';
import {AudioPlayer} from 'components/audio-player/AudioPlayer';
import {useAudioPlayerStore} from 'stores/useAudioPlayerStore';
import {useAuthenticationStore} from 'stores/useAuthenticationStore';
import {useConsoleStore} from 'stores/useConsoleStore';
import {useGalleryStore} from 'stores/useGalleryStore';
import {useDepsEffect} from 'common/ReactUtil';
import {useSuggestionStore} from 'stores/useSuggestionStore';

const inodeStore = new InodeStore(axios);

export function App(): JSX.Element {
    const {appStore, isLoading, keyboardControl, modalContent} = useAppStore();
    const {audioPlayerControl, audioPlayerStore} = useAudioPlayerStore(appStore);
    const {consoleEntries, consoleStore, setShowConsole, showConsole} = useConsoleStore();
    const {authenticationStore, isLoggedIn} = useAuthenticationStore(axios, appStore, consoleStore);
    const {galleryControl, galleryStore} = useGalleryStore(appStore, isLoggedIn);
    const suggestionStore = useSuggestionStore(appStore, consoleStore, inodeStore);

    const context: AppContext = useMemo(
        () => ({
            appStore,
            audioPlayerStore,
            authenticationStore,
            consoleStore,
            galleryStore,
            inodeStore,
            suggestionStore,
        }),
        [appStore, audioPlayerStore, authenticationStore, consoleStore, galleryStore, suggestionStore]
    );

    // Fix that soft-keyboards do not reduce page height any more.
    const [classNames, setClassNames] = useState<string>('');
    useDepsEffect(() => {
        // Delayed to let the click events of the sidebar buttons through.
        setTimeout(() => {
            setClassNames(keyboardControl !== undefined ? 'app-keyboard' : '');
        }, 200);
    }, [keyboardControl]);

    return (
        <div className={`app ${classNames}`}>
            {renderPage()}
            {audioPlayerControl && <AudioPlayer audioPlayerControl={audioPlayerControl} context={context} />}
            <ConsoleComponent entries={consoleEntries} hidden={!showConsole} hide={(): void => setShowConsole(false)} />
            {galleryControl !== undefined && (
                <Gallery context={context} galleryControl={galleryControl} keyboardControl={keyboardControl} />
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
        } else if (appStore.appParameter.values.location === AppLocation.inodes) {
            return <DirectoryPageMemorized context={context} keyboardControl={keyboardControl} />;
        } else if (appStore.appParameter.values.location === AppLocation.edit) {
            const path = appStore.currentParams.get(ParamName.path);
            if (path !== null) {
                return <FilePage context={context} keyboardControl={keyboardControl} path={path} />;
            } else {
                return <PageAlert>Path missing.</PageAlert>;
            }
        } else {
            return (
                <PageAlert>
                    Location <i>{appStore.appParameter.values.location}</i> not found.
                </PageAlert>
            );
        }
    }
}

function PageAlert({children}: {readonly children: ReactNode}): JSX.Element {
    return (
        <Alert className='m-5' color='danger'>
            {children}
        </Alert>
    );
}
