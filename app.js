const express = require('express');
const { spawn } = require('child_process'); 
const cors = require('cors');
const axios = require('axios');
const { get } = require('http');
const app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/display.html');
});


//end-point for the main data 
app.get('/main_data', async (req, res) => {
  try {
    const data = await getMainData();
    res.send(data);
    // add the current time it was sent
    console.log("Data Sent at " + new Date().toLocaleString());
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});


// retrieving the promise from the backend
async function getMainData() {
  return new Promise((resolve, reject) => {
    const updateScript = spawn('python3', ['data/update_pollutants.py']);

    let stdout = ''; 

    updateScript.stdout.on('data', (data) => {
      console.log(`Data Collected!`);
      stdout += data.toString(); 
    });

    updateScript.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    updateScript.on('close', (code) => {
      console.log(`Json is updated. Child process exited with code ${code}`);

      try {
        const parsedData = JSON.parse(stdout);
        resolve(parsedData); 
      } catch (error) {
        reject(error); 
      }
    });
  });
}


// fetching and returning the data from the timeseries
app.get('/timeseries', (req, res) => {
  console.log(req.query);
  const { nodeId, date } = req.query;
  const timeseriesScript = spawn('python3', ['data/get_timeseries.py', nodeId, date]);

  let stdout = '';
  timeseriesScript.stdout.on('data', data => {
    stdout += data.toString();
  });


  timeseriesScript.stderr.on('data', err => {
    res.status(500).send(err.toString());
  });

  timeseriesScript.on('close', code => {

    if (code === 0) {
      res.send(stdout);
      console.log(stdout);
    } else {
      res.status(500).send(`Python script exited with code ${code}`);
    }
  });
});



const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
  console.log("Loading Data in...");
});
