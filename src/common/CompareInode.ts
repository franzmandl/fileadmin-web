import {compareNatural} from './Util';
import {Inode, isSpecial} from 'dto/Inode';
import {Ided} from './Ided';
import {constant} from './constants';

export interface CompareParameter {
    readonly ascending: boolean;
    readonly attributeKey: AttributeKey;
    readonly foldersFirst: boolean;
    readonly priority: boolean;
    readonly specialFirst: boolean;
    readonly time: boolean;
    readonly trim: boolean;
}

export interface ExtendedCompareParameter extends CompareParameter {
    readonly ascendingMultiplier: number;
    readonly compareAttribute: CompareAttribute;
}

export function extendCompareParameter(parameter: CompareParameter): ExtendedCompareParameter {
    return {
        ...parameter,
        ascendingMultiplier: parameter.ascending ? 1 : -1,
        compareAttribute: compareAttribute[parameter.attributeKey],
    };
}

export function compare(
    parameter: ExtendedCompareParameter,
    directory: Inode,
    {data: a}: Ided<Inode, unknown>,
    {data: b}: Ided<Inode, unknown>,
): number {
    return (
        compareSpecialFirst(parameter.specialFirst, a, b) ??
        comparePriorityOfItem(parameter.priority, a, b) ??
        comparePriorityOfTask(parameter.priority, a, b) ??
        compareFoldersFirst(parameter.foldersFirst, a, b) ??
        parameter.compareAttribute(parameter, directory, a, b)
    );
}

function compareSpecialFirst(enable: boolean, a: Inode, b: Inode): number | undefined {
    if (enable) {
        if (isSpecial(a)) {
            if (!isSpecial(b)) {
                return -1;
            }
        } else if (isSpecial(b)) {
            return 1;
        }
    }
}

function compareFoldersFirst(enable: boolean, a: Inode, b: Inode): number | undefined {
    if (enable) {
        if (a.isDirectory) {
            if (!b.isDirectory) {
                return -1;
            }
        } else if (b.isDirectory) {
            return 1;
        }
    }
}

function comparePriorityOfItem(enable: boolean, a: Inode, b: Inode): number | undefined {
    if (enable) {
        if (a.priorityOfItem > b.priorityOfItem) {
            return constant.priorityOfItem.compareMultiplier;
        } else if (a.priorityOfItem < b.priorityOfItem) {
            return -constant.priorityOfItem.compareMultiplier;
        }
    }
}

function comparePriorityOfTask(enable: boolean, a: Inode, b: Inode): number | undefined {
    if (enable) {
        if (a.priorityOfTask > b.priorityOfTask) {
            return constant.priorityOfTask.compareMultiplier;
        } else if (a.priorityOfTask < b.priorityOfTask) {
            return -constant.priorityOfTask.compareMultiplier;
        }
    }
}

export type CompareAttribute = (parameter: ExtendedCompareParameter, directory: Inode, a: Inode, b: Inode) => number;

export enum AttributeKey {
    modified = 'modified',
    name = 'name',
    size = 'size',
}

export const compareAttribute = Object.freeze<Record<AttributeKey, CompareAttribute>>({
    modified: (parameter, directory, a, b) =>
        compareTimeDirectory(parameter, directory, a, b) ??
        compareNumber(a.lastModifiedMilliseconds, b.lastModifiedMilliseconds, parameter.ascendingMultiplier) ??
        0,
    name: (parameter, directory, a, b) =>
        (parameter.time ? compareNumber(a.item?.timeMilliseconds, b.item?.timeMilliseconds, parameter.ascendingMultiplier) : undefined) ??
        compareTimeDirectory(parameter, directory, a, b) ??
        compareNatural(trimName(parameter, a.orderName), trimName(parameter, b.orderName)) * parameter.ascendingMultiplier,
    size: (parameter, directory, a, b) =>
        compareTimeDirectory(parameter, directory, a, b) ?? compareNumber(a.size, b.size, parameter.ascendingMultiplier) ?? 0,
});

function compareNumber(a: number | undefined, b: number | undefined, multiplier: number): number | undefined {
    if (a === b) {
        return;
    } else if (a === undefined) {
        return multiplier;
    } else if (b === undefined || a < b) {
        return -multiplier;
    } else {
        return multiplier;
    }
}

function compareTimeDirectory(parameter: ExtendedCompareParameter, directory: Inode, a: Inode, b: Inode): number | undefined {
    return safeMultiply(compareFoldersFirst(parameter.time && !directory.isTimeDirectory, a, b), 1);
}

function safeMultiply(a: number | undefined, b: number): number | undefined {
    if (a !== undefined) {
        return a * b;
    }
}

function trimName(parameter: ExtendedCompareParameter, name: string): string {
    if (parameter.trim) {
        return name.replace(/^#+/, '');
    } else {
        return name;
    }
}
