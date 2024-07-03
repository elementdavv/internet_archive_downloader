# Internet Archive Downloader

[Internet Archive](https://archive.org) holds more than 34 millions books. Some books are permitted to read online by borrowing for a limit period. With the extension, the borrowed books can be downloaded for offline reading.

[HathiTrust Digital Library](https://hathitrust.org) is also supported. All books with full view permission can be downloaded.

The extension works by fetching every leaf of a book, constructing a PDF stream on the fly targeting to disk storage. So it consumes only a little RAM resource and can handle books of thousands of leafs easily.

## Features
* Download a book as a PDF file
* Download a book as a collection of image files (JPEG/PNG) one for each leaf
* Optional leaf range
* Optional leaf quality
* Download multiple books in parallel

## Install
For Chrome, Edge, Brave, etc:
* Grab the latest package (.crx) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* Drop the package from file manager to Extension Manager page on your browser (developer mode must be enabled).

For Firefox:
* Grab the latest package (.xpi) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* Drop the package from file manager to Extensions page on your browser.
* Grant all Optional permissions in the Permissions tab of the extension detail page.

Alternatively, install automatically from their repositories:
- [Chrome WebStore](https://chrome.google.com/webstore/detail/internet-archive-download/keimonnoakgkpnifppoomfdlkadghkjb)
- [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/internet-archive-download/cnpoedgimjaecinmgfnfhfmcpcngeeje)
- [Mozilla Addons (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/internet_archive_downloader/) (All Optional permissions must be granted as well)

## Usage
### Internet Archive:
In [archive.org](https://archive.org), the availability of books lies in three categories:
1) Lending Library
2) Borrow 14 days
3) Always Available

The extension works with category 1 and 2.

After borrowing a book, two new buttons, "Quality" and "Download", appear under the book viewer alongside the "Favorite" button. 
<image src="resources/capture/borrow1.png">

* To get the current book as a PDF file, press the "Download" button.
* To get each leaf as a JPEG file, press the "Download" button while holding Ctrl key (Command key on Mac).
* To get only a range of leafs, press the "Download" button while holding Alt key (Option key on Mac), then input a range.

<image src="resources/capture/download1.png">

After successful downloads, the book will be returned automatically for availability to other users.

### HathiTrust:
No login, no borrows required. In [hathitrust.org](https://hathitrust.org), for books with full view permission, a new section, "Ayesha", appears above the "Download" section on the left-hand side of the page. The section contains three buttons, "Quality", "Tasks" and "Download".
<image src="resources/capture/borrow2.png">

* To get the current book as a PDF file, press the "Download" button.
* To get each leaf as a JPEG/PNG file, press the "Download" button while holding Ctrl key (Command key on Mac).
* To get only a range of leafs, press the "Download" button while holding Alt key (Option key on Mac), then input a range.

<image src="resources/capture/download2.png">

The download process may take some breaks due to server constraints.

## Availability
* Chromium family(Chrome, Edge, Brave, Vivaldi, Opera, Yandex, Kiwi, etc) version 90+ supported
* Firefox version 115+ supported
* For Brave below version 1.67.119, item 'File System Access API' on the 'brave://flags' page should be enabled.

## License
[GPL3](LICENSE) ©Element Davv

Any questions and/or suggestions are appreciatiated.

## Donation
If you found the extension helpful consider supporting me with a coffee <a href='https://www.buymeacoffee.com/timelegend' target='_blank'><img src='resources/logo/bmc-orange.png' style='width:100px;height:28px'></a>.
