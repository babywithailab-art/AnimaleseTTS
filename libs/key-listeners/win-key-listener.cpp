#include <windows.h>
#include <iostream>

HHOOK hHook;

LRESULT CALLBACK KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode == HC_ACTION) {
        KBDLLHOOKSTRUCT* p = (KBDLLHOOKSTRUCT*)lParam;
        if (wParam == WM_KEYDOWN || wParam == WM_KEYUP || wParam == WM_SYSKEYDOWN || wParam == WM_SYSKEYUP) {
            bool isShiftPressed = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0;
            bool isCtrlPressed = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
            bool isAltPressed = (GetAsyncKeyState(VK_MENU) & 0x8000) != 0;
            std::cout   << "{\"type\":\"" << (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN ? "keydown" : "keyup")
                        << "\",\"keycode\":" << p->vkCode
                        << ",\"shift\":" << (isShiftPressed ? "true" : "false")
                        << ",\"ctrl\":" << (isCtrlPressed ? "true" : "false")
                        << ",\"alt\":" << (isAltPressed ? "true" : "false")
                        << "}" << std::endl;
        }
    }
    return CallNextHookEx(hHook, nCode, wParam, lParam);
}

int main() {
    hHook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, GetModuleHandle(NULL), 0);
    if (hHook == NULL) {
        std::cerr << "Failed to set hook" << std::endl;
        return 1;
    }

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    UnhookWindowsHookEx(hHook);
    return 0;
}