import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import PDFDocument from '../core/js/pdf/document.js';
import ZIPDocument from '../core/js/zip/document.js';
import ImageDecoder from '../core/js/utils/image_decoder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const defaultUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const defaultConcurrency = 6;

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.url) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  let browserSession = null;
  let writer = null;
  try {
    const detailUrl = normalizeDetailUrl(options.url);
    browserSession = getRequestedBrowserSession(options)
      ? await loadBrowserArchiveSession(getRequestedBrowserSession(options), detailUrl, options.braveProfile ?? options.browserProfile ?? 'Default')
      : null;
    const headers = await buildHeaders(options, browserSession);

    console.log(`Loading ${detailUrl}`);
    let br = browserSession?.br;
    if (!br) {
      const detailHtml = await fetchText(detailUrl, headers);
      const jsiaUrl = extractJsiaUrl(detailHtml);
      const payload = JSON.parse(await fetchText(jsiaUrl, headers));
      br = payload?.data?.brOptions;
    }

    if (!br?.bookId || !Array.isArray(br.data)) {
      throw new Error('Could not extract BookReader metadata from the page.');
    }

    const pages = br.data.flat();
    if (pages.length === 0) {
      throw new Error('The item did not expose any page images.');
    }
    assertFullBookReaderAccess(br, pages);

    const pageCount = pages.length;
    const start = clampInt(options.start ?? 1, 1, pageCount);
    const end = clampInt(options.end ?? pageCount, start, pageCount);
    const scale = clampInt(options.scale ?? 1, 1, 32);
    const concurrency = clampInt(options.concurrency ?? defaultConcurrency, 1, 32);
    const format = options.zip ? 'zip' : 'pdf';
    const outputPath = path.resolve(options.output ?? buildDefaultName(br.bookId, scale, start, end, pageCount, format));

    console.log(`Book: ${br.bookTitle ?? br.bookId}`);
    console.log(`Pages: ${start}-${end} of ${pageCount}`);
    console.log(`Format: ${format.toUpperCase()}  Scale: ${scale}  Workers: ${concurrency}`);
    console.log(`Output: ${outputPath}`);

    writer = new FileWriter(outputPath);
    const doc = await createDocument(writer, format, br, end - start + 1);
    const jobs = [];

    for (let pageNumber = start; pageNumber <= end; pageNumber++) {
      const sourceIndex = pageNumber - 1;
      const selectedIndex = pageNumber - start;
      const page = pages[sourceIndex];
      jobs.push({
        sourceIndex,
        selectedIndex,
        pageNumber,
        page,
      });
    }

    let completed = 0;
    await runPool(jobs, concurrency, async job => {
      const buffer = await fetchArchivePage(job.page, scale, headers, browserSession);
      const view = new DataView(buffer);

      if (format === 'zip') {
        const name = `${sanitizeName(br.bookId)}_${String(job.pageNumber).padStart(4, '0')}`;
        doc.image({ view, name });
      } else {
        doc.image(view, null, {
          pageindex: job.selectedIndex,
          x: 0,
          y: 0,
          width: Math.ceil(job.page.width / scale),
          height: Math.ceil(job.page.height / scale),
        });
      }

      completed += 1;
      console.log(`[${completed}/${jobs.length}] page ${job.pageNumber}`);
    });

    doc.end();
    await writer.close();
  } catch (error) {
    await writer?.abort();
    throw error;
  } finally {
    await browserSession?.close();
  }

  console.log('Done');
}

