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
  console.log(req.query);
  const { nodeId, date } = req.query;
  const pythonScript2 = spawn('python3', ['old_data/timeseries.py', nodeId, date]);

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
    } else {
      res.status(500).send(`Python script exited with code ${code}`);
    }
  });
});



const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
