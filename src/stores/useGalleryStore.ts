import {useDepsEffect} from 'common/ReactUtil';
import {GalleryControl, SetGalleryControl} from 'components/GalleryControl';
import {useMemo, useState} from 'react';

export interface GalleryStore {
    readonly setGalleryControl: SetGalleryControl;
}

export function useGalleryStore(isLoggedIn: boolean): {
    readonly galleryStore: GalleryStore;
    readonly galleryControl: GalleryControl | undefined;
} {
    const [galleryControl, setGalleryControl] = useState<GalleryControl>();

    useDepsEffect(() => {
        if (!isLoggedIn) {
            setGalleryControl(undefined);
        }
    }, [isLoggedIn]);

    return {
        galleryStore: useMemo(
            () => ({
                setGalleryControl,
            }),
            []
        ),
        galleryControl,
    };
}