function parseArgs(argv) {
  const options = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--zip':
        options.zip = true;
        break;
      case '--pdf':
        options.zip = false;
        break;
      case '--url':
        options.url = argv[++i];
        break;
      case '--output':
      case '-o':
        options.output = argv[++i];
        break;
      case '--start':
        options.start = parseNumberArg(arg, argv[++i]);
        break;
      case '--end':
        options.end = parseNumberArg(arg, argv[++i]);
        break;
      case '--scale':
        options.scale = parseNumberArg(arg, argv[++i]);
        break;
      case '--concurrency':
      case '--workers':
        options.concurrency = parseNumberArg(arg, argv[++i]);
        break;
      case '--cookie':
        options.cookie = argv[++i];
        break;
      case '--cookie-file':
        options.cookieFile = argv[++i];
        break;
      case '--cookies-from-brave':
        options.cookiesFromBrave = true;
        break;
      case '--cookies-from-edge':
        options.cookiesFromEdge = true;
        break;
      case '--brave-profile':
        options.braveProfile = argv[++i];
        break;
      case '--browser-profile':
        options.browserProfile = argv[++i];
        break;
      default:
        if (!arg.startsWith('-') && !options.url) {
          options.url = arg;
        } else {
          throw new Error(`Unknown argument: ${arg}`);
        }
        break;
    }
  }

  return options;
}

function parseNumberArg(flag, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number after ${flag}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage:
  iad.cmd <archive.org/details/...> [options]
  node cli/archive-cli.mjs <archive.org/details/...> [options]

Options:
  --pdf                 Write a PDF file (default)
  --zip                 Write a ZIP of page images
  --start <n>           First page number (1-based)
  --end <n>             Last page number
  --scale <n>           Archive.org scale divisor, e.g. 1, 2, 4
  --workers <n>         Parallel page fetches (default: 6)
  --output, -o <path>   Output path
  --cookie <value>      Raw Cookie header for borrowed books
  --cookie-file <path>  Read Cookie header value from a file
  --cookies-from-brave  Read archive.org cookies from your Brave profile
  --cookies-from-edge   Read archive.org cookies from your Edge profile
  --brave-profile <p>   Brave profile name, default: Default
  --browser-profile <p> Browser profile name, default: Default
  --help, -h            Show this help

Examples:
  iad.cmd https://archive.org/details/victorygirls00unit
  iad.cmd https://archive.org/details/victorygirls00unit --start 1 --end 10 --scale 2
  iad.cmd https://archive.org/details/some_borrowed_book --cookie-file cookies.txt`);
}

async function buildHeaders(options, browserSession = null) {
  const headers = {
    'user-agent': defaultUserAgent,
    accept: '*/*',
  };

  let cookie = options.cookie;
  if (!cookie && options.cookieFile) {
    cookie = (await fsp.readFile(path.resolve(options.cookieFile), 'utf8')).trim();
  }
  if (!cookie && options.cookiesFromBrave) {
    cookie = browserSession?.cookieHeader ?? null;
  }
  if (!cookie && options.cookiesFromEdge) {
    cookie = browserSession?.cookieHeader ?? null;
  }
  if (cookie) {
    headers.cookie = cookie;
  }

  return headers;
}

function assertFullBookReaderAccess(br, pages) {
  const previewPages = pages.filter(page => typeof page.uri === 'string' && page.uri.includes('BookReaderPreview.php'));
  const unviewablePages = pages.filter(page => page.viewable === false);

  if (br.protected && (previewPages.length > 0 || unviewablePages.length > 0)) {
    throw new Error(
      'Archive.org is returning preview-only BookReader data for this session. ' +
      'Open the item in the same browser/profile, borrow it there, then rerun the downloader with the matching browser cookie option.'
    );
  }
}

function getRequestedBrowserSession(options) {
  if (options.cookiesFromBrave && options.cookiesFromEdge) {
    throw new Error('Choose only one browser cookie source.');
  }
  if (options.cookiesFromBrave) {
    return 'brave';
  }
  if (options.cookiesFromEdge) {
    return 'edge';
  }
  return null;
}

