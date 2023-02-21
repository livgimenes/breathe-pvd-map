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
    console.log(`child process exited with code ${code}`);
  });
}

function scheduleScript() {
  var now = new Date();
  var delay = 60 * 60 * 1000 - (now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
  setTimeout(function() {
    runPythonScript();
    setInterval(runPythonScript, 60 * 60 * 1000);
  }, delay);
}

scheduleScript();

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});