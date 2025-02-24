import {AppLocation, constant, HistoryState, ParamName} from 'common/constants';
import {paramsToHash, parseDatePeriod, ParsedDate, pushHash, replaceHash, separator, setOrDeleteParam} from 'common/Util';
import {Dispatch, SetStateAction, useMemo, useRef} from 'react';

export interface AppParameterValues {
    readonly galleryIsOpen: boolean;
    readonly location: string;
    readonly now: ParsedDate;
    readonly path: string;
    readonly rememberMe: boolean;
    readonly spellCheck: boolean;
    readonly username: string;
}

export interface AppParameter {
    readonly encoded: URLSearchParams;
    readonly previousPath: string | undefined;
    readonly values: AppParameterValues;
    readonly getEncodedPath: (path: string) => URLSearchParams;
    readonly pushPath: Dispatch<string>;
    readonly replacePath: Dispatch<string>;
    readonly getEncodedLocation: (location: string) => URLSearchParams;
    readonly setGalleryIsOpen: Dispatch<boolean>;
    readonly setNow: Dispatch<string>;
    readonly setSpellCheck: Dispatch<boolean>;
}

export function useAppParameter(
    parentParams: URLSearchParams,
    currentParams: URLSearchParams,
    setCurrentParams: Dispatch<SetStateAction<URLSearchParams>>,
): AppParameter {
    const previousPathRef = useRef<string>();
    const previousValuesRef = useRef<AppParameterValues>();
    return useMemo(() => {
        const values = decodeValues(currentParams);
        const previousPath = previousValuesRef.current?.path;
        if (values.path !== previousPath) {
            previousPathRef.current = previousPath;
        }
        previousValuesRef.current = values;
        const push = (partialValues: Partial<AppParameterValues>): void =>
            setCurrentParams((prevParams) => pushHash(encodeValues(prevParams, {...values, ...partialValues})));
        const replace = (partialValues: Partial<AppParameterValues>): void =>
            setCurrentParams((prevParams) => replaceHash(encodeValues(prevParams, {...values, ...partialValues})));
        return {
            encoded: encodeValues(parentParams, values),
            values,
            previousPath: previousPathRef.current,
            getEncodedPath: (path: string) => encodeValues(currentParams, {...values, path}),
            pushPath: (path: string) => push({path}),
            replacePath: (path: string) => replace({path}),
            getEncodedLocation: (location: string) => encodeValues(parentParams, {...values, location}),
            setGalleryIsOpen: (galleryIsOpen: boolean) =>
                setCurrentParams((prevParams) => {
                    const params = encodeValues(prevParams, {...values, galleryIsOpen});
                    // Will not behave the same in development mode since Gallery is rerendered very fast twice which is faster than old history states get restored.
                    if (window.history.state === HistoryState.galleryWasOpened && !galleryIsOpen) {
                        window.history.back();
                    } else if (window.history.state !== HistoryState.galleryWasOpened && galleryIsOpen) {
                        window.history.pushState(HistoryState.galleryWasOpened, '', paramsToHash(params));
                    } else {
                        window.history.replaceState(window.history.state, '', paramsToHash(params));
                    }
                    return params;
                }),
            setNow: (string: string) => replace({now: parseDatePeriod(string, constant.now)}),
            setSpellCheck: (spellCheck: boolean) => replace({spellCheck}),
        };
    }, [currentParams, parentParams, setCurrentParams]);
}

function encodeValues(copyParams: URLSearchParams, values: AppParameterValues): URLSearchParams {
    const params = new URLSearchParams(copyParams);
    setOrDeleteParam(params, values.galleryIsOpen, ParamName.gallery, values.galleryIsOpen.toString());
    setOrDeleteParam(params, values.location !== AppLocation.inodes, ParamName.location, values.location);
    setOrDeleteParam(params, values.now.string !== '', ParamName.now, values.now.string);
    setOrDeleteParam(params, values.path !== separator, ParamName.path, values.path);
    setOrDeleteParam(params, values.rememberMe, ParamName.rememberMe, values.rememberMe.toString());
    setOrDeleteParam(params, !values.spellCheck, ParamName.spellCheck, values.spellCheck.toString());
    setOrDeleteParam(params, values.username !== constant.username, ParamName.username, values.username);
    return params;
}

function decodeValues(params: URLSearchParams): AppParameterValues {
    return {
        galleryIsOpen: params.get(ParamName.gallery) === 'true',
        location: params.get(ParamName.location) ?? AppLocation.inodes,
        now: parseDatePeriod(params.get(ParamName.now) ?? '', constant.now),
        path: params.get(ParamName.path) ?? separator,
        rememberMe: params.get(ParamName.rememberMe) === 'true',
        spellCheck: params.get(ParamName.spellCheck) !== 'false',
        username: params.get(ParamName.username) ?? constant.username,
    };
}
