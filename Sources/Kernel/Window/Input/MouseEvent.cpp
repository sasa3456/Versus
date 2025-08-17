#include "MouseEvent.hpp"

namespace VE_Kernel
{
    MouseEvent::MouseEvent()
        : type_(Type::UninitializedType), button_(Button::UninitializedButton),
          x_(0), y_(0)
    {}

    MouseEvent::MouseEvent(UINT u_msg_a, WPARAM w_param_a, LPARAM l_param_a)
    {
        x_ = LOWORD(l_param_a);
        y_ = HIWORD(l_param_a);
        switch (u_msg_a)
        {
        case WM_MOUSEMOVE:
            button_ = Button::None;
            type_ = Type::MouseMove;
            break;
        case WM_LBUTTONDOWN:
            button_ = Button::Left;
            type_ = Type::MouseDown;
            break;
        case WM_RBUTTONDOWN:
            button_ = Button::Right;
            type_ = Type::MouseDown;
            break;
        case WM_MBUTTONDOWN:
            button_ = Button::Middle;
            type_ = Type::MouseDown;
            break;
        case WM_LBUTTONUP:
            button_ = Button::Left;
            type_ = Type::MouseUp;
            break;
        case WM_RBUTTONUP:
            button_ = Button::Right;
            type_ = Type::MouseUp;
            break;
        case WM_MBUTTONUP:
            button_ = Button::Middle;
            type_ = Type::MouseUp;
            break;
        default:
            break;
        }
    }

    bool MouseEvent::IsValid() const
    {
        return (type_ != Type::UninitializedType
                && button_ != Button::UninitializedButton);
    }

    MouseEvent::Type MouseEvent::GetType() const
    {
        return type_;
    }

    MouseEvent::Button MouseEvent::GetButton() const
    {
        return button_;
    }

    MousePoint MouseEvent::GetPos() const
    {
        return {x_, y_};
    }

    int MouseEvent::GetPosX() const
    {
        return x_;
    }

    int MouseEvent::GetPosY() const
    {
        return y_;
    }

    ul::MouseEvent MouseEvent::ToUltralightMouseEvent()
    {
        ul::MouseEvent mouse_event_ {};
        mouse_event_.button = static_cast<ul::MouseEvent::Button>(button_);
        mouse_event_.type = static_cast<ul::MouseEvent::Type>(type_);
        mouse_event_.x = x_;
        mouse_event_.y = y_;
        return mouse_event_;
    }
} // namespace VE_Kernel