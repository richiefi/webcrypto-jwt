var token = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9',
  'TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ'
].join('.');

var claims = {
  sub: '1234567890',
  name: 'John Doe',
  admin: true
}

var assertNotCalled = (err) => { assert(!err); };

assert.equal(claims, parseJWT(token));

assert.equal(JSON.stringify(claims), decodeJWT(token));

verifyJWT(token, 'secret', 'HS256').then((res) => { assert.equal(true, res) }, assert.ifError);

verifyJWT(token, 'secret2', 'HS256').then((res) => { assert.equal(false, res) }, assert.ifError);

var invalidSignatureToken =
  (token.split('.').slice(0, 2).concat('invalidsignature')).join('.');

verifyJWT(invalidSignatureToken, 'secret', 'HS256').then((res) => { assert.equal(false, res) }, assert.ifError);

verifyJWT(null, 'secret', 'HS256').then(assertNotCalled, (err) => {
  assert.equal('token must be a string', err.message);
});

verifyJWT({}, 'secret', 'HS256').then(assertNotCalled, (err) => {
  assert.equal('token must be a string', err.message);
});

verifyJWT(token, null, 'HS256').then(assertNotCalled, (err) => {
  assert.equal('secret must be a string', err.message);
});

verifyJWT(token, {}, 'HS256').then(assertNotCalled, (err) => {
  assert.equal('secret must be a string', err.message);
});

verifyJWT('foo', 'secret', 'HS256').then(assertNotCalled, (err) => {
  assert.equal('token must have 3 parts', err.message);
});

verifyJWT(token, 'secret', null).then(assertNotCalled, (err) => {
  assert.equal('alg must be a string', err.message);
});

verifyJWT(token, 'secret', 'POSE123').then(assertNotCalled, (err) => {
  assert.equal('Expecting HS256 or ES256 for alg', err.message);
});

verifyJWT().then(assertNotCalled, (err) => { assert(err); });

verifyJWT(token, 'secret', 'HS256', null).then(assertNotCalled, (err) => { assert(err); });

signJWT({ user: 'john.doe' }, 'secret', 'HS256').then((res) => {
  var expectedToken = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJ1c2VyIjoiam9obi5kb2UifQ',
    'gznFhZxGqtZhWcu0S6gKIgXLcF7kKiV2ZJpLy3ieH1Y'
  ];
  assert.equal(expectedToken.join('.'), res);
}, assertNotCalled);

signJWT(null, 'secret', 'HS256').then(assertNotCalled, (err) => {
  assert.equal('payload must be an object', err.message);
});

signJWT({}, null, 'HS256').then(assertNotCalled, (err) => {
  assert.equal('secret must be a string', err.message);
});

signJWT({}, {}, 'HS256').then(assertNotCalled, (err) => {
  assert.equal('secret must be a string', err.message);
});

signJWT({}, 'secret', null).then(assertNotCalled, (err) => {
  assert.equal('alg must be a string', err.message);
});

signJWT({}, 'secret', {}).then(assertNotCalled, (err) => {
  assert.equal('alg must be a string', err.message);
});

signJWT({foo: 'bar'}, 'secret', 'POSE123').then(assertNotCalled, (err) => {
  assert.equal('algorithm not found', err.message);
});

signJWT().then(assertNotCalled, (err) => { assert(err); });

signJWT(token, 'secret', 'HS256', null).then(assertNotCalled, (err) => { assert(err); });

// Roundtrip
signJWT({foo: 'bar'}, 'secret', 'HS256', function (err, token) {
  verifyJWT(token, 'secret', 'HS256', function (err, valid) {
    assert.ifError(err);
    assert(valid);
  });
});

signJWT({foo: 'bar'}, 'secret', 'HS256').then((token) => {
  verifyJWT(token, 'secret', 'HS256').then((valid) => {
    assert(valid);
  }, assertNotCalled);
}, assertNotCalled);

var emojiString = {'hello 😉': 'bye 😬'};

signJWT(emojiString, 'secret', 'HS256').then((token) => {
  assert(token);
  verifyJWT(token, 'secret', 'HS256').then((valid) => {
    assert(valid);
    var result = decodeJWT(token);
    assert.equal(result, JSON.stringify(emojiString));
  }, assertNotCalled);
}, assertNotCalled);

signJWT(emojiString, 'secret', 'HS256').then((token) => {
  assert(token);
  verifyJWT(token, 'secret', 'HS256').then((valid) => {
    assert(valid);
    var result = decodeJWT(token);
    assert.equal(result, JSON.stringify(emojiString));
  }, assertNotCalled);
}, assertNotCalled);
