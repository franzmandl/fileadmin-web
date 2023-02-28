export interface Task {
    readonly actions: {readonly [action: string]: string};
    readonly date: string;
    readonly isRepeating: boolean;
    readonly isWaiting: boolean;
    readonly priority: number;
    readonly usesExpression: boolean;
    readonly fileEnding: string;
}
