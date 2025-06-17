const puppeteer = require("puppeteer");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

function getIdsFromExcel(fileName) {
  const filePath = path.join(__dirname, "data", fileName);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  return data.map((row) => row.ID || row.Id || row.id).filter(Boolean);
}

function getAlreadyCommunicatedIds() {
  const filePath = path.join(__dirname, "comunicated-ids.txt");

  if (fs.existsSync(filePath)) {
    return fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function getIdsToCommunicate() {
  const allIds = getIdsFromExcel("2025-jun-1-3-acessos.xlsx");
  const alreadyCommunicatedIds = getAlreadyCommunicatedIds();
  return alreadyCommunicatedIds.length
    ? allIds.filter((id) => !alreadyCommunicatedIds.includes(String(id)))
    : allIds;
}

const CHATPRO_FLOW_NAME = "Agregadores 1~3 - Jun";
const ids = getIdsToCommunicate();

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

async function login(page) {
  try {
    // Navigate to the login page
    await page.goto(
      "https://evo5.w12app.com.br/#/acesso/panobiancos/autenticacao"
    );

    // Wait for the login form to be loaded
    await delay(1000);
    await page.waitForSelector("#usuario");

    // Fill in the login credentials
    await page.click("#usuario");
    await page.type("#usuario", "gui.olhenrique@gmail.com", { delay: 20 });

    await page.click("#senha");
    await page.type("#senha", "dbt8rzu3RKP2fyd-aqd", { delay: 20 });

    // Click the login button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForNavigation();

    console.log("Login successful!");
    return true;
  } catch (error) {
    console.error("Login failed:", error);
    return false;
  }
}

async function checkIfItIsClient(page) {
  await page.waitForSelector(".md-toolbar-tools a");
  const isClient = await page.evaluate(() => {
    return document
      .querySelector(".md-toolbar-tools a")
      .innerText.includes("Cliente");
  });
  return isClient;
}

async function sendMessageToClient(page, id) {
  await page.waitForSelector("header nav > ul > li:nth-child(5) > a");
  await delay(1000);
  await page.click("header nav > ul > li:nth-child(5) > a");

  await sendGeneralMessage(page, id);
}

async function selectChatProFlow(page) {
  await page.waitForSelector("#fluxoBot");
  await page.click("#fluxoBot");

  await page.evaluate(
    ({ chatProFlowName }) => {
      const chatProFlow = [...document.querySelectorAll("mat-option")].find(
        (el) =>
          el.innerText.toLowerCase() === chatProFlowName.toLocaleLowerCase()
      );
      if (!chatProFlow) {
        throw new Error("Chat Pro Flow not found");
      }

      return chatProFlow.click();
    },
    { chatProFlowName: CHATPRO_FLOW_NAME }
  );
}

async function sendGeneralMessage(page, id) {
  console.log("Sending message to ID:", id);

  await delay(1000);
  const tab = await page.evaluate(() => {
    return document.querySelector("#mat-tab-label-1-4") ? 1 : 3;
  });

  await page.waitForSelector(`#mat-tab-label-${tab}-4`);
  await page.click(`#mat-tab-label-${tab}-4`);

  await page.waitForSelector(`#mat-tab-content-${tab}-4 a`);
  await page.click(`#mat-tab-content-${tab}-4 a`);

  await selectChatProFlow(page);

  await page.waitForSelector(
    `#mat-tab-content-${tab}-4 evo-button.m-t-sm.m-l-sm > button`
  );
  await page.click(
    `#mat-tab-content-${tab}-4 evo-button.m-t-sm.m-l-sm > button`
  );
}

async function sendMessage(page, id) {
  try {
    console.log(`Processing ID: ${id}`);

    // Search for the contact
    await page.waitForSelector("#evoAutocomplete");
    await page.click("#evoAutocomplete");
    await page.type("#evoAutocomplete", id, { delay: 20 });
    await page.waitForSelector(".item-lista");
    await page.click(".item-lista");

    // Wait for navigation
    await page.waitForNavigation();

    await page.waitForSelector(".md-toolbar-tools a");
    const isClient = await checkIfItIsClient(page);

    if (isClient) {
      await sendMessageToClient(page, id);
    } else {
      await sendGeneralMessage(page, id);
    }

    // Escreve o id no arquivo após sucesso
    fs.appendFileSync(path.join(__dirname, "comunicated-ids.txt"), id + "\n");
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
      headless: true,
      defaultViewport: null,
      args: ["--start-maximized"],
      timeout: 60000,
    });

    // Create a new page
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Perform login
    const loginSuccess = await login(page);
    if (!loginSuccess) {
      throw new Error("Login failed");
    }

    // Process each ID
    for (const id of ids) {
      const messageSuccess = await sendMessage(page, id);
      if (!messageSuccess) {
        throw new Error(`Failed to send message for ID ${id}`);
      }
      // Add a small delay between processing IDs
      await delay(2000);
    }

    // Se chegou aqui, todos foram bem-sucedidos
    const filePath = path.join(__dirname, "comunicated-ids.txt");
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("Arquivo comunicated-ids.txt removido após sucesso total.");
    }
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    // Uncomment to close browser when done
    if (browser) await browser.close();
  }
}

// Run the main function
main();
