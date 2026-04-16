/**
 * QRCodeGenerator - Image-Charts PCF Component
 *
 * Generates signed Image-Charts QR Codes for Microsoft Power Apps.
 * Supports Enterprise mode (HMAC signing) and Private Cloud mode.
 *
 * @version 1.0.0
 * @see https://documentation.image-charts.com/qr-codes/
 */

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import {
  computeHmacSha256Sync,
  normalizeColor,
  parseAdvancedOptions,
  isValidHostname,
  debounce,
  loadImageWithRetry,
  createErrorPlaceholder,
  buildUserAgent,
  IMAGE_CHARTS_VERSION,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_TIMEOUT_MS
} from "../shared/image-charts-utils";

const COMPONENT_NAME = 'qrcode';

export class QRCodeGenerator implements ComponentFramework.StandardControl<IInputs, IOutputs> {

  // DOM elements
  private _container!: HTMLDivElement;
  private _imgElement!: HTMLImageElement;
  private _debugElement: HTMLDivElement | null = null;

  // State
  private _signedUrl: string = "";
  private _notifyOutputChanged!: () => void;
  private _isLoading: boolean = false;

  // Debounced update function
  private _debouncedUpdate!: (context: ComponentFramework.Context<IInputs>) => void;

  /**
   * init() - Called once when the component is loaded.
   *
   * Creates the HTML structure for displaying the QR Code.
   */
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this._notifyOutputChanged = notifyOutputChanged;
    this._container = container;

    // Create main container
    this._container.className = 'image-charts-qrcode-container';

    // Create image element
    this._imgElement = document.createElement("img");
    this._imgElement.setAttribute("id", "qrCodeImage");
    this._imgElement.setAttribute("alt", "QR Code");
    this._imgElement.className = 'image-charts-qrcode';
    this._container.appendChild(this._imgElement);

