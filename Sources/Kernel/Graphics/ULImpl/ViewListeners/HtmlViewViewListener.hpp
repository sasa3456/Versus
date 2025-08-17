// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef HTMLVIEWVIEWLISTENER_HPP
#define HTMLVIEWVIEWLISTENER_HPP

#include <Ultralight/Listener.h>
#include <Windows.h>

namespace ul = ultralight;
namespace VE_Kernel
{
    class HtmlViewViewListener : public ul::ViewListener
    {
    public:
        HtmlViewViewListener();
        void OnChangeTitle(ul::View* caller_a, const ul::String& title_a) override;
        void OnChangeURL(ul::View* caller_a, const ul::String& url_a) override;
        void OnChangeTooltip(ul::View* caller_a,
                             const ul::String& tooltip_a) override;

        void OnChangeCursor(ul::View* caller_a, ul::Cursor cursor_a) override;
        void OnAddConsoleMessage(ul::View* caller_a,
                                 ul::MessageSource source_a,
                                 ul::MessageLevel level_a,
                                 const ul::String& message_a,
                                 uint32_t line_number_a,
                                 uint32_t column_number_a,
                                 const ul::String& source_id_a) override;

    private:
        HCURSOR cursor_hand_;
        HCURSOR cursor_arrow_;
        HCURSOR cursor_ibeam_;
    };
} // namespace VE_Kernel

#endif