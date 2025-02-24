import {Overwrite} from 'common/TsUtil';

export interface ItemResultDto {
    readonly highlightTags: ReadonlyArray<string>;
    readonly priority?: number;
}

export type ItemResult = Overwrite<
    ItemResultDto,
    {
        readonly highlightTagSet: ReadonlySet<string>;
    }
>;

export function createItemResult(itemResult: ItemResultDto): ItemResult {
    return {...itemResult, highlightTagSet: new Set(itemResult.highlightTags)};
}
