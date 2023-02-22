const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

let coordinates = [];

function runPythonScript() {
  const pythonScript = spawn('python3', ['old_data/getcoord.py']);

  pythonScript.stdout.on('data', (data) => {
    console.log('Refreshing process started');
    coordinates = JSON.parse(data);
    console.log(`stdout: ${data}`);
  });

  pythonScript.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  pythonScript.on('close', (code) => {
    console.log(`Json is updated. child process exited with code ${code}`);
  });
}

setInterval(runPythonScript, 60 * 1000);

app.get('/coordinates', (req, res) => {
  res.json(coordinates);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
