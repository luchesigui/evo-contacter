const { delay, waitAndClick } = require("../helpers/browser");
const {
  getAlreadyCommunicatedIds,
  addToCommunicatedIds,
  addToNonExistentClients,
} = require("../helpers/fileManager");
const {
  checkIfItIsClient,
  sendGeneralMessage,
  sendMessageToClient,
} = require("./messaging");

const IS_DEBUG_ACTIVE = true;

async function sendMessage(page, id) {
  try {
    console.log(`Processing ID: ${id}`);

    // Verifica se o ID já foi comunicado
    const alreadyCommunicatedIds = getAlreadyCommunicatedIds();
    if (alreadyCommunicatedIds.includes(String(id))) {
      console.log(`Duplicated contact attempt for the ID: ${id}`);
      return true;
    }

    // Search for the contact
    await waitAndClick(page, "#evoAutocomplete");
    await page.type("#evoAutocomplete", id, { delay: 20 });

    let noResults = false;
    try {
      await page.waitForSelector(".item-lista", { timeout: 5000 });
    } catch (error) {
      noResults = true;
    }

    if (noResults) {
      console.log(`No results found for ID: ${id}`);
      await page.evaluate(() => {
        const closeButton = document.querySelector(".icone-close-cliente");
        if (closeButton) {
          closeButton.click();
        }
      });

      addToNonExistentClients(id);
    } else {
      await waitAndClick(page, ".item-lista");
      await delay(1000);
      await page.waitForSelector(".md-toolbar-tools a");
      const isClient = await checkIfItIsClient(page);

      if (isClient) {
        await sendMessageToClient(page, id);
      } else {
        await sendGeneralMessage(page, id);
      }

      console.log(`Message sent successfully for ID: ${id}`);
    }

    // Escreve o id no arquivo após sucesso
    addToCommunicatedIds(id);
    return true;
  } catch (error) {
    console.error("Failed to send message for ID:", id);

    if (IS_DEBUG_ACTIVE) {
      console.error("Error details:", error, "\n\n");
    }

    return false;
  }
}

module.exports = {
  sendMessage,
};
