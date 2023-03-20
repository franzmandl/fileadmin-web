import {getName} from 'common/Util';

describe('<App/>', () => {
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
