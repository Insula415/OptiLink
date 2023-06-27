import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import chalk from 'chalk';
import minimist from 'minimist';
import axios from 'axios';
import cheerio from 'cheerio';
import { URL } from 'url';


// Function to print text in red color
function printRed(text) {
  console.log('\x1b[31m%s\x1b[0m', text);
}

// Function to print text in green color
function printGreen(text) {
  console.log('\x1b[32m%s\x1b[0m', text);
}

// Function to print text in orange color
function printOrange(text) {
  console.log('\x1b[33m%s\x1b[0m', text);
}

// Function to create a loader-like progress indicator
function createLoader(message) {
  const frames = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
  let currentFrame = 0;

  return setInterval(() => {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(frames[currentFrame] + ' ' + message);
    currentFrame = (currentFrame + 1) % frames.length;
  }, 100);
}

// Function to check if a URL is internal or external
function isInternalUrl(baseUrl, link) {
  const base = new URL(baseUrl);
  const target = new URL(link, baseUrl);
  return base.hostname === target.hostname;
}

// Function to scan a website for broken URLs
async function scanWebsite(url) {
  try {
    console.log(" ");
    console.log('\x1b[32m%s\x1b[0m', 'Scanning website:', url);
    console.log(" ");
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const links = $('a[href]')
      .map((_, element) => $(element).attr('href'))
      .get();

    const brokenInternalUrls = [];
    const brokenExternalUrls = [];

    let loader = createLoader('Checking links... ');

    for (const link of links) {
      if (!link.startsWith('#') && !link.startsWith('mailto:')) {
        const targetUrl = new URL(link, url).href;
        if (!isInternalUrl(url, targetUrl)) {
          try {
            await axios.get(targetUrl);
          } catch (error) {
            brokenExternalUrls.push(targetUrl);
          }
        }
      }
    }

    clearInterval(loader);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write('\r' + '✓ Checking external links... Complete!     \n');

    loader = createLoader('Checking links... ');

    for (const link of links) {
      if (!link.startsWith('#') && !link.startsWith('mailto:')) {
        const targetUrl = new URL(link, url).href;
        if (isInternalUrl(url, targetUrl)) {
          try {
            await axios.get(targetUrl);
          } catch (error) {
            brokenInternalUrls.push(targetUrl);
          }
        }
      }
    }

    clearInterval(loader);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write('\r' + '✓ Checking internal links... Complete!     \n\n');

    if (brokenExternalUrls.length > 0) {
      console.log('\x1b[31m%s\x1b[0m', 'Broken external URLs (' + brokenExternalUrls.length + '):');
      brokenExternalUrls.forEach((url) => printRed(url));
    } else {
      console.log('\x1b[32m%s\x1b[0m', 'No broken external links found.');
    }

    // Inside the `scanWebsite` function, after checking broken internal links
    if (brokenInternalUrls.length > 0) {
        console.log('\x1b[31m', 'Broken internal URLs (' + brokenInternalUrls.length + '):');
        brokenInternalUrls.forEach((url) => printRed(url));
    } else {
        console.log('\x1b[32m%s\x1b[0m', 'No broken internal links found.');
    }
    
  } catch (error) {
    console.error('An error occurred while scanning the website:', error);
  }
}

// Command-line arguments
const argv = minimist(process.argv.slice(2));
const websiteUrl = argv._[0];
const showLogs = argv.logs && !argv.linksonly;
const showImprovements = argv.improvements && !argv.linksonly;
const showHelp = argv.help || false;

// Show help and exit if no website URL provided
if (!websiteUrl || showHelp) {
  console.log(`
  Usage: node main.mjs <websiteUrl> [--logs] [--improvements] [--linksonly]
  
  Options:
    --logs          Show Lighthouse console logs (requires --linksonly to be disabled)
    --improvements  Show Lighthouse improvements (requires --linksonly to be disabled)
    --linksonly     Only check broken links without running Google Lighthouse
    --help          Show this help text
  `);
  process.exit(0);
}

// Function to launch Chrome and run Lighthouse
async function launchChromeAndRunLighthouse(url, opts) {
  if (opts.linksonly) {
    return null;
  }

  const chrome = await chromeLauncher.launch({ chromeFlags: opts.chromeFlags });
  opts.port = chrome.port;

  const customOpts = {
    ...opts,
    logLevel: opts.showLogs ? 'info' : 'error', // Show LH:Status logs if `--logs` flag is provided
    output: 'json', // Change output to JSON
    throttlingMethod: 'simulate', // Add this line
  };

  let loader = null;
  if (!showLogs) {
    loader = createLoader('Gathering Google Lighthouse report... ');
  }

  try {
    const results = await lighthouse(url, customOpts);
    if (loader) {
      clearInterval(loader);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write('\r' + '✓ Gathering Google Lighthouse report... Complete!     \n');
    }

    return results;
  } catch (error) {
    if (loader) {
      clearInterval(loader);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write('\r' + '✘ Gathering Google Lighthouse report... Failed!     \n');
    }
    throw error;
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

// Run Google Lighthouse analytics and website scanning
(async () => {
  const lighthouseResults = await launchChromeAndRunLighthouse(websiteUrl, { chromeFlags: ['--headless'], showLogs, linksonly: argv.linksonly });

  if (lighthouseResults) {
    const categories = lighthouseResults.lhr.categories;
    console.log(" ");
    console.log(chalk.green('Performance: ') + chalk.bold((categories['performance'].score * 100).toFixed(2) + '%'));
    console.log(chalk.green('Accessibility: ') + chalk.bold((categories['accessibility'].score * 100).toFixed(2) + '%'));
    console.log(chalk.green('Best Practices: ') + chalk.bold((categories['best-practices'].score * 100).toFixed(2) + '%'));
    console.log(chalk.green('SEO: ') + chalk.bold((categories['seo'].score * 100).toFixed(2) + '%'));
    console.log(chalk.green('Progressive Web App: ') + chalk.bold((categories['pwa'].score * 100).toFixed(2) + '%'));

    if (showImprovements) {
      Object.values(lighthouseResults.lhr.audits).forEach(audit => {
        if (audit.score !== 1) {
          const shortDescription = audit.description.substring(0, 100);  // Truncate to first 100 characters
          console.log(chalk.yellow(`\nImprovement: ${audit.title}\nShort description: ${shortDescription}...\nRead more: ${audit.helpUrl}`));
        }
      });
    }
  }

  scanWebsite(websiteUrl);
})();
