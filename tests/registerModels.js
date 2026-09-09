// Registers every Mongoose model this service knows about on this test
// file's module registry, before any router/socket/test code runs — the
// same convention as catalog_server/tests/registerModels.js.
require('../models/user');
require('../models/contact');
