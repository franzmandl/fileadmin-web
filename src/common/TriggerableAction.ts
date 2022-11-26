import {Action} from 'components/Action';

export interface TriggerableAction {
    readonly triggerAction: (action: Action, handled: () => void) => void;
}
