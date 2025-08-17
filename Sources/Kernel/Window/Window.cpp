#include "Window.hpp"

namespace
{
    inline int TitleH()
    {
        int h_ = GetSystemMetrics(SM_CYCAPTION);
        return (h_ < 28) ? 28 : h_;
    }

    inline int FrameThickness()
    {
        return GetSystemMetrics(SM_CXFRAME)
               + GetSystemMetrics(SM_CXPADDEDBORDER);
    }

    inline void ComputeToolbarRects(HWND hwnd_a,
                                    RECT& rc_toolbar_a,
                                    RECT& rc_min_a,
                                    RECT& rc_max_a,
                                    RECT& rc_close_a)
    {
        RECT rc_client_ {};
        GetClientRect(hwnd_a, &rc_client_);
        const int w_ = rc_client_.right - rc_client_.left;
        const int h_ = TitleH();
        rc_toolbar_a = {0, 0, w_, h_};

        const int btn_w_ = GetSystemMetrics(SM_CXSIZE);
        const int btn_h_ = h_;

        rc_close_a = {w_ - btn_w_, 0, w_, btn_h_};
        rc_max_a = {w_ - 2 * btn_w_, 0, w_ - btn_w_, btn_h_};
        rc_min_a = {w_ - 3 * btn_w_, 0, w_ - 2 * btn_w_, btn_h_};
    }

    inline bool PtIn(const RECT& r_a, int x_a, int y_a)
    {
        return x_a >= r_a.left && x_a < r_a.right && y_a >= r_a.top && y_a < r_a.bottom;
    }

    inline void DrawCaptionButtons(HDC hdc_a,
                                   const RECT& r_min_a,
                                   const RECT& r_max_a,
                                   const RECT& r_close_a,
                                   HWND hwnd_a)
    {
        DrawFrameControl(hdc_a,
                         const_cast<RECT*>(&r_min_a),
                         DFC_CAPTION,
                         DFCS_CAPTIONMIN);
        
		UINT max_flag_ = IsZoomed(hwnd_a) ? DFCS_CAPTIONRESTORE : DFCS_CAPTIONMAX;
        DrawFrameControl(hdc_a, const_cast<RECT*>(&r_max_a), DFC_CAPTION, max_flag_);
        DrawFrameControl(hdc_a,
                         const_cast<RECT*>(&r_close_a),
                         DFC_CAPTION,
                         DFCS_CAPTIONCLOSE);
    }

} // namespace

namespace VE_Kernel
{
    bool Window::Initialize(uint16_t width_a,
                            uint16_t height_a,
                            const char* title_a,
                            int x_pos_a,
                            int y_pos_a)
    {
        width_ = width_a;
        height_ = height_a;
        title_ = title_a;
        int x_pos_ = x_pos_a, y_pos_ = y_pos_a;

        if (x_pos_ == INT_MAX)
        {
            int sw_ = GetSystemMetrics(SM_CXSCREEN);
            x_pos_ = (sw_ - width_) / 2;
        }

        if (y_pos_ == INT_MAX)
        {
            int sh = GetSystemMetrics(SM_CYSCREEN);
            y_pos_ = (sh - height_) / 2;
        }

        RECT wr_ {x_pos_, y_pos_, x_pos_ + (LONG)width_, y_pos_ + (LONG)height_};

        DWORD style_ = (WS_OVERLAPPEDWINDOW & ~(WS_CAPTION | WS_SYSMENU));
        DWORD ex_style_ = WS_EX_APPWINDOW;

        if (!AdjustWindowRect(&wr_, style_, FALSE))
            return false;

        _RegisterWindowClass();

        hwnd_ = CreateWindowExA(ex_style_,
                                window_class_,
                                title_.c_str(),
                                style_,
                                wr_.left,
                                wr_.top,
                                wr_.right - wr_.left,
                                wr_.bottom - wr_.top,
                                NULL,
                                NULL,
                                GetModuleHandle(NULL),
                                this);
        if (!hwnd_)
            return false;

        HICON h_main_icon_ = static_cast<HICON>(
                LoadImageA(GetModuleHandle(NULL),
                           "IDI_MAIN_ICON",
                           IMAGE_ICON,
                           GetSystemMetrics(SM_CXICON),
                           GetSystemMetrics(SM_CYICON),
                           LR_SHARED));
        if (h_main_icon_)
        {
            SendMessage(hwnd_,
                        WM_SETICON,
                        ICON_BIG,
                        reinterpret_cast<LPARAM>(h_main_icon_));
        }

        BOOL dark_mode_ = TRUE;
        ::DwmSetWindowAttribute(hwnd_,
                                20,
                                &dark_mode_,
                                sizeof(dark_mode_));

        ShowWindow(hwnd_, SW_MAXIMIZE);
        SetForegroundWindow(hwnd_);
        SetFocus(hwnd_);
        return true;
    }

