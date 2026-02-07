> [!WARNING]
> This GitHub repo ([https://github.com/elementdavv/internet_archive_downloader](https://github.com/elementdavv/internet_archive_downloader)) is the only official source of the project. Do not download releases from random websites, even if their name contains ```internet archive downloader```.

# <img src=resources/logo/icons8-export-pdf-90.png width=45> Internet Archive Downloader
In [Internet Archive](https://archive.org), Some books can be borrowed to read online for a limited period. The extension will try to download these books.

In [HathiTrust Digital Library](https://hathitrust.org). books with full view permission is also supported.

The extension works by fetching every leaf of a book, constructing a PDF stream on the fly targeting to disk storage. So it can handle books of thousands of leafs easily with little memory.

## Features
* Download a book as a PDF file with text embedded
* Download a book as a collection of image files (JPEG/PNG) one for each leaf, and the text of the book
* Download multiple books in parallel
* multiple options configurable

## Install manually
Install as the following directions supports automatic updates when new versions are available.

### Chrome extension
* Navigate to [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page, find and download the latest **iadownloader-x.x.x.crx**. It is suggested to dowload it correctly by clicking(or right-clicking) and selecting "save as".
* Drag and Drop the CRX file from file manager to Extensions page on browser (developer mode must be enabled).
* If the extension is installed but can not be enabled, take the following steps:
    * Windows: Download registry file [windows.reg](https://github.com/elementdavv/internet_archive_downloader/releases/download/v1.0.0/windows.reg). Double click to run it. The file will allow Internet Archive Downloader extension CRX file to install in Chrome, Edge, Brave and Vivaldi browser.
    * MacOS: Download policy file for [Chrome](https://github.com/elementdavv/internet_archive_downloader/releases/download/v1.0.0/com.google.Chrome.mobileconfig) / [Edge](https://github.com/elementdavv/internet_archive_downloader/releases/download/v1.0.0/com.microsoft.Edge.mobileconfig) / [Brave](https://github.com/elementdavv/internet_archive_downloader/releases/download/v1.0.0/com.brave.Browser.mobileconfig). Double click to run it. Then from System Preferences (or System Settings) find the item of "Profile" (it may be in current page, or inside "General", "Security and Privacy" item, dependent of MacOS version). In the "Profile" setting page, click "install" button to activate it. The profiles will allow Internet Archive Downloader extension CRX file to install in Chrome, Edge and Brave browser.

### Edge extension
* Navigate to [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page, find and download the latest **iadownloader-edge-x.x.x.crx**.
* Drag and Drop the CRX file from file manager to Extensions page on Edge (developer mode must be enabled).

### Firefox extension
* Run Firefox, navigate to [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page, find and click the latest **iadownloader-x.x.x.xpi** to install.

## Install from browser repository
- [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/internet-archive-download/cnpoedgimjaecinmgfnfhfmcpcngeeje)
- [Mozilla Addons (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/internet_archive_downloader/)

## Configuration
- For Firefox, permissions of access to related websites must be granted in the "Permissions" tab within the extension detail page.

- Click the extension button on browser toolbar to open settings page. Configurable options include quality level, getting PDF or ZIP, preseting download range, whether to return book upon download completes etc. Hover mouse on information icon to the right of each item name to see its explanation. All changes will be applied to next download job. Old style Ctrl/Alt + Click combinations still work as ever.

  <image src="resources/capture/settings.png">

## Usage
### Internet Archive:
In [archive.org](https://archive.org), the availability of books lies in three categories:
1) Lending Library
2) Borrow 14 days
3) Always Available

The extension works with category 1 and 2.

After borrowing a book, two new buttons, "Quality" and "Download", appear under the book viewer alongside the "Favorite" button. 

On rare occasions where the buttons did not appear upon page loaded, click the extension button on browser toolbar to open settings page and click "Show Buttons".

<image src="resources/capture/borrow1.png">

* To get the current book as a PDF file, press the "Download" button.
* To get each leaf as a JPEG file, press the "Download" button while holding Ctrl key (Command key on Mac).
* To get only a range of leafs, press the "Download" button while holding Alt key (Option key on Mac), then input a range.

<image src="resources/capture/download1.png">

### HathiTrust:
No login, no borrows required. In [hathitrust.org](https://hathitrust.org), for books with full view permission, a new section, "Ayesha", appears above the "Download" section on the left-hand side of the page. The section contains three buttons, "Quality", "Tasks" and "Download".

<image src="resources/capture/borrow2.png">

* To get the current book as a PDF file, press the "Download" button.
* To get each leaf as a JPEG/PNG file, press the "Download" button while holding Ctrl key (Command key on Mac).
* To get only a range of leafs, press the "Download" button while holding Alt key (Option key on Mac), then input a range.

<image src="resources/capture/download2.png">

The download job may take a break at each around 100 pages due to server restriction, just wait and continue.

## Introduction in Youtube
[![Internet Archive Downloader](https://img.youtube.com/vi/SL4hbCKxl58/0.jpg)](https://www.youtube.com/watch?v=SL4hbCKxl58)

## Availability
* Chromium family (Chromium, Chrome, Edge, Brave, Vivaldi, Opera, Yandex, Kiwi, etc) version 90+ supported
* Firefox version 115+ supported

## Privacy
Please read carefully the [Extension Privacy Policy](Privacy.md).

## Maintenance Note (Fork)
This version is a **fork** of the original project, maintained to fix issues with modern Archive.org (2024+) architecture, Shadow DOM encapsulation, and performance bottlenecks. All original copyright notices are preserved as per [AGPLv3](LICENSE).

## Disclaimer & Legal Notice
**IMPORTANT: Read carefully before use.**

This project is provided for **educational and research purposes only**. 
1. **As-Is Basis**: In accordance with **AGPLv3 Section 15**, this program is distributed in the hope that it will be useful, but **WITHOUT ANY WARRANTY**; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
2. **Limitation of Liability**: As per **AGPLv3 Section 16**, the authors or copyright holders shall NOT be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software. This includes, but is not limited to, data loss, account suspension, or legal consequences resulting from the use of this tool on third-party platforms.
3. **Usage Restrictions**: Use of this tool must comply with the Terms of Service of Archive.org and HathiTrust. Downloading borrowed books may be subject to platform-specific restrictions. Users assume all responsibility for compliance with local and international laws.
4. **No Redistribution**: Users are strictly prohibited from redistributing copyrighted material downloaded using this tool.

## Credits
- [PDFKit](https://github.com/foliojs/pdfkit) for PDF generation
- [StreamSaver.js](https://github.com/jimmywarting/streamsaver.js) for filesystem stream creation and ZIP generation
- [web-streams-polyfill](https://github.com/MattiasBuelens/web-streams-polyfill) for web stream writing
- [CryptoES](https://github.com/entronad/crypto-es) for PDF ID generation
- [png.js](https://github.com/foliojs/png.js) for PNG image parsing
- [pako](https://github.com/nodeca/pako) for some string utilities
 
## Sharing & Redistribution
This project is open-source under the AGPLv3 license. You are free to share, fork, and redistribute this software, provided that:
1. The **AGPLv3 license** is preserved.
2. The **source code remains accessible** to anyone you share the extension with (this GitHub fork fulfills this requirement).
3. All **original copyright notices** and modification logs are kept intact.

## Contributions (Pull Requests)
If you wish to contribute to the original project:
- You can submit a **Pull Request (PR)** to the [upstream repository](https://github.com/elementdavv/internet_archive_downloader).
- Once a PR is merged, you officially become a **Contributor**.
- By submitting a PR, you agree that your contributions are licensed under the same AGPLv3 terms as the original project.

## Contacts
- Email: elementdavv@hotmail.com
- Telegram: [@elementdavv](https://t.me/elementdavv)
- X(Twitter): [@elementdavv](https://x.com/elementdavv)

## Support
If you love the downloader, consider supporting or hiring the maintainer [@elementdavv](https://x.com/elementdavv) [![donate](resources/logo/paypal-logo.png)](https://paypal.me/timelegend)
