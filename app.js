const express = require('express');
const { spawn } = require('child_process');
const app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/display.html');
});


function runPythonScript() {
  const pythonScript = spawn('python3', ['old_data/getcoord.py']);

  pythonScript.stdout.on('data', (data) => {
    console.log('Refreshing process started')
    console.log(`stdout: ${data}`);
  });

  pythonScript.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  pythonScript.on('close', (code) => {
    console.log(`Json is updated. child process exited with code ${code}`);
  });
}


setInterval(runPythonScript, 60 * 60 * 1000);

// fetching and returning the data from the timeseries
app.get('/api/data', (req, res) => {
  
  // get the data back from res and run the async function 
  const { nodeId, date } = req.data;
  const pythonScript = spawn('python', ['old_data/timeseries.py', nodeId, date]);


  // response is set to the result of the python script, instead of returning it
  res.send(new Promise((resolve, reject) => {
    let stdout = '';
    pythonScript.stdout.on('data', data => {
      stdout += data.toString();
    });

    pythonScript.stderr.on('data', err => {
      reject(err.toString());
    });

    pythonScript.on('close', code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(`Python script exited with code ${code}`);
      }
    });
  })
)


})



const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
