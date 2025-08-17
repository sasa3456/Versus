#include "Keyboard.hpp"

namespace VE_Kernel
{
    Keyboard::Keyboard() {}

    bool Keyboard::KeyIsPressed(const unsigned char keycode_a)
    {
        return key_states_[keycode_a];
    }

    bool Keyboard::EventBufferIsEmpty()
    {
        return event_buffer_.empty();
    }

    KeyboardEvent Keyboard::ReadEvent()
    {
        if (event_buffer_.empty())
        {
            return KeyboardEvent();
        } 
        else
        {
            KeyboardEvent e_ = event_buffer_.front();
            event_buffer_.pop();
            
            return e_;
        }
    }

    void Keyboard::_OnWindowsKeyboardMessage(UINT u_msg_a,
                                            WPARAM w_param_a,
                                            LPARAM l_param_a)
    {
        KeyboardEvent kbe_(u_msg_a, w_param_a, l_param_a);
        switch (kbe_.GetType())
        {
        case KeyboardEvent::Type::KeyDown:
            key_states_[kbe_.GetKeyCode()] = true;
            break;
        case KeyboardEvent::Type::KeyUp:
            key_states_[kbe_.GetKeyCode()] = false;
            break;
        case KeyboardEvent::Type::Char:
            break;
        }

        event_buffer_.push(kbe_);
    }
} // namespace VE_Kernel