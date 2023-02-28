import {useDepsEffect, useLatest} from 'common/ReactUtil';
import {GalleryControl, SetGalleryControl} from 'components/gallery/GalleryControl';
import {useMemo, useState} from 'react';
import {AppStore} from './useAppStore';

export interface GalleryStore {
    readonly setGalleryControl: SetGalleryControl;
}

export function useGalleryStore(
    appStore: AppStore,
    isLoggedIn: boolean
): {
    readonly galleryStore: GalleryStore;
    readonly galleryControl: GalleryControl | undefined;
} {
    const [galleryControl, setGalleryControl] = useState<GalleryControl>();

    const setGalleryControlAndParameterRef = useLatest((nextGalleryControl: GalleryControl | undefined) => {
        setGalleryControl(nextGalleryControl);
        appStore.appParameter.setGalleryIsOpen(nextGalleryControl !== undefined);
    });

    useDepsEffect(() => {
        if (!isLoggedIn) {
            setGalleryControlAndParameterRef.current(undefined);
        }
    }, [isLoggedIn]);

    return {
        galleryStore: useMemo(
            () => ({
                setGalleryControl: (nextGalleryControl: GalleryControl | undefined) =>
                    setGalleryControlAndParameterRef.current(nextGalleryControl),
            }),
            [setGalleryControlAndParameterRef]
        ),
        galleryControl,
    };
}
