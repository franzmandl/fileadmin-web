import {AttributeKey, CompareParameter, ExtendedCompareParameter, extendCompareParameter} from 'common/CompareInode';
import {constant, ParamName} from 'common/constants';
import {useDepsMemo} from 'common/ReactUtil';
import {parseDatePeriod, replaceHash, setOrDeleteParam, ParsedDate, parseInteger, ParsedInteger} from 'common/Util';
import {Action, parseAction} from 'components/Action';
import {Dispatch, useMemo} from 'react';
import {AppStore} from 'stores/useAppStore';

export type SetSortAttributeAndAscending = (attributeKey: AttributeKey, ascending: boolean) => void;

export interface DirectoryPageParameterValues {
    readonly action: Action;
    readonly compareParameter: ExtendedCompareParameter;
    readonly decentDirectory: boolean;
    readonly decentFile: boolean;
    readonly decentReadmeFile: boolean;
    readonly decentRunLastFile: boolean;
    readonly pageSize: ParsedInteger;
    readonly showDateFrom: ParsedDate;
    readonly showDateTo: ParsedDate;
    readonly showHidden: boolean;
    readonly showLastModified: boolean;
    readonly showMimeType: boolean;
    readonly showNotRepeating: boolean;
    readonly showSize: boolean;
    readonly showThumbnail: boolean;
    readonly showWaiting: boolean;
}

export interface DirectoryPageParameter {
    readonly encoded: URLSearchParams;
    readonly values: DirectoryPageParameterValues;
    readonly setAction: Dispatch<Action>;
    readonly setDecentDirectory: Dispatch<boolean>;
    readonly setDecentFile: Dispatch<boolean>;
    readonly setDecentReadmeFile: Dispatch<boolean>;
    readonly setDecentRunLastFile: Dispatch<boolean>;
    readonly setPageSize: Dispatch<string>;
    readonly setShowDateFrom: Dispatch<string>;
    readonly setShowDateTo: Dispatch<string>;
    readonly setShowHidden: Dispatch<boolean>;
    readonly setShowLastModified: Dispatch<boolean>;
    readonly setShowMimeType: Dispatch<boolean>;
    readonly setShowNotRepeating: Dispatch<boolean>;
    readonly setShowSize: Dispatch<boolean>;
    readonly setShowThumbnail: Dispatch<boolean>;
    readonly setShowWaiting: Dispatch<boolean>;
    readonly setSortAttributeAndAscending: SetSortAttributeAndAscending;
    readonly setSortFoldersFirst: Dispatch<boolean>;
    readonly setSortPriority: Dispatch<boolean>;
    readonly setSortSpecialFirst: Dispatch<boolean>;
    readonly setSortTime: Dispatch<boolean>;
    readonly setSortTrim: Dispatch<boolean>;
}

export function useDirectoryPageParameter({
    appParameter: {encoded: parentParams},
    currentParams,
    setCurrentParams,
}: AppStore): DirectoryPageParameter {
    const compareParameter = decodeCompareParameter(currentParams);
    const extendedCompareParameter = useDepsMemo(() => extendCompareParameter(compareParameter), Object.values(compareParameter));
    return useMemo(() => {
        const values = decodeValues(currentParams, extendedCompareParameter);
        const replace = (partialValues: Partial<DirectoryPageParameterValues>): void =>
            setCurrentParams((prevParams) => replaceHash(encodeValues(prevParams, {...values, ...partialValues})));
        const replaceCompareParameter = (partialValues: Partial<CompareParameter>): void =>
            setCurrentParams((prevParams) =>
                replaceHash(
                    encodeValues(prevParams, {
                        ...values,
                        compareParameter: extendCompareParameter({...values.compareParameter, ...partialValues}),
                    }),
                ),
            );
        return {
            encoded: encodeValues(parentParams, values),
            values,
            setAction: (action: Action) => replace({action}),
            setDecentDirectory: (decentDirectory: boolean) => replace({decentDirectory}),
            setDecentFile: (decentFile: boolean) => replace({decentFile}),
            setDecentReadmeFile: (decentReadmeFile: boolean) => replace({decentReadmeFile}),
            setDecentRunLastFile: (decentRunLastFile: boolean) => replace({decentRunLastFile}),
            setPageSize: (string: string) => replace({pageSize: parseInteger(string)}),
            setShowDateFrom: (string: string) => replace({showDateFrom: parseDatePeriod(string, constant.now)}),
            setShowDateTo: (string: string) => replace({showDateTo: parseDatePeriod(string, constant.now)}),
            setShowHidden: (showHidden: boolean) => replace({showHidden}),
            setShowLastModified: (showLastModified: boolean) => replace({showLastModified}),
            setShowMimeType: (showMimeType: boolean) => replace({showMimeType}),
            setShowNotRepeating: (showNotRepeating: boolean) => replace({showNotRepeating}),
            setShowSize: (showSize: boolean) => replace({showSize}),
            setShowThumbnail: (showThumbnail: boolean) => replace({showThumbnail}),
            setShowWaiting: (showWaiting: boolean) => replace({showWaiting}),
            setSortAttributeAndAscending: (sortByAttributeKey: AttributeKey, sortAscending: boolean) =>
                replaceCompareParameter({attributeKey: sortByAttributeKey, ascending: sortAscending}),
            setSortFoldersFirst: (sortFoldersFirst: boolean) => replaceCompareParameter({foldersFirst: sortFoldersFirst}),
            setSortPriority: (sortPriority: boolean) => replaceCompareParameter({priority: sortPriority}),
            setSortSpecialFirst: (sortSpecialFirst: boolean) => replaceCompareParameter({specialFirst: sortSpecialFirst}),
            setSortTime: (sortTime: boolean) => replaceCompareParameter({time: sortTime}),
            setSortTrim: (sortTrim: boolean) => replaceCompareParameter({trim: sortTrim}),
        };
    }, [currentParams, parentParams, setCurrentParams, extendedCompareParameter]);
}

