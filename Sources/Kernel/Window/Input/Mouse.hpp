// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef MOUSE_HPP
#define MOUSE_HPP

#include "MouseEvent.hpp"

namespace VE_Kernel
{
    class Mouse
    {
        friend class Window;

    public:
        int GetPosX();
        int GetPosY();
        MousePoint GetPos();
        bool EventBufferIsEmpty();
        MouseEvent ReadEvent();

    private:
        void _OnWindowsMouseMessage(
                UINT u_msg_a, WPARAM w_param_a, LPARAM l_param_a);

    private:
        MouseEvent::Button last_pressed_button_ = MouseEvent::Button::None;
        std::queue<MouseEvent> event_buffer_;

        int x_ = 0;
        int y_ = 0;
    };
} // namespace VE_Kernel

#endif