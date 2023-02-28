import {getName} from 'common/Util';
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

    it('getname', async () => {
        expect(getName('name')).toEqual('name');
        expect(getName('/name')).toEqual('name');
        expect(getName('/')).toEqual('');
        expect(getName('path/name')).toEqual('name');
        expect(getName('/path/name')).toEqual('name');
    });
});
