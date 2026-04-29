const cron = require("node-cron");
const { processModules } = require("../services/sectionServices");

cron.schedule("*/10 * * * *", async () => {
  try {
    console.log("⏱ Running module auto table generator...");

    const result = await processModules();
    console.log(result);

  } catch (err) {
    console.error("Cron Error:", err.message);
  }
});