import {AxiosError, AxiosStatic} from 'axios';
import {serverPath} from 'common/constants';
import {useLatest} from 'common/ReactUtil';
import {useAsyncCallback} from 'common/useAsyncCallback';
import {Dispatch, ReactNode, useMemo, useState} from 'react';
import {DropdownItem} from 'reactstrap';
import {AppStore} from './useAppStore';
import {ConsoleStore} from './useConsoleStore';

export interface AuthenticationStore {
    readonly logoutDropdownItem: ReactNode;
    readonly handleAuthenticationError: (error: unknown) => void;
    readonly setIsLoggedIn: Dispatch<boolean>;
}

export function useAuthenticationStore(
    axios: AxiosStatic,
    appStore: AppStore,
    consoleStore: ConsoleStore
): {
    readonly authenticationStore: AuthenticationStore;
    readonly isLoggedIn: boolean;
} {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
    const logoutRef = useLatest(
        useAsyncCallback(
            () =>
                appStore.indicateLoading(
                    appStore.preventClose(
                        axios.get(serverPath.authenticatedPath.logout(), {
                            withCredentials: true,
                        })
                    )
                ),
            () => setIsLoggedIn(false),
            consoleStore.handleError
        )
    );
    return {
        authenticationStore: useMemo(
            () => ({
                logoutDropdownItem: (
                    <DropdownItem onClick={(): Promise<void> => logoutRef.current()}>
                        <span className='mdi mdi-logout' /> Logout
                    </DropdownItem>
                ),
                handleAuthenticationError: (error): void => {
                    const axiosError = error as AxiosError<string> | undefined;
                    const status = axiosError?.response?.status;
                    if (status === 401) {
                        setIsLoggedIn(false);
                    } else {
                        consoleStore.handleError(error);
                    }
                },
                setIsLoggedIn,
            }),
            [consoleStore, logoutRef]
        ),
        isLoggedIn,
    };
}
