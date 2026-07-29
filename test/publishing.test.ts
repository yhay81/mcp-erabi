import { describe, expect, it } from "vitest";

import packageJson from "../package.json?raw";
import appClient from "../public/app.js?raw";
import robots from "../public/robots.txt?raw";
import sitemap from "../public/sitemap.xml?raw";
import readme from "../README.md?raw";
import product from "../src/config/product.ts?raw";
import wrangler from "../wrangler.jsonc?raw";

describe("publishing contract", () => {
  it("uses the product yhay81.com subdomain as the only production origin", async () => {
    for (const content of [product, wrangler, packageJson, robots, sitemap, readme]) {
      expect(content).toContain("mcp-erabi.yhay81.com");
      expect(content).not.toContain("yusuke8h.workers.dev");
    }
    expect(wrangler).toContain('"workers_dev": false');
    expect(wrangler).toContain('"custom_domain": true');
    expect(wrangler).toContain('"binding": "DB"');
  });

  it("keeps internal and API paths out of crawler discovery", () => {
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Disallow: /internal/");
    expect(sitemap).not.toContain("/api/");
  });

  it("excludes explicit and webdriver QA from product metrics", () => {
    expect(appClient).toContain('get("qa") === "1"');
    expect(appClient).toContain("navigator.webdriver === true");
    expect(appClient).toContain('sessionStorage.setItem(`${storagePrefix}automated-qa`, "1")');
    expect(appClient).toContain('sessionStorage.getItem(`${storagePrefix}automated-qa`) === "1"');
    expect(appClient).toContain("automated: automatedQa");
  });

  it("renders registry metadata without an HTML injection path", () => {
    expect(appClient).not.toContain("innerHTML");
    expect(appClient).not.toContain("insertAdjacentHTML");
    expect(appClient).toContain("textContent");
  });
});
