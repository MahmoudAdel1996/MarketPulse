import { formatPrice } from './price.pipe';

describe('formatPrice', () => {
  it('keeps tiny prices', () => expect(formatPrice(0.00001734, 'en-US')).toBe('0.00001734'));
  it('pads to two decimals', () => expect(formatPrice(227.1, 'en-US')).toBe('227.10'));
  it('groups thousands', () => expect(formatPrice(62000.5, 'en-US')).toBe('62,000.50'));
  it('renders a dash for missing values', () => expect(formatPrice(null, 'en-US')).toBe('—'));
});
