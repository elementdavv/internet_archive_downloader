# Changelog
## v1.2.0
- **Speed Optimization**: Implemented parallel fetching motor using `Promise.all` (Performance increased by 200-300%).
- **Shadow DOM Support**: Added recursive Shadow DOM piercing to support the new Archive.org UI (2024+).
- **Error Resilience**: Added 403 Forbidden resilience for OCR layers (DjVu XML); download continues even if text layer is restricted.
- **Physical Asset Restoration**: Fixed broken symbolic links by migrating core assets directly into the `src` directory.
- **Improved Page Detection**: Support both `property` and `name` attributes for `mediatype` metadata.
## v1.1.0
- add settings page
- improve embeded text appearance
- improve fault tolerance

## v1.0.3
- patch for image encryption
- improve popup menu style

## v1.0.2
- improve compatibility

## v1.0.1
- patch for Firefox 133.0

## v1.0.0
- add support of always available books
- add support of automatic update for the Chrome extension
- add popup menu
- improve robustness in handling invalid text file of book pages
- minimize permissions requirement

## v0.8.0
- Embed text to the produced PDF file.

## v0.7.3
- Bug fix and improvement of range download function.

## v0.7.2
- Add range download support.
- On range download, the range numbers were appended to the default downloaded filename.

## v0.7.0
- Add hathitrust.org support.
- Add PNG image type support.
- Add HTTP 502/504 gateway errors support, when that happened download will retry, not just abort.
- If the buttons does not appear due to slow network, you can show it manually by pressing the extension icon on the browser toolbar after the page being loaded.

## v0.6.3
- Possible download succeeded with 0 byte PDF file for large books. Now fixed.
- For Firefox, minimum version  required is 115 now (for storage.session).
- In Firefox, no response when pressing the 'Download' button after a saveas dialog is canceled. Now fixed.
- In Firefox, zip download function does not work. Now fixed.
- In Firefox, pressing the 'Download' button to cancel a download which has lasted for more than 30 seconds will leave with uncompleted files not cleaned. Now fixed.

## v0.6.2
- Quality code was appended to the default downloaded filename.
- Borrowed books will be returned automatically on successful download for availability to other users.
- In Firefox, if "Always ask you where to save files" on "about:preferences" page was checked, download may fail. Now fixed.

## v0.6.1
- Possible leaf lost caused by unexpected abort. Now fixed.
- In Firefox, pressing the 'Download' button to cancel a download which has lasted for more than 30 seconds will leave with uncompleted files not cleaned. Now fixed.
- For Brave, Whenever the browser is launched, the extension have to be refreshed to work properly. Now fixed.
- In some browsers under incorrect settings, download succeeded but no PDF file found. Now fixed.

## v0.6.0
- Downloads will now retry automatically on network errors. So it will work more smoothly than ever.
- Download process can be aborted at any time. There is no need to wait for cleaning up any more.
- Aborted download can be resumed later.
- Inaccurate button title place. Now fixed.
- More browsers are supported.
- Compatibility improvements.

## v0.5.1
- Update firefox extension to support versions 114+.

## v0.5.0
- Add Firefox extension (for firefox version 113, required by declarativeNetRequest)
- Add option of download as JPEG files

## v0.4.0
- Retrieve leaf info from book structure instead of from book view page, in case it may be incorrect on boundary conditions.
- Add metadata to the produced PDF file.
- Add button title in same style as the page.
- Buttons show up quickly even on slow network now.
- Improve the reliability and stability.

## v0.3.0
- Add option of leaf quality.
- Constraint the download function to the books that can be borrowed, don't interfere with the books of always available.
- Clean uncompleted files on failed/canceled downloads.

## v0.2.0
- Download to a whole PDF book.
- Independant of CORS extension.

## v0.1.0
- Download each leaf to a single JPEG file.
- Dependant on CORS extension.
