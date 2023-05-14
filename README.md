# Internet Archive downloader

There are many tons of books on Internet Archive(archive.org) available for public. Some books are for borrowing or lending that can only be read online. This extension let you download these books as PDF to read offline.

The extension works by retrieving every page of a book after borrowing and combining them into a file. So it does not break the rules of the website of archive.org. The pages of a book are not processed in memory, instead each page on successful retrieval is feeded immediately to a file stream on local disk. So it can handle files of almost unlimited size with minimal impact on memory.

Note that the extension was only tested on chrome and edge with latest version under Ubuntu, Windows and MacOS. Other chromium based browsers should work on theory but there is no warranty. It does not work on Android and iOS.

## Install
Grab the release zip file, extract it to a directory. Then from your browser(Chrome or Edge), open Extension Manager page, click "Load unpacked" button and select the extracted directory.

Alternatively install it from browser extension repositories(not always up to date):

[Chrome WebStore](https://chrome.google.com/webstore/detail/internet-archive-download/keimonnoakgkpnifppoomfdlkadghkjb) / [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/internet-archive-download/cnpoedgimjaecinmgfnfhfmcpcngeeje)

## Usage
After borrowing or lending a book on archive.org, two new buttons read "Quality" and "Download" will appear under the book reading window, beside the "Favorite" button. 
<image src="resources/borrow.png">

To download the current book, Click the "Download" button, and then the button will turn into a progress bar.
<image src="resources/download.png">

Every book has different page quality levels available. To choose a level, Click the stars on the "Quality" button. The more stars the higher quality, the larger file size, and taking longer to download. The default selection is the highest quality.
<image src="resources/quality.png">

## License
[GPL3](LICENSE) ©Element Davv

Any questions and/or suggestions are appreciatiated.
