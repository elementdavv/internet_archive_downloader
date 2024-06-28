# Internet Archive Downloader

[Internet Archive](https://archive.org) holds more than 34 millions books for free access. Some mean to be read online by borrowing for a limit period. This extension can download these books for later reading.

As an addition, [HathiTrust Digital Library](https://hathitrust.org) is supported. All books in it with full view permission can be downloaded at a click.

The extension works by fetching every leaf of a book, constructing a PDF stream on the fly targeting to disk storage. So it consumes only a little RAM resource and can handle books of thousands of leafs easily.

## Features
* Download a book as a PDF file
* Download a book as a collection of image files(JPEG / PNG) one for each leaf
* Optional leaf range
* Optional leaf quality
* Download multiple books in parallel

## Install
For Chrome, Edge, etc:
* Grab the latest version of package(.crx) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* Drop the package from file manager to Extension Manager page in your browser(developer mode must be enabled).

For Firefox:
* Grab the latest version of package(.xpi) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* Drop the package from file manager to Extensions page in your browser.
* Grant all Optional permissions in the Permissions tab of the extension page.

Alternatively, install automatically from their repositories:
- [Chrome WebStore](https://chrome.google.com/webstore/detail/internet-archive-download/keimonnoakgkpnifppoomfdlkadghkjb)
- [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/internet-archive-download/cnpoedgimjaecinmgfnfhfmcpcngeeje)
- [Mozilla Addons (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/internet_archive_downloader/)(All Optional permissions must be granted as well)

## Usage
### Internet Archive:
In [archive.org](https://archive.org), the availability of books lies in three categories:
1) Lending Library
2) Borrow 14 days
3) Always Available

The extension works with category 1 and 2.

After borrowing a book, two new buttons named "Quality" and "Download" will appear under the book viewer, beside the "Favorite" button. 
<image src="resources/capture/borrow1.png">

* To get current book as a PDF file, click the "Download" button.
* To get each leaf as an image file(JPEG), click the "Download" button with Ctrl key pressed(Command key on Mac).
* To get only a range of leafs, click the "Download" button with Alt key pressed (Option key on Mac).

With download begins, the button will turn into a progress bar.
<image src="resources/capture/download1.png">

There are variant leaf qualities for each book which the extension keeps up to four levels. Click the stars on the "Quality" button to choose one. Default is the best quality(the original image, without scaled down).

On download completes, the book will be returned automatically to make it available to other users. In [Internet Archive](https://archive.org), books are always allowed to loan to limited users, others have to wait.

### HathiTrust:
When a book view page of [hathitrust.org](https://hathitrust.org) is loaded, a new section named "Ayesha" will appear above the "Download" section on the left-hand side of the page. Click it to show the download panel. There are three controlls, named "Quality", "Tasks" and "Download".
<image src="resources/capture/borrow2.png">

* To get current book as a PDF file, click the "Download" button.
* To get each leaf as an image file(JPEG / PNG), click the "Download" button with Ctrl key pressed(Command key on Mac).
* To get only a range of leafs, click the "Download" button with Alt key pressed (Option key on Mac).

With download begins, the button will turn into a progress bar.
<image src="resources/capture/download2.png">

As for leaf quality controll "Quality", the first option named "full size" will download every leaf in maximum size, but the size may be much different between each leafs. Other options will download all leafs in almost the same size.

Another controll is "Tasks", by which download task number running synchronously can be designated. HathiTrust server does not allowed frequent access. So the download process have to take some breaks. The extension had managed to minimize the waiting time. Choose a suitable task number to get the best experience.

Even for some books which HathiTrust provides download link, the produced PDF files are very ugly. So it is suggested to bring in the extension as well.

## Availability
* Chromium family(Chrome, Edge, Brave, Vivaldi, Opera, Yandex, Kiwi, etc) version 90+ supported
* Firefox version 115+ supported
* For Brave below version 1.67.119, item 'File System Access API' in 'brave://flags' page should be enabled.

## License
[GPL3](LICENSE) ©Element Davv

Any questions and/or suggestions are appreciatiated.

## Donation
If you found the extension helpful consider supporting me with a coffee <a href='https://www.buymeacoffee.com/timelegend' target='_blank'><img src='resources/logo/bmc-orange.png' style='width:100px;height:28px'></a> or some coins [![donate](resources/logo/paypal-logo.png)](https://paypal.me/timelegend).
