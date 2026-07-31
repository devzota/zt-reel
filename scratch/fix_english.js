const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, '../apps/api/src/render/render.controller.ts');
const cronPath = path.join(__dirname, '../apps/api/src/render/publisher.cron.ts');
const factoryPath = path.join(__dirname, '../apps/web/src/pages/ReelFactory.tsx');

let controller = fs.readFileSync(controllerPath, 'utf8');
let cron = fs.readFileSync(cronPath, 'utf8');
let factory = fs.readFileSync(factoryPath, 'utf8');

// Replace the prefixes block in controller (finalCaption)
controller = controller.replace(/const prefixes = \[[\s\S]*?\];/g, `const prefixes = [
          '👉 Discover more here:',
          '🔥 Read the full story:',
          '📌 Check out the details:',
          '👇 Full article link:',
          '🔗 Learn more at:'
        ];`);

// Replace the commentPrefixes block in controller
controller = controller.replace(/const commentPrefixes = \[[\s\S]*?\];/g, `const commentPrefixes = [
            '👉 Discover more here:',
            '🔥 Read the full story:',
            '📌 Check out the details:',
            '👇 Full article link:',
            '🔗 Learn more at:'
          ];`);

// Replace the prefixes block in cron
cron = cron.replace(/const prefixes = \[[\s\S]*?\];/g, `const prefixes = [
        '👉 Discover more here:',
        '🔥 Read the full story:',
        '📌 Check out the details:',
        '👇 Full article link:',
        '🔗 Learn more at:'
      ];`);

// Replace the commentPrefixes block in cron
cron = cron.replace(/const commentPrefixes = \[[\s\S]*?\];/g, `const commentPrefixes = [
          '👉 Discover more here:',
          '🔥 Read the full story:',
          '📌 Check out the details:',
          '👇 Full article link:',
          '🔗 Learn more at:'
        ];`);


fs.writeFileSync(controllerPath, controller);
fs.writeFileSync(cronPath, cron);

// For ReelFactory.tsx, we need to make it look like a Facebook post.
// The user wants it to look like a Facebook Reel preview.
// Let's replace the whole card rendering in ReelFactory.tsx using a more robust replacement.
// Let's just restore ReelFactory.tsx using git checkout since it's unstaged. Oh wait, user rejected it.
