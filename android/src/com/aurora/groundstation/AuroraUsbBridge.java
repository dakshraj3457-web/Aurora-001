package com.aurora.groundstation;

import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

/**
 * JavaScript Interface Bridge binding native Android USB Host APIs to the React Mission Control app.
 */
public class AuroraUsbBridge implements UsbSerialManager.UsbEventListener {
    private final Activity mActivity;
    private final WebView mWebView;
    private final UsbSerialManager mUsbManager;

    public AuroraUsbBridge(Activity activity, WebView webView, UsbSerialManager usbManager) {
        mActivity = activity;
        mWebView = webView;
        mUsbManager = usbManager;
        mUsbManager.setEventListener(this);
    }

    @JavascriptInterface
    public boolean isNativeAvailable() {
        return true;
    }

    @JavascriptInterface
    public String scanDevices() {
        return mUsbManager.scanDevicesJson();
    }

    @JavascriptInterface
    public void scanAndConnect() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                mUsbManager.scanAndAutoConnect();
            }
        });
    }

    @JavascriptInterface
    public void requestPermission() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                mUsbManager.scanAndAutoConnect();
            }
        });
    }

    @JavascriptInterface
    public void connect(final int baudRate) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                mUsbManager.setBaudRate(baudRate);
                mUsbManager.scanAndAutoConnect();
            }
        });
    }

    @JavascriptInterface
    public void disconnect() {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                mUsbManager.disconnect();
            }
        });
    }

    @JavascriptInterface
    public boolean sendCommand(String cmd) {
        mUsbManager.sendCommand(cmd);
        return true;
    }

    @JavascriptInterface
    public String getConnectionState() {
        return mUsbManager.getConnectionState();
    }

    @JavascriptInterface
    public int getBaudRate() {
        return mUsbManager.getBaudRate();
    }

    @JavascriptInterface
    public void setBaudRate(int baud) {
        mUsbManager.setBaudRate(baud);
    }

    // UsbEventListener callbacks forwarded to WebView
    @Override
    public void onConnectionStateChange(final String state, final String deviceName, final String errorMsg) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                StringBuilder sb = new StringBuilder();
                sb.append("{\"type\":\"state_change\",")
                  .append("\"state\":\"").append(escape(state)).append("\",")
                  .append("\"device\":").append(deviceName == null ? "null" : "\"" + escape(deviceName) + "\"").append(",")
                  .append("\"error\":").append(errorMsg == null ? "null" : "\"" + escape(errorMsg) + "\"")
                  .append("}");
                emitJs(sb.toString());
            }
        });
    }

    @Override
    public void onLineReceived(final String line) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                StringBuilder sb = new StringBuilder();
                sb.append("{\"type\":\"data\",")
                  .append("\"line\":\"").append(escape(line)).append("\"")
                  .append("}");
                emitJs(sb.toString());
            }
        });
    }

    @Override
    public void onLineSent(final String line, final boolean success) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                StringBuilder sb = new StringBuilder();
                sb.append("{\"type\":\"line_sent\",")
                  .append("\"line\":\"").append(escape(line)).append("\",")
                  .append("\"success\":").append(success)
                  .append("}");
                emitJs(sb.toString());
            }
        });
    }

    @Override
    public void onLog(final String level, final String message) {
        mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                StringBuilder sb = new StringBuilder();
                sb.append("{\"type\":\"log\",")
                  .append("\"level\":\"").append(escape(level)).append("\",")
                  .append("\"message\":\"").append(escape(message)).append("\"")
                  .append("}");
                emitJs(sb.toString());
            }
        });
    }

    private void emitJs(String json) {
        if (mWebView != null) {
            String js = "if (window.onAuroraUsbEvent) { window.onAuroraUsbEvent(" + json + "); }";
            mWebView.evaluateJavascript(js, null);
        }
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
