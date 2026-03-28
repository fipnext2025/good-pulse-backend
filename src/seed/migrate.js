/**
 * Migration script: Migrate old field names to new ones.
 * Run: node backend/src/seed/migrate.js
 *
 * - User: fipCoins → karmaPoints, add location hierarchy fields
 * - Submission: fipCoins → karmaPoints, set submissionType='deed' where missing
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function migrate() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // --- Migrate Users ---
    const usersCollection = db.collection('users');

    // Rename fipCoins → karmaPoints for all users that still have fipCoins
    const userResult = await usersCollection.updateMany(
      { fipCoins: { $exists: true } },
      [
        {
          $set: {
            karmaPoints: { $ifNull: ['$fipCoins', 0] },
            'location.area': { $ifNull: ['$location.area', ''] },
            'location.district': { $ifNull: ['$location.district', ''] },
            'location.state': { $ifNull: ['$location.state', '$location.region'] },
            'location.country': { $ifNull: ['$location.country', ''] },
          },
        },
        { $unset: 'fipCoins' },
      ]
    );
    console.log(`Users migrated: ${userResult.modifiedCount}`);

    // Also set defaults for users without fipCoins but missing new fields
    await usersCollection.updateMany(
      { karmaPoints: { $exists: false } },
      { $set: { karmaPoints: 0 } }
    );

    // --- Migrate Submissions ---
    const submissionsCollection = db.collection('submissions');

    // Rename fipCoins → karmaPoints
    const subResult1 = await submissionsCollection.updateMany(
      { fipCoins: { $exists: true } },
      [
        {
          $set: { karmaPoints: { $ifNull: ['$fipCoins', 0] } },
        },
        { $unset: 'fipCoins' },
      ]
    );
    console.log(`Submissions fipCoins migrated: ${subResult1.modifiedCount}`);

    // Set submissionType='deed' where missing
    const subResult2 = await submissionsCollection.updateMany(
      { submissionType: { $exists: false } },
      { $set: { submissionType: 'deed' } }
    );
    console.log(`Submissions submissionType set: ${subResult2.modifiedCount}`);

    // Set karmaPoints default where missing
    await submissionsCollection.updateMany(
      { karmaPoints: { $exists: false } },
      { $set: { karmaPoints: 0 } }
    );

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();
