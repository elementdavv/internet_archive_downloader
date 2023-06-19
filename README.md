# Internet Archive Downloader

[Internet Archive](https://archive.org) holds more than 34 millions books for free access. Among them some can only be read online by borrowing for a limit period. This extension can download these books for later reading.

## Features
* Download a book as a PDF file
* Download a book as a collection of JPEG files for each page
* Optional page quality
* Concurrent download of multiple books

## Install
For Chrome, Edge, etc:
* Grab the latest version of package(.crx) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* On your browser, drop the package from file manager to Extension Manager page(developer mode must be enabled).

For Firefox:
* Grab the latest version of package(.xpi) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* On your browser, drop the package from file manager to Extensions page.
* Enable Optional permissions from Permissions tab of the extension.

Alternatively, install automatically from browser extension repositories(not always up to date):

[Chrome WebStore](https://chrome.google.com/webstore/detail/internet-archive-download/keimonnoakgkpnifppoomfdlkadghkjb) / [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/internet-archive-download/cnpoedgimjaecinmgfnfhfmcpcngeeje) / [Mozilla Addons (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/internet_archive_downloader/)

## Configuration
None.

## Usage
In [Internet Archive](https://archive.org), the availability of books lies in 3 categaries:
* Lending Library
* Borrow 14 days
* Always Available

The extension works with the first two. As to the third download links are already there.

After borrowing a book, two new buttons read "Quality" and "Download" will appear under the book reading window, beside the "Favorite" button. 
<image src="resources/borrow.png">

* To get current book as PDF file, click the "Download" button.
* To get each page as original JPEG file, click the "Download" button with Ctrl key pressed(Command key on Mac).

With the download begins, the button will turn into a progress bar.
<image src="resources/download.png">

There are variant levels of page quality available for each book. The extension keeps 4 levels at most. To choose any page quality, click the stars on the "Quality" button. The more stars the higher quality, the larger file size, and the more time it will take to download.

Default is the highest quality.
<image src="resources/quality.png">

## Availability 
* Chromium based browsers, Chrome, Edge, Brave, Vivaldi, Yandex, etc supported
* Firefox version 113 and later supported
* With Brave, extra works needed:
  * Enable 'file-system-access-api' item from 'brave://flags'
  * After launching Brave, Disable and enable the extension once
* Kiwi on Android not supported

## License
[GPL3](LICENSE) ©Element Davv

Any questions and/or suggestions are appreciatiated.

## Donation
If you would like to support my development, you can donate some coins. [![donate](resources/pp-logo.png)](https://paypal.me/timelegend)
