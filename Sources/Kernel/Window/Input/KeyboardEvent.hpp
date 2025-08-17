// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef KEYBOARDEVENT_HPP
#define KEYBOARDEVENT_HPP

#include <wrl/client.h>
#include <queue>
#include <fstream>

#include <Ultralight/KeyEvent.h>

namespace ul = ultralight;
namespace VE_Kernel
{
    class KeyboardEvent
    {
    public:
        enum class Type
        {
            Invalid = 0,
            KeyDown = ul::KeyEvent::kType_RawKeyDown,
            KeyUp = ul::KeyEvent::kType_KeyUp,
            Char = ul::KeyEvent::kType_Char,
        };

        KeyboardEvent();
        KeyboardEvent(UINT u_msg_a, WPARAM w_param_a, LPARAM l_param_a);
        Type GetType();
        bool IsKeyDown() const;
        bool IsKeyUp() const;
        bool IsAutoRepeat() const;
        bool IsValid() const;
        bool IsSystemKey() const;
        unsigned char GetKeyCode() const;

        ul::KeyEvent ToUltralightKeyboardEvent();

    private:
        WPARAM w_param_ = NULL;
        LPARAM l_param_ = NULL;
        Type type_ = Type::Invalid;
        wchar_t key_ = 0;
        bool is_auto_repeat_ = false;
        bool is_system_key_ = false;
    };
} // namespace VE_Kernel

#endif