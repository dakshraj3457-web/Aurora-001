package com.aurora.groundstation;

import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import java.io.IOException;

/**
 * Driver for CH340 / CH341 USB-to-UART chips commonly found on Arduino UNO clones.
 */
public class Ch340SerialDriver implements UsbSerialDriver {
    private final UsbDevice mDevice;
    private final UsbDeviceConnection mConnection;
    private UsbInterface mInterface;
    private UsbEndpoint mInEndpoint;
    private UsbEndpoint mOutEndpoint;
    private boolean mIsOpen = false;
    private int mBaudRate = 9600;

    private static final int DEFAULT_TIMEOUT = 1000;

    public Ch340SerialDriver(UsbDevice device, UsbDeviceConnection connection) {
        mDevice = device;
        mConnection = connection;
    }

    @Override
    public void open() throws IOException {
        if (mConnection == null) {
            throw new IOException("UsbDeviceConnection is null");
        }

        if (mDevice.getInterfaceCount() == 0) {
            throw new IOException("No USB interfaces found on CH340");
        }

        mInterface = mDevice.getInterface(0);
        if (!mConnection.claimInterface(mInterface, true)) {
            throw new IOException("Failed to claim CH340 USB interface");
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
            throw new IOException("CH340 bulk endpoints not found");
        }

        // Initialize CH340 chip
        byte[] buffer = new byte[8];
        controlTransfer(0xC0, 0x5F, 0, 0, buffer, 2);
        controlTransfer(0x40, 0xA1, 0, 0, null, 0);
        setBaudRate(mBaudRate);
        controlTransfer(0xC0, 0x95, 0x2518, 0, buffer, 2);
        controlTransfer(0x40, 0x9A, 0x2518, 0x0050, null, 0);
        controlTransfer(0xC0, 0x95, 0x0F2C, 0, buffer, 2);
        controlTransfer(0x40, 0x9A, 0x0F2C, 0x0010, null, 0);
        controlTransfer(0x40, 0xA1, 0x501F, 0xD90A, null, 0);
        setDtrRts(true, true);

        mIsOpen = true;
    }

    private int controlTransfer(int reqType, int req, int val, int idx, byte[] data, int length) {
        return mConnection.controlTransfer(reqType, req, val, idx, data, length, DEFAULT_TIMEOUT);
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

        int a, b;
        switch (baudRate) {
            case 2400:   a = 0xd901; b = 0x0038; break;
            case 4800:   a = 0x6402; b = 0x001f; break;
            case 9600:   a = 0xb202; b = 0x0013; break;
            case 19200:  a = 0xd902; b = 0x0008; break;
            case 38400:  a = 0x6403; b = 0x0004; break;
            case 57600:  a = 0x9803; b = 0x0002; break;
            case 115200: a = 0xcc03; b = 0x0001; break;
            default:     a = 0xb202; b = 0x0013; break; // fallback 9600
        }

        controlTransfer(0x40, 0x9A, 0x1312, a, null, 0);
        controlTransfer(0x40, 0x9A, 0x0F2C, b, null, 0);
    }

    @Override
    public void setDtrRts(boolean dtr, boolean rts) throws IOException {
        if (mConnection == null) return;
        int val = (dtr ? 0x20 : 0) | (rts ? 0x40 : 0);
        controlTransfer(0x40, 0xA4, ~val & 0xFF, 0, null, 0);
    }

    @Override
    public int write(byte[] src, int timeoutMillis) throws IOException {
        if (!mIsOpen || mOutEndpoint == null) {
            throw new IOException("CH340 is not open for transmission");
        }
        int res = mConnection.bulkTransfer(mOutEndpoint, src, src.length, timeoutMillis);
        if (res < 0) {
            throw new IOException("CH340 bulk write error (" + res + ")");
        }
        return res;
    }

    @Override
    public int read(byte[] dest, int timeoutMillis) throws IOException {
        if (!mIsOpen || mInEndpoint == null) {
            throw new IOException("CH340 is not open for reception");
        }
        return mConnection.bulkTransfer(mInEndpoint, dest, dest.length, timeoutMillis);
    }

    @Override
    public UsbDevice getDevice() {
        return mDevice;
    }

    @Override
    public String getDriverName() {
        return "CH340/CH341 Serial (Arduino UNO Clone)";
    }
}
