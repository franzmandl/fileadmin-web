import {useLatest} from 'common/ReactUtil';
import {GalleryControl, SetGalleryControl} from './GalleryControl';
import {useMemo, useState} from 'react';
import {AppStore} from 'stores/useAppStore';

export interface GalleryStore {
    readonly setGalleryControl: SetGalleryControl;
}

export function useGalleryStore(appStore: AppStore): {
    readonly galleryStore: GalleryStore;
    readonly galleryControl: GalleryControl | undefined;
} {
    const [galleryControl, setGalleryControl] = useState<GalleryControl>();

    const setGalleryControlAndParameterRef = useLatest((nextGalleryControl: GalleryControl | undefined) => {
        setGalleryControl(nextGalleryControl);
        appStore.appParameter.setGalleryIsOpen(nextGalleryControl !== undefined);
    });

    return {
        galleryStore: useMemo(
            () => ({
                setGalleryControl: (nextGalleryControl: GalleryControl | undefined) =>
                    setGalleryControlAndParameterRef.current(nextGalleryControl),
            }),
            [setGalleryControlAndParameterRef],
        ),
        galleryControl,
    };
}
