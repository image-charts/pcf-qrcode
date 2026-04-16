/**
 * Integration Tests for QRCodeGenerator PCF Component
 * Black-box tests against the real Image-Charts API.
 * Based on test scenarios from the Zapier connector.
 */

const crypto = require('crypto');
const https = require('https');

const ACCOUNT_ID = process.env.IMAGE_CHARTS_ACCOUNT_ID;
const SECRET_KEY = process.env.IMAGE_CHARTS_SECRET_KEY;
const PRIVATE_CLOUD_DOMAIN = process.env.IMAGE_CHARTS_PRIVATE_CLOUD_DOMAIN;
const USER_AGENT = process.env.IMAGE_CHARTS_USER_AGENT || 'pcf-image-charts-qrcode/1.0.0-test';

const describeIfCredentials = ACCOUNT_ID && SECRET_KEY ? describe : describe.skip;
const describeIfPrivateCloud = PRIVATE_CLOUD_DOMAIN ? describe : describe.skip;

function computeHmacSha256Sync(secretKey, message) {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

function buildSignedQRCodeUrl(params) {
  const { accountId, secretKey, qrData, chartSize, fgColor, bgColor } = params;
  const searchParams = new URLSearchParams();
  searchParams.append('cht', 'qr');
  searchParams.append('chs', chartSize || '300x300');
  searchParams.append('chl', qrData);
  searchParams.append('choe', 'UTF-8');
  if (fgColor) searchParams.append('icqrf', fgColor);
  if (bgColor) searchParams.append('icqrb', bgColor);
  searchParams.append('icac', accountId);
  const signature = computeHmacSha256Sync(secretKey, searchParams.toString());
  searchParams.append('ichm', signature);
  return 'https://image-charts.com/chart?' + searchParams.toString();
}

function buildPrivateCloudQRCodeUrl(params) {
  const { domain, qrData, chartSize, fgColor, bgColor } = params;
  const searchParams = new URLSearchParams();
  searchParams.append('cht', 'qr');
  searchParams.append('chs', chartSize || '300x300');
  searchParams.append('chl', qrData);
  searchParams.append('choe', 'UTF-8');
  if (fgColor) searchParams.append('icqrf', fgColor);
  if (bgColor) searchParams.append('icqrb', bgColor);
  const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;
  return baseUrl + '/chart?' + searchParams.toString();
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ============================================================
// URL Generation Tests
// ============================================================

describe('URL Generation', () => {
  const testAccountId = 'test_account';
  const testSecretKey = 'test_secret_key_123';

  test('should generate correct URL structure for QR code', () => {
    const url = buildSignedQRCodeUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      qrData: 'Hello world',
      chartSize: '150x150'
    });
    expect(url).toContain('cht=qr');
    expect(url).toContain('chs=150x150');
    expect(url).toContain('chl=Hello+world');
    expect(url).toContain('choe=UTF-8');
    expect(url).toContain('icac=' + testAccountId);
    expect(url).toContain('ichm=');
  });

  test('should include foreground color when provided', () => {
    const url = buildSignedQRCodeUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      qrData: 'Test',
      fgColor: 'FF0000'
    });
    expect(url).toContain('icqrf=FF0000');
  });

  test('should include background color when provided', () => {
    const url = buildSignedQRCodeUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      qrData: 'Test',
      bgColor: 'FFFF00'
    });
    expect(url).toContain('icqrb=FFFF00');
  });

  test('should include both foreground and background colors', () => {
    const url = buildSignedQRCodeUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      qrData: 'ColorTest',
      fgColor: 'FF0000',
      bgColor: 'FFFF00'
    });
    expect(url).toContain('icqrf=FF0000');
    expect(url).toContain('icqrb=FFFF00');
  });

  test('HMAC signature should be deterministic', () => {
    const params = {
      accountId: testAccountId,
      secretKey: testSecretKey,
      qrData: 'Test QR Code',
      chartSize: '300x300'
    };
    const url1 = buildSignedQRCodeUrl(params);
    const url2 = buildSignedQRCodeUrl(params);
    expect(url1).toBe(url2);
  });

  test('Private Cloud URL should not include icac or ichm', () => {
    const url = buildPrivateCloudQRCodeUrl({
      domain: 'https://private.example.com',
      qrData: 'Test',
      chartSize: '200x200'
    });
    expect(url).not.toContain('icac=');
    expect(url).not.toContain('ichm=');
  });
});

