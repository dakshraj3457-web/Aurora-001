package com.aurora.groundstation;

import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.util.Log;
import java.io.IOException;

/**
 * Driver for FTDI FT232R and compatible chips commonly found on Arduino UNO clones.
 */
public class FtdiSerialDriver implements UsbSerialDriver {
    private static final String TAG = "AuroraFtdi";

    private final UsbDevice mDevice;
    private final UsbDeviceConnection mConnection;
    private UsbInterface mInterface;
    private UsbEndpoint mInEndpoint;
    private UsbEndpoint mOutEndpoint;
    private boolean mIsOpen = false;
    private int mBaudRate = 9600;

    private static final int FTDI_DEVICE_OUT_REQTYPE = 0x40;
    private static final int SIO_RESET_REQUEST = 0;
    private static final int SIO_SET_MODEM_CTRL_REQUEST = 1;
    private static final int SIO_SET_BAUD_RATE_REQUEST = 3;
    private static final int SIO_SET_DATA_REQUEST = 4;

    public FtdiSerialDriver(UsbDevice device, UsbDeviceConnection connection) {
        mDevice = device;
        mConnection = connection;
    }

    @Override
    public void open() throws IOException {
        if (mConnection == null) {
            throw new IOException("UsbDeviceConnection is null for FTDI");
        }

        if (mDevice.getInterfaceCount() == 0) {
            throw new IOException("No USB interfaces found on FTDI device");
        }

        mInterface = mDevice.getInterface(0);
        if (!mConnection.claimInterface(mInterface, true)) {
            Log.w(TAG, "claimInterface returned false for FTDI interface 0, proceeding with caution");
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
            throw new IOException("FTDI bulk IN/OUT endpoints not found");
        }

        // Reset device
        controlTransfer(FTDI_DEVICE_OUT_REQTYPE, SIO_RESET_REQUEST, 0, 0, null, 0);

        // 8 data bits, 1 stop bit, no parity
        controlTransfer(FTDI_DEVICE_OUT_REQTYPE, SIO_SET_DATA_REQUEST, 8, 0, null, 0);

        setBaudRate(mBaudRate);
        setDtrRts(true, true);

        mIsOpen = true;
    }

    private int controlTransfer(int requestType, int request, int value, int index, byte[] buffer, int length) {
        return mConnection.controlTransfer(requestType, request, value, index, buffer, length, 1000);
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

        // Approximate FTDI divisor calculation for standard 9600, 19200, 38400, 57600, 115200
        int divisor;
        int index = 0;
        switch (baudRate) {
            case 9600:
                divisor = 0x4138;
                break;
            case 19200:
                divisor = 0x809c;
                break;
            case 38400:
                divisor = 0xc04e;
                break;
            case 57600:
                divisor = 0x0034;
                break;
            case 115200:
                divisor = 0x001a;
                break;
            default:
                divisor = 0x4138; // Default to 9600
                break;
        }

        controlTransfer(FTDI_DEVICE_OUT_REQTYPE, SIO_SET_BAUD_RATE_REQUEST, divisor, index, null, 0);
    }

    @Override
    public void setDtrRts(boolean dtr, boolean rts) throws IOException {
        if (mConnection == null) return;
        int val = (dtr ? 0x0101 : 0x0100) | (rts ? 0x0202 : 0x0200);
        controlTransfer(FTDI_DEVICE_OUT_REQTYPE, SIO_SET_MODEM_CTRL_REQUEST, val, 0, null, 0);
    }

    @Override
    public int write(byte[] src, int timeoutMillis) throws IOException {
        if (!mIsOpen || mOutEndpoint == null) {
            throw new IOException("FTDI driver is not open for writing");
        }
        int res = mConnection.bulkTransfer(mOutEndpoint, src, src.length, timeoutMillis);
        if (res < 0) {
            throw new IOException("FTDI bulk write failed (" + res + ")");
        }
        return res;
    }

    @Override
    public int read(byte[] dest, int timeoutMillis) throws IOException {
        if (!mIsOpen || mInEndpoint == null) {
            throw new IOException("FTDI driver is not open for reading");
        }
        byte[] temp = new byte[dest.length + 2];
        int res = mConnection.bulkTransfer(mInEndpoint, temp, temp.length, timeoutMillis);
        if (res > 2) {
            // First 2 bytes are FTDI modem status bytes
            int payloadLen = res - 2;
            int copyLen = Math.min(payloadLen, dest.length);
            System.arraycopy(temp, 2, dest, 0, copyLen);
            return copyLen;
        } else if (res <= 2 && res > 0) {
            return 0; // Only modem status received
        }
        return res;
    }

    @Override
    public UsbDevice getDevice() {
        return mDevice;
    }

    @Override
    public String getDriverName() {
        return "FTDI FT232 (Arduino UNO Clone)";
    }
}
