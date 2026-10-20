package com.aurora.groundstation;

import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.util.Log;
import java.io.IOException;

/**
 * Driver for Silicon Labs CP2102 / CP2104 / CP2105 USB-UART bridges on Arduino UNO clones.
 */
public class Cp2102SerialDriver implements UsbSerialDriver {
    private static final String TAG = "AuroraCp2102";

    private final UsbDevice mDevice;
    private final UsbDeviceConnection mConnection;
    private UsbInterface mInterface;
    private UsbEndpoint mInEndpoint;
    private UsbEndpoint mOutEndpoint;
    private boolean mIsOpen = false;
    private int mBaudRate = 9600;

    private static final int CP210X_REQTYPE_HOST_TO_DEVICE = 0x41;
    private static final int CP210X_IFC_ENABLE = 0x00;
    private static final int CP210X_SET_BAUDRATE = 0x1E;
    private static final int CP210X_SET_LINE_CTL = 0x03;
    private static final int CP210X_SET_MHS = 0x07;

    public Cp2102SerialDriver(UsbDevice device, UsbDeviceConnection connection) {
        mDevice = device;
        mConnection = connection;
    }

    @Override
    public void open() throws IOException {
        if (mConnection == null) {
            throw new IOException("UsbDeviceConnection is null for CP2102");
        }

        if (mDevice.getInterfaceCount() == 0) {
            throw new IOException("No USB interfaces found on CP2102 device");
        }

        mInterface = mDevice.getInterface(0);
        if (!mConnection.claimInterface(mInterface, true)) {
            Log.w(TAG, "claimInterface returned false for CP2102 interface 0, continuing");
        }

        for (int i = 0; i < mInterface.getEndpointCount(); i++) {
            UsbEndpoint ep = mInterface.getEndpoint(i);
            if (ep.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                if (ep.getDirection() == UsbConstants.USB_DIR_IN) {
                    mInEndpoint = ep;
                } else if (ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                    mOutEndpoint = ep;
                }
            }
        }

        if (mInEndpoint == null || mOutEndpoint == null) {
            throw new IOException("CP2102 bulk endpoints not found");
        }

        // Enable UART
        controlTransfer(CP210X_REQTYPE_HOST_TO_DEVICE, CP210X_IFC_ENABLE, 0x0001, 0, null, 0);

        // 8 data bits, 1 stop bit, no parity (0x0800)
        controlTransfer(CP210X_REQTYPE_HOST_TO_DEVICE, CP210X_SET_LINE_CTL, 0x0800, 0, null, 0);

        setBaudRate(mBaudRate);
        setDtrRts(true, true);

        mIsOpen = true;
    }

    private int controlTransfer(int reqType, int req, int val, int idx, byte[] data, int length) {
        return mConnection.controlTransfer(reqType, req, val, idx, data, length, 1000);
    }

    @Override
    public void close() {
        mIsOpen = false;
        try {
            if (mConnection != null) {
                controlTransfer(CP210X_REQTYPE_HOST_TO_DEVICE, CP210X_IFC_ENABLE, 0x0000, 0, null, 0);
                if (mInterface != null) {
                    mConnection.releaseInterface(mInterface);
                }
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public boolean isOpen() {
        return mIsOpen;
    }

    @Override
    public void setBaudRate(int baudRate) throws IOException {
        mBaudRate = baudRate;
        if (mConnection == null) return;

        byte[] baudBytes = new byte[] {
            (byte) (baudRate & 0xFF),
            (byte) ((baudRate >> 8) & 0xFF),
            (byte) ((baudRate >> 16) & 0xFF),
            (byte) ((baudRate >> 24) & 0xFF)
        };
        controlTransfer(CP210X_REQTYPE_HOST_TO_DEVICE, CP210X_SET_BAUDRATE, 0, 0, baudBytes, 4);
    }

    @Override
    public void setDtrRts(boolean dtr, boolean rts) throws IOException {
        if (mConnection == null) return;
        // DTR state + DTR mask | RTS state + RTS mask
        int value = (dtr ? 0x0101 : 0x0100) | (rts ? 0x0202 : 0x0200);
        controlTransfer(CP210X_REQTYPE_HOST_TO_DEVICE, CP210X_SET_MHS, value, 0, null, 0);
    }

    @Override
    public int write(byte[] src, int timeoutMillis) throws IOException {
        if (!mIsOpen || mOutEndpoint == null) {
            throw new IOException("CP2102 is not open for writing");
        }
        int res = mConnection.bulkTransfer(mOutEndpoint, src, src.length, timeoutMillis);
        if (res < 0) {
            throw new IOException("CP2102 write error (" + res + ")");
        }
        return res;
    }

    @Override
    public int read(byte[] dest, int timeoutMillis) throws IOException {
        if (!mIsOpen || mInEndpoint == null) {
            throw new IOException("CP2102 is not open for reading");
        }
        return mConnection.bulkTransfer(mInEndpoint, dest, dest.length, timeoutMillis);
    }

    @Override
    public UsbDevice getDevice() {
        return mDevice;
    }

    @Override
    public String getDriverName() {
        return "CP2102 Serial (Arduino UNO Clone)";
    }
}
