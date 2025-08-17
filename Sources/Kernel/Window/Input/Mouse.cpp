#include "Mouse.hpp"

namespace VE_Kernel
{
    int Mouse::GetPosX()
    {
        return x_;
    }

    int Mouse::GetPosY()
    {
        return y_;
    }

    MousePoint Mouse::GetPos()
    {
        return {x_, y_};
    }

    bool Mouse::EventBufferIsEmpty()
    {
        return event_buffer_.empty();
    }

    MouseEvent Mouse::ReadEvent()
    {
        if (event_buffer_.empty())
        {
            return MouseEvent();
        } 
        else
        {
            MouseEvent e_ = event_buffer_.front();
            event_buffer_.pop();
            return e_;
        }
    }

    void Mouse::_OnWindowsMouseMessage(UINT u_msg_a,
                                      WPARAM w_param_a,
                                      LPARAM l_param_a)
    {
        MouseEvent mouse_event_(u_msg_a, w_param_a, l_param_a);
        switch (mouse_event_.type_)
        {
        case MouseEvent::Type::MouseDown:
            last_pressed_button_ = mouse_event_.button_;
            break;
        case MouseEvent::Type::MouseUp:
            last_pressed_button_ = MouseEvent::Button::None;
            break;
        case MouseEvent::Type::MouseMove:
            mouse_event_.button_ = last_pressed_button_;
            break;
        }

        event_buffer_.push(mouse_event_);
    }
} // namespace VE_Kernel