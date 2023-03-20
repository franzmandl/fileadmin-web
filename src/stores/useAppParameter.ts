import {AppLocation, constant, HistoryState, ParamName} from 'common/constants';
import {paramsToHash, replaceHash, setOrDeleteParam} from 'common/Util';
import {Dispatch, SetStateAction, useMemo} from 'react';

export interface AppParameterValues {
    readonly galleryIsOpen: boolean;
    readonly location: string;
    readonly spellCheck: boolean;
    readonly username: string;
}

export interface AppParameter {
    readonly encoded: URLSearchParams;
    readonly values: AppParameterValues;
    readonly getEncodedLocation: (location: string) => URLSearchParams;
    readonly setGalleryIsOpen: Dispatch<boolean>;
    readonly setSpellCheck: Dispatch<boolean>;
}

export function useAppParameter(
    parentParams: URLSearchParams,
    currentParams: URLSearchParams,
    setCurrentParams: Dispatch<SetStateAction<URLSearchParams>>
): AppParameter {
    return useMemo(() => {
        const values = decodeValues(currentParams);
        const replace = (partialValues: Partial<AppParameterValues>): void =>
            setCurrentParams((prevParams) => replaceHash(encodeValues(prevParams, {...values, ...partialValues})));
        return {
            encoded: encodeValues(parentParams, values),
            values,
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
            setSpellCheck: (spellCheck: boolean) => replace({spellCheck}),
        };
    }, [currentParams, parentParams, setCurrentParams]);
}

function encodeValues(copyParams: URLSearchParams, values: AppParameterValues): URLSearchParams {
    const params = new URLSearchParams(copyParams);
    setOrDeleteParam(params, values.galleryIsOpen, ParamName.gallery, values.galleryIsOpen.toString());
    setOrDeleteParam(params, values.location !== AppLocation.inodes, ParamName.location, values.location);
    setOrDeleteParam(params, !values.spellCheck, ParamName.spellCheck, values.spellCheck.toString());
    setOrDeleteParam(params, values.username !== constant.username, ParamName.username, values.username);
    return params;
}

function decodeValues(params: URLSearchParams): AppParameterValues {
    return {
        galleryIsOpen: params.get(ParamName.gallery) === 'true',
        location: params.get(ParamName.location) ?? AppLocation.inodes,
        spellCheck: params.get(ParamName.spellCheck) !== 'false',
        username: params.get(ParamName.username) ?? constant.username,
    };
}
