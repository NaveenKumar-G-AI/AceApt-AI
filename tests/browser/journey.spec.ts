import { test, expect } from "@playwright/test";
test('learning domain links refresh a previously selected domain', async ({page}) => {
  await page.goto('/learn?domain=VERBAL');
  await expect(page.getByLabel('Explore a domain')).toHaveValue('VERBAL');
  await page.getByRole('link', {name:'Workspace', exact:true}).click();
  await page.locator('a[href="/learn?domain=QUANTITATIVE"]').click();
  await expect(page.getByLabel('Explore a domain')).toHaveValue('QUANTITATIVE');
});
test('daily path remembers its focus and opens the selected practice', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', {name:'Your adaptive daily path'})).toBeVisible();
  const focus = page.getByLabel('Path focus');
  const selected = await focus.locator('option').last().getAttribute('value');
  await focus.selectOption(selected!);
  await page.reload();
  await expect(page.getByLabel('Path focus')).toHaveValue(selected!);
  await page.locator('.plan-list a').first().click();
  await expect(page.getByLabel('Focus area')).toHaveValue(selected!);
  await page.getByRole('button', {name:'Start session', exact:true}).click();
  await expect(page.getByText('Question 1', {exact:true})).toBeVisible();
});
test('starting a simulation from a topic selection opens its first question', async ({page}) => {
  await page.goto('/skills');
  await page.getByRole('link', {name:'Practise skill'}).first().click();
  await page.getByRole('button', {name:'Exam simulation', exact:false}).click();
  await page.getByRole('button', {name:'Start session', exact:true}).click();
  await expect(page.getByText('Question 1', {exact:true})).toBeVisible();
  await expect(page.getByRole('heading', {name:'A practice session is already open.'})).toHaveCount(0);
});
test('formula recall, mapping, transfer and delayed recall use distinct activities',async({page})=>{
 await page.goto('/learn');await page.getByRole('tab',{name:'Formula lab'}).click();
 await page.getByLabel('Training activity').selectOption('RECALL');
 await page.getByLabel('Your recalled equation').fill('D = T * S');
 await page.getByRole('button',{name:'Check formula & result'}).click();
 await expect(page.getByText('Correct formula and calculation.',{exact:false})).toBeVisible();
 await page.getByLabel('Training activity').selectOption('MAP');
 await page.getByLabel('Value of S',{exact:true}).fill('60');await page.getByLabel('Value of T',{exact:true}).fill('2');
 await page.getByRole('button',{name:'Check formula & result'}).click();
 await expect(page.getByText('mapped to the right variables',{exact:false})).toBeVisible();
 await page.getByLabel('Training activity').selectOption('TRANSFER');
 await page.getByLabel('Your numeric result').fill('30');await page.getByRole('button',{name:'Check formula & result'}).click();
 await expect(page.getByText('90 minutes = 1.5 hours.',{exact:false})).toBeVisible();
 await page.getByLabel('Training activity').selectOption('RETAIN');
 await expect(page.getByText('return at least 24 hours',{exact:false})).toBeVisible();
});
test('saved shortcut drills record real answers and timing',async({page})=>{
 await page.goto('/library');await page.getByLabel('Your expression').fill('x / 4');await page.getByRole('button',{name:'Check against sample values'}).click();await page.getByRole('button',{name:'Save checked method',exact:true}).click();
 await page.clock.install();await page.getByRole('button',{name:'Start method drill',exact:true}).click();
 const prompt=await page.locator('.method-training h3').last().innerText();const base=Number(prompt.match(/x = (\d+)/)?.[1]);expect(base).toBeGreaterThan(0);
 await page.clock.runFor(2000);await page.getByLabel('Calculated result').fill(String(base*.25));await page.getByRole('button',{name:'Record this drill'}).click();
 await expect(page.locator('.method-training')).toContainText('1 baseline successes');
 await page.reload();await expect(page.locator('.method-training')).toContainText('1 baseline successes');
});
test('a requested topic offers a clear switch from the existing session',async({page})=>{
 await page.goto('/practice');await page.getByRole('button',{name:'Start session',exact:true}).click();await page.getByRole('link',{name:'Skill map',exact:true}).click();await page.getByRole('link',{name:'Practise skill'}).first().click();
 await expect(page.getByRole('heading',{name:'A practice session is already open.'})).toBeVisible();await page.getByRole('button',{name:'Start selected session'}).click();await expect(page.getByText('Question 1',{exact:true})).toBeVisible();
});
test("practice time excludes time spent on another screen", async ({
  page,
}) => {
  await page.goto("/practice");
  await page.clock.install();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await page.clock.runFor(1000);
  await page.getByRole("link", { name: "Preferences", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Learning preferences" }),
  ).toBeVisible();
  await page.clock.fastForward(120000);
  await page
    .getByRole("link", { name: "Practice studio", exact: true })
    .click();
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .click();
  const duration = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("aceapt.learning.v1")!).attempts[0]
        .durationMs as number,
  );
  expect(duration).toBeLessThan(10000);
});
test("shortcut validation finds incorrect methods and saves checked methods", async ({
  page,
}) => {
  await page.goto("/library");
  await page.getByLabel("Your expression").fill("x / 5");
  await page
    .getByRole("button", { name: "Check against sample values" })
    .click();
  await expect(
    page.getByText("The methods disagree", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Your expression").fill("x / 4");
  await page
    .getByRole("button", { name: "Check against sample values" })
    .click();
  await expect(
    page.getByText("sampled and boundary values agreed", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save checked method", exact: true })
    .click();
  await expect(page.locator(".saved-method")).toContainText(
    "Expression: x / 4",
  );
});
test("anonymous practice, feedback, persistence, bookmark and progress", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your next breakthrough starts here." }),
  ).toBeVisible();
  await expect(page.locator("input[type=email]")).toHaveCount(0);
  await page.goto("/practice");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "Bookmark question", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .click();
  await expect(
    page.getByText("Correct answer:", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Question 2", { exact: true })).toBeVisible();
  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { name: "Recent activity", exact: true }),
  ).toBeVisible();
  await page.goto("/library");
  await expect(
    page.getByRole("button", { name: "Remove saved question" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("all navigation routes and mobile widths work without overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/learn",
      "/practice",
      "/skills",
      "/tutor",
      "/progress",
      "/revision",
      "/library",
      "/settings",
    ]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
test("guided solving and formula training provide actual feedback", async ({
  page,
}) => {
  await page.goto("/learn");
  await page.getByRole("tab", { name: "Guided solving" }).click();
  await page.getByLabel("Choose an approach").selectOption("opt_correct");
  await page.getByRole("button", { name: "Check this step" }).click();
  await expect(
    page.getByText("This step is correct.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await page.getByLabel("Your result", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Check this step" }).click();
  await expect(page.getByText("You worked through the method.")).toBeVisible();
  await page.getByRole("tab", { name: "Formula lab" }).click();
  await page
    .getByLabel("Which relationship fits?")
    .selectOption("fx-speed-distance-time");
  await page.getByLabel("Your numeric result").fill("120");
  await page.getByRole("button", { name: "Check formula & result" }).click();
  await expect(
    page.getByText("Correct formula and calculation.", { exact: false }),
  ).toBeVisible();
});
test("tutor failure is recoverable and a valid reply renders safely", async ({
  page,
}) => {
  await page.goto("/tutor");
  await page.route("**/api/tutor", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: "The tutor is unavailable. Continue with the worked solution.",
      },
    }),
  );
  await page
    .getByLabel("Your question and reasoning")
    .fill("How do I find 20 percent of 500?");
  await page.getByRole("button", { name: "Ask PrepVista", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "unavailable",
  );
  await page.unroute("**/api/tutor");
  await page.route("**/api/tutor", (route) =>
    route.fulfill({
      status: 200,
      json: {
        message: "Find one tenth first. <script>alert(1)</script>",
        nextStep: "What is 500 divided by 10?",
      },
    }),
  );
  await page.getByRole("button", { name: "Ask PrepVista", exact: true }).click();
  await expect(
    page.getByText("What is 500 divided by 10?", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".chat-message script")).toHaveCount(0);
});
test("assessment hides assistance and completes with feedback", async ({
  page,
}) => {
  await page.goto("/practice?mode=simulation");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Show a hint" })).toHaveCount(
    0,
  );
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .click();
  await expect(page.getByText("Correct answer:", { exact: false })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Finish session" }).click();
  await expect(page.getByText("Simulation score / 10")).toBeVisible();
});
