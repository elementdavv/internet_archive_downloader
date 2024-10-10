# Internet Archive Downloader

In [Internet Archive](https://archive.org), Some books can be borrowed to read online for a limited period. The extension will try to download these books.

In [HathiTrust Digital Library](https://hathitrust.org). books with full view permission is also supported.

The extension works by fetching every leaf of a book, constructing a PDF stream on the fly targeting to disk storage. So it can handle books of thousands of leafs easily with little memory.

## What It Can Do
* Download a book as a PDF file with text embedded
* Download a book as a collection of image files (JPEG/PNG) one for each leaf, and the text of the book
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

Alternatively, install automatically from Browsers repositories:
- Chrome WebStore (Taken down)
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

On successful downloads, the book will be returned automatically for availability to other users.

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

## Disclaimer
The project is for study purpose only. Users should recognize that downloading borrowed limited period books is prohibited. All books downloaded using this project should be deleted within 48 hours. The project is provided on an "as is" basis. Use of the project is at user's own risk. The owner does not guarantee or assume responsibility for any damages to user's computer system, mobile device, loss of data or legal risks that results from using the project.

## License
[AGPL3](LICENSE) ©Element Davv

Any questions and/or suggestions are appreciatiated.

## Donation
If you want to support my work you could donate some coins. [![donate](resources/logo/paypal-logo.png)](https://paypal.me/timelegend)
