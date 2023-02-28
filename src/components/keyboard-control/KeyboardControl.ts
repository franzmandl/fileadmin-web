import {Dispatch} from 'react';

export interface KeyboardControl {
    readonly moveCursor: (relativePosition: number) => void;
}

export type SetKeyboardControl = Dispatch<KeyboardControl | undefined>;
