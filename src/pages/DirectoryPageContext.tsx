import {ImmutableRefObject} from 'common/ReactUtil';
import {Action} from 'components/Action';
import {AppContext} from 'stores/AppContext';
import {DirectoryPageParameter} from './useDirectoryPageParameter';
import {TagModalControl} from 'components/filter/TagModal';

export interface DirectoryPageContext {
    readonly actionChangeListeners: {
        readonly add: (listener: (nextAction: Action, prevAction: Action) => void) => void;
        readonly remove: (listener: (nextAction: Action, prevAction: Action) => void) => void;
    };
    readonly appContext: AppContext;
    readonly directoryPageParameter: DirectoryPageParameter;
    readonly dropdownContainerRef: ImmutableRefObject<HTMLDivElement | null>;
    readonly setTagModalControl: (control: TagModalControl) => void;
}
