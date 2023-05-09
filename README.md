# Internet Archive downloader

There are many tons of books on Internet Archive(archive.org) available for public. Some books are for borrowing or lending that can only be read online. This extension let you download these books as PDF to read offline.

The extension works by retriving every page of a book after borrowing and combining them to a file. So it does not break the rules of the website of archive.org. The pages of a book are not processed in memory, instead each page on successful retrival is feeded to a file stream on local disk. So it can handle almost unlimited size of file with minimal impact on memory.

## Install
Get the release file, unzip to a directory. Then from Extension Manager of Browsers, click "Load unpacked" button and select the extracted directory.

Or install from Browser Extension Repository(not always up to date):

[Chrome WebStore](https://chrome.google.com/webstore/detail/internet-archive-download/keimonnoakgkpnifppoomfdlkadghkjb)

[Microsoft Addons](https://microsoftedge.microsoft.com/addons/detail/internet-archive-download/cnpoedgimjaecinmgfnfhfmcpcngeeje)

## Usage
After borrowing or lending a book on archive.org, two new buttons read "Quality" and "Download" will appear under the book reading window, beside the "Favorite" button. 

To download the current book, Click the "Download" button. With download begins, the button will turn into a progress bar.

Every book has different page quality levels available. To choose a level, Click the stars on the "Quality" button. The more stars the higher quality, and the larger file size, so taking longer to download. The default selection is the highest quality.

After clicking the "borrow for 1 hour" button.

<image src="resources/borrow.png">

When the download begins.

<image src="resources/download.png">

## License
[GPL3](LICENSE) ©Element Davv

Any questions and/or suggestions are appreciatiated.
