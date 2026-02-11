require('dotenv').config();
const pool = require('../config/database');

async function seed() {
  let connection;

  try {
    connection = await pool.getConnection();
    console.log('🌱 Starting database seeding...');

    // Create default channels
    const channels = [
      { name: 'general', description: 'General discussion for everyone', is_private: false },
      { name: 'random', description: 'Off-topic conversations', is_private: false },
      { name: 'announcements', description: 'Important announcements', is_private: false }
    ];

    for (const channel of channels) {
      await connection.query(
        'INSERT IGNORE INTO channels (name, description, is_private) VALUES (?, ?, ?)',
        [channel.name, channel.description, channel.is_private]
      );
    }

    console.log('✅ Default channels created');
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run seeding
if (require.main === module) {
  seed();
}

module.exports = seed;
