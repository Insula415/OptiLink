// This can be ran just in the website console.

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
    console.clear(); // Clear the console for a cleaner display
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
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const links = doc.querySelectorAll('a[href]');

    const brokenInternalUrls = [];
    const brokenExternalUrls = [];

    let loader = createLoader('Checking links... ');

    links.forEach((link) => {
      const targetUrl = link.href;
      if (!isInternalUrl(url, targetUrl)) {
        fetch(targetUrl, { method: 'HEAD' })
          .then((response) => {
            if (!response.ok) {
              brokenExternalUrls.push(targetUrl);
            }
          })
          .catch(() => {
            brokenExternalUrls.push(targetUrl);
          });
      }
    });

    clearInterval(loader);
    console.clear();
    console.log('✓ Checking external links... Complete!\n');

    loader = createLoader('Checking links... ');

    links.forEach((link) => {
      const targetUrl = link.href;
      if (isInternalUrl(url, targetUrl)) {
        fetch(targetUrl, { method: 'HEAD' })
          .then((response) => {
            if (!response.ok) {
              brokenInternalUrls.push(targetUrl);
            }
          })
          .catch(() => {
            brokenInternalUrls.push(targetUrl);
          });
      }
    });

    clearInterval(loader);
    console.clear();
    console.log('✓ Checking internal links... Complete!\n');

    if (brokenExternalUrls.length > 0) {
      console.log('\x1b[31m%s\x1b[0m', 'Broken external URLs (' + brokenExternalUrls.length + '):');
      brokenExternalUrls.forEach((url) => printRed(url));
    } else {
      console.log('\x1b[32m%s\x1b[0m', 'No broken external links found.');
    }

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

const websiteUrl = 'YOUR_WEBSITE_URL_HERE'; // Replace with your desired website URL

// Run website scanning
scanWebsite(websiteUrl);
