# Internet Archive downloader
Internet Archive provides free public access to collections of digitalized materials. Books are for download, borrow or lend. Borrowed books can only be read online within limited time. This chrome extension let you get the book by downloading each page one by one. After that you can use other tool to combine them to one whole book. For example, a tool named "convert" from imagemagic on linux.

## Dependency
Another chrome extension of CORS is required. On my test, "Allow CORS: Access-Control-Allow-Origin" works well. It can be installed from https://microsoftedge.microsoft.com/addons/detail/allow-cors-accesscontro/bhjepjpgngghppolkjdhckmnfphffdag

## Installation
Git clone this repository, then from Extension Manager window in the browser, click "Load unpacked" button and navigate to the repository folder.

## Usage
Set default download folder and make sure any download in the browser does not show "Save as ..." dialog,

Enable the CORS extension with option Access-Control-Allow-Credentials on.

In Internet Archive website, find a book and borrow it, click the extension button from the toolbar. then press "Download" link. The downloads will begin.
