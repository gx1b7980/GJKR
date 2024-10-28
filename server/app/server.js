const express = require("express");
const app = express();

const port = 3000;
const hostname = "localhost";

app.use(express.static("public"));

app.get('/', (req, res) => {
    res.send('Hello World!')
  })

app.listen(port, hostname, () => {
  console.log(`running at http://${hostname}:${port}`);
});
