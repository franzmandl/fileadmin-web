import {Overwrite} from 'common/TsUtil';
import {parseDate} from 'common/Util';

export interface TaskDto {
    readonly actions: {readonly [action: string]: string};
    readonly date: string;
    readonly isRepeating: boolean;
    readonly isWaiting: boolean;
    readonly priority?: number;
    readonly usesExpression: boolean;
    readonly fileEnding: string;
}

export type Task = Overwrite<
    TaskDto,
    {
        readonly date: Date;
    }
>;

export function createTask(task: TaskDto): Task {
    const date = parseDate(task.date);
    if (date === undefined) {
        throw Error(`Illegal date '${task.date}'.`);
    }
    return {
        ...task,
        date,
    };
}
