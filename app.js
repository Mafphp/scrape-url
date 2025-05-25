const express = require("express");
const app = express();
app.use(express.json());

async function loadAndSplitWeb({ url }) {
  const { connect } = require("puppeteer-real-browser");

  try {
    const { browser, page } = await connect({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      customConfig: {
        executablePath:
          process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
      },
      turnstile: true,
      connectOption: { protocolTimeout: 60000 },
      disableXvfb: false,
      ignoreAllFlags: false,
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "load",
      timeout: 60000,
    });

    const pageContent = await page.evaluate(() => {
      const elementsToRemove = document.querySelectorAll(
        'script, style, noscript, iframe, img, svg, header, footer, nav, [role="banner"], [role="navigation"]'
      );
      elementsToRemove.forEach((el) => el.remove());

      const getTextFromElement = (element) => {
        const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");
        const paragraphs = element.querySelectorAll("p");
        const lists = element.querySelectorAll("ul, ol");
        let text = "";

        const cleanText = (str) =>
          str
            .replace(/\t+/g, " ")
            .replace(/\n+/g, "\n")
            .replace(/ +/g, " ")
            .trim();

        headings.forEach((heading) => {
          text += cleanText(heading.textContent) + "\n";
        });

        paragraphs.forEach((p) => {
          text += cleanText(p.textContent) + "\n\n";
        });

        lists.forEach((list) => {
          const items = list.querySelectorAll("li");
          items.forEach((item) => {
            text += `• ${cleanText(item.textContent)}\n`;
          });
          text += "\n";
        });

        return text.trim();
      };

      const mainContent =
        document.querySelector('main, article, [role="main"]') || document.body;
      return getTextFromElement(mainContent);
    });

    await browser.close();

    return {
      pageContent: pageContent.trim(),
      contentLength: pageContent.length,
      success: pageContent.length > 0,
      timestamp: new Date().toISOString(),
      url,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return {
      pageContent: "",
      contentLength: 0,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      url,
    };
  }
}

app.post("/scrape", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: "Missing required field: url",
    });
  }

  const result = await loadAndSplitWeb({ url });
  res.json(result);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
