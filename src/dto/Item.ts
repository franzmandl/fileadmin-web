import {Overwrite} from 'common/TsUtil';
import {ItemResult, ItemResultDto, createItemResult} from './ItemResultDto';
import {compareNatural} from 'common/Util';

export interface ItemDto {
    readonly outputPath: string;
    readonly result?: ItemResultDto;
    readonly tags?: ReadonlyArray<string>;
    readonly time?: string;
}

export type Item = Overwrite<
    ItemDto,
    {
        readonly result?: ItemResult;
        readonly timeMilliseconds?: number;
    }
>;

export function createItem(item: ItemDto): Item {
    return {
        ...item,
        result: item.result !== undefined ? createItemResult(item.result) : undefined,
        tags: item.tags !== undefined ? [...item.tags].sort(compareNatural) : undefined,
        timeMilliseconds: item.time !== undefined ? new Date(item.time).getTime() : undefined,
    };
}
