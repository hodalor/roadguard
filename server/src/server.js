const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const connectDb = require('./config/db');
const { initializeFirebaseAdmin } = require('./config/firebaseAdmin');

const port = process.env.PORT || 5000;

connectDb();
initializeFirebaseAdmin();

app.listen(port, () => {
  console.log(`RoadGuard server running on port ${port}`);
});
