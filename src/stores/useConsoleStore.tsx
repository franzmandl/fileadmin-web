import {AxiosError} from 'axios';
import {formatTimestamp, TimestampPrecision} from 'common/Util';
import {ConsoleEntry, ConsoleEntryLevel} from 'components/console/ConsoleComponent';
import {Dispatch, ReactNode, useCallback, useMemo, useState} from 'react';
import {DropdownItem} from 'reactstrap';

export interface ConsoleStore {
    readonly handleError: (error: unknown) => void;
    readonly logError: (content: ReactNode) => void;
    readonly logWarning: (content: ReactNode) => void;
    readonly showConsoleDropdownItem: ReactNode;
}

export function useConsoleStore(): {
    readonly consoleStore: ConsoleStore;
    readonly consoleEntries: ReadonlyArray<ConsoleEntry>;
    readonly showConsole: boolean;
    readonly setShowConsole: Dispatch<boolean>;
} {
    const [consoleEntries, setConsoleEntries] = useState<ReadonlyArray<ConsoleEntry>>([]);
    const [showConsole, setShowConsole] = useState<boolean>(false);
    const log = useCallback(
        (level: ConsoleEntryLevel, node: ReactNode) => setConsoleEntries((prev) => [{id: prev.length, level, node}, ...prev]),
        []
    );
    const logError = useCallback(
        (content: ReactNode) => {
            setShowConsole(true);
            log(
                ConsoleEntryLevel.error,
                <div className='text-danger px-1'>
                    {formatTimestamp(new Date(), TimestampPrecision.second, ':')} ERROR: {content}
                </div>
            );
        },
        [log]
    );
    const logWarning = useCallback(
        (content: ReactNode) => {
            setShowConsole(true);
            log(
                ConsoleEntryLevel.warning,
                <div className='text-warning px-1'>
                    {formatTimestamp(new Date(), TimestampPrecision.second, ':')} WARNING: {content}
                </div>
            );
        },
        [log]
    );
    const handleError = useCallback(
        (error: unknown): void => {
            console.warn(error);
            logWarning(JSON.stringify(error));
            const axiosError = error as AxiosError<string> | undefined;
            const message = axiosError?.response?.data ?? axiosError?.response ?? axiosError;
            const status = axiosError?.response?.status;
            logError((status !== undefined ? `${status}: ` : '') + String(message));
        },
        [logError, logWarning]
    );
    const setShowConsoleTrue = useCallback(() => setShowConsole(true), []);
    return {
        consoleStore: useMemo(
            () => ({
                handleError,
                logError,
                logWarning,
                showConsoleDropdownItem: (
                    <DropdownItem onClick={setShowConsoleTrue}>
                        <span className='mdi mdi-code-tags' /> Show Console
                    </DropdownItem>
                ),
            }),
            [handleError, logError, logWarning, setShowConsoleTrue]
        ),
        consoleEntries,
        setShowConsole,
        showConsole,
    };
}
