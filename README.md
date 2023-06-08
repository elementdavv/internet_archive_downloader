# Internet Archive Downloader

There are many tons of books on Internet Archive(archive.org) available for public. Some books can only be read online by borrowing for a limited period. This extension can download them for later reading.

## Install
For Chrome and Edge:
* Grab the latest version of package(.zip) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* Extract the package somewhere.
* On your browser, open Extension Manager page -> Load unpacked button -> select the extracted directory.

For Firefox:
* Grab the latest version of package(.xpi) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* On your browser, open Addons Manager page -> Extensions menu -> Tools button -> Install Add-on From File -> select the downloaded package.
* Again, Extensions menu -> Internet Archive Downloader -> Permissions -> Optional permissions -> Enable.

Alternatively, install from browser extension repositories(not always up to date):

[Chrome WebStore](https://chrome.google.com/webstore/detail/internet-archive-download/keimonnoakgkpnifppoomfdlkadghkjb) / [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/internet-archive-download/cnpoedgimjaecinmgfnfhfmcpcngeeje) / [Mozilla Addons (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/internet_archive_downloader/)

## Configuration
None.

## Usage
In archive.org, the availability of all books, which mediatype is texts, lies in 3 categaries:
* Lending Library
* Borrow 14 days
* Always Available

The extension works with first two categaries. As to the third one download links are already there.

After borrowing a book, two buttons read "Quality" and "Download" will appear under the book reading window, beside the "Favorite" button. 
<image src="resources/borrow.png">

* To download current book as PDF file, click the "Download" button.
* To download the original JPEG files, click the "Download" button with Ctrl key pressed(Command key on MacOS).

When download begins, the button turns into a progress bar.
<image src="resources/download.png">

There are several levels of page quality available for each book. The extension keeps 4 levels at most. To choose any level, click the stars on the "Quality" button. The more stars the higher quality, the larger file size, and the more time it will take to download.

The default is the highest quality.
<image src="resources/quality.png">

## Availability 
* Tests passed in Chrome, Edge and Firefox on Linux(Ubuntu), Windows and MacOS.
* Other Chromium based browsers(Vivaldi, Brave, etc) / other platforms(Raspian, Jetson, etc) may work or may not.
* For Firefox, version 113 and above are required.

## License
[GPL3](LICENSE) ©Element Davv

Any questions and/or suggestions are appreciatiated.

## Donation
If you would like to support my development, you can donate some coins. [![donate](resources/pp-logo.png)](https://paypal.me/timelegend)
