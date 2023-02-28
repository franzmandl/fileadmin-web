import {constant, ParamName} from 'common/constants';
import {pushHash, replaceHash, separator, setOrDeleteParam} from 'common/Util';
import {Action, parseAction} from 'components/Action';
import {Dispatch, SetStateAction, useMemo, useRef} from 'react';

export type SetSortAlphabeticalAndAscending = (sortAlphabetical: boolean, sortAscending: boolean) => void;

export interface DirectoryPageParameterValues {
    readonly action: Action;
    readonly decentDirectory: boolean;
    readonly decentFile: boolean;
    readonly decentReadmeFile: boolean;
    readonly decentRunLastFile: boolean;
    readonly path: string;
    readonly showHidden: boolean;
    readonly showLastModified: boolean;
    readonly showMimeType: boolean;
    readonly showNotRepeating: boolean;
    readonly showSize: boolean;
    readonly showThumbnail: boolean;
    readonly showUnavailable: boolean;
    readonly showWaiting: boolean;
    readonly sortAlphabetical: boolean;
    readonly sortAscending: boolean;
    readonly sortFoldersFirst: boolean;
    readonly sortPriority: boolean;
    readonly sortSpecialFirst: boolean;
    readonly today: string;
}

export interface DirectoryPageParameter {
    readonly encoded: URLSearchParams;
    readonly previousPath: string | undefined;
    readonly values: DirectoryPageParameterValues;
    readonly getEncodedPath: (path: string) => URLSearchParams;
    readonly setAction: Dispatch<Action>;
    readonly setDecentDirectory: Dispatch<boolean>;
    readonly setDecentFile: Dispatch<boolean>;
    readonly setDecentReadmeFile: Dispatch<boolean>;
    readonly setDecentRunLastFile: Dispatch<boolean>;
    readonly setPath: Dispatch<string>;
    readonly setShowHidden: Dispatch<boolean>;
    readonly setShowLastModified: Dispatch<boolean>;
    readonly setShowMimeType: Dispatch<boolean>;
    readonly setShowNotRepeating: Dispatch<boolean>;
    readonly setShowSize: Dispatch<boolean>;
    readonly setShowThumbnail: Dispatch<boolean>;
    readonly setShowUnavailable: Dispatch<boolean>;
    readonly setShowWaiting: Dispatch<boolean>;
    readonly setSortAlphabeticalAndAscending: SetSortAlphabeticalAndAscending;
    readonly setSortFoldersFirst: Dispatch<boolean>;
    readonly setSortPriority: Dispatch<boolean>;
    readonly setSortSpecialFirst: Dispatch<boolean>;
    readonly setToday: Dispatch<string>;
}

export function useDirectoryPageParameter(
    parentParams: URLSearchParams,
    currentParams: URLSearchParams,
    setCurrentParams: Dispatch<SetStateAction<URLSearchParams>>
): DirectoryPageParameter {
    const previousPathRef = useRef<string>();
    const previousValuesRef = useRef<DirectoryPageParameterValues>();
    return useMemo(() => {
        const values = decodeValues(currentParams);
        const previousPath = previousValuesRef.current?.path;
        if (values.path !== previousPath) {
            previousPathRef.current = previousPath;
        }
        previousValuesRef.current = values;
        const push = (partialValues: Partial<DirectoryPageParameterValues>) =>
            setCurrentParams((prevParams) => pushHash(encodeValues(prevParams, {...values, ...partialValues})));
        const replace = (partialValues: Partial<DirectoryPageParameterValues>) =>
            setCurrentParams((prevParams) => replaceHash(encodeValues(prevParams, {...values, ...partialValues})));
        return {
            encoded: encodeValues(parentParams, values),
            values,
            previousPath: previousPathRef.current,
            getEncodedPath: (path: string) => encodeValues(parentParams, {...values, path}),
            setAction: (action: Action) => replace({action}),
            setDecentDirectory: (decentDirectory: boolean) => replace({decentDirectory}),
            setDecentFile: (decentFile: boolean) => replace({decentFile}),
            setDecentReadmeFile: (decentReadmeFile: boolean) => replace({decentReadmeFile}),
            setDecentRunLastFile: (decentRunLastFile: boolean) => replace({decentRunLastFile}),
            setPath: (path: string) => push({path}),
            setShowHidden: (showHidden: boolean) => replace({showHidden}),
            setShowLastModified: (showLastModified: boolean) => replace({showLastModified}),
            setShowMimeType: (showMimeType: boolean) => replace({showMimeType}),
            setShowNotRepeating: (showNotRepeating: boolean) => replace({showNotRepeating}),
            setShowSize: (showSize: boolean) => replace({showSize}),
            setShowThumbnail: (showThumbnail: boolean) => replace({showThumbnail}),
            setShowUnavailable: (showUnavailable: boolean) => replace({showUnavailable}),
            setShowWaiting: (showWaiting: boolean) => replace({showWaiting}),
            setSortAlphabeticalAndAscending: (sortAlphabetical: boolean, sortAscending: boolean) =>
                replace({sortAlphabetical, sortAscending}),
            setSortFoldersFirst: (sortFoldersFirst: boolean) => replace({sortFoldersFirst}),
            setSortPriority: (sortPriority: boolean) => replace({sortPriority}),
            setSortSpecialFirst: (sortSpecialFirst: boolean) => replace({sortSpecialFirst}),
            setToday: (today: string) => replace({today}),
        };
    }, [currentParams, parentParams, setCurrentParams]);
}

