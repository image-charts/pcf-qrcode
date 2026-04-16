/**
 * Unit Tests for QRCodeGenerator PCF Component
 *
 * Tests the core utilities and URL building logic.
 */

const crypto = require('crypto');

// ============================================================
// Mock implementations of utility functions for testing
// (In the actual PCF, these come from image-charts-utils.ts)
// ============================================================

function computeHmacSha256Sync(secretKey, message) {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

function normalizeColor(color) {
  if (!color) return '';
  const trimmed = color.trim();
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (/^[0-9A-Fa-f]{6}$/.test(withoutHash)) {
    return withoutHash.toUpperCase();
  }
  return '';
}

function parseAdvancedOptions(options) {
  if (!options) return {};
  const result = {};
  const pairs = options.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value !== undefined) {
      if (key === 'ichm' || key === 'icac') continue;
      result[key.trim()] = value.trim();
    }
  }
  return result;
}

function isValidHostname(hostname) {
  if (!hostname) return false;
  const trimmed = hostname.trim();
  if (trimmed.length > 253) return false;
  const hostnameRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$/;
  return hostnameRegex.test(trimmed);
}

function buildQrCodeUrl(params) {
  const {
    accountId,
    secretKey,
    privateCloudDomain,
    qrData,
    chartSize,
    qrFgColor,
    qrBgColor,
    errorCorrectionLevel,
    advancedOptions
  } = params;

  const host = privateCloudDomain || 'image-charts.com';
  const baseUrl = `https://${host}/chart`;

  const queryParts = [
    `cht=qr`,
    `chs=${chartSize || '300x300'}`,
    `chl=${qrData}`,
    `choe=UTF-8`
  ];

  if (qrFgColor) queryParts.push(`icqrf=${qrFgColor}`);
  if (qrBgColor) queryParts.push(`icqrb=${qrBgColor}`);
  if (errorCorrectionLevel) queryParts.push(`chld=${errorCorrectionLevel}`);

  const advancedParams = parseAdvancedOptions(advancedOptions);
  for (const [key, value] of Object.entries(advancedParams)) {
    queryParts.push(`${key}=${value}`);
  }

  if (accountId && !privateCloudDomain) {
    queryParts.push(`icac=${accountId}`);
  }

  const queryString = queryParts.join('&');

  if (accountId && secretKey && !privateCloudDomain) {
    const signature = computeHmacSha256Sync(secretKey, queryString);
    return `${baseUrl}?${queryString}&ichm=${signature}`;
  }

  return `${baseUrl}?${queryString}`;
}

// ============================================================
// Unit Tests
// ============================================================

describe('HMAC-SHA256 Signing', () => {
  test('should compute correct HMAC-SHA256 signature', () => {
    const secretKey = 'test_secret_key';
    const message = 'cht=qr&chs=300x300&chl=Hello&choe=UTF-8&icac=test_account';

    const signature = computeHmacSha256Sync(secretKey, message);

    // Verify signature is 64 hex characters (256 bits)
    expect(signature).toMatch(/^[a-f0-9]{64}$/);

    // Verify signature is deterministic
    const signature2 = computeHmacSha256Sync(secretKey, message);
    expect(signature).toBe(signature2);
  });

  test('should produce different signatures for different messages', () => {
    const secretKey = 'test_secret_key';
    const message1 = 'message1';
    const message2 = 'message2';

    const sig1 = computeHmacSha256Sync(secretKey, message1);
    const sig2 = computeHmacSha256Sync(secretKey, message2);

    expect(sig1).not.toBe(sig2);
  });

  test('should produce different signatures for different keys', () => {
    const message = 'same_message';
    const sig1 = computeHmacSha256Sync('key1', message);
    const sig2 = computeHmacSha256Sync('key2', message);

    expect(sig1).not.toBe(sig2);
  });
});

describe('Color Normalization', () => {
  test('should normalize RRGGBB format', () => {
    expect(normalizeColor('ff0000')).toBe('FF0000');
    expect(normalizeColor('FF0000')).toBe('FF0000');
    expect(normalizeColor('AbCdEf')).toBe('ABCDEF');
  });

  test('should normalize #RRGGBB format', () => {
    expect(normalizeColor('#ff0000')).toBe('FF0000');
    expect(normalizeColor('#FF0000')).toBe('FF0000');
    expect(normalizeColor('#AbCdEf')).toBe('ABCDEF');
  });

  test('should return empty string for invalid colors', () => {
    expect(normalizeColor('')).toBe('');
    expect(normalizeColor(null)).toBe('');
    expect(normalizeColor(undefined)).toBe('');
    expect(normalizeColor('invalid')).toBe('');
    expect(normalizeColor('#FFF')).toBe(''); // 3-char hex not supported
    expect(normalizeColor('rgb(255,0,0)')).toBe(''); // RGB not supported
  });

  test('should handle whitespace', () => {
    expect(normalizeColor('  FF0000  ')).toBe('FF0000');
    expect(normalizeColor('  #FF0000  ')).toBe('FF0000');
  });
});

