const express = require('express');
const { spawn } = require('child_process'); 
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/display.html');
});


//end-point for the main data 
app.post('/main_data', (req, res) => {
  runPythonScript()
    .then((parsedData) => {
      res.json(parsedData); 
    })
    .catch((error) => {
      console.error('Error processing data:', error);
      res.status(500).json({ error: 'Internal Server Error' }); 
    });
});


// retrieving the promise from the backend
function runPythonScript() {
  return new Promise((resolve, reject) => {
    const pythonScript = spawn('python3', ['data/update_pollutants.py']);

    let jsonData = ''; // Variable to store the received JSON string

    pythonScript.stdout.on('data', (data) => {
      console.log('Refreshing process started');
      console.log(`stdout: ${data}`);
      jsonData += data.toString(); // Append the received data to the jsonData variable
    });

    pythonScript.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    pythonScript.on('close', (code) => {
      console.log(`Json is updated. Child process exited with code ${code}`);

      try {
        const parsedData = JSON.parse(jsonData);
        resolve(parsedData); // Resolve the promise with the parsed data
      } catch (error) {
        reject(error); // Reject the promise with the parsing error
      }
    });
  });
}

// Initial run of the Python script
runPythonScript()
  .then((parsedData) => {
    axios
      .post('http://localhost:3000/main_data', parsedData)
      .then((response) => {
        console.log('Initial data sent successfully');
      })
      .catch((error) => {
        console.error('Error sending initial data:', error);
      });
  })
  .catch((error) => {
    console.error('Error processing initial data:', error);
  });




//requesting the data periodically
setInterval(() => {
  runPythonScript()
    .then((parsedData) => {
      // Make an HTTP POST request to your backend API with the updated data
      axios
        .post('http://localhost:3000/main_data', parsedData)
        .then((response) => {
          console.log('Data sent successfully');
        })
        .catch((error) => {
          console.error('Error sending data:', error);
        });
    })
    .catch((error) => {
      console.error('Error processing data:', error);
    });
}, 60 * 60 * 1000);



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
  console.log("Loading Data in...");
});
