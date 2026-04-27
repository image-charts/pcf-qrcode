
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-04-27

### Added

- **Initial Release** of Image-Charts QR Code Generator for Power Apps

#### Features

- **Enterprise Mode (HMAC Signing)**
  - Secure URL signing with HMAC-SHA256
  - Account ID and Secret Key authentication
  - Watermark-free QR Code generation

- **Private Cloud Mode**
  - Support for custom Image-Charts domains
  - No signature required
  - Direct domain configuration

- **QR Code Customization**
  - Custom size (WIDTHxHEIGHT format)
  - Foreground color (hex format RRGGBB or #RRGGBB)
  - Background color (hex format RRGGBB or #RRGGBB)
  - Error correction levels (L, M, Q, H)

- **Advanced Features**
  - Additional parameters via query string format
  - Debug mode to display generated URL
  - Custom error placeholder image

- **Reliability**
  - 300ms debounce on input changes
  - Retry with exponential backoff (up to 3 retries)
  - 15 second total timeout
  - Graceful error handling with placeholder

- **Developer Experience**
  - Pre-built Power Platform solution (.zip)
  - TypeScript source code included
  - Comprehensive unit tests
  - Integration tests against production API
  - CLI installation helper

#### Properties

| Property | Direction | Description |
|----------|-----------|-------------|
| `accountId` | Input | Enterprise Account ID |
| `secretKey` | Input | Enterprise Secret Key |
| `privateCloudDomain` | Input | Private Cloud domain |
| `qrData` | Input | Data to encode |
| `chartSize` | Input | QR Code size |
| `qrForegroundColor` | Input | Foreground color |
| `qrBackgroundColor` | Input | Background color |
| `errorCorrectionLevel` | Input | Error correction level |
| `advancedOptions` | Input | Additional parameters |
| `showDebugUrl` | Input | Show debug URL |
| `errorPlaceholderUrl` | Input | Custom error image |
| `signedUrl` | Output | Generated URL |

### Technical Details

- Built with Power Apps Component Framework (PCF)
- Uses Web Crypto API with crypto-js fallback for HMAC-SHA256
- Compatible with Canvas Apps
- Tested on Power Platform environments

---

[1.0.1]: https://github.com/image-charts/pcf-qrcode/releases/tag/v1.0.1