    // Create debounced update function
    this._debouncedUpdate = debounce(
      (ctx: ComponentFramework.Context<IInputs>) => this._performUpdate(ctx),
      DEFAULT_DEBOUNCE_MS
    );
  }

  /**
   * updateView() - Called when any input property changes.
   *
   * Debounces updates to avoid excessive API calls.
   */
  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this._debouncedUpdate(context);
  }

  /**
   * Perform the actual update after debounce.
   */
  private _performUpdate(context: ComponentFramework.Context<IInputs>): void {
    // Read input properties
    const accountId = context.parameters.accountId?.raw || "";
    const secretKey = context.parameters.secretKey?.raw || "";
    const privateCloudDomain = context.parameters.privateCloudDomain?.raw || "";
    const qrData = context.parameters.qrData?.raw || "";
    const chartSize = context.parameters.chartSize?.raw || "300x300";
    const qrFgColor = normalizeColor(context.parameters.qrForegroundColor?.raw || undefined);
    const qrBgColor = normalizeColor(context.parameters.qrBackgroundColor?.raw || undefined);
    const errorCorrectionLevel = context.parameters.errorCorrectionLevel?.raw || "";
    const advancedOptions = context.parameters.advancedOptions?.raw || "";
    const showDebugUrl = context.parameters.showDebugUrl?.raw || false;
    const errorPlaceholderUrl = context.parameters.errorPlaceholderUrl?.raw || "";

    // Validate required data
    if (!qrData) {
      this._showError("Missing QR data", errorPlaceholderUrl);
      return;
    }

    // Validate authentication mode
    const isEnterpriseMode = accountId && secretKey;
    const isPrivateCloudMode = privateCloudDomain && isValidHostname(privateCloudDomain);

    if (!isEnterpriseMode && !isPrivateCloudMode) {
      this._showError("Missing authentication. Provide accountId + secretKey (Enterprise) or privateCloudDomain (Private Cloud).", errorPlaceholderUrl);
      return;
    }

    // Build the chart URL
    const url = this._buildQrCodeUrl({
      accountId,
      secretKey,
      privateCloudDomain,
      qrData,
      chartSize,
      qrFgColor,
      qrBgColor,
      errorCorrectionLevel,
      advancedOptions
    });

    this._signedUrl = url;

    // Load image with retry
    this._loadImage(url, errorPlaceholderUrl);

    // Update debug display
    this._updateDebugDisplay(showDebugUrl, url);

    // Notify Power Apps of output change
    this._notifyOutputChanged();
  }

  /**
   * Build the Image-Charts QR Code URL.
   */
  private _buildQrCodeUrl(params: {
    accountId: string;
    secretKey: string;
    privateCloudDomain: string;
    qrData: string;
    chartSize: string;
    qrFgColor: string;
    qrBgColor: string;
    errorCorrectionLevel: string;
    advancedOptions: string;
  }): string {
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

    // Determine base host
    const host = privateCloudDomain || 'image-charts.com';
    const baseUrl = `https://${host}/chart`;

    // Build query string parts
    // IMPORTANT: Do NOT URL-encode parameters before signing (Image-Charts recommendation)
    const queryParts: string[] = [
      `cht=qr`,
      `chs=${chartSize}`,
      `chl=${qrData}`,
      `choe=UTF-8`
    ];

    // Add optional parameters
    if (qrFgColor) {
      queryParts.push(`icqrf=${qrFgColor}`);
    }
    if (qrBgColor) {
      queryParts.push(`icqrb=${qrBgColor}`);
    }
    if (errorCorrectionLevel) {
      queryParts.push(`chld=${errorCorrectionLevel}`);
    }

    // Parse and add advanced options (filtering out forbidden params)
    const advancedParams = parseAdvancedOptions(advancedOptions);
    for (const [key, value] of Object.entries(advancedParams)) {
      queryParts.push(`${key}=${value}`);
    }

    // Add account ID for Enterprise mode
    if (accountId && !privateCloudDomain) {
      queryParts.push(`icac=${accountId}`);
    }

    const queryString = queryParts.join('&');

    // Sign if Enterprise mode
    if (accountId && secretKey && !privateCloudDomain) {
      const signature = computeHmacSha256Sync(secretKey, queryString);
      return `${baseUrl}?${queryString}&ichm=${signature}`;
    }

    return `${baseUrl}?${queryString}`;
  }

  /**
   * Load image with retry logic.
   */
  private _loadImage(url: string, errorPlaceholderUrl: string): void {
    if (this._isLoading) return;
    this._isLoading = true;

    // Clear previous error state
    this._clearError();

    loadImageWithRetry(url, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      totalTimeout: DEFAULT_TIMEOUT_MS
    })
      .then(() => {
        this._imgElement.src = url;
        this._imgElement.style.display = 'block';
        this._isLoading = false;
      })
      .catch((error: Error) => {
        console.error('[QRCodeGenerator] Image load failed:', error.message);
        this._showError(error.message, errorPlaceholderUrl);
        this._isLoading = false;
      });
  }

  /**
   * Show error state.
   */
  private _showError(message: string, customPlaceholderUrl: string): void {
    this._imgElement.style.display = 'none';
    this._signedUrl = "";

    // Remove existing error placeholder
    const existingError = this._container.querySelector('.image-charts-error');
    if (existingError) {
      existingError.remove();
    }

    // Create and append error placeholder
    const errorElement = createErrorPlaceholder(message, customPlaceholderUrl || undefined);
    this._container.appendChild(errorElement);

    this._notifyOutputChanged();
  }

  /**
   * Clear error state.
   */
  private _clearError(): void {
    const existingError = this._container.querySelector('.image-charts-error');
    if (existingError) {
      existingError.remove();
    }
  }

  /**
   * Update debug URL display.
   */
  private _updateDebugDisplay(showDebug: boolean, url: string): void {
    if (showDebug) {
      if (!this._debugElement) {
        this._debugElement = document.createElement('div');
        this._debugElement.className = 'image-charts-debug-url';
        this._container.appendChild(this._debugElement);
      }
      this._debugElement.textContent = url;
      this._debugElement.style.display = 'block';
    } else if (this._debugElement) {
      this._debugElement.style.display = 'none';
    }
  }

  /**
   * getOutputs() - Returns output properties to Power Apps.
   */
  public getOutputs(): IOutputs {
    return {
      signedUrl: this._signedUrl
    };
  }

  /**
   * destroy() - Cleanup when component is removed.
   */
  public destroy(): void {
    // Cleanup if needed
  }
}
