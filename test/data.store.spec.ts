import { DataStore } from '../src/store/dataSource/data.store';

describe('DataStore pending items', () => {
  it('keeps items hidden while trims and proxy order change', () => {
    const dataStore = new DataStore('rgRow');
    dataStore.updateData([{ id: 1 }, { id: 2 }, { id: 3 }]);

    dataStore.setItemsPending(true);
    dataStore.addTrimmed({ grouping: { 1: true } });
    dataStore.setData({ proxyItems: [2, 0, 1] });

    expect(dataStore.store.get('items')).toEqual([]);

    dataStore.setItemsPending(false);

    expect(dataStore.store.get('items')).toEqual([2, 0]);
  });

  it('keeps a replacement source hidden until pending state is released', () => {
    const dataStore = new DataStore('rgRow');
    dataStore.updateData([{ id: 1 }]);
    dataStore.setItemsPending(true);

    dataStore.updateData([{ id: 2 }, { id: 3 }]);

    expect(dataStore.store.get('items')).toEqual([]);

    dataStore.setItemsPending(false);

    expect(dataStore.store.get('items')).toEqual([0, 1]);
  });
});