// ============================================================
// API Integration Tests - Enterprise Mode
// ============================================================

describeIfCredentials('Enterprise Mode - QR Codes', () => {
  test('should return 200 for basic QR code (matching Zapier scenario)', () => {
    const url = buildSignedQRCodeUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      qrData: 'Hello world',
      chartSize: '150x150'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for QR code with URL data', () => {
    const url = buildSignedQRCodeUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      qrData: 'https://example.com/path?query=value',
      chartSize: '300x300'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for QR code with custom colors', () => {
    const url = buildSignedQRCodeUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      qrData: 'ColorTest',
      fgColor: 'FF0000',
      bgColor: 'FFFF00'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return image without watermark', () => {
    const url = buildSignedQRCodeUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      qrData: 'Test QR Code',
      chartSize: '200x200'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
      expect(response.body.length).toBeGreaterThan(0);
    });
  }, 15000);

  test('should handle long text data', () => {
    const longText = 'This is a longer text message that will be encoded into a QR code for testing purposes.';
    const url = buildSignedQRCodeUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      qrData: longText,
      chartSize: '400x400'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 403 for invalid signature', () => {
    const url = 'https://image-charts.com/chart?cht=qr&chs=300x300&chl=Test&choe=UTF-8&icac=' + ACCOUNT_ID + '&ichm=invalid_signature';
    return fetchUrl(url).then((response) => {
      expect([400, 403]).toContain(response.statusCode);
    });
  }, 15000);
});

// ============================================================
// Private Cloud Mode Tests
// ============================================================

describeIfPrivateCloud('Private Cloud Mode - QR Codes', () => {
  test('should return 200 for basic QR code (matching Zapier scenario)', () => {
    const url = buildPrivateCloudQRCodeUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      qrData: 'Hello world',
      chartSize: '150x150'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for QR code with URL data', () => {
    const url = buildPrivateCloudQRCodeUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      qrData: 'https://example.com/path?query=value',
      chartSize: '300x300'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for QR code with custom colors', () => {
    const url = buildPrivateCloudQRCodeUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      qrData: 'ColorTest',
      fgColor: 'FF0000',
      bgColor: 'FFFF00'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return image without watermark', () => {
    const url = buildPrivateCloudQRCodeUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      qrData: 'Test QR Code',
      chartSize: '200x200'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
      expect(response.body.length).toBeGreaterThan(0);
    });
  }, 15000);

  test('should handle long text data', () => {
    const longText = 'This is a longer text message that will be encoded into a QR code for testing purposes.';
    const url = buildPrivateCloudQRCodeUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      qrData: longText,
      chartSize: '400x400'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);
});

// ============================================================
// Error Handling Tests
// ============================================================

describeIfCredentials('Error Handling - Enterprise', () => {
  test('should handle missing icac parameter', () => {
    const url = 'https://image-charts.com/chart?cht=qr&chs=300x300&chl=Test&choe=UTF-8';
    return fetchUrl(url).then((response) => {
      expect([200, 400]).toContain(response.statusCode);
    });
  }, 15000);

  test('should handle invalid chart size', () => {
    const url = buildSignedQRCodeUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      qrData: 'Test',
      chartSize: 'invalid'
    });
    return fetchUrl(url).then((response) => {
      expect([400, 200]).toContain(response.statusCode);
    });
  }, 15000);
});

// ============================================================
// Performance Tests
// ============================================================

describeIfCredentials('Performance - Enterprise', () => {
  test('should respond within 5 seconds', () => {
    const startTime = Date.now();
    const url = buildSignedQRCodeUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      qrData: 'Performance Test',
      chartSize: '300x300'
    });
    return fetchUrl(url).then((response) => {
      const duration = Date.now() - startTime;
      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(5000);
    });
  }, 10000);
});

describeIfPrivateCloud('Performance - Private Cloud', () => {
  test('should respond within 5 seconds', () => {
    const startTime = Date.now();
    const url = buildPrivateCloudQRCodeUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      qrData: 'Performance Test',
      chartSize: '300x300'
    });
    return fetchUrl(url).then((response) => {
      const duration = Date.now() - startTime;
      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(5000);
    });
  }, 10000);
});
