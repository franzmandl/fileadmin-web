import {ReactNode, useCallback, useMemo} from 'react';
import axios from 'axios';
import {Alert} from 'reactstrap';
import {DirectoryPage} from 'pages/DirectoryPage';
import {InodeStore} from 'stores/InodeStore';
import {FilePage} from 'pages/FilePage';
import {LoginPage} from 'pages/LoginPage';
import {constant, AppLocation} from 'common/constants';
import {LoadingIndicator} from 'components/LoadingIndicator';
import {ModalComponent} from 'components/ModalComponent';
import {ConsoleComponent} from 'components/ConsoleComponent';
import './App.scss';
import {AppContext} from 'stores/AppContext';
import {Toaster} from 'react-hot-toast';
import {Gallery} from 'components/Gallery';
import {useAppStore} from 'stores/useAppStore';
import {AudioPlayer} from 'components/AudioPlayer';
import {useAudioPlayerStore} from 'stores/useAudioPlayerStore';
import {useAuthenticationStore} from 'stores/useAuthenticationStore';
import {useConsoleStore} from 'stores/useConsoleStore';
import {useGalleryStore} from 'stores/useGalleryStore';

export function App(): JSX.Element {
    const inodeStore = useMemo(() => new InodeStore(axios), []);
    const {appStore, isLoading, keyboardControl, modalContent, spellCheck} = useAppStore();
    const {audioPlayerControl, audioPlayerStore} = useAudioPlayerStore(appStore);
    const {consoleEntries, consoleStore, setShowConsole, showConsole} = useConsoleStore();
    const {authenticationStore, isLoggedIn} = useAuthenticationStore(axios, appStore, consoleStore);
    const {galleryControl, galleryStore} = useGalleryStore(isLoggedIn);

    const context = useMemo<AppContext>(
        () => ({
            appStore,
            audioPlayerStore,
            authenticationStore,
            consoleStore,
            galleryStore,
            inodeStore,
        }),
        [appStore, audioPlayerStore, authenticationStore, consoleStore, galleryStore, inodeStore]
    );

    return (
        <div className='app'>
            {renderPage()}
            {audioPlayerControl && <AudioPlayer audioPlayerControl={audioPlayerControl} context={context} />}
            <ConsoleComponent
                entries={consoleEntries}
                hidden={!showConsole}
                hide={useCallback(() => setShowConsole(false), [setShowConsole])}
            />
            {galleryControl !== undefined && (
                <Gallery context={context} galleryControl={galleryControl} keyboardControl={keyboardControl} spellCheck={spellCheck} />
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
        } else if (constant.location === AppLocation.inodes) {
            return <DirectoryPage context={context} keyboardControl={keyboardControl} spellCheck={spellCheck} />;
        } else if (constant.location === AppLocation.edit) {
            if (constant.path !== null) {
                return <FilePage context={context} keyboardControl={keyboardControl} path={constant.path} spellCheck={spellCheck} />;
            } else {
                return <PageAlert>Path missing.</PageAlert>;
            }
        } else {
            return (
                <PageAlert>
                    Location <i>{constant.location}</i> not found.
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