function encodeValues(copyParams: URLSearchParams, values: DirectoryPageParameterValues): URLSearchParams {
    const params = new URLSearchParams(copyParams);
    setOrDeleteParam(params, values.path !== separator, ParamName.path, values.path);
    setOrDeleteParam(params, values.action !== Action.view, ParamName.action, values.action);
    setOrDeleteParam(params, values.decentDirectory, ParamName.decentDirectory, values.decentDirectory.toString());
    setOrDeleteParam(params, values.decentFile, ParamName.decentFile, values.decentFile.toString());
    setOrDeleteParam(params, !values.decentReadmeFile, ParamName.decentReadmeFile, values.decentReadmeFile.toString());
    setOrDeleteParam(params, !values.decentRunLastFile, ParamName.decentRunLastFile, values.decentRunLastFile.toString());
    setOrDeleteParam(params, values.showHidden, ParamName.showHidden, values.showHidden.toString());
    setOrDeleteParam(params, values.showLastModified, ParamName.showLastModified, values.showLastModified.toString());
    setOrDeleteParam(params, values.showMimeType, ParamName.showMimeType, values.showMimeType.toString());
    setOrDeleteParam(params, !values.showNotRepeating, ParamName.showNotRepeating, values.showNotRepeating.toString());
    setOrDeleteParam(params, !values.showSize, ParamName.showSize, values.showSize.toString());
    setOrDeleteParam(params, !values.showThumbnail, ParamName.showThumbnail, values.showThumbnail.toString());
    setOrDeleteParam(params, !values.showUnavailable, ParamName.showUnavailable, values.showUnavailable.toString());
    setOrDeleteParam(params, values.showWaiting, ParamName.showWaiting, values.showWaiting.toString());
    setOrDeleteParam(params, !values.sortAlphabetical, ParamName.sortAlphabetical, values.sortAlphabetical.toString());
    setOrDeleteParam(params, !values.sortAscending, ParamName.sortAscending, values.sortAscending.toString());
    setOrDeleteParam(params, values.sortFoldersFirst, ParamName.sortFoldersFirst, values.sortFoldersFirst.toString());
    setOrDeleteParam(params, !values.sortPriority, ParamName.sortPriority, values.sortPriority.toString());
    setOrDeleteParam(params, !values.sortSpecialFirst, ParamName.sortSpecialFirst, values.sortSpecialFirst.toString());
    setOrDeleteParam(params, values.today !== constant.today, ParamName.today, values.today);
    return params;
}

function decodeValues(params: URLSearchParams): DirectoryPageParameterValues {
    return {
        action: parseAction(params.get(ParamName.action)) ?? Action.view,
        decentDirectory: params.get(ParamName.decentDirectory) === 'true',
        decentFile: params.get(ParamName.decentFile) === 'true',
        decentReadmeFile: params.get(ParamName.decentReadmeFile) !== 'false',
        decentRunLastFile: params.get(ParamName.decentRunLastFile) !== 'false',
        path: params.get(ParamName.path) ?? separator,
        showHidden: params.get(ParamName.showHidden) === 'true',
        showLastModified: params.get(ParamName.showLastModified) === 'true',
        showMimeType: params.get(ParamName.showMimeType) === 'true',
        showNotRepeating: params.get(ParamName.showNotRepeating) !== 'false',
        showSize: params.get(ParamName.showSize) !== 'false',
        showThumbnail: params.get(ParamName.showThumbnail) !== 'false',
        showUnavailable: params.get(ParamName.showUnavailable) !== 'false',
        showWaiting: params.get(ParamName.showWaiting) === 'true',
        sortAlphabetical: params.get(ParamName.sortAlphabetical) !== 'false',
        sortAscending: params.get(ParamName.sortAscending) !== 'false',
        sortFoldersFirst: params.get(ParamName.sortFoldersFirst) === 'true',
        sortPriority: params.get(ParamName.sortPriority) !== 'false',
        sortSpecialFirst: params.get(ParamName.sortSpecialFirst) !== 'false',
        today: params.get(ParamName.today) ?? constant.today,
    };
}
