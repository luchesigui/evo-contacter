const puppeteer = require('puppeteer');

const chatProFlowId = 85;

const ids = [
    '3362769',
    '2622907',
]

function delay(time) {
   return new Promise(function(resolve) { 
       setTimeout(resolve, time)
   });
}

async function login(page) {
    try {
        // Navigate to the login page
        await page.goto('https://evo5.w12app.com.br/#/acesso/panobiancos/autenticacao', {
            waitUntil: 'networkidle0'
        });

        // Wait for the login form to be loaded
        await page.waitForSelector('#usuario');

        // Fill in the login credentials
        await page.click('#usuario');
        await page.type('#usuario', 'gui.olhenrique@gmail.com', { delay: 20 });

        await page.click('#senha');
        await page.type('#senha', 'dbt8rzu3RKP2fyd-aqd', { delay: 20 });

        // Click the login button
        await page.click('button[type="submit"]');

        // Wait for navigation after login
        await page.waitForNavigation({
            waitUntil: 'networkidle0'
        });

        console.log('Login successful!');
        return true;
    } catch (error) {
        console.error('Login failed:', error);
        return false;
    }
}

async function sendMessage(page, id) {
    try {
        console.log(`Processing ID: ${id}`);
        
        // Search for the contact
        await page.waitForSelector('#evoAutocomplete');
        await page.click('#evoAutocomplete');
        await page.type('#evoAutocomplete', id, { delay: 20 });
        await page.waitForSelector('.item-lista');
        await page.click('.item-lista');
        
        // Wait for navigation
        await page.waitForNavigation({
            waitUntil: 'networkidle0'
        });

        // Navigate to messages tab
        await page.waitForSelector('#mat-tab-label-1-4');
        await delay(1000);
        await page.click('#mat-tab-label-1-4');
        
        // Click on message link
        await page.waitForSelector('#mat-tab-content-1-4 a');
        await page.click('#mat-tab-content-1-4 a');
        
        // Select bot flow
        await page.waitForSelector('#fluxoBot');
        await page.click('#fluxoBot');

        // Select specific bot option
        await page.waitForSelector(`#mat-option-${chatProFlowId}`);
        await page.click(`#mat-option-${chatProFlowId}`);
        
        // Send message
        await page.waitForSelector('#mat-tab-content-1-4 evo-button.m-t-sm.m-l-sm > button');
        await page.click('#mat-tab-content-1-4 evo-button.m-t-sm.m-l-sm > button');
        
        console.log(`Message sent successfully for ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`Failed to send message for ID ${id}:`, error);
        return false;
    }
}

async function main() {
    let browser;
    try {
        // Launch the browser
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized'],
            timeout: 60000
        });

        // Create a new page
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Perform login
        const loginSuccess = await login(page);
        if (!loginSuccess) {
            throw new Error('Login failed');
        }

        // Process each ID
        for (const id of ids) {
            const messageSuccess = await sendMessage(page, id);
            if (!messageSuccess) {
                console.log(`Skipping to next ID after failure for ${id}`);
                continue;
            }
            // Add a small delay between processing IDs
            await delay(2000);
        }

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        // Uncomment to close browser when done
        if (browser) await browser.close();
    }
}

// Run the main function
main(); 

