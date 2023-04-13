const express = require('express');
const app = express();
const webdriver = require('selenium-webdriver');
const cheerio = require('cheerio');
const chrome = require('selenium-webdriver/chrome');
const { Builder, By, Key, until } = webdriver;
const dbConnect = require("./mongodbSelenium");
const {federatedData} = require("./dataFederated");
app.get('/versions', async (req, res) => {
  try {
    const options = new chrome.Options();
    options.addArguments('headless');
    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    const url = req.query.url;
    await driver.get(url);

    const pageSource = await driver.getPageSource();
    const $ = cheerio.load(pageSource);
    const versions = $('script').map((i, el) => {
      const version = $(el).attr('src') || $(el).text();
      const versionNumber = version.match(/\d+\.\d+\.\d+/);
      const library = $(el).attr('id');
      return { src: version, version: versionNumber, library };
    }).get();
    // Insert the new data into the database
    const insert = async () => {
      try {
        // Connect to MongoDB
        const db = await dbConnect();
  
        // Insert the received data into the database
        let result=0;
        for(let i=0; i<versions.length; i++){
         result = await db.insertOne(versions[i]);
         await federatedData.push(versions[i]);
        }
        if (result.acknowledged) {
          console.log("Data inserted successfully");
        }
      } catch (error) {
        console.error(`Error inserting data into database: ${error}`);
      }
    };
    insert();
    res.json({ versions });
    await driver.quit();
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(5000, () => {
  console.log('Selenium api listening on port 5000!');
});