function encodeValues(copyParams: URLSearchParams, values: DirectoryPageParameterValues): URLSearchParams {
    const params = new URLSearchParams(copyParams);
    const {compareParameter: compare} = values;
    setOrDeleteParam(params, values.action !== Action.view, ParamName.action, values.action);
    setOrDeleteParam(params, values.decentDirectory, ParamName.decentDirectory, values.decentDirectory.toString());
    setOrDeleteParam(params, values.decentFile, ParamName.decentFile, values.decentFile.toString());
    setOrDeleteParam(params, !values.decentReadmeFile, ParamName.decentReadmeFile, values.decentReadmeFile.toString());
    setOrDeleteParam(params, !values.decentRunLastFile, ParamName.decentRunLastFile, values.decentRunLastFile.toString());
    setOrDeleteParam(params, values.pageSize.value !== constant.pageSize, ParamName.pageSize, values.pageSize.string);
    setOrDeleteParam(params, values.showDateFrom.string !== '', ParamName.showDateFrom, values.showDateFrom.string);
    setOrDeleteParam(params, values.showDateTo.string !== '', ParamName.showDateTo, values.showDateTo.string);
    setOrDeleteParam(params, values.showHidden, ParamName.showHidden, values.showHidden.toString());
    setOrDeleteParam(params, values.showLastModified, ParamName.showLastModified, values.showLastModified.toString());
    setOrDeleteParam(params, values.showMimeType, ParamName.showMimeType, values.showMimeType.toString());
    setOrDeleteParam(params, !values.showNotRepeating, ParamName.showNotRepeating, values.showNotRepeating.toString());
    setOrDeleteParam(params, !values.showSize, ParamName.showSize, values.showSize.toString());
    setOrDeleteParam(params, !values.showThumbnail, ParamName.showThumbnail, values.showThumbnail.toString());
    setOrDeleteParam(params, values.showWaiting, ParamName.showWaiting, values.showWaiting.toString());
    setOrDeleteParam(params, !compare.ascending, ParamName.sortAscending, compare.ascending.toString());
    setOrDeleteParam(params, compare.attributeKey !== AttributeKey.name, ParamName.sortAttribute, compare.attributeKey);
    setOrDeleteParam(params, compare.foldersFirst, ParamName.sortFoldersFirst, compare.foldersFirst.toString());
    setOrDeleteParam(params, !compare.priority, ParamName.sortPriority, compare.priority.toString());
    setOrDeleteParam(params, !compare.specialFirst, ParamName.sortSpecialFirst, compare.specialFirst.toString());
    setOrDeleteParam(params, !compare.time, ParamName.sortTime, compare.time.toString());
    setOrDeleteParam(params, !compare.trim, ParamName.sortTrim, compare.trim.toString());
    return params;
}

function decodeCompareParameter(params: URLSearchParams): CompareParameter {
    return {
        ascending: params.get(ParamName.sortAscending) !== 'false',
        attributeKey: AttributeKey[params.get(ParamName.sortAttribute) as AttributeKey] ?? AttributeKey.name,
        foldersFirst: params.get(ParamName.sortFoldersFirst) === 'true',
        priority: params.get(ParamName.sortPriority) !== 'false',
        specialFirst: params.get(ParamName.sortSpecialFirst) !== 'false',
        time: params.get(ParamName.sortTime) !== 'false',
        trim: params.get(ParamName.sortTrim) !== 'false',
    };
}

function decodeValues(params: URLSearchParams, compareParameter: ExtendedCompareParameter): DirectoryPageParameterValues {
    return {
        action: parseAction(params.get(ParamName.action)) ?? Action.view,
        compareParameter,
        decentDirectory: params.get(ParamName.decentDirectory) === 'true',
        decentFile: params.get(ParamName.decentFile) === 'true',
        decentReadmeFile: params.get(ParamName.decentReadmeFile) !== 'false',
        decentRunLastFile: params.get(ParamName.decentRunLastFile) !== 'false',
        pageSize: parseInteger(params.get(ParamName.pageSize) ?? constant.pageSizeString),
        showDateFrom: parseDatePeriod(params.get(ParamName.showDateFrom) ?? '', constant.now),
        showDateTo: parseDatePeriod(params.get(ParamName.showDateTo) ?? '', constant.now),
        showHidden: params.get(ParamName.showHidden) === 'true',
        showLastModified: params.get(ParamName.showLastModified) === 'true',
        showMimeType: params.get(ParamName.showMimeType) === 'true',
        showNotRepeating: params.get(ParamName.showNotRepeating) !== 'false',
        showSize: params.get(ParamName.showSize) !== 'false',
        showThumbnail: params.get(ParamName.showThumbnail) !== 'false',
        showWaiting: params.get(ParamName.showWaiting) === 'true',
    };
}
