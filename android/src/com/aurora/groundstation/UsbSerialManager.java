package com.aurora.groundstation;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Native Android USB Host Manager for Arduino UNO communications.
 * Handles device discovery, permission requests, connection state,
 * and background serial reading/writing.
 */
public class UsbSerialManager {
    private static final String TAG = "AuroraUsb";
    public static final String ACTION_USB_PERMISSION = "com.aurora.groundstation.USB_PERMISSION";

    public interface UsbEventListener {
        void onConnectionStateChange(String state, String deviceName, String errorMsg);
        void onLineReceived(String line);
        void onLineSent(String line, boolean success);
        void onLog(String level, String message);
    }

    private final Context mContext;
    private final UsbManager mUsbManager;
    private final Handler mMainHandler;
    private final ExecutorService mExecutor;

    private UsbEventListener mListener;
    private UsbSerialDriver mCurrentDriver;
    private UsbDevice mCurrentDevice;
    private Thread mReadThread;
    private volatile boolean mIsRunning = false;

    private String mConnectionState = "DISCONNECTED";
    private int mBaudRate = 9600;
    private String mLastErrorMessage = null;

    private final BroadcastReceiver mUsbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        if (device != null) {
                            logInfo("USB Permission GRANTED for " + getDeviceDisplayName(device));
                            connectDevice(device, mBaudRate);
                        }
                    } else {
                        logWarn("USB Permission DENIED by user for device");
                        setState("ERROR", device != null ? getDeviceDisplayName(device) : null,
                                "USB permission denied by user. Allow USB access to communicate with Arduino UNO.");
                    }
                }
            } else if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                if (device != null) {
                    logInfo("USB device attached: " + getDeviceDisplayName(device));
                    if (isArduinoDevice(device)) {
                        setState("DEVICE FOUND", getDeviceDisplayName(device), null);
                        requestPermission(device);
                    }
                }
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                if (device != null && mCurrentDevice != null && device.getDeviceId() == mCurrentDevice.getDeviceId()) {
                    logWarn("Active Arduino UNO USB cable disconnected");
                    disconnect();
                    setState("DISCONNECTED", null, "Arduino UNO cable disconnected");
                }
            }
        }
    };

    public UsbSerialManager(Context context) {
        mContext = context;
        mUsbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        mMainHandler = new Handler(Looper.getMainLooper());
        mExecutor = Executors.newSingleThreadExecutor();

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_USB_PERMISSION);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);

        mContext.registerReceiver(mUsbReceiver, filter);
    }

    public void setEventListener(UsbEventListener listener) {
        mListener = listener;
    }

    public String getConnectionState() {
        return mConnectionState;
    }

    public int getBaudRate() {
        return mBaudRate;
    }

    public void setBaudRate(int baudRate) {
        mBaudRate = baudRate;
        if (mCurrentDriver != null && mCurrentDriver.isOpen()) {
            try {
                mCurrentDriver.setBaudRate(baudRate);
                logInfo("Baud rate dynamically updated to " + baudRate);
            } catch (IOException e) {
                logWarn("Failed to update baud rate: " + e.getMessage());
            }
        }
    }

    public void scanAndAutoConnect() {
        if (mUsbManager == null) {
            setState("ERROR", null, "USB Host subsystem unavailable on this device");
            return;
        }

        HashMap<String, UsbDevice> deviceList = mUsbManager.getDeviceList();
        if (deviceList == null || deviceList.isEmpty()) {
            setState("DISCONNECTED", null, "No USB devices detected. Connect Arduino UNO via USB OTG adapter.");
            return;
        }

        UsbDevice targetDevice = null;
        for (UsbDevice device : deviceList.values()) {
            if (isArduinoDevice(device)) {
                targetDevice = device;
                break;
            }
        }

        if (targetDevice != null) {
            String name = getDeviceDisplayName(targetDevice);
            logInfo("Discovered Arduino UNO: " + name);
            if (mUsbManager.hasPermission(targetDevice)) {
                connectDevice(targetDevice, mBaudRate);
            } else {
                setState("PERMISSION REQUIRED", name, null);
                requestPermission(targetDevice);
            }
        } else {
            setState("DISCONNECTED", null, "Connected USB device is not recognized as Arduino UNO or supported serial chip");
        }
    }

    public void requestPermission(UsbDevice device) {
        if (device == null || mUsbManager == null) return;
        setState("PERMISSION REQUIRED", getDeviceDisplayName(device), null);

        int flags = 0;
        if (Build.VERSION.SDK_INT >= 31) {
            flags = 0x02000000; // PendingIntent.FLAG_MUTABLE
        }
        PendingIntent permissionIntent = PendingIntent.getBroadcast(
                mContext, 0, new Intent(ACTION_USB_PERMISSION), flags);
        mUsbManager.requestPermission(device, permissionIntent);
    }

    public synchronized void connectDevice(final UsbDevice device, final int baudRate) {
        if (device == null || mUsbManager == null) {
            setState("ERROR", null, "No USB device specified");
            return;
        }

        mCurrentDevice = device;
        mBaudRate = baudRate;
        setState("CONNECTING", getDeviceDisplayName(device), null);

        mExecutor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    UsbDeviceConnection connection = mUsbManager.openDevice(device);
                    if (connection == null) {
                        postState("ERROR", getDeviceDisplayName(device),
                                "Failed to open USB device. Ensure phone supports USB OTG and provides sufficient bus power.");
                        return;
                    }

                    UsbSerialDriver driver;
                    if (device.getVendorId() == 0x1A86) {
                        driver = new Ch340SerialDriver(device, connection);
                    } else {
                        // Standard Arduino UNO CDC-ACM
                        driver = new CdcAcmSerialDriver(device, connection);
                    }

                    driver.setBaudRate(baudRate);
                    driver.open();
                    mCurrentDriver = driver;

                    postState("CONNECTED", getDeviceDisplayName(device), null);
                    logInfo("Connected to " + driver.getDriverName() + " at " + baudRate + " baud (offline USB OTG link)");

                    startReaderThread();
                } catch (Exception e) {
                    Log.e(TAG, "USB open error", e);
                    postState("ERROR", getDeviceDisplayName(device), "Connection error: " + e.getMessage());
                }
            }
        });
    }

    private void startReaderThread() {
        mIsRunning = true;
        mReadThread = new Thread(new Runnable() {
            @Override
            public void run() {
                byte[] buffer = new byte[256];
                ByteArrayOutputStream lineBuffer = new ByteArrayOutputStream();

                while (mIsRunning && mCurrentDriver != null && mCurrentDriver.isOpen()) {
                    try {
                        int count = mCurrentDriver.read(buffer, 250);
                        if (count > 0) {
                            for (int i = 0; i < count; i++) {
                                byte b = buffer[i];
                                if (b == '\n') {
                                    final String line = lineBuffer.toString(StandardCharsets.UTF_8.name()).trim();
                                    lineBuffer.reset();
                                    if (!line.isEmpty()) {
                                        mMainHandler.post(new Runnable() {
                                            @Override
                                            public void run() {
                                                if (mListener != null) {
                                                    mListener.onLineReceived(line);
                                                }
                                            }
                                        });
                                    }
                                } else if (b != '\r') {
                                    lineBuffer.write(b);
                                }
                            }
                        }
                    } catch (IOException e) {
                        if (mIsRunning) {
                            Log.w(TAG, "Serial read loop IOException: " + e.getMessage());
                            postState("ERROR", mCurrentDevice != null ? getDeviceDisplayName(mCurrentDevice) : null,
                                    "Serial read interrupted: " + e.getMessage());
                            disconnect();
                        }
                        break;
                    }
                }
            }
        }, "AuroraUsbReaderThread");
        mReadThread.start();
    }

    public synchronized void sendCommand(final String command) {
        if (!"CONNECTED".equals(mConnectionState) || mCurrentDriver == null || !mCurrentDriver.isOpen()) {
            logWarn("Cannot send command while disconnected: " + command);
            if (mListener != null) {
                mListener.onLineSent(command, false);
            }
            return;
        }

        mExecutor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String toSend = command.endsWith("\n") ? command : command + "\n";
                    byte[] bytes = toSend.getBytes(StandardCharsets.UTF_8);
                    mCurrentDriver.write(bytes, 1000);
                    mMainHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            if (mListener != null) {
                                mListener.onLineSent(command, true);
                            }
                        }
                    });
                } catch (final Exception e) {
                    Log.e(TAG, "Send command failed: " + command, e);
                    mMainHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            if (mListener != null) {
                                mListener.onLineSent(command, false);
                                mListener.onLog("ERROR", "Send failed: " + e.getMessage());
                            }
                        }
                    });
                }
            }
        });
    }

    public synchronized void disconnect() {
        mIsRunning = false;
        if (mReadThread != null) {
            mReadThread.interrupt();
            mReadThread = null;
        }
        if (mCurrentDriver != null) {
            try {
                mCurrentDriver.close();
            } catch (Exception ignored) {
            }
            mCurrentDriver = null;
        }
        mCurrentDevice = null;
        setState("DISCONNECTED", null, null);
    }

    public void destroy() {
        disconnect();
        try {
            mContext.unregisterReceiver(mUsbReceiver);
        } catch (Exception ignored) {
        }
        mExecutor.shutdown();
    }

    public String scanDevicesJson() {
        StringBuilder sb = new StringBuilder("[");
        if (mUsbManager != null) {
            HashMap<String, UsbDevice> map = mUsbManager.getDeviceList();
            if (map != null) {
                boolean first = true;
                for (UsbDevice d : map.values()) {
                    if (!first) sb.append(",");
                    first = false;
                    boolean isArduino = isArduinoDevice(d);
                    boolean hasPerm = mUsbManager.hasPermission(d);
                    sb.append("{")
                      .append("\"deviceId\":").append(d.getDeviceId()).append(",")
                      .append("\"vendorId\":").append(d.getVendorId()).append(",")
                      .append("\"productId\":").append(d.getProductId()).append(",")
                      .append("\"name\":\"").append(escapeJson(getDeviceDisplayName(d))).append("\",")
                      .append("\"isArduino\":").append(isArduino).append(",")
                      .append("\"hasPermission\":").append(hasPerm)
                      .append("}");
                }
            }
        }
        sb.append("]");
        return sb.toString();
    }

    public static boolean isArduinoDevice(UsbDevice device) {
        if (device == null) return false;
        int vid = device.getVendorId();
        int pid = device.getProductId();

        // Official Arduino UNO (ATmega16U2/8U2: 0x2341 / 0x0043, 0x0001, etc.)
        if (vid == 0x2341 || vid == 0x2A03) return true;

        // CH340 / CH341 (Uno clone standard: 0x1A86 / 0x7523)
        if (vid == 0x1A86) return true;

        // FTDI FT232R (Uno clone: 0x0403 / 0x6001)
        if (vid == 0x0403) return true;

        // CP2102 (Uno clone: 0x10C4 / 0xEA60)
        if (vid == 0x10C4) return true;

        // CDC ACM Communication device class
        if (device.getDeviceClass() == UsbConstants.USB_CLASS_COMM) return true;
        for (int i = 0; i < device.getInterfaceCount(); i++) {
            UsbInterface iface = device.getInterface(i);
            if (iface.getInterfaceClass() == UsbConstants.USB_CLASS_COMM) {
                return true;
            }
        }
        return false;
    }

    public static String getDeviceDisplayName(UsbDevice device) {
        if (device == null) return "Unknown USB Device";
        int vid = device.getVendorId();
        int pid = device.getProductId();

        if (vid == 0x2341 || vid == 0x2A03) {
            return "Arduino UNO (0x" + Integer.toHexString(vid) + ":0x" + Integer.toHexString(pid) + ")";
        }
        if (vid == 0x1A86) {
            return "Arduino UNO Clone CH340 (0x1A86:0x" + Integer.toHexString(pid) + ")";
        }
        if (vid == 0x0403) {
            return "Arduino UNO FTDI (0x0403:0x" + Integer.toHexString(pid) + ")";
        }
        if (vid == 0x10C4) {
            return "Arduino UNO CP2102 (0x10C4:0x" + Integer.toHexString(pid) + ")";
        }
        return "USB Device (0x" + Integer.toHexString(vid) + ":0x" + Integer.toHexString(pid) + ")";
    }

    private void setState(String state, String deviceName, String errorMsg) {
        mConnectionState = state;
        mLastErrorMessage = errorMsg;
        if (mListener != null) {
            mListener.onConnectionStateChange(state, deviceName, errorMsg);
        }
    }

    private void postState(final String state, final String deviceName, final String errorMsg) {
        mMainHandler.post(new Runnable() {
            @Override
            public void run() {
                setState(state, deviceName, errorMsg);
            }
        });
    }

    private void logInfo(final String msg) {
        Log.i(TAG, msg);
        mMainHandler.post(new Runnable() {
            @Override
            public void run() {
                if (mListener != null) mListener.onLog("INFO", msg);
            }
        });
    }

    private void logWarn(final String msg) {
        Log.w(TAG, msg);
        mMainHandler.post(new Runnable() {
            @Override
            public void run() {
                if (mListener != null) mListener.onLog("WARN", msg);
            }
        });
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
