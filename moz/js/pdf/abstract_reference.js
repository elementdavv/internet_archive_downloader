/*
 * abstract_reference.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

class PDFAbstractReference {
  toString() {
    throw new Error('Must be implemented by subclasses');
  }
}

export default PDFAbstractReference;
