import {Spinner} from 'reactstrap';
import './LoadingIndicator.scss';

export function LoadingIndicator(): JSX.Element {
    return (
        <div className='loading-indicator' tabIndex={-1}>
            <div>
                <Spinner color='light' tabIndex={-1} />
            </div>
        </div>
    );
}
