import {Comparator} from 'common/Comparator';
import {ImmutableRefObject} from 'common/ReactUtil';
import {Action} from 'components/Action';
import {AppContext} from 'stores/AppContext';

export interface DirectoryPageContext {
    readonly action: Action;
    readonly appContext: AppContext;
    readonly comparator: Comparator;
    readonly decentFile: boolean;
    readonly decentReadmeFile: boolean;
    readonly dropdownContainerRef: ImmutableRefObject<HTMLDivElement | null>;
    readonly showAvailable: boolean;
    readonly showHidden: boolean;
    readonly showLastModified: boolean;
    readonly showMimeType: boolean;
    readonly showSize: boolean;
    readonly showThumbnail: boolean;
    readonly showWaiting: boolean;
    readonly today: string;
}
