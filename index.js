(function () {
  var exports = (typeof module !== 'undefined' && module.exports)  || window;

  // b64CodecParse is codec.parse from MIT-licensed https://github.com/swansontec/rfc4648.js
  function b64CodecParse (string, encoding, opts = {}) {
    // Build the character lookup table:
    if (!encoding.codes) {
      encoding.codes = {}
      for (let i = 0; i < encoding.chars.length; ++i) {
        encoding.codes[encoding.chars[i]] = i
      }
    }

    // The string must have a whole number of bytes:
    if (!opts.loose && (string.length * encoding.bits) & 7) {
      throw new SyntaxError('Invalid padding')
    }

    // Count the padding bytes:
    let end = string.length
    while (string[end - 1] === '=') {
      --end

      // If we get a whole number of bytes, there is too much padding:
      if (!opts.loose && !(((string.length - end) * encoding.bits) & 7)) {
        throw new SyntaxError('Invalid padding')
      }
    }

    // Allocate the output:
    const out = new (opts.out || Uint8Array)(((end * encoding.bits) / 8) | 0)

    // Parse the data:
    let bits = 0 // Number of bits currently in the buffer
    let buffer = 0 // Bits waiting to be written out, MSB first
    let written = 0 // Next byte to write
    for (let i = 0; i < end; ++i) {
      // Read one character from the string:
      const value = encoding.codes[string[i]]
      if (value === void 0) {
        throw new SyntaxError('Invalid character ' + string[i])
      }

      // Append the bits to the buffer:
      buffer = (buffer << encoding.bits) | value
      bits += encoding.bits

      // Write out some bits if the buffer has a byte's worth:
      if (bits >= 8) {
        bits -= 8
        out[written++] = 0xff & (buffer >> bits)
      }
    }

    // Verify that we have received just enough bits:
    if (bits >= encoding.bits || 0xff & (buffer << (8 - bits))) {
      throw new SyntaxError('Unexpected end of data')
    }

    return out
  }

  // b64URLParse is based on base64url from MIT-licensed https://github.com/swansontec/rfc4648.js
  function b64URLParse (string, opts) {
    var encoding = {
      chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
      bits: 6
    };
    return b64CodecParse(string, encoding, opts);
  }

  var cryptoSubtle = (crypto && crypto.subtle) ||
    (crypto && crypto.webkitSubtle) ||
    (window.msCrypto && window.msCrypto.Subtle);

  if (!cryptoSubtle) {
    throw new Error('crypto.subtle not found');
  }

// Adapted from https://chromium.googlesource.com/chromium/blink/+/master/LayoutTests/crypto/subtle/hmac/sign-verify.html
  var Base64URL = {
    stringify: function (a) {
      var base64string = btoa(String.fromCharCode.apply(0, a));
      return base64string.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    },
    parse: function (s) {
      s = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
      return new Uint8Array(Array.prototype.map.call(atob(s), function (c) { return c.charCodeAt(0); }));
    }
  };

  function isString(s) {
    return typeof s === 'string';
  }

  function utf8ToUint8Array(str) {
      var chars = [];
      str = btoa(unescape(encodeURIComponent(str)));
      return Base64URL.parse(str);
  }

  function isFunction(fn) {
    return typeof fn === 'function';
  }

  function isObject(arg) {
    return arg !== null && typeof arg === 'object';
  }

  function verifyJWTHS256(token, sharedSecret, cb) {
    if (!isString(sharedSecret)) {
      return cb(new Error('secret must be a string'));
    }

    var tokenParts = token.split('.');

    if (tokenParts.length !== 3) {
      return cb(new Error('token must have 3 parts'));
    }

    var importAlgorithm = {
      name: 'HMAC',
      hash: {
        name: 'SHA-256'
      }
    };

    // TODO Test utf8ToUint8Array function
    var keyData = utf8ToUint8Array(sharedSecret);

    cryptoSubtle.importKey(
      'raw',
      keyData,
      importAlgorithm,
      false,
      ['sign']
    ).then(function (key) {
      var partialToken = tokenParts.slice(0,2).join('.');
      var signaturePart = tokenParts[2];

      // TODO Test utf8ToUint8Array function
      var messageAsUint8Array = utf8ToUint8Array(partialToken);
      cryptoSubtle.sign(
        importAlgorithm.name,
        key,
        messageAsUint8Array
      ).then(function (res) {
        // TODO Test
        var resBase64 = Base64URL.stringify(new Uint8Array(res));

        // TODO Time comparison
        cb(null, resBase64 === signaturePart);
      }, cb);
    }, cb);
  }

  function verifyJWTES(token, publicKey, curve, hash, cb) {
    if (!isObject(publicKey)) {
      return cb(new Error('publicKey must be a JWK object'));
    }

    var tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return cb(new Error('token must have 3 parts'));
    }

    var importAlgorithm = {
      name: 'ECDSA',
      namedCurve: curve,
      hash,
    };

    cryptoSubtle.importKey(
      "jwk",
      publicKey,
      importAlgorithm,
      false,
      ["verify"]
    ).then(function (key) {
      var partialToken = tokenParts.slice(0,2).join('.');
      var signaturePart = tokenParts[2];

      cryptoSubtle.verify(
        importAlgorithm,
        key,
        b64URLParse(signaturePart, { loose: true }),
        new TextEncoder().encode(partialToken),
      ).then(function (ok) {
        cb(null, ok);
      }, cb);
    }, cb);
  }

  exports.verifyJWT_cb = function (token, key, alg, cb) {
    if (!isFunction(cb)) {
      throw new Error('cb must be a function');
    }

    if (!isString(token)) {
      return cb(new Error('token must be a string'));
    }

    if (!isString(alg)) {
      return cb(new Error('alg must be a string'));
    }

    if (alg === 'HS256') {
      return verifyJWTHS256(token, key, cb);
    } else if (alg === 'ES256') {
      return verifyJWTES(token, key, 'P-256', 'SHA-256', cb);
    } else if (alg === 'ES384') {
      return verifyJWTES(token, key, 'P-384', 'SHA-384', cb);
    } else {
      return cb(new Error('Expecting HS256, ES256 or ES384 for alg'));
    }
  };

	exports.verifyJWT = function (payload, key, algorithm) {
		return new Promise(function(resolve, reject) {
			exports.verifyJWT_cb(payload, key, algorithm, function(err, token) {
				if (err !== null) return reject(err);
				resolve(token);
			});
		});
  }

  exports.signJWT_cb = function (payload, secret, alg, cb) {
    if (!isFunction(cb)) {
      throw new Error('cb must be a function');
    }

    if (!isObject(payload)) {
      return cb(new Error('payload must be an object'));
    }

    if (!isString(secret)) {
      return cb(new Error('secret must be a string'));
    }

    if (!isString(alg)) {
      return cb(new Error('alg must be a string'));
    }

    var algorithms = {
      HS256: {
        name: 'HMAC',
        hash: {
          name: 'SHA-256'
        }
      }
    };

    var importAlgorithm = algorithms[alg];

    if (!importAlgorithm) {
      return cb(new Error('algorithm not found'));
    }

    var payloadAsJSON;

    try {
      payloadAsJSON = JSON.stringify(payload);
    } catch (err) {
      return cb(err);
    }

    var header = {alg: alg, typ: 'JWT'};
    var headerAsJSON = JSON.stringify(header);

    var partialToken = Base64URL.stringify(utf8ToUint8Array(headerAsJSON)) + '.' +
       Base64URL.stringify(utf8ToUint8Array(payloadAsJSON));

    // TODO Test utf8ToUint8Array function
    var keyData = utf8ToUint8Array(secret);

    cryptoSubtle.importKey(
      'raw',
      keyData,
      importAlgorithm,
      false,
      ['sign']
    ).then(function (key) {
      var characters = payloadAsJSON.split('');
      var it = utf8ToUint8Array(payloadAsJSON).entries();
      var i = 0;
      var result = [];

      while (!(current = it.next()).done) {
        result.push([current.value[1], characters[i]]);
        i++;
      }

      // TODO Test utf8ToUint8Array function
      var messageAsUint8Array = utf8ToUint8Array(partialToken);

      cryptoSubtle.sign(
        importAlgorithm.name,
        key,
        messageAsUint8Array
      ).then(function (signature) {
        // TODO Test
        var signatureAsBase64 = Base64URL.stringify(new Uint8Array(signature));

        var token = partialToken + '.' + signatureAsBase64;

        cb(null, token);
      }, cb);
    }, cb);
  };

	exports.signJWT = function (payload, shared_secret, algorithm) {
		return new Promise(function(resolve, reject) {
			exports.signJWT_cb(payload, shared_secret, algorithm, function(err, token) {
				if(err !== null) return reject(err);
				resolve(token);
			});
		});
  }

  function decode(tokenPart) {
    var output = tokenPart.replace(/-/g, '+').replace(/_/g, '/');
    switch (output.length % 4) {
      case 0:
        break;
      case 2:
        output += '==';
        break;
      case 3:
        output += '=';
        break;
      default:
        throw 'Illegal base64url string!';
    }

    // TODO Use shim or document incomplete browsers
    var result = atob(output);

    try{
      return decodeURIComponent(escape(result));
    } catch (err) {
      return result;
    }
  }

  exports.decodeJWTHeader = function (token) {
    return decode(token.split('.')[0]);
  }

  exports.decodeJWT = function (token) {
    return decode(token.split('.')[1]);
  };

  exports.parseJWTHeader = function (token) {
    return JSON.parse(exports.decodeJWTHeader(token));
  }

  exports.parseJWT = function (token) {
    // TODO: Handle when decodeJWT fails.
    // TODO: Handle when JSON.parse fails.
    return JSON.parse(exports.decodeJWT(token));
  };

}());
