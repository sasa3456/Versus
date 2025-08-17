// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef KEYBOARD_HPP
#define KEYBOARD_HPP

#include "KeyboardEvent.hpp"

namespace VE_Kernel
{
    class Keyboard
    {
        friend class Window;

    public:
        Keyboard();
        bool KeyIsPressed(const unsigned char keycode_a);
        bool EventBufferIsEmpty();
        KeyboardEvent ReadEvent();

    private:
        void _OnWindowsKeyboardMessage(
                UINT u_msg_a, WPARAM w_param_a, LPARAM l_param_a);
    
    private:
        bool key_states_[256] = {false};
        std::queue<KeyboardEvent> event_buffer_;
    };
} // namespace VE_KErnel

#endif