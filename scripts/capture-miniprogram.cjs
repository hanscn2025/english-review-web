const path = require("path");
const automator = require("miniprogram-automator");

async function main() {
  const projectPath = path.resolve(__dirname, "..");
  const miniProgram = await automator.launch({
    cliPath: "/Applications/wechatwebdevtools.app/Contents/MacOS/cli",
    projectPath,
    trustProject: true,
  });
  const allTargets = [
    ["today", "/pages/today/today"],
    ["translate", "/pages/translate/translate"],
    ["books", "/pages/books/books"],
    ["account", "/pages/account/account"],
    ["entry", "/pages/entry/entry"],
    ["review", "/pages/review/review"],
    ["review-history", "/pages/review-history/review-history?tab=history"],
    ["free-review", "/pages/review-history/review-history?tab=free"],
    ["complete", "/pages/complete/complete?count=3"],
  ];
  const requested = process.argv[2];
  const targets = requested ? allTargets.filter(([name]) => name === requested) : allTargets;
  for (const [name, route] of targets) {
    await miniProgram.reLaunch(route);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await miniProgram.currentPage();
    await miniProgram.screenshot({ path: `/private/tmp/dayword-${name}.png` });
    const page = await miniProgram.currentPage();
    if (name === "books") {
      const createBook = await page.$(".create-action");
      if (createBook) {
        await createBook.tap();
        await new Promise((resolve) => setTimeout(resolve, 300));
        await miniProgram.screenshot({ path: "/private/tmp/dayword-books-create.png" });
      }
      const firstBook = await page.$(".book");
      if (firstBook) {
        await firstBook.tap();
        await new Promise((resolve) => setTimeout(resolve, 800));
        await miniProgram.screenshot({ path: "/private/tmp/dayword-book-detail.png" });
      }
    }
    if (name === "entry") {
      await (await page.$(".picker-button")).tap();
      await new Promise((resolve) => setTimeout(resolve, 300));
      await miniProgram.screenshot({ path: "/private/tmp/dayword-entry-sheet.png" });
    }
    if (name === "free-review") {
      const entryId = await page.data("entries[0]._id");
      if (entryId) {
        await miniProgram.reLaunch(`/pages/review/review?practice=1&entryId=${entryId}`);
        await new Promise((resolve) => setTimeout(resolve, 800));
        await miniProgram.screenshot({ path: "/private/tmp/dayword-review-card.png" });
        const reviewPage = await miniProgram.currentPage();
        const reveal = await reviewPage.$(".reveal");
        if (reveal) {
          await reveal.tap();
          await new Promise((resolve) => setTimeout(resolve, 300));
          await miniProgram.screenshot({ path: "/private/tmp/dayword-review-answer.png" });
        }
        await miniProgram.reLaunch(`/pages/review/review?practice=1&entryId=${entryId}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        const directPage = await miniProgram.currentPage();
        const knowNext = await directPage.$(".know-next");
        if (knowNext) {
          await knowNext.tap();
          await new Promise((resolve) => setTimeout(resolve, 1200));
          await miniProgram.screenshot({ path: "/private/tmp/dayword-review-direct-next.png" });
        }
      }
    }
    const selectors = name === "today" ? [".page", ".review-panel", ".start", ".action-grid", ".add-action", ".translate-action"] : name === "books" ? [".page", ".inline-form", ".input", ".inline-form button"] : name === "account" ? [".page", ".profile", ".stats", ".settings"] : [];
    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) console.log(name, selector, await element.size(), { width: await element.style("width"), display: await element.style("display"), padding: await element.style("padding"), margin: await element.style("margin") });
    }
  }
  await miniProgram.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
