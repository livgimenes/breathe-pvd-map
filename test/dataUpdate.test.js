const { expect } = require('chai');
const { timeUntilNextHour } = require('../public/script');


// creating a fake browser environment
const puppeteer = require('puppeteer');
const assert = require('assert');

describe('Leaflet Test', function () {
  let browser;
  let page;

  before(async function () {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.goto('public/display.html'); // Replace with the path to your HTML file containing Leaflet import.
  });

  after(async function () {
    await browser.close();
  });

  it('should load Leaflet and create a map', async function () {
    const map = await page.evaluate(() => {
      return L.map('map').setView([51.505, -0.09], 13);
    });

    // Test assertions on the map object or other Leaflet functionality
    assert.strictEqual(map.getZoom(), 13);
  });

  // Add more test cases as needed
});






describe('Test if the time until the next hour is calculated correctly', () => {
    it('should calculate the time until the next straight hour', () => {

      // Use a fixed time for the test (11:30:00)
      const now = new Date('2023-07-27T11:30:00'); 
  
      // Set the expected time for the next straight hour (12:00:00)
      const nextHour = new Date('2023-07-27T12:00:00');
  
      // Calculate the difference
      const expectedDifference = nextHour.getTime() - now.getTime();
     
      // calling the original function
      const timeUntilNext = timeUntilNextHour(now);
  
  
      //assertion
      expect(timeUntilNext).to.equal(expectedDifference);
    });
  
    it('should handle the current time at a straight hour', () => {
      
        // Use a fixed time for the test (12:00:00)
      const now = new Date('2023-07-27T12:00:00'); 
  
      const timeUntilNext = timeUntilNextHour(now);

      //assertion
      expect(timeUntilNext).to.equal(3600000);
    });
  
    it('should handle the current time just after a straight hour', () => {
      // Use a fixed time for the test (12:00:10)
      const now = new Date('2023-07-27T12:00:10'); 
      const nextHour = new Date('2023-07-27T13:00:00'); 
      const timeUntilNext = timeUntilNextHour(now);
      const expectedDifference = nextHour.getTime() - now.getTime();
  
      //assertion
      expect(timeUntilNext).to.equal(expectedDifference);
    });
  });