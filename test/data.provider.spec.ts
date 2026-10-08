import { DataProvider } from '../src/services/data.provider';
import DimensionProvider from '../src/services/dimension.provider';
import ViewportProvider from '../src/services/viewport.provider';
import { rowTypes } from '../src/store';

describe('DataProvider.refresh', () => {
  const createProvider = () =>
    new DataProvider(
      new DimensionProvider(new ViewportProvider(), {
        realSizeChanged: jest.fn(),
      }),
    );

  it('refreshes only the requested row type', () => {
    const provider = createProvider();
    const refreshItems = jest
      .spyOn(provider, 'refreshItems')
      .mockImplementation(() => undefined);

    provider.refresh('rowPinStart');

    expect(refreshItems.mock.calls).toEqual([['rowPinStart']]);
  });

  it('refreshes each row type once when refreshing all data', () => {
    const provider = createProvider();
    const refreshItems = jest
      .spyOn(provider, 'refreshItems')
      .mockImplementation(() => undefined);

    provider.refresh('all');

    expect(refreshItems.mock.calls).toEqual(rowTypes.map(type => [type]));
  });
});
