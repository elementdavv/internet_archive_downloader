# Internet Archive Downloader

There are many tons of books on Internet Archive(archive.org) available for public. Some books can only be read online by borrowing for a limited period. This extension can download these books for later reading.

## Install
For Chrome and Edge:
* Grab the latest version of package(.crx) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* On your browser, drop the package from file manager to Extension Manager page(developer mode must be enabled).

For Firefox:
* Grab the latest version of package(.xpi) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* On your browser, drop the package from file manager to Extensions page.
* Click Internet Archive Downloader extension, from Permissions tab enable Optional permissions.

Alternatively, install automatically from browser extension repositories(not always up to date):

[Chrome WebStore](https://chrome.google.com/webstore/detail/internet-archive-download/keimonnoakgkpnifppoomfdlkadghkjb) / [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/internet-archive-download/cnpoedgimjaecinmgfnfhfmcpcngeeje) / [Mozilla Addons (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/internet_archive_downloader/)

## Configuration
None.

## Usage
In archive.org, the availability of books lies in 3 categaries:
* Lending Library
* Borrow 14 days
* Always Available

The extension works with first two categaries. As to the third download links are already there.

After borrowing a book, two new buttons read "Quality" and "Download" will appear under the book reading window, beside the "Favorite" button. 
<image src="resources/borrow.png">

* To get current book as PDF file, click the "Download" button.
* To get each page as original JPEG file, click the "Download" button with Ctrl key pressed(Command key on MacOS).

With the download begins, the button will turn into a progress bar.
<image src="resources/download.png">

There are several levels of page quality available for each book. The extension keeps 4 levels at most. To choose any level, click the stars on the "Quality" button. The more stars the higher quality, the larger file size, and the more time it will take to download.

Default is the highest quality.
<image src="resources/quality.png">

## Availability 
* Chromium browsers(Chrome, Edge, Opera, Brave, Vivaldi) and Firefox are supported on Linux(Ubuntu), Windows and MacOS.
* With Brave, extra works needed:
 * Enable 'file-system-access-api' from 'brave:flags'
 * After launching Brave, Disable and Enable the extension once
* For Firefox, version 113 and later are required.

## License
[GPL3](LICENSE) ©Element Davv

Any questions and/or suggestions are appreciatiated.

## Donation
If you would like to support my development, you can donate some coins. [![donate](resources/pp-logo.png)](https://paypal.me/timelegend)