async function loadBrowserArchiveSession(browserName, detailUrl, profileName) {
  const browser = findBrowserInstall(browserName);
  if (isProcessRunning(browser.processName)) {
    throw new Error(`Could not read cookies from ${browser.displayName}. Close ${browser.displayName} first, then retry.`);
  }

  const debugPort = browser.debugPort;
  const args = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${browser.userDataDir}`,
    `--profile-directory=${profileName}`,
    '--no-first-run',
    '--no-default-browser-check',
    detailUrl,
  ];
  const child = spawn(browser.exePath, args, {
    detached: false,
    stdio: 'ignore',
    windowsHide: true,
  });
  let pageCdp = null;
  let browserCdp = null;

  try {
    const version = await waitForJson(`http://127.0.0.1:${debugPort}/json/version`, 15000);
    const pageTarget = await waitForPageTarget(debugPort, detailUrl, 15000);
    pageCdp = createCdpClient(pageTarget.webSocketDebuggerUrl);
    browserCdp = createCdpClient(version.webSocketDebuggerUrl);

    await pageCdp.connect();
    await browserCdp.connect();
    await pageCdp.send('Runtime.enable');

    const brJson = await waitForWindowBr(pageCdp, 180000);
    const cookiesResult = await browserCdp.send('Storage.getCookies');
    const header = buildCookieHeader(cookiesResult.cookies ?? [], 'archive.org');
    const br = JSON.parse(brJson);

    if (!header) {
      throw new Error(`No archive.org cookies were found in ${browser.displayName} profile "${profileName}".`);
    }
    if (!br?.bookId || !Array.isArray(br.data)) {
      throw new Error(`Could not read authenticated BookReader data from ${browser.displayName}.`);
    }

    return {
      cookieHeader: header,
      br,
      fetchResource: url => fetchResourceInBrowser(pageCdp, url),
      async close() {
        try {
          await browserCdp.send('Browser.close');
        } catch (_) {
          child.kill();
        } finally {
          pageCdp.close();
          browserCdp.close();
        }
      },
    };
  } catch (error) {
    pageCdp?.close();
    browserCdp?.close();
    child.kill();
    throw error;
  }
}

function isProcessRunning(imageName) {
  const result = spawnSync('tasklist', ['/FI', `IMAGENAME eq ${imageName}`], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0 && result.stdout.toLowerCase().includes(imageName.toLowerCase());
}

function findBrowserInstall(browserName) {
  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env['PROGRAMFILES'];
  const programFilesX86 = process.env['PROGRAMFILES(X86)'];
  const configs = {
    brave: {
      displayName: 'Brave',
      processName: 'brave.exe',
      exeName: 'brave.exe',
      debugPort: 9223,
      installParts: ['BraveSoftware', 'Brave-Browser', 'Application'],
      userDataParts: ['BraveSoftware', 'Brave-Browser', 'User Data'],
    },
    edge: {
      displayName: 'Edge',
      processName: 'msedge.exe',
      exeName: 'msedge.exe',
      debugPort: 9224,
      installParts: ['Microsoft', 'Edge', 'Application'],
      userDataParts: ['Microsoft', 'Edge', 'User Data'],
    },
  };
  const config = configs[browserName];
  if (!config) {
    throw new Error(`Unsupported browser: ${browserName}`);
  }
  const candidates = [programFiles, programFilesX86, localAppData]
    .filter(Boolean)
    .map(root => path.join(root, ...config.installParts, config.exeName));

  const exePath = candidates.find(candidate => fs.existsSync(candidate));
  if (!exePath) {
    throw new Error(`Could not find ${config.displayName} installation.`);
  }

  const userDataDir = path.join(localAppData ?? '', ...config.userDataParts);
  if (!fs.existsSync(userDataDir)) {
    throw new Error(`Could not find ${config.displayName} user data directory.`);
  }

  return { ...config, exePath, userDataDir };
}

async function waitForJson(url, timeoutMs) {
  const started = Date.now();
  let lastError;

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }

  throw new Error(`Browser did not expose its debugging endpoint in time. ${lastError?.message ?? ''}`.trim());
}

