package com.aurora.groundstation;

import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.util.Log;
import java.io.IOException;

/**
 * Universal fallback serial driver for any USB device offering Bulk IN and Bulk OUT endpoints.
 * Ensures compatibility with any Arduino clone, USB-UART adapter, or custom microcontroller.
 */
public class UniversalSerialDriver implements UsbSerialDriver {
    private static final String TAG = "AuroraUniversal";

    private final UsbDevice mDevice;
    private final UsbDeviceConnection mConnection;
    private UsbInterface mInterface;
    private UsbEndpoint mInEndpoint;
    private UsbEndpoint mOutEndpoint;
    private boolean mIsOpen = false;
    private int mBaudRate = 9600;

    public UniversalSerialDriver(UsbDevice device, UsbDeviceConnection connection) {
        mDevice = device;
        mConnection = connection;
    }

    @Override
    public void open() throws IOException {
        if (mConnection == null) {
            throw new IOException("UsbDeviceConnection is null");
        }

        // Search through all interfaces for bulk IN and bulk OUT endpoints
        UsbInterface matchedInterface = null;
        UsbEndpoint inEp = null;
        UsbEndpoint outEp = null;

        for (int i = 0; i < mDevice.getInterfaceCount(); i++) {
            UsbInterface iface = mDevice.getInterface(i);
            UsbEndpoint curIn = null;
            UsbEndpoint curOut = null;

            for (int e = 0; e < iface.getEndpointCount(); e++) {
                UsbEndpoint ep = iface.getEndpoint(e);
                if (ep.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                    if (ep.getDirection() == UsbConstants.USB_DIR_IN && curIn == null) {
                        curIn = ep;
                    } else if (ep.getDirection() == UsbConstants.USB_DIR_OUT && curOut == null) {
                        curOut = ep;
                    }
                }
            }

            if (curIn != null && curOut != null) {
                matchedInterface = iface;
                inEp = curIn;
                outEp = curOut;
                break;
            }
        }

        // If no single interface has both, search across all interfaces
        if (matchedInterface == null) {
            for (int i = 0; i < mDevice.getInterfaceCount(); i++) {
                UsbInterface iface = mDevice.getInterface(i);
                for (int e = 0; e < iface.getEndpointCount(); e++) {
                    UsbEndpoint ep = iface.getEndpoint(e);
                    if (ep.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                        if (ep.getDirection() == UsbConstants.USB_DIR_IN && inEp == null) {
                            inEp = ep;
                            if (matchedInterface == null) matchedInterface = iface;
                        } else if (ep.getDirection() == UsbConstants.USB_DIR_OUT && outEp == null) {
                            outEp = ep;
                            if (matchedInterface == null) matchedInterface = iface;
                        }
                    }
                }
            }
        }

        if (inEp == null || outEp == null) {
            throw new IOException("USB device has no compatible serial bulk transfer endpoints");
        }

        mInterface = matchedInterface;
        mInEndpoint = inEp;
        mOutEndpoint = outEp;

        if (mInterface != null) {
            boolean claimed = mConnection.claimInterface(mInterface, true);
            if (!claimed) {
                Log.w(TAG, "claimInterface returned false, continuing with bulk endpoints");
            }
        }

        // Attempt CDC line coding setup (non-fatal if unsupported)
        try {
            setBaudRate(mBaudRate);
            setDtrRts(true, true);
        } catch (Exception e) {
            Log.d(TAG, "Standard line coding ignored by universal driver: " + e.getMessage());
        }

        mIsOpen = true;
    }

    @Override
    public void close() {
        mIsOpen = false;
        try {
            if (mConnection != null && mInterface != null) {
                mConnection.releaseInterface(mInterface);
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

        byte[] lineCoding = new byte[] {
            (byte) (baudRate & 0xFF),
            (byte) ((baudRate >> 8) & 0xFF),
            (byte) ((baudRate >> 16) & 0xFF),
            (byte) ((baudRate >> 24) & 0xFF),
            0, 0, 8
        };

        // Try standard CDC SET_LINE_CODING
        mConnection.controlTransfer(0x21, 0x20, 0, 0, lineCoding, lineCoding.length, 500);
    }

    @Override
    public void setDtrRts(boolean dtr, boolean rts) throws IOException {
        if (mConnection == null) return;
        int value = (dtr ? 0x01 : 0) | (rts ? 0x02 : 0);
        mConnection.controlTransfer(0x21, 0x22, value, 0, null, 0, 500);
    }

    @Override
    public int write(byte[] src, int timeoutMillis) throws IOException {
        if (!mIsOpen || mOutEndpoint == null) {
            throw new IOException("Universal driver is not open for transmission");
        }
        int res = mConnection.bulkTransfer(mOutEndpoint, src, src.length, timeoutMillis);
        if (res < 0) {
            throw new IOException("Bulk write failed (code " + res + ")");
        }
        return res;
    }

    @Override
    public int read(byte[] dest, int timeoutMillis) throws IOException {
        if (!mIsOpen || mInEndpoint == null) {
            throw new IOException("Universal driver is not open for reception");
        }
        return mConnection.bulkTransfer(mInEndpoint, dest, dest.length, timeoutMillis);
    }

    @Override
    public UsbDevice getDevice() {
        return mDevice;
    }

    @Override
    public String getDriverName() {
        return "Universal USB Serial Driver";
    }
}
