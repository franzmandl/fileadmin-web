import {getBasename} from 'common/Util';
import {mount, ReactWrapper} from 'enzyme';
import {App} from './App';

describe('<App/>', () => {
    let component: ReactWrapper;

    beforeEach(async () => {
        component = mount(<App />);
    });

    it('test 1', async () => {
        expect(component).toBeDefined();
    });

    it('test split', async () => {
        expect(''.split('\n')).toHaveLength(1);
        expect(
            ''
                .split('\n')
                .map((value) => value + '\n')
                .join('')
        ).toEqual('\n');
    });

    it('getBasename', async () => {
        expect(getBasename('basename')).toEqual('basename');
        expect(getBasename('/basename')).toEqual('basename');
        expect(getBasename('/')).toEqual('');
        expect(getBasename('path/basename')).toEqual('basename');
        expect(getBasename('/path/basename')).toEqual('basename');
    });
});
