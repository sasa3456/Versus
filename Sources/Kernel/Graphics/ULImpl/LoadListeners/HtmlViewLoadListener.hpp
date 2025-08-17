// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef HTMLVIEWLOADLISTENER_HPP
#define HTMLVIEWLOADLISTENER_HPP

#include <Ultralight/Ultralight.h>

namespace ul = ultralight;
namespace VE_Kernel
{
    class HtmlViewLoadListener : public ul::LoadListener
    {
    public:
        HtmlViewLoadListener() {}

        virtual ~HtmlViewLoadListener() {}
        virtual void OnDOMReady(ul::View* view_a) override;
    };
} // namespace VE_Kernel

#endif