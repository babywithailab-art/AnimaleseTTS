#include <X11/Xlib.h>
#include <X11/extensions/record.h>
#include <iostream>

Display *dpy = nullptr;
XRecordContext context = 0;

void callback(XPointer, XRecordInterceptData *data) {
    if (!data || data->category != XRecordFromServer) {
        if (data) XRecordFreeData(data);
        return;
    }

    unsigned char *d = reinterpret_cast<unsigned char*>(data->data);
    int type = d[0];
    if (type != KeyPress && type != KeyRelease) {
        XRecordFreeData(data);
        return;
    }

    int keycode = d[1];
    unsigned int state = (d[28]) | (d[29] << 8) | (d[30] << 16) | (d[31] << 24);
    bool shift = (state & ShiftMask) != 0;
    bool ctrl = (state & ControlMask) != 0;
    bool alt = (state & Mod1Mask) != 0;

    const char* t = (type == KeyPress) ? "keydown" : "keyup";
    std::cout << "{\"type\":\"" << t << "\",\"keycode\":" << keycode
              << ",\"shift\":" << (shift ? "true" : "false")
              << ",\"ctrl\":" << (ctrl ? "true" : "false")
              << ",\"alt\":" << (alt ? "true" : "false")
              << "}" << std::endl;

    XRecordFreeData(data);
}

int main() {
    dpy = XOpenDisplay(nullptr);
    if (!dpy) return 1;

    int major, minor;
    if (!XRecordQueryVersion(dpy, &major, &minor)) { XCloseDisplay(dpy); return 1; }

    XRecordRange *range = XRecordAllocRange();
    range->device_events.first = KeyPress;
    range->device_events.last = KeyRelease;

    XRecordClientSpec clients = XRecordAllClients;
    context = XRecordCreateContext(dpy, 0, &clients, 1, &range, 1);
    XFree(range);
    if (!context) { XCloseDisplay(dpy); return 1; }

    XRecordEnableContext(dpy, context, callback, nullptr);

    XRecordDisableContext(dpy, context);
    XRecordFreeContext(dpy, context);
    XCloseDisplay(dpy);
    return 0;
}