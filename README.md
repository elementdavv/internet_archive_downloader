# Internet Archive downloader

There are many tons of books on Internet Archive(archive.org) available for public. Some books are for borrowing that can only be read online. This extension let you download these books as PDF to read offline.

The extension works by retrieving every page of a book after borrowing and combining them into one file. So it does not break the rules of the website of archive.org. The combining was not processed in memory, instead each page on successful retrieval was feeded to a file stream on local disk immediately. So it can handle files of almost unlimited size with minimal memory impact.

The extension was targeted at Chromium, and tested on Chrome and Edge with nearly latest versions, under Ubuntu 22.04, Windows 11 and MacOS 11.6. Other Chromium based browsers should work theorily but there is no warranty. It does NOT work under Android and iOS.

## Install
Grab the zip file from release page, extract it to a directory. Then from your browser(Chrome or Edge), open Extension Manager page, click "Load unpacked" button and select the extracted directory.

Alternatively, install from browser extension repositories(not always up to date):

[Chrome WebStore](https://chrome.google.com/webstore/detail/internet-archive-download/keimonnoakgkpnifppoomfdlkadghkjb) / [Edge Addons](https://microsoftedge.microsoft.com/addons/detail/internet-archive-download/cnpoedgimjaecinmgfnfhfmcpcngeeje)

## Usage
In archive.org, all books have three types of Availablity:
* Lending Library
* Borrow 14 days
* Always Available

The extension works with first two types.

After borrowing a book, two buttons read "Quality" and "Download" will appear under the book reading window, beside the "Favorite" button. 
<image src="resources/borrow.png">

To download the current book, click the "Download" button, then the button will turn into a progress bar.
<image src="resources/download.png">

Every book has several levels of page quality available. To choose a level, click the stars on the "Quality" button. The more stars the higher quality, the larger file size, and taking longer to download.

The default selection is the highest quality.
<image src="resources/quality.png">

## License
[GPL3](LICENSE) ©Element Davv

Any questions and/or suggestions are appreciatiated.
