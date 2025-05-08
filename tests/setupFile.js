const { beforeAll, afterEach, afterAll } = require('vitest');
const mongoose = require('mongoose');


beforeAll(async () => {
    // put your client connection code here, example with mongoose:
    await mongoose.connect(process.env['MONGODB_URI']);
});

afterAll(async () => {
    // put your client disconnection code here, example with mongoose:
    await mongoose.disconnect();
});