const express = require('express');
const readline = require('node:readline');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Echo server is running'));

app.post('/echo', (req, res) => {
  res.json({ echo: req.body.message ?? '' });
});

const server = app.listen(PORT, () => {
  console.log(`Express listening on http://localhost:${PORT}`);
  startConsole();
});

function startConsole() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'you> ',
  });

  console.log('Interactive mode: type a message and press Enter. Type "exit" to quit.');
  rl.prompt();

  rl.on('line', (line) => {
    const input = line.trim();
    if (input === 'exit') return rl.close();
    if (input) console.log(`echo: ${input}`);
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('Bye!');
    server.close();
    process.exit(0);
  });
}
