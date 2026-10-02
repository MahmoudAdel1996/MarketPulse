import { safeReturnPath } from './return-url';

describe('safeReturnPath', () => {
  it.each(['/alerts', '/watchlists/abc?x=1'])('keeps relative app path %s', (path) => {
    expect(safeReturnPath(path)).toBe(path);
  });

  it.each([null, undefined, '', 'alerts', '//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)'])(
    'rejects %s',
    (value) => {
      expect(safeReturnPath(value)).toBe('/instruments');
    },
  );
});
