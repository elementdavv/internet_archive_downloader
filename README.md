# Internet Archive Downloader

[Internet Archive](https://archive.org) holds more than 34 millions books for free access. Some mean to be read online by borrowing for a limit period. This extension can download these books for later reading.

## Features
* Download a book as a Pdf file
* Download a book as a collection of Jpeg files one for each leaf
* Optional leaf quality
* Download multiple books in parallel

## Install
For Chrome, Edge, etc:
* Grab the latest version of package(.crx) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* Drop the package from file manager to Extension Manager page in your browser(developer mode must be enabled).

For Firefox:
* Grab the latest version of package(.xpi) in the [releases](https://github.com/elementdavv/internet_archive_downloader/releases) page.
* Drop the package from file manager to Extensions page in your browser.
* Grant Optional permissions from Permissions tab on the extension page.

Alternatively, install automatically from their repositories:
- [Chrome WebStore](https://chrome.google.com/webstore/detail/internet-archive-download/keimonnoakgkpnifppoomfdlkadghkjb)
- [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/internet-archive-download/cnpoedgimjaecinmgfnfhfmcpcngeeje)
- [Mozilla Addons (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/internet_archive_downloader/)(Optional permissions must be granted as well)

## Usage
In [Internet Archive](https://archive.org), the availability of books lies in three categories:
1) Lending Library
2) Borrow 14 days
3) Always Available

The extension works with category 1 and 2.

After borrowing a book, two new buttons read "Quality" and "Download" will appear under the book viewer, beside the "Favorite" button. 
<image src="resources/borrow.png">

* To get current book as Pdf file, click the "Download" button.
* To get each leaf as a Jpeg file, click the "Download" button with Ctrl key pressed(Command key on Mac).

With download begins, the button will turn into a progress bar.
<image src="resources/download.png">

There are variant leaf qualities for each book which the extension keeps up to four levels. Click the stars on the "Quality" button to choose one. Default is the best quality(the original image, without scaled down).

When download completes, the book will be returned automatically to make it available to other users. In [Internet Archive](https://archive.org), books are always allowed to loan to limited users, others have to wait.

## Availability
* Chromium family(Chrome, Edge, Brave, Vivaldi, Opera, Yandex, Kiwi, etc) version 90+ supported
* Firefox version 115+ supported
* For Brave, item 'File System Access API' in 'brave://flags' page should be enabled.

## License
[GPL3](LICENSE) ©Element Davv

Any questions and/or suggestions are appreciatiated.

## Supporters
- [Shine Ed](mailto:zero.minute@gmail.com)
- [Guevara Ernesto](mailto:ernieguevara@yahoo.com)

If you found the extension helpful consider supporting me with a coffee. [![donate](resources/pp-logo.png)](https://paypal.me/timelegend)
