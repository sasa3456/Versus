// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef WINDOW_HPP
#define WINDOW_HPP

#include "Input/Mouse.hpp"
#include "Input/Keyboard.hpp"
#include <dwmapi.h>

namespace VE_Kernel
{
    class Window
    {
    public:
        bool Initialize(uint16_t width_a = 1920,
                        uint16_t height_a = 1000,
                        const char* title_a = "Window Title",
                        int x_pos_a = INT_MAX,
                        int y_pos_a = INT_MAX);

        bool ProcessMessages();
        LRESULT WindowProcA(HWND hwnd_a, UINT u_msg_a, 
                            WPARAM w_param_a, LPARAM l_param_a);
        
        Mouse& GetMouse();
        Keyboard& GetKeyboard();
        HWND GetHWND() const;
        uint16_t GetWidth() const;
        uint16_t GetHeight() const;

    private:
        void _RegisterWindowClass();

    private:
        Mouse mouse_;
        Keyboard keyboard_;
        HWND hwnd_ = NULL;
        std::string title_ = "";
        const char* window_class_ = "EngineWindowClass";
        uint16_t width_ = 0;
        uint16_t height_ = 0;
    };
} // namespace VE_Kernel

#endif