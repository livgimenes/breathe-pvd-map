
//Fetch the data 
    
    //load the spreadsheet with the sensor names list 
const fs = require("fs");

async function loadCSV() {
  const fileData = await fs.promises.readFile("old_data/breathe_providence_sensors.csv", "utf-8");
  const lines = fileData.split("\n");

  const header = lines[0].split(",");
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].split(",");
    const obj = {};

    for (let j = 0; j < line.length; j++) {
      obj[header[j].trim()] = line[j].trim();
    }

    data.push(obj);
  }

  return data;
}

console.log(loadCSV())

    // retrive it from the url 
    function getData(nodeName, nodeId, variable, startDate, startTime, endDate, endTime) {
        const baseUrl = "http://128.32.208.8";
      
        const customUrl = `/node/${nodeId}/measurements_all/csv?name=${encodeURIComponent(
          nodeName
        )}&interval=60&variables=${variable}&start=${startDate}%20${startTime}&end=${endDate}%20${endTime}&char_type=measurement`;
      
        console.log(baseUrl + customUrl);
      
        return baseUrl + customUrl;
      }

    // for all of the components in the list add them to the list 


    // put into a csv


//clean the data 

    // get null values out

    // get unecessary field 

    //turn date from pst to est and apply to the json


//filter the json to only include the current day