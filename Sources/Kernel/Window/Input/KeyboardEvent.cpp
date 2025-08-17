#include "KeyboardEvent.hpp"

namespace VE_Kernel
{
    KeyboardEvent::KeyboardEvent()
        : type_(Type::Invalid), key_(0u), is_auto_repeat_(false) {}

    KeyboardEvent::KeyboardEvent(UINT u_msg_a, WPARAM w_param_a, LPARAM l_param_a)
    {
        w_param_ = w_param_a;
        l_param_ = l_param_a;
        unsigned char keycode_ = static_cast<unsigned char>(w_param_);
        key_ = keycode_;
        switch (u_msg_a)
        {
        case WM_KEYDOWN:
            type_ = KeyboardEvent::Type::KeyDown;
            is_auto_repeat_ = l_param_ & 0x40000000;
            break;
        case WM_KEYUP:
            type_ = KeyboardEvent::Type::KeyUp;
            is_auto_repeat_ = false;
            break;
        case WM_SYSKEYDOWN:
            type_ = KeyboardEvent::Type::KeyDown;
            is_auto_repeat_ = l_param_ & 0x40000000;
            is_system_key_ = true;
            break;
        case WM_SYSKEYUP:
            type_ = KeyboardEvent::Type::KeyUp;
            is_auto_repeat_ = false;
            is_system_key_ = true;
            break;
        case WM_CHAR:
            type_ = KeyboardEvent::Type::Char;
            is_auto_repeat_ = l_param_ & 0x40000000;
            break;
        default:
            type_ = KeyboardEvent::Type::Invalid;
            break;
        }
    }

    KeyboardEvent::Type KeyboardEvent::GetType()
    {
        return type_;
    }

    bool KeyboardEvent::IsKeyDown() const
    {
        return type_ == Type::KeyDown;
    }

    bool KeyboardEvent::IsKeyUp() const
    {
        return type_ == Type::KeyUp;
    }

    bool KeyboardEvent::IsAutoRepeat() const
    {
        return is_auto_repeat_;
    }

    bool KeyboardEvent::IsValid() const
    {
        return type_ != Type::Invalid;
    }

    bool KeyboardEvent::IsSystemKey() const
    {
        return is_system_key_;
    }

    unsigned char KeyboardEvent::GetKeyCode() const
    {
        return key_;
    }

    ul::KeyEvent KeyboardEvent::ToUltralightKeyboardEvent()
    {
        return ul::KeyEvent(static_cast<ul::KeyEvent::Type>(type_),
                            w_param_,
                            l_param_,
                            is_system_key_);
    }
} // namespace VE_Kernel