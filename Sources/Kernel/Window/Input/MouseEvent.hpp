// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef MOUSEEVENT_HPP
#define MOUSEEVENT_HPP

#include <Ultralight/KeyEvent.h>
#include <Ultralight/MouseEvent.h>
#include <Ultralight/Ultralight.h>

#include <queue>
#include <wrl/client.h>

#include "MousePoint.hpp"

namespace ul = ultralight;
namespace VE_Kernel
{
    class MouseEvent
    {
        friend class Mouse;

    public:
        enum class Type
        {
            MouseMove = ul::MouseEvent::Type::kType_MouseMoved,
            MouseDown = ul::MouseEvent::Type::kType_MouseDown,
            MouseUp = ul::MouseEvent::Type::kType_MouseUp,
            MouseMoveRaw,
            UninitializedType
        };

        enum class Button
        {
            None = 0,
            Left = ul::MouseEvent::Button::kButton_Left,
            Middle = ul::MouseEvent::Button::kButton_Middle,
            Right = ul::MouseEvent::Button::kButton_Right,
            UninitializedButton
        };

    public:
        MouseEvent();
        MouseEvent(UINT u_msg_a, WPARAM w_param_a, LPARAM l_param_a);
        bool IsValid() const;
        Type GetType() const;
        Button GetButton() const;
        MousePoint GetPos() const;
        int GetPosX() const;
        int GetPosY() const;
        ul::MouseEvent ToUltralightMouseEvent();

    private:
        Type type_ = Type::UninitializedType;
        Button button_ = Button::UninitializedButton;
        int x_;
        int y_;
    };
} // namespace VE_Kernel

#endif