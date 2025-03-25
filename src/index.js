var express = require('express');
var orgController = require('./controller/orgController');
var app = express();
var PORT = 3000;
app.use(express.json());
app.use('/organizations', orgController);
app.all(/(.*)/, function (req, res) {
  res.status(404).json({ message: 'Invalid Page!' });
}); // for non-existent pages and methods
app.listen(PORT, function () {
  console.log('Server is listening on http://localhost:'.concat(PORT));
});