describe('Advanced Options Parsing', () => {
  test('should parse simple query string', () => {
    const result = parseAdvancedOptions('chof=.svg&chld=H|4');
    expect(result).toEqual({
      'chof': '.svg',
      'chld': 'H|4'
    });
  });

  test('should filter out forbidden parameters', () => {
    const result = parseAdvancedOptions('ichm=fake&icac=fake&chof=.svg');
    expect(result).toEqual({
      'chof': '.svg'
    });
    expect(result.ichm).toBeUndefined();
    expect(result.icac).toBeUndefined();
  });

  test('should handle empty input', () => {
    expect(parseAdvancedOptions('')).toEqual({});
    expect(parseAdvancedOptions(null)).toEqual({});
    expect(parseAdvancedOptions(undefined)).toEqual({});
  });

  test('should handle malformed input', () => {
    const result = parseAdvancedOptions('key1=value1&key2=&=value3&key4');
    expect(result.key1).toBe('value1');
    expect(result.key2).toBe('');
  });
});

describe('Hostname Validation', () => {
  test('should validate correct hostnames', () => {
    expect(isValidHostname('charts.example.com')).toBe(true);
    expect(isValidHostname('my-charts.company.io')).toBe(true);
    expect(isValidHostname('localhost')).toBe(true);
    expect(isValidHostname('sub.domain.example.com')).toBe(true);
  });

  test('should reject invalid hostnames', () => {
    expect(isValidHostname('')).toBe(false);
    expect(isValidHostname(null)).toBe(false);
    expect(isValidHostname(undefined)).toBe(false);
    expect(isValidHostname('-invalid.com')).toBe(false);
    expect(isValidHostname('invalid-.com')).toBe(false);
    expect(isValidHostname('http://example.com')).toBe(false); // URL not hostname
    expect(isValidHostname('example.com/path')).toBe(false); // Contains path
  });

  test('should reject hostnames exceeding max length', () => {
    const longHostname = 'a'.repeat(254) + '.com';
    expect(isValidHostname(longHostname)).toBe(false);
  });
});

describe('QR Code URL Building', () => {
  test('should build basic QR code URL with Enterprise mode', () => {
    const url = buildQrCodeUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      qrData: 'Hello World',
      chartSize: '300x300'
    });

    expect(url).toContain('https://image-charts.com/chart?');
    expect(url).toContain('cht=qr');
    expect(url).toContain('chs=300x300');
    expect(url).toContain('chl=Hello World');
    expect(url).toContain('icac=test_account');
    expect(url).toContain('ichm=');
  });

  test('should build QR code URL with Private Cloud mode', () => {
    const url = buildQrCodeUrl({
      privateCloudDomain: 'charts.mycompany.com',
      qrData: 'Hello World',
      chartSize: '300x300'
    });

    expect(url).toContain('https://charts.mycompany.com/chart?');
    expect(url).toContain('cht=qr');
    expect(url).not.toContain('icac=');
    expect(url).not.toContain('ichm=');
  });

  test('should include optional color parameters', () => {
    const url = buildQrCodeUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      qrData: 'Test',
      qrFgColor: 'FF0000',
      qrBgColor: 'FFFFFF'
    });

    expect(url).toContain('icqrf=FF0000');
    expect(url).toContain('icqrb=FFFFFF');
  });

  test('should include error correction level', () => {
    const url = buildQrCodeUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      qrData: 'Test',
      errorCorrectionLevel: 'H|4'
    });

    expect(url).toContain('chld=H|4');
  });

  test('should include advanced options', () => {
    const url = buildQrCodeUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      qrData: 'Test',
      advancedOptions: 'chof=.svg'
    });

    expect(url).toContain('chof=.svg');
  });

  test('should use default size when not specified', () => {
    const url = buildQrCodeUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      qrData: 'Test'
    });

    expect(url).toContain('chs=300x300');
  });

  test('should produce valid signature', () => {
    const url = buildQrCodeUrl({
      accountId: 'my_account',
      secretKey: 'my_secret_key',
      qrData: 'https://example.com',
      chartSize: '200x200'
    });

    // Extract the signature from the URL
    const match = url.match(/ichm=([a-f0-9]{64})/);
    expect(match).not.toBeNull();

    // Verify the signature by recomputing it
    const urlParts = url.split('&ichm=');
    const queryString = urlParts[0].replace('https://image-charts.com/chart?', '');
    const expectedSignature = computeHmacSha256Sync('my_secret_key', queryString);

    expect(match[1]).toBe(expectedSignature);
  });
});

describe('URL Building - Edge Cases', () => {
  test('should handle QR data with special characters', () => {
    const url = buildQrCodeUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      qrData: 'https://example.com?param=value'
    });

    // Data should be included as-is (not URL-encoded before signing)
    expect(url).toContain('chl=https://example.com?param=value');
  });

  test('should handle empty optional parameters', () => {
    const url = buildQrCodeUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      qrData: 'Test',
      qrFgColor: '',
      qrBgColor: '',
      errorCorrectionLevel: '',
      advancedOptions: ''
    });

    expect(url).not.toContain('icqrf=');
    expect(url).not.toContain('icqrb=');
    expect(url).not.toContain('chld=');
  });
});
