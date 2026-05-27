const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const connectDb = require('./config/db');
const { initializeFirebaseAdmin } = require('./config/firebaseAdmin');
const ensureSuperAdmin = require('./utils/ensureSuperAdmin');

const port = process.env.PORT || 5000;

async function startServer() {
  await connectDb();
  await ensureSuperAdmin();
  initializeFirebaseAdmin();

  app.listen(port, () => {
    console.log(`RoadGuard server running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
