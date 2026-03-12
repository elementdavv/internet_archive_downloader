import { registerFormat, create, defaultLanguage, setDefaultLanguage } from './base.js';
import TTFFont from './TTFFont.js';
// import WOFFFont from './WOFFFont';
// import WOFF2Font from './WOFF2Font';
// import TrueTypeCollection from './TrueTypeCollection';
// import DFont from './DFont';

// Register font formats
registerFormat(TTFFont);
// registerFormat(WOFFFont);
// registerFormat(WOFF2Font);
// registerFormat(TrueTypeCollection);
// registerFormat(DFont);

export * from './base.js';
