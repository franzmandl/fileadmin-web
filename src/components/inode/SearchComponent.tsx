import {resolvePath, separator} from 'common/Util';
import {SetKeyboardControl} from 'components/keyboard-control/KeyboardControl';
import {AutoResizeTextarea} from 'components/textarea/AutoResizeTextarea';
import React, {Dispatch, useState} from 'react';
import {Button} from 'reactstrap';
import './SearchComponent.scss';
import {filterOperatorEvaluate, separatorWordRegex} from 'common/constants';
import {SuggestionStore} from 'stores/useSuggestionStore';

export function SearchComponent({
    setKeyboardControl,
    path,
    setPath,
    spellCheck,
    suggestionStore,
}: {
    readonly setKeyboardControl: SetKeyboardControl;
    readonly path: string;
    readonly setPath: Dispatch<string>;
    readonly spellCheck: boolean;
    readonly suggestionStore: SuggestionStore;
}): React.JSX.Element {
    const suggestionControl = suggestionStore.createSuggestionControl(path, separatorWordRegex);
    const [value, setValue] = useState<string>(separator);
    const search = (appendix: string): void => {
        setPath(resolvePath(path, value.replace(/^\/+|(?<=\/)\/+|\/+$/g, '') + appendix));
        setValue(separator);
    };
    return (
        <div className='search-component'>
            <AutoResizeTextarea
                setKeyboardControl={setKeyboardControl}
                onEnterKeyDown={(ev): void => {
                    ev.preventDefault();
                    search('');
                }}
                spellCheck={spellCheck}
                suggestionControl={suggestionControl}
                textareaClassName='font-monospace ps-2'
                value={value}
                setValue={setValue}
            />
            <Button className='m-1 mdi mdi-play' color='dark' onClick={(): void => search('/,max(/100/)/' + filterOperatorEvaluate)} />
            <Button className='m-1 mdi mdi-tag' color='dark' onClick={(): void => search('')} />
        </div>
    );
}