async function waitForPageTarget(debugPort, detailUrl, timeoutMs) {
  const started = Date.now();
  const targetUrl = detailUrl.replace(/\/$/, '');

  while (Date.now() - started < timeoutMs) {
    const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`, 5000);
    const page = targets.find(target => target.type === 'page' && target.url.replace(/\/$/, '') === targetUrl);
    if (page?.webSocketDebuggerUrl) {
      return page;
    }
    await sleep(250);
  }

  throw new Error('Browser opened, but the archive.org page target was not available in time.');
}

async function waitForWindowBr(cdp, timeoutMs) {
  const started = Date.now();
  let waitingForLoan = false;
  const expression = `
    (() => {
      if (!window.br) return null;
      if (window.br.protected && !window.br.options?.lendingInfo?.loanId) return "__NOT_BORROWED__";
      return JSON.stringify({
        reductionFactors: window.br.reductionFactors,
        bookId: window.br.bookId,
        bookTitle: window.br.bookTitle,
        bookPath: window.br.bookPath,
        server: window.br.server,
        data: window.br.data.flat(),
        protected: window.br.protected
      });
    })()
  `;

  while (Date.now() - started < timeoutMs) {
    const result = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    const value = result.result?.value;

    if (value === '__NOT_BORROWED__') {
      if (!waitingForLoan) {
        console.log('Waiting for an active loan in the opened browser window. Borrow the book there if it is not already borrowed.');
        waitingForLoan = true;
      }
      await sleep(1000);
      continue;
    }
    if (typeof value === 'string' && value.startsWith('{')) {
      return value;
    }
    await sleep(500);
  }

  throw new Error('Timed out waiting for authenticated BookReader data from the browser.');
}

async function fetchResourceInBrowser(cdp, url) {
  const expression = `
    (async () => {
      const response = await fetch(${JSON.stringify(url)}, { credentials: 'include' });
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Array.from(response.headers.entries()),
        base64: btoa(binary),
      };
    })()
  `;
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(`Browser fetch failed for ${url}`);
  }

  const value = result.result?.value;
  if (!value) {
    throw new Error(`Browser fetch returned no data for ${url}`);
  }

  const bytes = Buffer.from(value.base64 ?? '', 'base64');
  return {
    ok: value.ok,
    status: value.status,
    statusText: value.statusText,
    url: value.url,
    headers: new Map(value.headers ?? []),
    buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

function createCdpClient(webSocketDebuggerUrl) {
  const pending = new Map();
  let seq = 0;
  let ws;

  return {
    connect() {
      return new Promise((resolve, reject) => {
        ws = new WebSocket(webSocketDebuggerUrl);
        ws.addEventListener('open', () => resolve());
        ws.addEventListener('message', event => {
          const message = JSON.parse(event.data);
          if (!message.id) {
            return;
          }
          const entry = pending.get(message.id);
          if (!entry) {
            return;
          }
          pending.delete(message.id);
          if (message.error) {
            entry.reject(new Error(message.error.message ?? 'CDP error'));
          } else {
            entry.resolve(message.result ?? {});
          }
        });
        ws.addEventListener('error', event => {
          reject(new Error(`CDP connection failed: ${event.message ?? 'unknown error'}`));
        });
      });
    },
    send(method, params = {}) {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      if (ws && ws.readyState < 2) {
        ws.close();
      }
    },
  };
}

function buildCookieHeader(cookies, domain) {
  const deduped = new Map();

  for (const cookie of cookies) {
    if (cookie.domain !== domain && cookie.domain !== `.${domain}`) {
      continue;
    }
    deduped.set(cookie.name, cookie.value);
  }

  return Array.from(deduped.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeDetailUrl(input) {
  const url = new URL(input.startsWith('http') ? input : `https://${input}`);
  if (url.hostname !== 'archive.org') {
    throw new Error('This local runner currently supports archive.org detail pages only.');
  }
  if (!url.pathname.startsWith('/details/')) {
    throw new Error('Pass an archive.org details URL, for example https://archive.org/details/<identifier>.');
  }
  url.search = '';
  url.hash = '';
  return url.toString();
}

