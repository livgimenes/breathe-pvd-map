const express = require('express');
const { spawn } = require('child_process'); 
const axios = require('axios');
const app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/display.html');
});


// this has to be sending new data 


function runPythonScript() {
  const pythonScript = spawn('python3', ['data/update_pollutants.py']);

  pythonScript.stdout.on('data', (data) => {
    console.log('Refreshing process started')
    console.log(`stdout: ${data}`);

    const parsedData = JSON.parse(data);
    
    // Make an HTTP POST request to your backend API with the updated data
    axios.post('/main_data', parsedData)
      .then(response => {
        console.log('Data sent successfully');
      })
      .catch(error => {
        console.error('Error sending data:', error);
      });
  });

  pythonScript.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  pythonScript.on('close', (code) => {
    console.log(`Json is updated. Child process exited with code ${code}`);
  });
}

/// might want to monitor this to make sure it only goes off when it's actually a strike
setInterval(runPythonScript, 60 * 60 * 1000);

// fetching and returning the data from the timeseries
app.get('/timeseries', (req, res) => {
  console.log(req.query);
  const { nodeId, date } = req.query;
  const pythonScript2 = spawn('python3', ['data/get_timeseries.py', nodeId, date]);

  let stdout = '';
  pythonScript2.stdout.on('data', data => {
    stdout += data.toString();
  });


  pythonScript2.stderr.on('data', err => {
    res.status(500).send(err.toString());
  });

  pythonScript2.on('close', code => {

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
});
