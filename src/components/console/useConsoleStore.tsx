import {AxiosError} from 'axios';
import {formatTimestamp, TimestampPrecision} from 'common/Util';
import {ConsoleEntry, ConsoleEntryLevel} from './ConsoleComponent';
import {Dispatch, ReactNode, useMemo, useState} from 'react';
import {DropdownItem} from 'reactstrap';

export interface ConsoleStore {
    readonly handleError: (error: unknown) => void;
    readonly logError: (content: ReactNode) => void;
    readonly logInfo: (content: ReactNode) => void;
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
    return {
        consoleStore: useMemo(() => {
            const log = (level: ConsoleEntryLevel, node: ReactNode): void =>
                setConsoleEntries((prev) => [{id: prev.length, level, node}, ...prev]);
            const logError = (content: ReactNode): void => {
                setShowConsole(true);
                log(
                    ConsoleEntryLevel.error,
                    <div className='text-danger px-1'>
                        {formatTimestamp(new Date(), TimestampPrecision.second, ':')} ERROR: {content}
                    </div>,
                );
            };
            const handleError = (error: unknown): void => {
                console.warn(error);
                const axiosError = error as AxiosError<string> | undefined;
                const message = axiosError?.response?.data ?? axiosError?.response ?? axiosError;
                const status = axiosError?.response?.status;
                logError(
                    <>
                        {status !== undefined ? `${status}: ` : ''}
                        {String(message)}
                        <br />
                        {JSON.stringify(error)}
                    </>,
                );
            };
            const setShowConsoleTrue = (): void => setShowConsole(true);
            return {
                handleError,
                logError,
                logInfo: (content: ReactNode): void =>
                    log(
                        ConsoleEntryLevel.info,
                        <div className='text-info px-1'>
                            {formatTimestamp(new Date(), TimestampPrecision.second, ':')} INFO: {content}
                        </div>,
                    ),
                logWarning: (content: ReactNode): void => {
                    setShowConsole(true);
                    log(
                        ConsoleEntryLevel.warning,
                        <div className='text-warning px-1'>
                            {formatTimestamp(new Date(), TimestampPrecision.second, ':')} WARNING: {content}
                        </div>,
                    );
                },
                showConsoleDropdownItem: (
                    <DropdownItem onClick={setShowConsoleTrue}>
                        <span className='mdi mdi-code-tags' /> Show Console
                    </DropdownItem>
                ),
            };
        }, []),
        consoleEntries,
        setShowConsole,
        showConsole,
    };
}
