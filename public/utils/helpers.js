

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
    percent = normalize(value, 0, 2); 
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
