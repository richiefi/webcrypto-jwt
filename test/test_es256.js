var token = [
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9',
  'uAM5b7JGtGafO80BwwsG6pRht43wPK9JLLYJwQ_iGB_kDxxL1bFrK8zs8gQGeApRm0Aizkjm-c8vbvoaPrAYFw',
].join('.');

var publicKey = JSON.parse("{\"crv\":\"P-256\",\"ext\":true,\"key_ops\":[\"verify\"],\"kty\":\"EC\",\"x\":\"RMQADNLWv2pWaHZztyzmlndAxLS3iPwiTg5ghd2z9Xs\",\"y\":\"ehkW7-FQyRpY_NtfWNRR7k0ZmQ8yEIdQZXOgthDYh40\"}");
// Corresponding privateKey = JSON.parse("{\"crv\":\"P-256\",\"d\":\"kBg-rmW2MCdVxybp9UFa1eeqQeISlC9unfG1qSqxXgs\",\"ext\":true,\"key_ops\":[\"sign\"],\"kty\":\"EC\",\"x\":\"RMQADNLWv2pWaHZztyzmlndAxLS3iPwiTg5ghd2z9Xs\",\"y\":\"ehkW7-FQyRpY_NtfWNRR7k0ZmQ8yEIdQZXOgthDYh40\"}");



var claims = {
  sub: '1234567890',
  name: 'John Doe',
  admin: true
};

verifyJWT(token, publicKey, 'ES256').then((isValid) => {
  assert(isValid);
  var result = decodeJWT(token);
  console.log("result:", result);
  assert.equal(JSON.parse(result), claims);
}).catch((err) => {
  console.log("An error caught: ", err);
});
