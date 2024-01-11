

//This file includes helper functions that are used in the main script.js file, isolated helpers that don't make any rendering or asynchronous calls


// normalizes values for the getColor function
function normalize(value, min, max) {
  return (value - min) / (max - min);
}


// gets the color for each of the nodes based on the pollutant and the value


//NOTE: Blue is used for CO2 and Green is used for CO
export function getColor(value, pollutant) {


  let color1, color2, percent;


  if(pollutant == 'co2') {
    color1 = [0, 31, 102];  
    color2 = [229, 237, 255];  
    percent = 1 - (value - 350) / 200;

    
  } else if (pollutant == 'co') {
    color1 = [234, 255, 236];
    color2 =  [0,100,0];
    percent = normalize(value, 0, 0.4); 
  }
  //add more pollutants here


  if(value == -1) {
    return `#F5F5F5`};


  const color = [
    Math.round(color1[0] + (color2[0] - color1[0]) * percent),
    Math.round(color1[1] + (color2[1] - color1[1]) * percent),
    Math.round(color1[2] + (color2[2] - color1[2]) * percent)
  ];


  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}





//Function used for condesing the data for different for display in the chart 
export function processData(datetime, correctPollutant, chunkSize) {

  const dates = datetime.map(date => new Date(date));
  const data = dates.map((date, i) => ({ date, pollutant: correctPollutant[i] }));

  data.sort((a, b) => a.date - b.date);

  const chunkedData = _.chunk(data, chunkSize);
 

  const processedData = chunkedData.map(chunk => {
    const avgPollutant = _.meanBy(chunk, 'pollutant');
    const avgDate = chunk[Math.floor(chunk.length / 2)].date;
    const pcDate = avgDate.toISOString().slice(0, 19).replace('T', ' ');
    return { date: pcDate, pollutant: avgPollutant};
  });

  
  let processedDatetime = processedData.map(d => d.date);
  const processedPollutant = processedData.map(d => d.pollutant);

  return { processedDatetime, processedPollutant };
}



//Retrieves extra information about the location of the node
export async function getInfoHelper(){
  const response = await fetch('sensors_with_nodes.json');
  const data = await response.json();
  // log all of the locations
  return data;

}


// reorganizes the json in order to make them accessible by each json 
export function organizeDataByNodeId(jsonData) {
  var dataByNodeId = {};

  // Iterate through the original JSON data and organize it by Node ID
  jsonData.forEach(function(sensor) {
    var nodeId = sensor["Node ID"];
    dataByNodeId[nodeId] = sensor;
  });

  return dataByNodeId;
}



///// this is temporary put back or change


function updatePollutant(div) {
 
  //buttons
  const gradientDiv = div.querySelector('#gradient-div');
  const radioCO = div.querySelector('#co-option');
  const radioCO2 = div.querySelector('#co2-option');
  const maxValue = div.querySelector('#max-value');
  const minValue = div.querySelector('#min-value');
  const concentrationDef = div.querySelector('#concentration-tag');

  
  if (radioCO2.checked) {
    console.log('co2 checked');

    // changing the legend 
    gradientDiv.style.background = "linear-gradient(to bottom, rgb(0, 31, 102), rgb(39, 74, 146), rgb(77, 117, 190), rgb(115, 160, 234), rgb(153, 187, 244), rgb(191, 213, 253), rgb(214, 226, 255), rgb(229, 237, 255))";
    maxValue.innerHTML = '600 ppm';
    minValue.innerHTML = '350 ppm';
    selectedPollutant = 'co2';

    //changing the chart
    closeButton.style.backgroundImage = "url('./icons/cross_png_clean.png')";
    NetworkName.style.backgroundImage = "url('./icons/breathe_icon.png')";
    ChartTitle.innerHTML =  "Average CO<sub>2</sub> Levels";
    loader.style.borderTop = '8px solid darkblue';
    concentrationDef.innerHTML = '<b> Concentration (ppm):<b>';

    makeMap(co2Array, selectedPollutant);
    

  } else if (radioCO.checked) {
    console.log('co checked');

    //maybe add the conditional here
    console.log(coArray);


    //changing the legend 
    gradientDiv.style.background = "linear-gradient(to bottom,rgb(0,100,0), rgb(116, 150, 113), rgb(143, 188, 139), rgb(209, 242, 206), rgb(236, 252, 235))";
    maxValue.innerHTML = '0.4 V';
    minValue.innerHTML = '0 V';
    selectedPollutant = 'co';

   //changing the chart
   closeButton.style.backgroundImage = "url('./icons/cross_green_clean.png')";  
   NetworkName.style.backgroundImage = "url('./icons/breathe_icon_green.png')";
   ChartTitle.innerHTML =  "Average CO Levels";
   loader.style.borderTop = '8px solid darkgreen';
   concentrationDef.innerHTML = '<b> Concentration (V):<b>';

   makeMap(coArray, selectedPollutant);

  }
  console.log("Updates requested for: ", selectedPollutant);
}


//Constants for code
const date_obj = new Date();
date_obj.setHours(date_obj.getHours() - 2);

const currentYear = date_obj.getFullYear().toString();
const currentMonth = (date_obj.getMonth() + 1).toString().padStart(2, '0');
const currentDate = date_obj.getDate().toString().padStart(2, '0');
const currentHour = date_obj.getHours().toString().padStart(2, '0');


var date = currentYear + '-' + currentMonth + '-' + currentDate;
var time = currentHour + ':00:00';
time  = currentHour + ':00:00';
if (currentHour.length === 1) {
  currentHour = '0' + currentHour;
}



class LegendControl extends L.Control {
  // Define the onAdd method
  onAdd() {
      const div = L.DomUtil.create('div', 'legend');
      div.style.backgroundColor = "white";
      div.style.padding = "6px";
      div.style.borderRadius = "6px";
      div.style.width = "141.28px";
      div.style.height = "317.29px";
      div.style.position = "absolute";
      div.style.right = "610px";
      div.style.top = "450px";
      div.style.fontSize = "14px";
      div.innerHTML =  `
      <div>
        <b>Legend</b>
        <br>
        Date: ${date}
        <br>
        Time: ${time}
        <br>
        <b>Pollutants:</b>
        <ul style="list-style: none; margin: 0; padding: 0"">
          <li>
            <input type="radio" id="co-option" name="selector" onchange="updatePollutant(this.parentElement.parentElement.parentElement)">
            <label for="f-option">CO</label>
          </li>
          <li>
            <input type="radio" id="co2-option" name="selector" checked="checked" onchange="updatePollutant(this.parentElement.parentElement.parentElement)">
            <label for="s-option">CO<sub>2</sub></label>
          </li>
        </ul>
          <div id="concentration-tag"><b>Concentration (ppm):</b> </div>
          <br>
          <div style="display: inline-block; vertical-align: top; margin-top: -20px;">
          <div id="max-value" style="height: 20px;">600 ppm </div>
          <div id="gradient-div" style="display:inline-block; width: 20px; height: 120px; background: linear-gradient(to bottom, rgb(0, 31, 102), rgb(39, 74, 146), rgb(77, 117, 190), rgb(115, 160, 234), rgb(153, 187, 244), rgb(191, 213, 253), rgb(214, 226, 255), rgb(229, 237, 255));;"></div>
          <br>
          <div id="min-value" style="height: 20px;">350 ppm </div>
          </div>
          </div>
      </div>`;

    


      return div;
  }
}



