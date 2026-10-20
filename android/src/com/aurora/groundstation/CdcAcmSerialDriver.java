package com.aurora.groundstation;

import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import java.io.IOException;

/**
 * Native USB CDC-ACM driver for Arduino UNO (ATmega16U2 / ATmega8U2).
 */
public class CdcAcmSerialDriver implements UsbSerialDriver {
    private final UsbDevice mDevice;
    private final UsbDeviceConnection mConnection;
    private UsbInterface mControlInterface;
    private UsbInterface mDataInterface;
    private UsbEndpoint mInEndpoint;
    private UsbEndpoint mOutEndpoint;
    private boolean mIsOpen = false;
    private int mBaudRate = 9600;

    private static final int SET_LINE_CODING = 0x20;
    private static final int SET_CONTROL_LINE_STATE = 0x22;
    private static final int USB_REQ_TYPE_INTERFACE_OUT = 0x21;

    public CdcAcmSerialDriver(UsbDevice device, UsbDeviceConnection connection) {
        mDevice = device;
        mConnection = connection;
    }

    @Override
    public void open() throws IOException {
        if (mConnection == null) {
            throw new IOException("UsbDeviceConnection is null - OTG connection failed");
        }

        // Locate Control and Data interfaces
        for (int i = 0; i < mDevice.getInterfaceCount(); i++) {
            UsbInterface iface = mDevice.getInterface(i);
            if (iface.getInterfaceClass() == UsbConstants.USB_CLASS_COMM) {
                mControlInterface = iface;
            } else if (iface.getInterfaceClass() == UsbConstants.USB_CLASS_CDC_DATA) {
                mDataInterface = iface;
            }
        }

        // If not explicitly divided into COMM and CDC_DATA, find interface with bulk endpoints
        if (mDataInterface == null) {
            for (int i = 0; i < mDevice.getInterfaceCount(); i++) {
                UsbInterface iface = mDevice.getInterface(i);
                for (int ep = 0; ep < iface.getEndpointCount(); ep++) {
                    UsbEndpoint endpoint = iface.getEndpoint(ep);
                    if (endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                        mDataInterface = iface;
                        break;
                    }
                }
                if (mDataInterface != null) break;
            }
        }

        if (mDataInterface == null) {
            throw new IOException("Compatible CDC-ACM data interface not found on Arduino UNO");
        }

        if (mControlInterface != null && !mConnection.claimInterface(mControlInterface, true)) {
            throw new IOException("Failed to claim USB CDC control interface");
        }

        if (!mConnection.claimInterface(mDataInterface, true)) {
            throw new IOException("Failed to claim USB CDC data interface");
        }

        // Assign IN and OUT bulk endpoints
        for (int ep = 0; ep < mDataInterface.getEndpointCount(); ep++) {
            UsbEndpoint endpoint = mDataInterface.getEndpoint(ep);
            if (endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                if (endpoint.getDirection() == UsbConstants.USB_DIR_IN) {
                    mInEndpoint = endpoint;
                } else if (endpoint.getDirection() == UsbConstants.USB_DIR_OUT) {
                    mOutEndpoint = endpoint;
                }
            }
        }

        if (mInEndpoint == null || mOutEndpoint == null) {
            throw new IOException("Required USB bulk IN/OUT endpoints not found on Arduino UNO");
        }

        mIsOpen = true;

        // Set initial 9600 baud rate and assert DTR/RTS
        setBaudRate(mBaudRate);
        setDtrRts(true, true);
    }

    @Override
    public void close() {
        mIsOpen = false;
        try {
            if (mConnection != null) {
                if (mControlInterface != null) {
                    mConnection.releaseInterface(mControlInterface);
                }
                if (mDataInterface != null) {
                    mConnection.releaseInterface(mDataInterface);
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
        if (!mIsOpen || mConnection == null) return;

        byte[] lineCoding = new byte[] {
            (byte) (baudRate & 0xFF),
            (byte) ((baudRate >> 8) & 0xFF),
            (byte) ((baudRate >> 16) & 0xFF),
            (byte) ((baudRate >> 24) & 0xFF),
            0, // 1 stop bit
            0, // No parity
            8  // 8 data bits
        };

        int ifaceId = mControlInterface != null ? mControlInterface.getId() : 0;
        int res = mConnection.controlTransfer(USB_REQ_TYPE_INTERFACE_OUT, SET_LINE_CODING, 0, ifaceId, lineCoding, lineCoding.length, 1000);
        if (res < 0) {
            throw new IOException("Failed to set CDC line coding at " + baudRate + " baud (code " + res + ")");
        }
    }

    @Override
    public void setDtrRts(boolean dtr, boolean rts) throws IOException {
        if (!mIsOpen || mConnection == null) return;
        int value = (dtr ? 0x01 : 0) | (rts ? 0x02 : 0);
        int ifaceId = mControlInterface != null ? mControlInterface.getId() : 0;
        mConnection.controlTransfer(USB_REQ_TYPE_INTERFACE_OUT, SET_CONTROL_LINE_STATE, value, ifaceId, null, 0, 1000);
    }

    @Override
    public int write(byte[] src, int timeoutMillis) throws IOException {
        if (!mIsOpen || mOutEndpoint == null) {
            throw new IOException("USB connection is not open for transmission");
        }
        int transferred = mConnection.bulkTransfer(mOutEndpoint, src, src.length, timeoutMillis);
        if (transferred < 0) {
            throw new IOException("USB bulk write failed to Arduino UNO (code " + transferred + ")");
        }
        return transferred;
    }

    @Override
    public int read(byte[] dest, int timeoutMillis) throws IOException {
        if (!mIsOpen || mInEndpoint == null) {
            throw new IOException("USB connection is not open for reception");
        }
        int readBytes = mConnection.bulkTransfer(mInEndpoint, dest, dest.length, timeoutMillis);
        return readBytes;
    }

    @Override
    public UsbDevice getDevice() {
        return mDevice;
    }

    @Override
    public String getDriverName() {
        return "CDC-ACM (Arduino UNO ATmega16U2)";
    }
}
