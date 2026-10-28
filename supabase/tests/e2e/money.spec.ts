import { test, expect } from "@playwright/test";
test("shared money control preserves decimal, large, pasted and edited amounts", async ({
  page,
}) => {
  await page.route("**/money-input-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `
    <div id="root"></div><script type="module">
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      const { useState } = React, { createRoot } = ReactDOM;
      import { MoneyInput } from '/components/MoneyInput.tsx';
      function Fixture() {
        const [numeric,setNumeric]=useState(0), [raw,setRaw]=useState('');
        return React.createElement('div',null,
          React.createElement(MoneyInput,{'aria-label':'numeric money',value:numeric,onChange:e=>setNumeric(previous=>Number(e.target.value))}),
          React.createElement('output',{'aria-label':'numeric saved'},String(numeric)),
          React.createElement(MoneyInput,{'aria-label':'exact money',value:raw,onChange:e=>setRaw(e.target.value)}),
          React.createElement('output',{'aria-label':'exact saved'},raw));
      }
      createRoot(document.getElementById('root')).render(React.createElement(Fixture));
    </script>`,
    }),
  );
  await page.goto("/money-input-fixture");
  const numeric = page.getByLabel("numeric money"),
    exact = page.getByLabel("exact money");
  await numeric.fill("");
  await numeric.pressSequentially("12345.67");
  await expect(numeric).toHaveValue("12,345.67");
  await expect(page.getByLabel("numeric saved")).toHaveText("12345.67");
  expect(
    await numeric.evaluate((e: HTMLInputElement) => e.checkValidity()),
  ).toBe(true);
  await exact.fill("۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۳");
  await expect(exact).toHaveValue("9,007,199,254,740,993");
  await expect(page.getByLabel("exact saved")).toHaveText("9007199254740993");
  await exact.fill("1234");
  await exact.press("Home");
  await exact.press("Delete");
  await expect(exact).toHaveValue("234");
  await exact.fill("");
  await expect(page.getByLabel("exact saved")).toHaveText("");
  await exact.fill("12x34");
  await expect(exact).toHaveValue("");
});
