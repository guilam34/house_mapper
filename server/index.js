const express = require("express");

const PORT = process.env.PORT || 3001;

const app = express();

var houses = require('../importer/houses.json')

app.get("/api", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(houses));
})

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});