    bool Window::ProcessMessages()
    {
        MSG msg_;
        ZeroMemory(&msg_, sizeof(MSG)); 

        while (PeekMessage(
                &msg_, 
                hwnd_,
                0,  
                0,  
                PM_REMOVE))
        {
            TranslateMessage(&msg_);
            DispatchMessage(&msg_);
        }

        if (msg_.message == WM_NULL)
        {
            if (!IsWindow(hwnd_))
            {
                hwnd_ = NULL; 
                UnregisterClassA(window_class_, GetModuleHandle(NULL));
                return false;
            }
        }

        return true;
    }

    LRESULT Window::WindowProcA(HWND hwnd_a,
                                UINT u_msg_a,
                                WPARAM w_param_a,
                                LPARAM l_param_a)
    {
        switch (u_msg_a)
        {
        case WM_MOUSEMOVE:
            mouse_._OnWindowsMouseMessage(u_msg_a, w_param_a, l_param_a);
            return 0;
        case WM_LBUTTONDOWN:
        case WM_RBUTTONDOWN:
        case WM_MBUTTONDOWN:
            mouse_._OnWindowsMouseMessage(u_msg_a, w_param_a, l_param_a);
            SetCapture(hwnd_);
            return 0;
        case WM_LBUTTONUP:
        case WM_RBUTTONUP:
        case WM_MBUTTONUP:
            mouse_._OnWindowsMouseMessage(u_msg_a, w_param_a, l_param_a);
            ReleaseCapture();
            return 0;
        case WM_KEYDOWN:
        case WM_KEYUP:
        case WM_SYSKEYDOWN:
        case WM_SYSKEYUP:
        case WM_CHAR:
            keyboard_._OnWindowsKeyboardMessage(u_msg_a, w_param_a, l_param_a);
            return 0;
        default:
            return DefWindowProcA(hwnd_a, u_msg_a, w_param_a, l_param_a);
        }
    }

    Mouse& Window::GetMouse()
    {
        return mouse_;
    }

    Keyboard& Window::GetKeyboard()
    {
        return keyboard_;
    }

    HWND Window::GetHWND() const
    {
        return hwnd_;
    }

    uint16_t Window::GetWidth() const
    {
        return width_;
    }

    uint16_t Window::GetHeight() const
    {
        return height_;
    }

    LRESULT CALLBACK HandleMsgRedirect(HWND hwnd_a,
                                       UINT u_msg_a,
                                       WPARAM w_param_a,
                                       LPARAM l_param_a)
    {
        switch (u_msg_a)
        {
        case WM_CLOSE:
            DestroyWindow(hwnd_a);
            return 0;

        default: 
        {
            Window* const window_ = reinterpret_cast<Window*>(
                    GetWindowLongPtr(hwnd_a, GWLP_USERDATA));
           
            return window_->WindowProcA(hwnd_a, u_msg_a, w_param_a, l_param_a);
        }
        }
    }

    LRESULT CALLBACK HandleMessageSetup(HWND hwnd_a,
                                        UINT u_msg_a,
                                        WPARAM w_param_a,
                                        LPARAM l_param_a)
    {
        switch (u_msg_a)
        {
        case WM_NCCREATE: {
            const CREATESTRUCTW* const create_ =
                    reinterpret_cast<CREATESTRUCTW*>(l_param_a);
            
            Window* window_ = reinterpret_cast<Window*>(
                    create_->lpCreateParams);
            if (window_ == nullptr)
            {
                exit(-1);
            }

            SetWindowLongPtr(hwnd_a,
                             GWLP_USERDATA,
                             reinterpret_cast<LONG_PTR>(window_));
            
            SetWindowLongPtr(hwnd_a,
                             GWLP_WNDPROC,
                             reinterpret_cast<LONG_PTR>(HandleMsgRedirect));
            
            return window_->WindowProcA(hwnd_a, u_msg_a, w_param_a, l_param_a);
        }
        default:
            return DefWindowProcA(hwnd_a, u_msg_a, w_param_a, l_param_a);
        }
    }

    void Window::_RegisterWindowClass()
    {
        WNDCLASSEXA wc_ = {};
        wc_.style = CS_HREDRAW | CS_VREDRAW | CS_OWNDC;
        wc_.lpfnWndProc = HandleMessageSetup;
        wc_.cbClsExtra = 0; 
        wc_.cbWndExtra = 0; 
        wc_.hInstance = GetModuleHandle(NULL); 
        wc_.hIcon = static_cast<HICON>(LoadImageA(GetModuleHandle(NULL),
                                                 "IDI_MAIN_ICON",
                                                 IMAGE_ICON,
                                                 0,
                                                 0,
                                                 LR_DEFAULTSIZE | LR_SHARED));

        wc_.hIconSm = NULL;
        wc_.hCursor = LoadCursor(NULL, IDC_ARROW);
        wc_.hbrBackground = NULL; 
        wc_.lpszMenuName  = NULL; 
        wc_.lpszClassName = window_class_;
        wc_.cbSize = sizeof(WNDCLASSEXA);
        RegisterClassExA(&wc_);
    }
} // namespace VE_Kernel