import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:process.env.ACEAPT_BROWSER_PATH});
fs.mkdirSync('docs/screenshots',{recursive:true});
const page=await browser.newPage();
for(const [name,width,height] of [['desktop',1440,1050],['mobile',390,844]]){
 await page.setViewportSize({width,height});
 await page.goto('http://127.0.0.1:3210/');
 await page.getByRole('heading',{name:'Your next breakthrough starts here.'}).waitFor();
 await page.screenshot({path:`docs/screenshots/${name}.png`,fullPage:true});
}
await browser.close();
console.log('Saved desktop and mobile production screenshots.');
