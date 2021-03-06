const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8888;

// configure routes
var loginRouter = require('./routes/login.js');
var petsRouter = require('./routes/pets.js');
var userRouter = require('./routes/user.js');
var careTakerRouter = require('./routes/careTaker.js');
var fullTimerRouter = require('./routes/fullTimer.js');
var partTimerRouter = require('./routes/partTimer.js');
var bidsRouter = require('./routes/bids.js');
var catalogueRouter = require('./routes/catalogueViewer.js');
var adminRouter = require('./routes/admin.js');
var reviewRouter = require('./routes/petOwnerReview.js');

// configure middleware
app.use(express.static('./public'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

// initialise routes
app.use('/api/login', loginRouter);
app.use('/api/pets', petsRouter);
app.use('/api/users', userRouter);
app.use('/api/bids', bidsRouter);
app.use('/api/caretakers', careTakerRouter);
app.use('/api/fulltimers', fullTimerRouter);
app.use('/api/parttimers', partTimerRouter);
app.use('/api/catalogue', catalogueRouter);
app.use('/api/admin', adminRouter);
app.use('/api/review', reviewRouter)

app.get('/api', (req, res) => {
  res.send('Hello World! Welcome to Furry Fantasy API Server!');
});

app.get('/', (req, res) => {
  res.send('Connected!');
});

app.listen(port, () => {
  console.log(`Furry Fantasy server listening at http://localhost:${port}`);
});
