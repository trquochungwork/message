import mongoose from 'mongoose';
import User from './be/src/models/User.js';
import Friend from './be/src/models/Friend.js';

async function check() {
    await mongoose.connect('mongodb://localhost:27017/message'); // Assuming standard local URI, let me check .env instead if needed. Wait, server.js uses connectDB.
    const hung = await User.findOne({ email: /trinhquochungwork/ });
    console.log('Hung id:', hung._id);
    const testUser = await User.findOne({ displayName: /Test User/ });
    console.log('Test User id:', testUser._id);
    
    const friends = await Friend.find({ $or: [{ userA: hung._id }, { userB: hung._id }] });
    console.log('Friends of Hung:', friends);
    
    const searchRes = await User.find({
        _id: { $ne: hung._id },
        $or: [{ username: /test/i }, { displayName: /test/i }, { email: /test/i }]
    });
    console.log('Search for "test" (excluding Hung):', searchRes.map(u => u.displayName));
    
    mongoose.disconnect();
}
check();
