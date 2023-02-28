import {separator} from 'common/Util';
import {SetKeyboardControl} from 'components/keyboard-control/KeyboardControl';
import {AutoResizeTextarea} from 'components/textarea/AutoResizeTextarea';
import {SuggestionControl} from 'components/textarea/RichTextarea';
import {Dispatch, useCallback, useState} from 'react';
import {Button} from 'reactstrap';
import './SearchComponent.scss';

export function SearchComponent({
    setKeyboardControl,
    path,
    setPath,
    spellCheck,
    suggestionControl,
}: {
    readonly setKeyboardControl: SetKeyboardControl;
    readonly path: string;
    readonly setPath: Dispatch<string>;
    readonly spellCheck: boolean;
    readonly suggestionControl: SuggestionControl;
}): JSX.Element {
    const [value, setValue] = useState<string>('#');
    const search = useCallback(() => {
        setPath((path === separator ? '' : path) + value.replaceAll('#', separator));
        setValue('#');
    }, [setPath, path, value]);
    return (
        <div className='search-component'>
            <AutoResizeTextarea
                setKeyboardControl={setKeyboardControl}
                onEnterKeyDown={useCallback(
                    (ev: React.KeyboardEvent) => {
                        ev.preventDefault();
                        search();
                    },
                    [search]
                )}
                spellCheck={spellCheck}
                suggestionControl={suggestionControl}
                textareaClassName='font-monospace ps-2'
                value={value}
                setValue={setValue}
            />
            <Button className='m-1' color='dark' onClick={search}>
                <span className='mdi mdi-magnify' />
            </Button>
        </div>
    );
}
