
# @image-charts/pcf-qrcode

[![npm version](https://img.shields.io/npm/v/%40image-charts/pcf-qrcode.svg)](https://www.npmjs.com/package/@image-charts/pcf-qrcode)
[![npm downloads](https://img.shields.io/npm/dm/%40image-charts/pcf-qrcode.svg)](https://www.npmjs.com/package/@image-charts/pcf-qrcode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Generate signed [Image-Charts](https://image-charts.com) QR Codes directly in Microsoft Power Apps Canvas Apps

![QR Code Generator in Power Apps](https://documentation.image-charts.com/assets/pcf-qrcode-hero.png)

## Quick Start

### 1. Install the package

```bash
npm install @image-charts/pcf-qrcode
```

### 2. Import the solution into Power Apps

The solution file is located at:
```
node_modules/@image-charts/pcf-qrcode/solution/ImageChartsQRCode.zip
```

1. Go to [make.powerapps.com](https://make.powerapps.com)
2. Select your environment
3. Navigate to **Solutions** > **Import**
4. Select the `.zip` file and follow the import wizard

### 3. Add the component to your Canvas App

1. Open your Canvas App in edit mode
2. Go to **Insert** (+) > **Code components** > **Import component**
3. Select **QRCodeGenerator**
4. Drag the component onto your screen

```powerapps-fx
// Configure the component
QRCodeGenerator.accountId = "YOUR_ACCOUNT_ID"
QRCodeGenerator.secretKey = "YOUR_SECRET_KEY"
QRCodeGenerator.qrData = TextInput1.Text
QRCodeGenerator.chartSize = "300x300"
```

## Demo

![QR Code Generator Demo](https://documentation.image-charts.com/assets/pcf-qrcode-demo.gif)

## Documentation

**Full tutorial and documentation:** [https://documentation.image-charts.com/integrations/power-apps/](https://documentation.image-charts.com/integrations/power-apps/)

---

## Authentication Modes

### Enterprise Mode (HMAC Signing)

For Image-Charts Enterprise customers. URLs are signed with HMAC-SHA256.

```powerapps-fx
QRCodeGenerator.accountId = "your_account_id"
QRCodeGenerator.secretKey = "your_secret_key"
```

### Private Cloud Mode

For Image-Charts Private Cloud customers. No signature required.

```powerapps-fx
QRCodeGenerator.privateCloudDomain = "charts.yourcompany.com"
```

> **Note:** Private Cloud mode does not require `accountId` or `secretKey`.

---

## API Reference

### Input Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `accountId` | Text | No* | - | Image-Charts Enterprise Account ID |
| `secretKey` | Text | No* | - | Image-Charts Enterprise Secret Key |
| `privateCloudDomain` | Text | No* | - | Private Cloud domain (e.g., `charts.mycompany.com`) |
| `qrData` | Text | **Yes** | - | Data to encode in the QR Code |
| `chartSize` | Text | No | `300x300` | Size in pixels (format: `WIDTHxHEIGHT`) |
| `qrForegroundColor` | Text | No | `000000` | Foreground color (hex: `RRGGBB` or `#RRGGBB`) |
| `qrBackgroundColor` | Text | No | `FFFFFF` | Background color (hex: `RRGGBB` or `#RRGGBB`) |
| `errorCorrectionLevel` | Text | No | `M` | Error correction: `L`, `M`, `Q`, or `H` |
| `advancedOptions` | Text | No | - | Additional parameters (format: `key=value&key2=value2`) |
| `showDebugUrl` | Boolean | No | `false` | Display generated URL below the QR Code |
| `errorPlaceholderUrl` | Text | No | - | Custom image URL for error state |

*\*Either `accountId` + `secretKey` OR `privateCloudDomain` is required.*

### Output Properties

| Property | Type | Description |
|----------|------|-------------|
| `signedUrl` | Text | The complete Image-Charts URL (signed if Enterprise mode) |

---

## Examples

### Basic QR Code

```powerapps-fx
QRCodeGenerator.accountId = "my_account"
QRCodeGenerator.secretKey = "my_secret"
QRCodeGenerator.qrData = "https://example.com"
```

### Dynamic QR Code from TextInput

```powerapps-fx
QRCodeGenerator.qrData = TextInputURL.Text
```

### Custom Colors

```powerapps-fx
QRCodeGenerator.qrForegroundColor = "0000FF"  // Blue
QRCodeGenerator.qrBackgroundColor = "FFFF00"  // Yellow
```

### High Error Correction

```powerapps-fx
QRCodeGenerator.errorCorrectionLevel = "H"  // 30% error correction
QRCodeGenerator.advancedOptions = "chld=H|4" // With 4px margin
```

### Display the Generated URL

```powerapps-fx
QRCodeGenerator.showDebugUrl = true

// Access the URL in a Label
Label1.Text = QRCodeGenerator.signedUrl
```

---

## Troubleshooting

### QR Code shows watermark

- Verify your `accountId` and `secretKey` are correct
- Check that your Enterprise subscription is active
- Enable `showDebugUrl` to inspect the generated URL

### QR Code doesn't update

- The component has a 300ms debounce delay to prevent excessive API calls
- Wait a moment after changing inputs for the QR Code to refresh

### Error: "Missing authentication"

- Provide either `accountId` + `secretKey` (Enterprise) **OR** `privateCloudDomain` (Private Cloud)
- Both modes cannot be used simultaneously

### Network errors

- The component retries failed requests up to 3 times with exponential backoff
- Total timeout is 15 seconds
- Check your network connectivity

---

## Alternative Installation (CLI)

For development environments, you can push directly:

```bash
# Authenticate with your Power Platform environment
pac auth create --url https://your-org.crm.dynamics.com

# Push the component
npx @image-charts/pcf-qrcode push --publisher-prefix ic
```

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## License

MIT - see [LICENSE](./LICENSE)

## Support

- **Documentation:** [https://documentation.image-charts.com](https://documentation.image-charts.com)
- **Issues:** [https://github.com/image-charts/pcf-qrcode/issues](https://github.com/image-charts/pcf-qrcode/issues)
- **Email:** support@image-charts.com

---

<p align="center">
  Made with love by <a href="https://image-charts.com">Image-Charts</a>
</p>