async function fetchText(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} for ${url}`);
  }
  return await response.text();
}

function extractJsiaUrl(html) {
  const match = html.match(/"url":"(\/\/[^"]*BookReaderJSIA\.php[^"]*)"/);
  if (!match) {
    throw new Error('Could not find the BookReader bootstrap URL in the details page.');
  }

  let raw = match[1]
    .replaceAll('\\/', '/')
    .replaceAll('\\u0026', '&');

  if (raw.startsWith('//')) {
    raw = `https:${raw}`;
  }
  raw = raw.replace('format=jsonp', 'format=json');
  return raw;
}

function buildDefaultName(bookId, scale, start, end, pageCount, format) {
  let name = `${sanitizeName(bookId)}_${scale}`;
  if (start !== 1 || end !== pageCount) {
    name += `_${start}_${end}`;
  }
  return `${name}.${format}`;
}

async function createDocument(writer, format, br, pagecount) {
  if (format === 'zip') {
    return new ZIPDocument(writer);
  }

  const fontPath = path.join(repoRoot, 'core', 'js', 'pdf', 'font', 'data', 'Georgia.afm');
  const fontdata = await fsp.readFile(fontPath, 'utf8');
  const info = {
    Title: br.bookTitle ?? br.bookId,
    Application: 'Internet Archive Downloader CLI',
  };

  return new PDFDocument(writer, {
    pagecount,
    info,
    font: 'Times-Roman',
    fontdata,
  });
}

async function fetchArchivePage(page, scale, headers, browserSession = null) {
  let url = page.uri;
  url += url.includes('?') ? '&' : '?';
  url += `scale=${scale}&rotate=0`;

  if (browserSession?.fetchResource) {
    const browserResponse = await browserSession.fetchResource(url);
    if (!browserResponse.ok) {
      throw new Error(`Page fetch failed: ${browserResponse.status} ${browserResponse.statusText} for ${url}`);
    }
    return await ImageDecoder.decodeArchiveImage({
      arrayBuffer: async () => browserResponse.buffer,
      headers: {
        get: name => browserResponse.headers.get(name.toLowerCase()) ?? browserResponse.headers.get(name) ?? null,
      },
      url: browserResponse.url,
    });
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Page fetch failed: ${response.status} ${response.statusText} for ${url}`);
  }
  return await ImageDecoder.decodeArchiveImage(response);
}

async function runPool(items, concurrency, worker) {
  let nextIndex = 0;

  async function runOne() {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) {
        return;
      }
      await worker(items[current]);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runOne()));
}

function sanitizeName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function clampInt(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

class FileWriter {
  constructor(filePath) {
    this.filePath = filePath;
    this.stream = fs.createWriteStream(filePath);
    this.ready = Promise.resolve();
    this.queue = Promise.resolve();
  }

  write(chunk) {
    this.queue = this.queue.then(() => this.writeNow(chunk));
    return this.queue;
  }

  writeNow(chunk) {
    return new Promise((resolve, reject) => {
      const onError = error => {
        cleanup();
        reject(error);
      };
      const onDrain = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        this.stream.off('error', onError);
        this.stream.off('drain', onDrain);
      };

      this.stream.once('error', onError);
      const writable = this.stream.write(chunk, error => {
        if (error) {
          cleanup();
          reject(error);
        } else if (writable) {
          cleanup();
          resolve();
        }
      });

      if (!writable) {
        this.stream.once('drain', onDrain);
      }
    });
  }

  async close() {
    await this.queue;
    return new Promise((resolve, reject) => {
      this.stream.end(error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async abort() {
    this.stream.destroy();
    await fsp.rm(this.filePath, { force: true });
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
