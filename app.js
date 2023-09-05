const express = require('express');
const { spawn } = require('child_process'); 
const app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/display.html');
});


//Retrieving the data for all of the nodes, depending on the pollutant type
app.get('/main_data', async (req, res) => {
  try {
    const { pollutant_type} = req.query;
    const data = await getMainData(pollutant_type);
    res.send(data);
    console.log("Data Sent at " + new Date().toLocaleString());
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});


// Helper function for the main_data
async function getMainData(pollutant_type) {
  return new Promise((resolve, reject) => {
    const updateScript = spawn('python3', ['data/update_pollutants.py', pollutant_type]);

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


//Retrieves data for a specific node given the timerange and pollutant type, used for the timeseries graph
app.get('/timeseries', (req, res) => {
  console.log(req.query);
  const { nodeId, date, pollutant } = req.query;
  console.log(nodeId, date, pollutant)
  const timeseriesScript = spawn('python3', ['data/get_timeseries.py', nodeId, date, pollutant]);

  let stdout = '';
  let stderr = '';

  timeseriesScript.stdout.on('data', data => {
    stdout += data.toString();
  });

  timeseriesScript.stderr.on('data', err => {
    stderr += err.toString(); // Collect the error message
  });

  timeseriesScript.on('close', code => {
    console.log(code);

    if (code === 0) {
      res.send(stdout);
    } else {
      if (stderr) {
        res.status(500).send(stderr); // Send the error response
      } else {
        res.status(500).send(`Python script exited with code ${code}`);
      }
    }
  });
});


// Spins up the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
  console.log("Loading Data in...");
});
