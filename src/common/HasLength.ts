import {mod} from './Util';

export interface HasLength {
    readonly length: number;
}

export function addAroundIndex(set: Set<number>, hasLength: HasLength, index: number): ReadonlySet<number> {
    set.add(getPrevIndex(hasLength, index));
    set.add(index);
    set.add(getNextIndex(hasLength, index));
    return set;
}

export function getPrevIndex({length}: HasLength, index: number): number {
    return mod(index - 1, length);
}

export function getNextIndex({length}: HasLength, index: number): number {
    return mod(index + 1, length);
}

export function getRandomIndex({length}: HasLength): number {
    return Math.floor(Math.random() * length);
}
