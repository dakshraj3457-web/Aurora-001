package com.aurora.groundstation;

import android.hardware.usb.UsbDevice;
import java.io.IOException;

/**
 * Common USB-serial driver interface for Arduino UNO hardware.
 */
public interface UsbSerialDriver {
    void open() throws IOException;
    void close();
    boolean isOpen();
    void setBaudRate(int baudRate) throws IOException;
    void setDtrRts(boolean dtr, boolean rts) throws IOException;
    int write(byte[] src, int timeoutMillis) throws IOException;
    int read(byte[] dest, int timeoutMillis) throws IOException;
    UsbDevice getDevice();
    String getDriverName();
}
